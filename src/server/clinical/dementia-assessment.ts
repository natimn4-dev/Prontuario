import type { Prisma } from "../../generated/prisma/client.ts";
import {
  DEMENTIA_ASSESSMENT_PROTOCOL_VERSION,
  buildDementiaReportDraft,
  cognitiveScaleFamily,
  cognitiveScaleName,
  interpretDementiaAssessment,
  type DementiaAssessmentDraft,
  type DementiaAssessmentWorkspaceView,
} from "../../domain/dementia-assessment.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import { DementiaAssessmentError } from "./dementia-assessment-errors.ts";
import { dementiaAssessmentWorkspaceContext } from "./dementia-assessment-workspace-context.ts";

export async function getDementiaAssessmentWorkspace(consultationId: string): Promise<DementiaAssessmentWorkspaceView> {
  await requireAuthenticatedUser("patient.read");
  return prisma.$transaction((tx) => dementiaAssessmentWorkspaceContext(tx, consultationId));
}

export async function saveDementiaAssessmentRecord(input: {
  consultationId: string;
  expectedLatestVersion: number;
  draft: DementiaAssessmentDraft;
  requestId?: string;
}): Promise<DementiaAssessmentWorkspaceView> {
  const { user } = await requireAuthenticatedUser("consultation.write");

  try {
    return await prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.findUnique({
        where: { id: input.consultationId },
        select: { id: true, patientId: true, status: true },
      });
      if (!consultation) throw new DementiaAssessmentError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.", 404);
      if (consultation.status === "FINALIZED") throw new DementiaAssessmentError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.", 409);

      const latest = await tx.cognitiveDiagnosticAssessment.findFirst({
        where: { patientId: consultation.patientId, consultationId: consultation.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const latestVersion = latest?.version ?? 0;
      if (latestVersion !== input.expectedLatestVersion) {
        throw new DementiaAssessmentError(
          "DEMENTIA_ASSESSMENT_CHANGED",
          "A avaliação foi atualizada em outra sessão. Recarregue antes de salvar novamente.",
          409,
        );
      }

      const scales = await tx.scaleAssessment.findMany({
        where: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          scaleCode: { in: ["meem", "moca", "meem_freitas", "moca_br_freitas", "clock", "relogio"] },
        },
        orderBy: { appliedAt: "desc" },
        select: {
          scaleCode: true,
          scoreNumeric: true,
          scoreText: true,
          classification: true,
          interpretation: true,
          appliedAt: true,
        },
      });
      const interpretation = interpretDementiaAssessment(input.draft);
      const reportText = input.draft.reportText?.trim() || buildDementiaReportDraft(
        input.draft,
        interpretation,
        scales.filter((scale, index, all) => all.findIndex((candidate) => cognitiveScaleFamily(candidate.scaleCode) === cognitiveScaleFamily(scale.scaleCode)) === index).map((scale) => ({
          scaleCode: scale.scaleCode,
          name: cognitiveScaleName(scale.scaleCode),
          score: scale.scoreNumeric === null ? undefined : Number(scale.scoreNumeric),
          scoreText: scale.scoreText ?? undefined,
          classification: scale.classification ?? undefined,
          interpretation: scale.interpretation ?? undefined,
          appliedAt: scale.appliedAt.toISOString(),
        })),
      );
      const created = await tx.cognitiveDiagnosticAssessment.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          recordedById: user.id,
          version: latestVersion + 1,
          protocolVersion: DEMENTIA_ASSESSMENT_PROTOCOL_VERSION,
          safety: input.draft.safety as unknown as Prisma.InputJsonValue,
          clinical: input.draft.clinical as unknown as Prisma.InputJsonValue,
          keyFeatures: input.draft.keyFeatures as unknown as Prisma.InputJsonValue,
          labs: input.draft.labs as unknown as Prisma.InputJsonValue,
          imaging: input.draft.imaging as unknown as Prisma.InputJsonValue,
          biomarkers: input.draft.biomarkers as unknown as Prisma.InputJsonValue,
          neuropsychologySummary: input.draft.neuropsychologySummary,
          clinicianSyndrome: input.draft.clinicianSyndrome,
          clinicianPrimaryHypothesis: input.draft.clinicianPrimaryHypothesis,
          clinicianDifferentials: input.draft.clinicianDifferentials,
          interpretation: interpretation as unknown as Prisma.InputJsonValue,
          reportText,
          clinicianReviewed: input.draft.clinicianReviewed,
        },
      });
      await tx.auditEvent.create({
        data: {
          userId: user.id,
          entityType: "CognitiveDiagnosticAssessment",
          entityId: created.id,
          action: "dementia-assessment.record.create",
          requestId: input.requestId,
          outcome: "success",
          reasonCode: interpretation.pathway.toLowerCase(),
        },
      });

      return dementiaAssessmentWorkspaceContext(tx, consultation.id);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof DementiaAssessmentError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002" || code === "P2034") {
      throw new DementiaAssessmentError(
        "DEMENTIA_ASSESSMENT_CHANGED",
        "A avaliação foi atualizada em outra sessão. Recarregue antes de salvar novamente.",
        409,
      );
    }
    throw error;
  }
}
