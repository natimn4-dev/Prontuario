import type { Prisma } from "../../generated/prisma/client";
import { buildAgaReportModel, renderAgaReportText } from "../../domain/aga-report";
import { consultationHorizon, problemsAsOf } from "../../domain/as-of-consultation";
import type { LongitudinalAssessment } from "../../domain/clinical-change-summary";
import { assertDocumentContextIntegrity } from "../../domain/document-context-integrity";
import { withDocumentSnapshotWriteRetry } from "../../domain/document-snapshot-versioning";
import { sanitizeFamilyReportModel } from "../../domain/family-care-safety";
import { prisma } from "../db";
import { requireAuthenticatedUser } from "../auth/require-user";
import { createDocumentSnapshotInTransaction } from "./document-snapshot-transaction";

function answersRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
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

      const clinicalReport = buildAgaReportModel({
        patientId: consultation.patientId,
        consultationId: consultation.id,
        consultationStatus: consultation.status,
        patientName: consultation.patient.fullName,
        longitudinalAssessments: assessments,
        longitudinalProblems: problems,
      });
      const report = sanitizeFamilyReportModel(clinicalReport);
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
