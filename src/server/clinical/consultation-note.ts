import type { Prisma } from "../../generated/prisma/client.ts";
import type { ClinicalColor } from "../../domain/clinical-engine.ts";
import type { LongitudinalAssessment } from "../../domain/clinical-change-summary.ts";
import {
  consultationNoteJsonToSoapDraft,
  soapDraftToConsultationNoteJson,
  type SoapDraftFields,
} from "../../domain/consultation-note-contract.ts";
import {
  consultationHorizon,
  problemsAsOf,
  type ProblemTimelineRecord,
} from "../../domain/as-of-consultation.ts";
import {
  ConsultationNoteError,
  type ConsultationNoteView,
} from "../../domain/consultation-note-view.ts";
import { buildProfessionalPlanSuggestions } from "../../domain/professional-plan-suggestions.ts";
import {
  buildConsultationExamView,
  normalizeClinicalExamText,
} from "../../domain/consultation-exams.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";

function clinicalColor(value: string | null): ClinicalColor | undefined {
  if (value === "verde" || value === "amarelo" || value === "vermelho" || value === "cinza") return value;
  return undefined;
}

async function noteContext(tx: Prisma.TransactionClient, consultationId: string) {
  const consultation = await tx.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id: true,
      patientId: true,
      status: true,
      occurredAt: true,
      createdAt: true,
      updatedAt: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
    },
  });
  if (!consultation) {
    throw new ConsultationNoteError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
  }

  const consultations = await tx.consultation.findMany({
    where: { patientId: consultation.patientId },
    select: { id: true, patientId: true, occurredAt: true, createdAt: true },
  });
  const horizon = consultationHorizon({
    patientId: consultation.patientId,
    targetConsultationId: consultation.id,
    consultations,
  });
  const consultationIds = horizon.map((item) => item.id);

  const examRecords = await tx.clinicalExamRecord.findMany({
    where: {
      patientId: consultation.patientId,
      consultationId: { in: consultationIds },
    },
    select: {
      id: true,
      patientId: true,
      consultationId: true,
      content: true,
      updatedAt: true,
    },
  });
  const exams = buildConsultationExamView({
    patientId: consultation.patientId,
    targetConsultationId: consultation.id,
    consultations,
    records: examRecords,
  });

  const persistedProblems = await tx.clinicalProblem.findMany({
    where: { patientId: consultation.patientId },
    include: {
      events: {
        select: {
          problemId: true,
          patientId: true,
          consultationId: true,
          previousStatus: true,
          newStatus: true,
          createdAt: true,
        },
      },
    },
  });

  const problems = problemsAsOf({
    patientId: consultation.patientId,
    consultationIds,
    problems: persistedProblems.map((problem) => ({
      id: problem.id,
      patientId: problem.patientId,
      originConsultationId: problem.originConsultationId,
      type: problem.type,
      status: problem.status,
      title: problem.title,
      description: problem.description ?? undefined,
      priority: problem.priority ?? undefined,
      events: problem.events,
    })) satisfies ProblemTimelineRecord[],
  });

  const currentAssessmentsRaw = await tx.scaleAssessment.findMany({
    where: {
      patientId: consultation.patientId,
      consultationId: consultation.id,
    },
    orderBy: [{ appliedAt: "asc" }, { id: "asc" }],
    select: {
      patientId: true,
      consultationId: true,
      scaleCode: true,
      scaleVersion: true,
      scoreNumeric: true,
      scoreText: true,
      classification: true,
      interpretation: true,
      clinicalColor: true,
      appliedAt: true,
    },
  });
  const currentAssessments: LongitudinalAssessment[] = currentAssessmentsRaw.map((assessment) => ({
    patientId: assessment.patientId,
    consultationId: assessment.consultationId,
    scaleCode: assessment.scaleCode,
    scaleVersion: assessment.scaleVersion,
    score: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
    scoreText: assessment.scoreText ?? undefined,
    classification: assessment.classification ?? undefined,
    interpretation: assessment.interpretation ?? undefined,
    color: clinicalColor(assessment.clinicalColor),
    appliedAt: assessment.appliedAt,
  }));

  if (consultation.assessment !== null) {
    throw new ConsultationNoteError(
      "UNSUPPORTED_ASSESSMENT_JSON",
      "Esta consulta possui conteúdo legado em Avaliação e requer revisão antes de editar o SOAP estruturado.",
    );
  }

  let fields: SoapDraftFields;
  try {
    fields = consultationNoteJsonToSoapDraft({
      subjective: consultation.subjective,
      objective: consultation.objective,
      plan: consultation.plan,
    });
  } catch {
    throw new ConsultationNoteError(
      "INCOMPATIBLE_PERSISTED_NOTE",
      "Esta consulta possui nota em formato anterior e requer revisão antes da edição estruturada.",
    );
  }

  return { consultation, fields, exams, problems, currentAssessments };
}

function publicView(context: Awaited<ReturnType<typeof noteContext>>): ConsultationNoteView {
  const planSuggestions = buildProfessionalPlanSuggestions({
    targetConsultationId: context.consultation.id,
    patientId: context.consultation.patientId,
    problems: context.problems.map((problem) => ({
      id: problem.id,
      patientId: problem.patientId,
      title: problem.title,
      status: problem.status,
    })),
    assessments: context.currentAssessments,
  });

  return {
    consultationId: context.consultation.id,
    consultationStatus: context.consultation.status,
    updatedAt: context.consultation.updatedAt.toISOString(),
    fields: context.fields,
    exams: context.exams,
    problems: context.problems.map((problem) => ({
      id: problem.id,
      type: problem.type,
      status: problem.status,
      title: problem.title,
    })),
    planSuggestions,
  };
}

function prismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function getConsultationNote(consultationId: string): Promise<ConsultationNoteView> {
  await requireAuthenticatedUser("patient.read");
  return prisma.$transaction(async (tx) => publicView(await noteContext(tx, consultationId)));
}

export async function saveConsultationNote(input: {
  consultationId: string;
  expectedUpdatedAt: string;
  fields: SoapDraftFields;
  examsText?: string;
  requestId?: string;
}): Promise<ConsultationNoteView> {
  const { user } = await requireAuthenticatedUser("consultation.write");
  const expectedUpdatedAt = new Date(input.expectedUpdatedAt);
  if (!Number.isFinite(expectedUpdatedAt.getTime())) {
    throw new Error("Versão da consulta inválida.");
  }

  return prisma.$transaction(async (tx) => {
    const context = await noteContext(tx, input.consultationId);
    if (context.consultation.status === "FINALIZED") {
      throw new ConsultationNoteError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
    }

    const allowedProblemIds = new Set(context.problems.map((problem) => problem.id));
    for (const problemId of Object.keys(input.fields.planByProblem ?? {})) {
      if (!allowedProblemIds.has(problemId)) {
        throw new ConsultationNoteError(
          "UNKNOWN_PROBLEM",
          "O plano contém problema que não pertence ao histórico desta consulta.",
        );
      }
    }

    const serialized = soapDraftToConsultationNoteJson(input.fields);
    const updated = await tx.consultation.updateMany({
      where: {
        id: context.consultation.id,
        patientId: context.consultation.patientId,
        status: { not: "FINALIZED" },
        updatedAt: expectedUpdatedAt,
      },
      data: {
        subjective: prismaJson(serialized.subjective),
        objective: prismaJson(serialized.objective),
        plan: prismaJson(serialized.plan),
      },
    });

    if (updated.count !== 1) {
      throw new ConsultationNoteError(
        "CONSULTATION_CHANGED",
        "A consulta foi alterada em outra sessão. Recarregue antes de salvar novamente.",
      );
    }

    if (input.examsText !== undefined) {
      const content = normalizeClinicalExamText(input.examsText);
      if (content) {
        await tx.clinicalExamRecord.upsert({
          where: { consultationId: context.consultation.id },
          create: {
            patientId: context.consultation.patientId,
            consultationId: context.consultation.id,
            content,
          },
          update: {
            content,
          },
        });
      } else {
        await tx.clinicalExamRecord.deleteMany({
          where: {
            patientId: context.consultation.patientId,
            consultationId: context.consultation.id,
          },
        });
      }
    }

    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Consultation",
        entityId: context.consultation.id,
        action: "consultation.note.update",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: "soap-contract-v1",
      },
    });

    return publicView(await noteContext(tx, input.consultationId));
  }, { isolationLevel: "Serializable" });
}
