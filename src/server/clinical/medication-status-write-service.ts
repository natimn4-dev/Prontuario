import type { MedicationLifecycleStatus } from "../../domain/medication-status-history.ts";

export type MedicationStatusWriteErrorCode =
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "MEDICATION_NOT_FOUND"
  | "RETROSPECTIVE_STATUS_WRITE_BLOCKED"
  | "STATUS_HISTORY_DIVERGED"
  | "MEDICATION_CHANGED";

export class MedicationStatusWriteError extends Error {
  readonly code: MedicationStatusWriteErrorCode;

  constructor(code: MedicationStatusWriteErrorCode, message: string) {
    super(message);
    this.name = "MedicationStatusWriteError";
    this.code = code;
  }
}

export interface MedicationStatusWriteContext {
  consultationId: string;
  patientId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
  medicationId: string | null;
  currentStatus: MedicationLifecycleStatus | null;
  explicitStatusKnown: boolean;
  previousExplicitStatus: MedicationLifecycleStatus | null;
}

export interface MedicationStatusWriteTransaction {
  findWriteContext(input: {
    consultationId: string;
    medicationId: string;
  }): Promise<MedicationStatusWriteContext | null>;
  updateCurrentMedicationStatus(input: {
    medicationId: string;
    patientId: string;
    expectedCurrentStatus: MedicationLifecycleStatus;
    newStatus: MedicationLifecycleStatus;
  }): Promise<boolean>;
  createStatusEvent(input: {
    medicationId: string;
    patientId: string;
    consultationId: string;
    previousStatus: MedicationLifecycleStatus | null;
    newStatus: MedicationLifecycleStatus;
  }): Promise<{ id: string }>;
  createAuditEvent(input: {
    userId: string;
    entityType: "MedicationStatusEvent";
    entityId: string;
    action: "medication.status.change";
    requestId?: string;
    outcome: "success";
    reasonCode: "explicit-prospective-status";
  }): Promise<void>;
}

export interface MedicationStatusWriteDependencies {
  authenticate(permission: "consultation.write"): Promise<{ user: { id: string } }>;
  transaction<T>(operation: (tx: MedicationStatusWriteTransaction) => Promise<T>): Promise<T>;
}

export function medicationStatusWriteService(
  dependencies: MedicationStatusWriteDependencies,
) {
  async function recordStatusChange(input: {
    consultationId: string;
    medicationId: string;
    newStatus: MedicationLifecycleStatus;
    requestId?: string;
  }) {
    const { user } = await dependencies.authenticate("consultation.write");

    return dependencies.transaction(async (tx) => {
      const context = await tx.findWriteContext({
        consultationId: input.consultationId,
        medicationId: input.medicationId,
      });
      if (!context) {
        throw new MedicationStatusWriteError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
      }
      if (context.consultationStatus === "FINALIZED") {
        throw new MedicationStatusWriteError(
          "CONSULTATION_FINALIZED",
          "Consulta finalizada não aceita alteração medicamentosa.",
        );
      }
      if (!context.medicationId || !context.currentStatus) {
        throw new MedicationStatusWriteError(
          "MEDICATION_NOT_FOUND",
          "Medicamento não encontrado para o paciente desta consulta.",
        );
      }
      if (!context.isLatestConsultation) {
        throw new MedicationStatusWriteError(
          "RETROSPECTIVE_STATUS_WRITE_BLOCKED",
          "O status atual do medicamento não pode ser alterado a partir de uma consulta anterior. Registre a mudança na consulta mais recente.",
        );
      }
      if (
        context.explicitStatusKnown
        && context.previousExplicitStatus !== context.currentStatus
      ) {
        throw new MedicationStatusWriteError(
          "STATUS_HISTORY_DIVERGED",
          "O status atual do medicamento diverge do histórico explícito e precisa ser revisado antes de nova alteração.",
        );
      }

      const changed = await tx.updateCurrentMedicationStatus({
        medicationId: context.medicationId,
        patientId: context.patientId,
        expectedCurrentStatus: context.currentStatus,
        newStatus: input.newStatus,
      });
      if (!changed) {
        throw new MedicationStatusWriteError(
          "MEDICATION_CHANGED",
          "O medicamento mudou durante a gravação; recarregue a consulta antes de tentar novamente.",
        );
      }

      const event = await tx.createStatusEvent({
        medicationId: context.medicationId,
        patientId: context.patientId,
        consultationId: context.consultationId,
        previousStatus: context.explicitStatusKnown
          ? context.previousExplicitStatus
          : null,
        newStatus: input.newStatus,
      });

      await tx.createAuditEvent({
        userId: user.id,
        entityType: "MedicationStatusEvent",
        entityId: event.id,
        action: "medication.status.change",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: "explicit-prospective-status",
      });

      return {
        eventId: event.id,
        medicationId: context.medicationId,
        patientId: context.patientId,
        consultationId: context.consultationId,
        previousStatus: context.explicitStatusKnown
          ? context.previousExplicitStatus
          : null,
        newStatus: input.newStatus,
      };
    });
  }

  return { recordStatusChange };
}
