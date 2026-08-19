export type MedicationMoment =
  | "manha"
  | "almoco"
  | "tarde"
  | "noite"
  | "ao_deitar"
  | "se_necessario";

export interface MedicationPlanItem {
  id: string;
  medicationText: string;
  doseInstruction?: string;
  route?: string;
  moments: readonly MedicationMoment[];
  instructions?: string;
  continuous?: boolean;
}

export interface MedicationPlanRow {
  id: string;
  medicationText: string;
  doseInstruction?: string;
  route?: string;
  instructions?: string;
  continuous: boolean;
  moments: Readonly<Record<MedicationMoment, boolean>>;
}

export interface MedicationPlanViewModel {
  patientName: string;
  rows: MedicationPlanRow[];
}

export const MEDICATION_MOMENTS: readonly MedicationMoment[] = [
  "manha",
  "almoco",
  "tarde",
  "noite",
  "ao_deitar",
  "se_necessario",
];

export const MEDICATION_MOMENT_LABELS: Readonly<Record<MedicationMoment, string>> = {
  manha: "Manhã",
  almoco: "Almoço",
  tarde: "Tarde",
  noite: "Noite",
  ao_deitar: "Ao deitar",
  se_necessario: "Se necessário",
};

function normalizedForSemanticValidation(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

const FREQUENCY_OR_SCHEDULE_PATTERNS: readonly RegExp[] = [
  /\b\d+\s*x\s*(?:\/|por\s+)?\s*(?:dia|d)\b/,
  /\b\d+\s*ve(?:z|zes)\s*(?:ao|por)\s*dia\b/,
  /\bmanha\s*(?:e|\/|\+)\s*noite\b/,
  /\bao\s+deitar\b/,
  /\bse\s+necessario\b/,
  /\b(?:manha|almoco|tarde|noite)\b/,
];

export function cleanMedicationText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePatientDisplayName(value: string): string {
  if (/\r|\n/.test(value)) {
    throw new Error("Nome do paciente inválido para exibição no plano de medicamentos.");
  }

  const patientName = value.trim().replace(/\s+/g, " ");
  if (!patientName) {
    throw new Error("O plano de medicamentos precisa estar vinculado a um paciente identificado.");
  }

  return patientName;
}

export function assertMedicationTextContainsNoSchedule(value: string): void {
  const normalized = normalizedForSemanticValidation(value);
  if (FREQUENCY_OR_SCHEDULE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(
      "O texto do medicamento deve conter somente nome e dose/apresentação; selecione os horários nos campos estruturados.",
    );
  }
}

export function validateMedicationPlanItem(item: MedicationPlanItem): MedicationPlanItem {
  const medicationText = cleanMedicationText(item.medicationText);
  if (!medicationText) throw new Error("Medicamento precisa de nome e dose/apresentação.");
  assertMedicationTextContainsNoSchedule(medicationText);

  const moments = [...new Set(item.moments)];
  if (moments.length === 0) throw new Error("Selecione ao menos um horário para o medicamento.");
  if (moments.some((moment) => !MEDICATION_MOMENTS.includes(moment))) {
    throw new Error("Horário de medicamento inválido.");
  }

  return {
    ...item,
    medicationText,
    doseInstruction: cleanMedicationText(item.doseInstruction ?? "") || undefined,
    route: cleanMedicationText(item.route ?? "") || undefined,
    instructions: item.instructions?.trim() || undefined,
    moments,
  };
}

export function validateMedicationPlan(
  items: readonly MedicationPlanItem[],
): MedicationPlanItem[] {
  const seen = new Set<string>();
  return items.map((item) => {
    if (seen.has(item.id)) throw new Error(`Medicamento duplicado no plano: ${item.id}`);
    seen.add(item.id);
    return validateMedicationPlanItem(item);
  });
}

export function buildMedicationPlanRows(
  items: readonly MedicationPlanItem[],
): MedicationPlanRow[] {
  return validateMedicationPlan(items).map((item) => ({
    id: item.id,
    medicationText: item.medicationText,
    doseInstruction: item.doseInstruction,
    route: item.route,
    instructions: item.instructions,
    continuous: item.continuous === true,
    moments: Object.fromEntries(
      MEDICATION_MOMENTS.map((moment) => [moment, item.moments.includes(moment)]),
    ) as Record<MedicationMoment, boolean>,
  }));
}

export function buildMedicationPlanViewModel(
  patientName: string,
  items: readonly MedicationPlanItem[],
): MedicationPlanViewModel {
  return {
    patientName: normalizePatientDisplayName(patientName),
    rows: buildMedicationPlanRows(items),
  };
}

export function renderMedicationPlanText(
  patientName: string,
  items: readonly MedicationPlanItem[],
): string {
  const model = buildMedicationPlanViewModel(patientName, items);
  const lines = [`PLANO DE MEDICAMENTOS — ${model.patientName}`];

  for (const row of model.rows) {
    const details = [row.doseInstruction, row.route, row.continuous ? "uso contínuo" : undefined]
      .filter(Boolean)
      .join(" · ");
    lines.push("", `- ${row.medicationText}${details ? ` — ${details}` : ""}`);
    lines.push(
      MEDICATION_MOMENTS
        .map((moment) => `${row.moments[moment] ? "[x]" : "[ ]"} ${MEDICATION_MOMENT_LABELS[moment]}`)
        .join("  "),
    );
    if (row.instructions) lines.push(`  ${row.instructions}`);
  }

  return lines.join("\n");
}
