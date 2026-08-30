import type { Prisma } from "../../generated/prisma/client.ts";
import {
  emptyAdvanceDirectiveTopics,
  type AdvanceDirectiveRecordView,
  type AdvanceDirectiveTopics,
  type AdvanceDirectiveWorkspaceView,
} from "../../domain/advance-directives.ts";
import { AdvanceDirectiveError } from "./advance-directives-errors.ts";

export async function advanceDirectiveWorkspaceContext(
  tx: Prisma.TransactionClient,
  consultationId: string,
): Promise<AdvanceDirectiveWorkspaceView> {
  const consultation = await tx.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, patientId: true, status: true, occurredAt: true, createdAt: true },
  });
  if (!consultation) {
    throw new AdvanceDirectiveError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
  }

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
  const records = await tx.advanceDirectiveRecord.findMany({
    where: {
      patientId: consultation.patientId,
      consultationId: { in: horizon.map((item) => item.id) },
    },
    include: {
      consultation: { select: { occurredAt: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { version: "desc" }],
  });

  const publicRecords: AdvanceDirectiveRecordView[] = records.map((record) => ({
    id: record.id,
    consultationId: record.consultationId,
    consultationOccurredAt: record.consultation.occurredAt.toISOString(),
    recordedByName: record.recordedBy.name,
    version: record.version,
    protocolVersion: record.protocolVersion,
    createdAt: record.createdAt.toISOString(),
    disposition: record.disposition as AdvanceDirectiveRecordView["disposition"],
    participationMode: record.participationMode as AdvanceDirectiveRecordView["participationMode"],
    trustedPersonName: record.trustedPersonName ?? undefined,
    trustedRelation: record.trustedRelation ?? undefined,
    trustedContact: record.trustedContact ?? undefined,
    whatMatters: record.whatMatters ?? undefined,
    dignityAndComfort: record.dignityAndComfort ?? undefined,
    priorities: record.priorities as AdvanceDirectiveRecordView["priorities"],
    topics: (record.topics ?? emptyAdvanceDirectiveTopics()) as AdvanceDirectiveTopics,
    documentStatus: record.documentStatus as AdvanceDirectiveRecordView["documentStatus"],
    reviewTrigger: record.reviewTrigger as AdvanceDirectiveRecordView["reviewTrigger"],
  }));
  const current = publicRecords.find((record) => record.consultationId === consultation.id);

  return {
    consultationId: consultation.id,
    consultationStatus: consultation.status,
    latestVersion: current?.version ?? 0,
    ...(current ? { current } : {}),
    history: publicRecords,
  };
}
