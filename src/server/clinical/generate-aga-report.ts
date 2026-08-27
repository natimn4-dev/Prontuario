import type { Prisma } from "../../generated/prisma/client";
import { buildAgaReportModel, renderAgaReportText } from "../../domain/aga-report";
import {
  consultationHorizon,
  isProblemLogicalDeletionNote,
  problemsAsOf,
} from "../../domain/as-of-consultation";
import {
  buildCapacityDimensionHistory,
  type CapacityTimelineMilestone,
} from "../../domain/capacity-dimension-history";
import type { LongitudinalAssessment } from "../../domain/clinical-change-summary";
import { assertDocumentContextIntegrity } from "../../domain/document-context-integrity";
import { withDocumentSnapshotWriteRetry } from "../../domain/document-snapshot-versioning";
import { sanitizeFamilyReportModel } from "../../domain/family-care-safety";
import { parseObjectiveNote } from "../../domain/consultation-note-contract";
import {
  buildMedicationPlanSnapshotModel,
  MedicationPlanSnapshotError,
} from "../../domain/medication-plan-snapshot";
import type { VaccinationReview } from "../../domain/vaccination-prevention";
import { prisma } from "../db";
import { requireAuthenticatedUser } from "../auth/require-user";
import { createDocumentSnapshotInTransaction } from "./document-snapshot-transaction";
import { workspaceContext } from "./medication-workspace";

function answersRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function vaccinationReviewFromObjective(value: unknown): VaccinationReview | undefined {
  try {
    return parseObjectiveNote(value)?.vaccinationReview;
  } catch {
    return undefined;
  }
}

export async function generateAgaReport(input: {
  consultationId: string;
  requestId?: string;
}) {
  const { user } = await requireAuthenticatedUser("document.generate");

  return withDocumentSnapshotWriteRetry(() =>
    prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.findUnique({
        where: { id: input.consultationId },
        select: {
          id: true,
          patientId: true,
          status: true,
          occurredAt: true,
          createdAt: true,
          objective: true,
          patient: {
            select: {
              fullName: true,
              baselineConsultationId: true,
            },
          },
        },
      });
      if (!consultation) throw new Error("Consulta não encontrada.");

      const patientConsultations = await tx.consultation.findMany({
        where: {
          patientId: consultation.patientId,
          occurredAt: { lte: consultation.occurredAt },
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, patientId: true, occurredAt: true, createdAt: true },
      });
      const horizon = consultationHorizon({
        patientId: consultation.patientId,
        targetConsultationId: consultation.id,
        consultations: patientConsultations,
      });
      const consultationIds = horizon.map((item) => item.id);

      const [scaleAssessments, persistedProblems] = await Promise.all([
        tx.scaleAssessment.findMany({
          where: {
            patientId: consultation.patientId,
            consultationId: { in: consultationIds },
          },
          orderBy: { appliedAt: "asc" },
          select: {
            id: true,
            patientId: true,
            consultationId: true,
            scaleCode: true,
            scaleVersion: true,
            answers: true,
            scoreNumeric: true,
            scoreText: true,
            classification: true,
            interpretation: true,
            clinicalColor: true,
            appliedAt: true,
            scaleDefinition: {
              select: {
                sourceCitation: true,
                definitionHash: true,
              },
            },
            consultation: {
              select: {
                occurredAt: true,
                createdAt: true,
              },
            },
          },
        }),
        tx.clinicalProblem.findMany({
          where: {
            patientId: consultation.patientId,
            originConsultationId: { in: consultationIds },
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            patientId: true,
            originConsultationId: true,
            type: true,
            status: true,
            title: true,
            description: true,
            priority: true,
            createdAt: true,
            events: {
              where: {
                patientId: consultation.patientId,
                consultationId: { in: consultationIds },
              },
              select: {
                problemId: true,
                patientId: true,
                consultationId: true,
                previousStatus: true,
                newStatus: true,
                note: true,
                createdAt: true,
              },
            },
          },
        }),
      ]);

      assertDocumentContextIntegrity({
        patientId: consultation.patientId,
        consultationId: consultation.id,
        consultationIds,
        scaleAssessments,
        problems: persistedProblems,
      });

      const assessments: LongitudinalAssessment[] = scaleAssessments.map((assessment) => ({
        patientId: assessment.patientId,
        consultationId: assessment.consultationId,
        scaleCode: assessment.scaleCode,
        scaleVersion: assessment.scaleVersion,
        score: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
        scoreText: assessment.scoreText ?? undefined,
        classification: assessment.classification ?? undefined,
        interpretation: assessment.interpretation ?? undefined,
        color: (assessment.clinicalColor ?? undefined) as LongitudinalAssessment["color"],
        answers: answersRecord(assessment.answers),
        appliedAt: assessment.appliedAt,
        consultationOccurredAt: assessment.consultation.occurredAt,
        consultationCreatedAt: assessment.consultation.createdAt,
        isBaseline: assessment.consultationId === consultation.patient.baselineConsultationId,
      }));
      const problems = problemsAsOf({
        patientId: consultation.patientId,
        consultationIds,
        problems: persistedProblems.map((problem) => ({
          ...problem,
          description: problem.description ?? undefined,
          priority: problem.priority ?? undefined,
        })),
      });
      const milestones: CapacityTimelineMilestone[] = persistedProblems.flatMap((problem) => {
        const items: CapacityTimelineMilestone[] = [];
        const originNote = problem.description?.trim();
        if (originNote) {
          items.push({
            patientId: problem.patientId,
            consultationId: problem.originConsultationId,
            title: problem.title,
            note: originNote,
            recordedAt: problem.createdAt,
            source: "problem-origin",
          });
        }
        for (const event of problem.events) {
          const eventNote = event.note?.trim();
          if (!eventNote || isProblemLogicalDeletionNote(eventNote)) continue;
          items.push({
            patientId: event.patientId,
            consultationId: event.consultationId,
            title: problem.title,
            note: eventNote,
            recordedAt: event.createdAt,
            source: "problem-event",
          });
        }
        return items;
      });

      const medicationWorkspace = (await workspaceContext(tx, consultation.id)).view;
      let medicationPlan;
      try {
        const medicationSnapshot = buildMedicationPlanSnapshotModel({
          consultationId: consultation.id,
          patientName: consultation.patient.fullName,
          workspace: medicationWorkspace,
        });
        medicationPlan = {
          status: "READY" as const,
          message: "Tabela para organização do cuidado: não substitui receita, não representa nova prescrição e não autoriza iniciar, suspender, substituir ou alterar medicamentos, doses ou horários por conta própria.",
          plan: medicationSnapshot.plan,
        };
      } catch (error) {
        if (error instanceof MedicationPlanSnapshotError && error.code === "CONSULTATION_CONTEXT_MISMATCH") {
          throw error;
        }
        medicationPlan = {
          status: "REQUIRES_REVIEW" as const,
          message: "Tabela não liberada: conclua a reconciliação, confirme o status histórico e os horários de todos os medicamentos.",
        };
      }

      const clinicalReport = buildAgaReportModel({
        patientId: consultation.patientId,
        consultationId: consultation.id,
        consultationStatus: consultation.status,
        patientName: consultation.patient.fullName,
        longitudinalAssessments: assessments,
        longitudinalProblems: problems,
        vaccinationReview: vaccinationReviewFromObjective(consultation.objective),
        medicationPlan,
      });
      const safeReport = sanitizeFamilyReportModel(clinicalReport);
      const capacityHistory = buildCapacityDimensionHistory({
        patientId: consultation.patientId,
        consultations: horizon,
        assessments: scaleAssessments.map((assessment) => ({
          id: assessment.id,
          patientId: assessment.patientId,
          consultationId: assessment.consultationId,
          scaleCode: assessment.scaleCode,
          scaleVersion: assessment.scaleVersion,
          scoreNumeric: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
          scoreText: assessment.scoreText,
          classification: assessment.classification,
          interpretation: assessment.interpretation,
          clinicalColor: (assessment.clinicalColor ?? null) as LongitudinalAssessment["color"] | null,
          appliedAt: assessment.appliedAt,
          consultationOccurredAt: assessment.consultation.occurredAt,
          consultationCreatedAt: assessment.consultation.createdAt,
          sourceCitation: assessment.scaleDefinition?.sourceCitation,
          definitionHash: assessment.scaleDefinition?.definitionHash,
        })),
        milestones,
        targetConsultationId: consultation.id,
        includeTargetWhenEmpty: true,
      });
      const report = { ...safeReport, capacityHistory };
      const text = renderAgaReportText(report);
      const snapshot = await createDocumentSnapshotInTransaction(tx, {
        consultationId: consultation.id,
        type: "AGA_REPORT",
        contentSchemaVersion: report.schemaVersion,
        content: { report, text } as unknown as Prisma.InputJsonValue,
        requestId: input.requestId,
        generatedById: user.id,
      });

      return { report, text, snapshot };
    }, { isolationLevel: "Serializable" }),
  );
}
