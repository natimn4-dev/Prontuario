import type { Prisma } from "../../generated/prisma/client.ts";
import {
  ADVANCE_DIRECTIVE_PROTOCOL_VERSION,
  type AdvanceDirectiveDraft,
  type AdvanceDirectiveWorkspaceView,
} from "../../domain/advance-directives.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import { AdvanceDirectiveError } from "./advance-directives-errors.ts";
import { advanceDirectiveWorkspaceContext } from "./advance-directives-workspace-context.ts";

export async function getAdvanceDirectiveWorkspace(consultationId: string): Promise<AdvanceDirectiveWorkspaceView> {
  await requireAuthenticatedUser("patient.read");
  return prisma.$transaction((tx) => advanceDirectiveWorkspaceContext(tx, consultationId));
}

export async function saveAdvanceDirectiveRecord(input: {
  consultationId: string;
  expectedLatestVersion: number;
  draft: AdvanceDirectiveDraft;
  requestId?: string;
}): Promise<AdvanceDirectiveWorkspaceView> {
  const { user } = await requireAuthenticatedUser("consultation.write");

  try {
    return await prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.findUnique({
        where: { id: input.consultationId },
        select: { id: true, patientId: true, status: true },
      });
      if (!consultation) {
        throw new AdvanceDirectiveError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
      }
      if (consultation.status === "FINALIZED") {
        throw new AdvanceDirectiveError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
      }

      const latest = await tx.advanceDirectiveRecord.findFirst({
        where: { patientId: consultation.patientId, consultationId: consultation.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const latestVersion = latest?.version ?? 0;
      if (latestVersion !== input.expectedLatestVersion) {
        throw new AdvanceDirectiveError(
          "ADVANCE_DIRECTIVE_CHANGED",
          "A conversa foi atualizada em outra sessão. Recarregue antes de salvar novamente.",
        );
      }

      const created = await tx.advanceDirectiveRecord.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          recordedById: user.id,
          version: latestVersion + 1,
          protocolVersion: ADVANCE_DIRECTIVE_PROTOCOL_VERSION,
          disposition: input.draft.disposition,
          participationMode: input.draft.participationMode,
          trustedPersonName: input.draft.trustedPersonName,
          trustedRelation: input.draft.trustedRelation,
          trustedContact: input.draft.trustedContact,
          whatMatters: input.draft.whatMatters,
          dignityAndComfort: input.draft.dignityAndComfort,
          priorities: input.draft.priorities as unknown as Prisma.InputJsonValue,
          topics: input.draft.topics as unknown as Prisma.InputJsonValue,
          documentStatus: input.draft.documentStatus,
          reviewTrigger: input.draft.reviewTrigger,
        },
      });
      await tx.auditEvent.create({
        data: {
          userId: user.id,
          entityType: "AdvanceDirectiveRecord",
          entityId: created.id,
          action: "advance-directive.record.create",
          requestId: input.requestId,
          outcome: "success",
          reasonCode: input.draft.disposition.toLowerCase(),
        },
      });

      return advanceDirectiveWorkspaceContext(tx, consultation.id);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof AdvanceDirectiveError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002" || code === "P2034") {
      throw new AdvanceDirectiveError(
        "ADVANCE_DIRECTIVE_CHANGED",
        "A conversa foi atualizada em outra sessão. Recarregue antes de salvar novamente.",
      );
    }
    throw error;
  }
}
