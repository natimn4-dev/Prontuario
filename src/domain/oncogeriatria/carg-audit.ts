import type { CargInput } from "./calculators.ts";

export const CARG_TREATMENT_COURSE_COMPLETION_POLICY = "PRESERVE_CURRENT" as const;

export type PartialCargInput = Partial<CargInput>;

export interface CargCompletionItem {
  key: keyof CargInput;
  label: string;
  complete: boolean;
}

const FACTORS: ReadonlyArray<{
  key: keyof CargInput;
  label: string;
  complete: (value: PartialCargInput) => boolean;
}> = [
  { key: "ageYears", label: "Idade no início do esquema", complete: (value) => finite(value.ageYears) },
  { key: "cancerType", label: "Tipo de câncer", complete: (value) => present(value.cancerType) },
  { key: "standardDose", label: "Dose planejada para o primeiro ciclo", complete: (value) => typeof value.standardDose === "boolean" },
  { key: "multipleChemotherapyAgents", label: "Número de quimioterápicos no esquema", complete: (value) => typeof value.multipleChemotherapyAgents === "boolean" },
  { key: "hemoglobinGdl", label: "Hemoglobina e sexo de referência laboratorial", complete: (value) => finite(value.hemoglobinGdl) && present(value.biologicalSex) },
  { key: "creatinineClearanceMlMin", label: "Depuração de creatinina", complete: (value) => finite(value.creatinineClearanceMlMin) },
  { key: "hearing", label: "Audição", complete: (value) => present(value.hearing) },
  { key: "oneOrMoreFallsLastSixMonths", label: "Quedas nos últimos 6 meses", complete: (value) => typeof value.oneOrMoreFallsLastSixMonths === "boolean" },
  { key: "needsHelpTakingMedications", label: "Ajuda para tomar medicamentos", complete: (value) => typeof value.needsHelpTakingMedications === "boolean" },
  { key: "limitedWalkingOneBlock", label: "Limitação para caminhar um quarteirão", complete: (value) => typeof value.limitedWalkingOneBlock === "boolean" },
  { key: "decreasedSocialActivity", label: "Redução de atividade social", complete: (value) => typeof value.decreasedSocialActivity === "boolean" },
];

function present(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function finite(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function summarizeCargCompleteness(input: PartialCargInput) {
  const items: CargCompletionItem[] = FACTORS.map((factor) => ({
    key: factor.key,
    label: factor.label,
    complete: factor.complete(input),
  }));
  const completedCount = items.filter((item) => item.complete).length;
  const pending = items.filter((item) => !item.complete);
  return {
    totalFactors: FACTORS.length,
    completedCount,
    pendingKeys: pending.map((item) => item.key),
    pendingLabels: pending.map((item) => item.label),
    complete: completedCount === FACTORS.length,
    items,
  } as const;
}

function comparableValue(value: unknown): string {
  if (value === null || value === undefined) return "não registrado";
  if (typeof value === "boolean") return value ? "sim" : "não";
  return String(value);
}

export function diffCargInputs(previous: PartialCargInput, next: PartialCargInput) {
  return FACTORS.flatMap((factor) => {
    const relatedKeys: (keyof CargInput)[] = factor.key === "hemoglobinGdl"
      ? ["hemoglobinGdl", "biologicalSex"]
      : [factor.key];
    const changed = relatedKeys.some((key) => comparableValue(previous[key]) !== comparableValue(next[key]));
    if (!changed) return [];
    return [{
      key: factor.key,
      label: factor.label,
      previous: relatedKeys.map((key) => `${String(key)}: ${comparableValue(previous[key])}`).join(" · "),
      next: relatedKeys.map((key) => `${String(key)}: ${comparableValue(next[key])}`).join(" · "),
    }];
  });
}

export interface CargLaboratoryProvenance {
  laboratoryDate?: string | null;
  laboratorySource?: string | null;
  creatinineClearanceMethod?: string | null;
}

export function sanitizeCargLaboratoryProvenance(value: CargLaboratoryProvenance | null | undefined): CargLaboratoryProvenance | null {
  if (!value) return null;
  const trim = (item: unknown, max = 191) => typeof item === "string" && item.trim() ? item.trim().slice(0, max) : null;
  const result = {
    laboratoryDate: trim(value.laboratoryDate, 32),
    laboratorySource: trim(value.laboratorySource),
    creatinineClearanceMethod: trim(value.creatinineClearanceMethod),
  };
  return Object.values(result).some(Boolean) ? result : null;
}
