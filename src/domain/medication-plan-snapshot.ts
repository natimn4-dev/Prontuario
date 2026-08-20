import { buildMedicationPlanViewModel, renderMedicationPlanText, type MedicationPlanItem, type MedicationPlanViewModel } from "./medication-plan.ts";
import type { MedicationWorkspaceView } from "./medication-workspace.ts";

export interface MedicationPlanSnapshotModel {
  schemaVersion: "1.0";
  consultationId: string;
  patientName: string;
  plan: MedicationPlanViewModel;
  text: string;
  excluded: Array<{
    medicationId: string;
    status: "SUSPENDED" | "FINISHED";
  }>;
}

type MedicationPlanSnapshotErrorCode = "HISTORICAL_STATUS_NOT_REVIEWED" | "CONSULTATION_CONTEXT_MISMATCH";

export class MedicationPlanSnapshotError extends Error {
  readonly code: MedicationPlanSnapshotErrorCode;

  constructor(code: MedicationPlanSnapshotErrorCode, message: string) {
    super(message);
    this.name = "MedicationPlanSnapshotError";
    this.code = code;
  }
}

export function buildMedicationPlanSnapshotModel(input: {
  consultationId: string;
  patientName: string;
  workspace: MedicationWorkspaceView;
}): MedicationPlanSnapshotModel {
  if (input.workspace.consultationId !== input.consultationId) {
    throw new MedicationPlanSnapshotError("CONSULTATION_CONTEXT_MISMATCH", "Contexto de consulta divergente no plano de medicamentos.");
  }

  const unresolved = input.workspace.items.filter((item) => item.status === "UNKNOWN" || item.statusSource !== "explicit-history");
  if (unresolved.length > 0) {
    throw new MedicationPlanSnapshotError(
      "HISTORICAL_STATUS_NOT_REVIEWED",
      "Todos os medicamentos precisam de status histórico explicitamente revisado antes de gerar o plano.",
    );
  }

  const active: MedicationPlanItem[] = input.workspace.items
    .filter((item) => item.status === "ACTIVE")
    .map((item) => ({
      id: item.medicationId,
      medicationText: item.medicationText,
      doseInstruction: item.doseInstruction,
      route: item.route,
      moments: item.moments,
      continuous: item.continuous,
      instructions: item.instructions,
    }));

  const plan = buildMedicationPlanViewModel(input.patientName, active);
  const text = renderMedicationPlanText(input.patientName, active);

  return {
    schemaVersion: "1.0",
    consultationId: input.consultationId,
    patientName: plan.patientName,
    plan,
    text,
    excluded: input.workspace.items
      .filter((item): item is typeof item & { status: "SUSPENDED" | "FINISHED" } => item.status === "SUSPENDED" || item.status === "FINISHED")
      .map((item) => ({ medicationId: item.medicationId, status: item.status })),
  };
}
