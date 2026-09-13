import type { Prisma } from "../../generated/prisma/client.ts";

export type DocumentSnapshotInput = {
  consultationId: string;
  type: "SOAP" | "FAMILY_REPORT" | "MEDICATION_PLAN" | "AGA_REPORT" | "DEMENTIA_REPORT";
  content: Prisma.InputJsonValue;
  contentSchemaVersion?: string;
  requestId?: string;
};

export async function createDocumentSnapshotInTransaction(
  tx: Prisma.TransactionClient,
  input: DocumentSnapshotInput & { generatedById: string },
) {
  const consultation = await tx.consultation.findUnique({
    where: { id: input.consultationId },
    select: { id: true, patientId: true, status: true },
  });

  if (!consultation) {
    throw new Error("Consulta não encontrada.");
  }

  const latest = await tx.documentSnapshot.findFirst({
    where: {
      consultationId: consultation.id,
      patientId: consultation.patientId,
      type: input.type,
    },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const snapshot = await tx.documentSnapshot.create({
    data: {
      patientId: consultation.patientId,
      consultationId: consultation.id,
      type: input.type,
      version: (latest?.version ?? 0) + 1,
      content: input.content,
      contentSchemaVersion: input.contentSchemaVersion ?? "1.0",
      sourceConsultationStatus: consultation.status,
      generatedById: input.generatedById,
    },
  });

  await tx.auditEvent.create({
    data: {
      userId: input.generatedById,
      entityType: "DocumentSnapshot",
      entityId: snapshot.id,
      action: "document.generate",
      requestId: input.requestId,
      outcome: "success",
      reasonCode: consultation.status === "FINALIZED" ? "finalized-context" : "draft-context",
    },
  });

  return snapshot;
}
