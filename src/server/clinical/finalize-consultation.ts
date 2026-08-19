import type { Prisma } from "../../generated/prisma/client.ts";
import type { ClinicalColor } from "../../domain/clinical-engine.ts";
import { urgentAlertsForCurrentConsultation } from "../../domain/consultation-urgent-alerts.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import {
  consultationFinalizationService,
  type ConsultationFinalizationTransaction,
} from "./consultation-finalization-service.ts";

function answersRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

async function workflowContext(
  tx: Prisma.TransactionClient,
  consultationId: string,
) {
  const consultation = await tx.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, patientId: true, status: true },
  });
  if (!consultation) return null;

  const assessments = await tx.scaleAssessment.findMany({
    where: {
      consultationId: consultation.id,
      patientId: consultation.patientId,
    },
    select: {
      id: true,
      scaleCode: true,
      answers: true,
      scoreNumeric: true,
      scoreText: true,
      classification: true,
      clinicalColor: true,
      appliedAt: true,
    },
  });

  const urgentAlerts = urgentAlertsForCurrentConsultation(
    assessments.map((assessment) => ({
      id: assessment.id,
      scaleCode: assessment.scaleCode,
      answers: answersRecord(assessment.answers),
      score: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
      scoreText: assessment.scoreText ?? undefined,
      classification: assessment.classification ?? undefined,
      color: (assessment.clinicalColor ?? undefined) as ClinicalColor | undefined,
      appliedAt: assessment.appliedAt,
    })),
  );

  return {
    id: consultation.id,
    patientId: consultation.patientId,
    status: consultation.status,
    urgentAlerts,
  };
}

const service = consultationFinalizationService({
  authenticate: requireAuthenticatedUser,
  transaction: async (operation) => prisma.$transaction(async (tx) => operation({
    findWorkflowContext: (consultationId) => workflowContext(tx, consultationId),
    transitionStatus: async ({ consultationId, patientId, from, to }) => {
      const updated = await tx.consultation.updateMany({
        where: { id: consultationId, patientId, status: from },
        data: { status: to },
      });
      return updated.count === 1;
    },
    createAuditEvent: async (input) => {
      await tx.auditEvent.create({ data: input });
    },
  } satisfies ConsultationFinalizationTransaction), { isolationLevel: "Serializable" }),
});

export const getConsultationWorkflowState = service.getWorkflowState;
export const startConsultationReview = service.startReview;
export const finalizeConsultation = service.finalize;
