import type {
  MedicationStatusSource,
  MedicationWorkspaceStatus,
} from "./medication-workspace.ts";

export interface SoapMedicationProvenanceItem {
  status: MedicationWorkspaceStatus;
  statusSource: MedicationStatusSource;
}

export interface SoapMedicationProvenanceSummary {
  explicitActiveCount: number;
  pendingReviewCount: number;
  canCopySoap: boolean;
}

/**
 * O SOAP só pode afirmar "medicações em uso" quando o status daquela consulta
 * deriva de histórico explicitamente reconciliado. O estado atual do cadastro
 * não é retroprojetado como evidência clínica para o documento.
 */
export function summarizeSoapMedicationProvenance(
  items: readonly SoapMedicationProvenanceItem[],
): SoapMedicationProvenanceSummary {
  const pendingReviewCount = items.filter((item) => item.statusSource !== "explicit-history").length;
  const explicitActiveCount = items.filter(
    (item) => item.statusSource === "explicit-history" && item.status === "ACTIVE",
  ).length;

  return {
    explicitActiveCount,
    pendingReviewCount,
    canCopySoap: pendingReviewCount === 0,
  };
}

export function isExplicitActiveMedication(item: SoapMedicationProvenanceItem): boolean {
  return item.statusSource === "explicit-history" && item.status === "ACTIVE";
}
