import { clinicalAlertsFor } from "../../domain/clinical-alerts.ts";
import type { ClinicalColor } from "../../domain/clinical-engine.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import {
  consultationFinalizationService,
  type ConsultationFinalizationTransaction,
  type ServerDerivedUrgentAlert,
} from "./consultation-finalization-service.ts";

function answersRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

async function workflowContext(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
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
    orderBy: [{ appliedAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      scaleCode: true,
      answers: true,
      scoreNumeric: true,
      scoreText: true,
      classification: true,
      clinicalColor: true,
    },
  });

  // Reaplicações na mesma consulta não podem multiplicar alertas antigos.
  // Mantemos apenas o registro efetivo mais recente de cada instrumento.
  const latestByScale = new Map<string, (typeof assessments)[number]>();
  for (const assessment of assessments) latestByScale.set(assessment.scaleCode, assessment);

  const urgentAlerts: ServerDerivedUrgentAlert[] = [...latestByScale.values()]
    .flatMap((assessment) => clinicalAlertsFor(assessment.scaleCode, {
      answers: answersRecord(assessment.answers),
      result: {
        score: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
        scoreText: assessment.scoreText ?? (assessment.scoreNumeric === null ? "—" : String(assessment.scoreNumeric)),
        cor: (assessment.clinicalColor ?? "cinza") as ClinicalColor,
        classe: assessment.classification ?? "Sem classificação registrada",
      },
    }))
    .filter((alert) => alert.severity === "urgent")
    .map((alert) => ({ code: alert.code, message: alert.message }));

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
