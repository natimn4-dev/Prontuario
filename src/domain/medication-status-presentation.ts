import type { MedicationLifecycleStatus } from "./medication-status-history";

export const MEDICATION_STATUS_LABELS: Readonly<Record<MedicationLifecycleStatus, string>> = {
  ACTIVE: "Em uso",
  SUSPENDED: "Suspenso",
  FINISHED: "Finalizado",
};

export interface MedicationStatusControlItem {
  id: string;
  displayName: string;
  currentStatus: MedicationLifecycleStatus;
  currentStatusLabel: string;
  availableStatuses: Array<{
    value: MedicationLifecycleStatus;
    label: string;
  }>;
}

function normalizedMedicationName(name: string, presentation?: string | null): string {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName || /[\r\n\0]/.test(name)) {
    throw new Error("Medicamento sem identificação válida não pode ser exibido para mudança de status.");
  }

  const normalizedPresentation = presentation?.trim().replace(/\s+/g, " ");
  return normalizedPresentation ? `${normalizedName} — ${normalizedPresentation}` : normalizedName;
}

export function buildMedicationStatusControlItems(input: readonly {
  id: string;
  name: string;
  presentation?: string | null;
  status: MedicationLifecycleStatus;
}[]): MedicationStatusControlItem[] {
  const seen = new Set<string>();

  return input.map((medication) => {
    const id = medication.id.trim();
    if (!id || /[\r\n\0]/.test(id) || seen.has(id)) {
      throw new Error("Lista de medicamentos contém identificador inválido ou duplicado.");
    }
    seen.add(id);

    if (!(medication.status in MEDICATION_STATUS_LABELS)) {
      throw new Error("Status de medicamento inválido para apresentação.");
    }

    const availableStatuses = (Object.keys(MEDICATION_STATUS_LABELS) as MedicationLifecycleStatus[])
      .filter((status) => status !== medication.status)
      .map((status) => ({ value: status, label: MEDICATION_STATUS_LABELS[status] }));

    return {
      id,
      displayName: normalizedMedicationName(medication.name, medication.presentation),
      currentStatus: medication.status,
      currentStatusLabel: MEDICATION_STATUS_LABELS[medication.status],
      availableStatuses,
    };
  });
}
