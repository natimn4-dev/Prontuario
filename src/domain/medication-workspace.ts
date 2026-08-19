import type { MedicationMoment } from "./medication-plan.ts";
import type { MedicationLifecycleStatus } from "./medication-status-history.ts";

export type MedicationWorkspaceStatus = MedicationLifecycleStatus | "UNKNOWN";
export type MedicationStatusSource = "explicit-history" | "current-record-only" | "unknown";
export type MedicationWorkspaceErrorCode =
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "RETROSPECTIVE_EDIT_BLOCKED"
  | "MEDICATION_NOT_FOUND";

export class MedicationWorkspaceError extends Error {
  readonly code: MedicationWorkspaceErrorCode;
  constructor(code: MedicationWorkspaceErrorCode, message: string) {
    super(message);
    this.name = "MedicationWorkspaceError";
    this.code = code;
  }
}

export interface MedicationWorkspaceRegimenRecord {
  id: string;
  medicationId: string;
  patientId: string;
  consultationId: string;
  createdAt: Date | string;
  dose?: string | null;
  route?: string | null;
  continuous?: boolean;
  instructions?: string | null;
  moments: readonly MedicationMoment[];
}

export interface MedicationWorkspaceItem {
  medicationId: string;
  medicationText: string;
  name: string;
  presentation?: string;
  doseInstruction?: string;
  route?: string;
  moments: MedicationMoment[];
  continuous: boolean;
  instructions?: string;
  status: MedicationWorkspaceStatus;
  statusSource: MedicationStatusSource;
  regimenId?: string;
}

export interface MedicationWorkspaceView {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
  items: MedicationWorkspaceItem[];
}

export function assertMedicationWorkspaceEditable(input: {
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
}): void {
  if (input.consultationStatus === "FINALIZED") {
    throw new MedicationWorkspaceError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
  }
  if (!input.isLatestConsultation) {
    throw new MedicationWorkspaceError(
      "RETROSPECTIVE_EDIT_BLOCKED",
      "A reconciliação medicamentosa não pode ser alterada retrospectivamente quando já existe consulta posterior.",
    );
  }
}

/**
 * Seleciona um único regime efetivo por medicamento dentro do horizonte já
 * validado da consulta. A ordem dos IDs de consulta é a única fonte temporal;
 * em reaplicações na mesma consulta vence o registro criado por último.
 */
export function effectiveMedicationRegimens(input: {
  consultationIds: readonly string[];
  regimens: readonly MedicationWorkspaceRegimenRecord[];
}): MedicationWorkspaceRegimenRecord[] {
  const order = new Map(input.consultationIds.map((id, index) => [id, index]));
  const eligible = input.regimens.filter((regimen) => order.has(regimen.consultationId));
  const grouped = new Map<string, MedicationWorkspaceRegimenRecord[]>();
  for (const regimen of eligible) {
    const current = grouped.get(regimen.medicationId) ?? [];
    current.push(regimen);
    grouped.set(regimen.medicationId, current);
  }

  return [...grouped.values()].map((items) => [...items].sort((a, b) =>
    (order.get(b.consultationId)! - order.get(a.consultationId)!)
    || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    || b.id.localeCompare(a.id),
  )[0]!).sort((a, b) => a.medicationId.localeCompare(b.medicationId));
}

export function medicationStatusForWorkspace(input: {
  isLatestConsultation: boolean;
  explicitStatus: MedicationLifecycleStatus | null;
  currentStatus: MedicationLifecycleStatus;
}): { status: MedicationWorkspaceStatus; source: MedicationStatusSource } {
  if (input.explicitStatus) return { status: input.explicitStatus, source: "explicit-history" };
  if (input.isLatestConsultation) return { status: input.currentStatus, source: "current-record-only" };
  return { status: "UNKNOWN", source: "unknown" };
}
