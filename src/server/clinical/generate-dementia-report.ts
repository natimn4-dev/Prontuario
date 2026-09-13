import type { Prisma } from "../../generated/prisma/client.ts";
import type { DementiaInterpretation } from "../../domain/dementia-assessment.ts";
import { withDocumentSnapshotWriteRetry } from "../../domain/document-snapshot-versioning.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import { createDocumentSnapshotInTransaction } from "./document-snapshot-transaction.ts";
import { DementiaAssessmentError } from "./dementia-assessment-errors.ts";

export interface DementiaReportSnapshotContent {
  schemaVersion: "1.0";
  patientId: string;
  consultationId: string;
  assessmentRecordId: string;
  assessmentVersion: number;
  protocolVersion: string;
  reportText: string;
  interpretation: DementiaInterpretation;
  clinicianReviewed: true;
}

export async function generateDementiaReport(input: { consultationId: string; requestId?: string }) {
  const { user } = await requireAuthenticatedUser("document.generate");
  return withDocumentSnapshotWriteRetry(() => prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.findUnique({
      where: { id: input.consultationId },
      select: { id: true, patientId: true },
    });
    if (!consultation) throw new DementiaAssessmentError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.", 404);
    const assessment = await tx.cognitiveDiagnosticAssessment.findFirst({
      where: { patientId: consultation.patientId, consultationId: consultation.id },
      orderBy: { version: "desc" },
    });
    if (!assessment) throw new DementiaAssessmentError("ASSESSMENT_REQUIRED", "Registre a avaliação antes de gerar o relatório.");
    if (!assessment.clinicianReviewed) {
      throw new DementiaAssessmentError("CLINICAL_REVIEW_REQUIRED", "Confirme a revisão clínica e salve uma nova versão antes de gerar o relatório.");
    }
    if (!assessment.reportText.trim()) throw new DementiaAssessmentError("REPORT_REQUIRED", "O texto do relatório está vazio.");

    const content: DementiaReportSnapshotContent = {
      schemaVersion: "1.0",
      patientId: consultation.patientId,
      consultationId: consultation.id,
      assessmentRecordId: assessment.id,
      assessmentVersion: assessment.version,
      protocolVersion: assessment.protocolVersion,
      reportText: assessment.reportText,
      interpretation: assessment.interpretation as unknown as DementiaInterpretation,
      clinicianReviewed: true,
    };
    return createDocumentSnapshotInTransaction(tx, {
      consultationId: consultation.id,
      type: "DEMENTIA_REPORT",
      content: content as unknown as Prisma.InputJsonValue,
      contentSchemaVersion: "1.0",
      requestId: input.requestId,
      generatedById: user.id,
    });
  }, { isolationLevel: "Serializable" }));
}
