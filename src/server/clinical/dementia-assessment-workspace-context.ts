import type { Prisma } from "../../generated/prisma/client.ts";
import type {
  DementiaAssessmentRecordView,
  DementiaAssessmentWorkspaceView,
} from "../../domain/dementia-assessment.ts";
import { cognitiveScaleFamily, cognitiveScaleName } from "../../domain/dementia-assessment.ts";
import { DementiaAssessmentError } from "./dementia-assessment-errors.ts";

export async function dementiaAssessmentWorkspaceContext(
  tx: Prisma.TransactionClient,
  consultationId: string,
): Promise<DementiaAssessmentWorkspaceView> {
  const consultation = await tx.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id: true,
      patientId: true,
      status: true,
      occurredAt: true,
      createdAt: true,
      patient: { select: { fullName: true } },
    },
  });
  if (!consultation) throw new DementiaAssessmentError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.", 404);

  const horizon = await tx.consultation.findMany({
    where: {
      patientId: consultation.patientId,
      OR: [
        { occurredAt: { lt: consultation.occurredAt } },
        { occurredAt: consultation.occurredAt, createdAt: { lte: consultation.createdAt } },
      ],
    },
    select: { id: true },
  });

  const [records, scales, latestSnapshot] = await Promise.all([
    tx.cognitiveDiagnosticAssessment.findMany({
      where: {
        patientId: consultation.patientId,
        consultationId: { in: horizon.map((item) => item.id) },
      },
      include: {
        consultation: { select: { occurredAt: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    }),
    tx.scaleAssessment.findMany({
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
    }),
    tx.documentSnapshot.findFirst({
      where: { patientId: consultation.patientId, consultationId: consultation.id, type: "DEMENTIA_REPORT" },
      orderBy: { version: "desc" },
      select: { version: true },
    }),
  ]);

  const publicRecords: DementiaAssessmentRecordView[] = records.map((record) => ({
    id: record.id,
    patientId: record.patientId,
    consultationId: record.consultationId,
    consultationOccurredAt: record.consultation.occurredAt.toISOString(),
    recordedByName: record.recordedBy.name,
    version: record.version,
    protocolVersion: record.protocolVersion,
    createdAt: record.createdAt.toISOString(),
    safety: record.safety as unknown as DementiaAssessmentRecordView["safety"],
    clinical: record.clinical as unknown as DementiaAssessmentRecordView["clinical"],
    keyFeatures: record.keyFeatures as unknown as DementiaAssessmentRecordView["keyFeatures"],
    labs: record.labs as unknown as DementiaAssessmentRecordView["labs"],
    imaging: record.imaging as unknown as DementiaAssessmentRecordView["imaging"],
    biomarkers: record.biomarkers as unknown as DementiaAssessmentRecordView["biomarkers"],
    neuropsychologySummary: record.neuropsychologySummary ?? undefined,
    clinicianSyndrome: record.clinicianSyndrome ?? undefined,
    clinicianPrimaryHypothesis: record.clinicianPrimaryHypothesis ?? undefined,
    clinicianDifferentials: record.clinicianDifferentials ?? undefined,
    interpretation: record.interpretation as unknown as DementiaAssessmentRecordView["interpretation"],
    reportText: record.reportText,
    clinicianReviewed: record.clinicianReviewed,
  }));
  const current = publicRecords.find((record) => record.consultationId === consultation.id);
  const seenScale = new Set<string>();
  const currentCognitiveScales = scales
    .filter((scale) => {
      const family = cognitiveScaleFamily(scale.scaleCode);
      if (seenScale.has(family)) return false;
      seenScale.add(family);
      return true;
    })
    .map((scale) => ({
      scaleCode: scale.scaleCode,
      name: cognitiveScaleName(scale.scaleCode),
      score: scale.scoreNumeric === null ? undefined : Number(scale.scoreNumeric),
      scoreText: scale.scoreText ?? undefined,
      classification: scale.classification ?? undefined,
      interpretation: scale.interpretation ?? undefined,
      appliedAt: scale.appliedAt.toISOString(),
    }));

  return {
    consultationId: consultation.id,
    patientId: consultation.patientId,
    patientName: consultation.patient.fullName,
    consultationStatus: consultation.status,
    latestVersion: current?.version ?? 0,
    ...(current ? { current } : {}),
    history: publicRecords,
    currentCognitiveScales,
    latestReportSnapshotVersion: latestSnapshot?.version ?? 0,
  };
}
