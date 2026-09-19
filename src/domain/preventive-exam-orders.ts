export const PREVENTIVE_EXAM_ORDER_OPTIONS = [
  {
    id: "LABORATORY_TESTS",
    label: "Solicitado exames laboratoriais",
  },
  {
    id: "FOBT",
    label: "Pesquisa de sangue oculto nas fezes",
  },
  {
    id: "COLONOSCOPY",
    label: "Colonoscopia",
  },
  {
    id: "MAMMOGRAPHY",
    label: "Mamografia",
  },
  {
    id: "BREAST_ULTRASOUND",
    label: "USG de mamas e axilas",
  },
  {
    id: "BONE_DENSITOMETRY",
    label: "Densitometria óssea",
  },
] as const;

export type PreventiveExamOrder = typeof PREVENTIVE_EXAM_ORDER_OPTIONS[number]["id"];

const PREVENTIVE_EXAM_ORDER_IDS = new Set<string>(
  PREVENTIVE_EXAM_ORDER_OPTIONS.map((option) => option.id),
);

export function preventiveExamOrderLabel(order: PreventiveExamOrder): string {
  return PREVENTIVE_EXAM_ORDER_OPTIONS.find((option) => option.id === order)!.label;
}

/**
 * Valida dados persistidos ou recebidos pela API sem inferir indicação clínica.
 * A ordem retornada é estável e segue o catálogo da interface.
 */
export function parsePreventiveExamOrders(value: unknown): PreventiveExamOrder[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("plan.preventiveExamOrders deve ser uma lista de opções.");
  }

  const selected = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !PREVENTIVE_EXAM_ORDER_IDS.has(item)) {
      throw new Error("plan.preventiveExamOrders contém uma opção não reconhecida.");
    }
    if (selected.has(item)) {
      throw new Error("plan.preventiveExamOrders não pode conter opções duplicadas.");
    }
    selected.add(item);
  }

  return PREVENTIVE_EXAM_ORDER_OPTIONS
    .map((option) => option.id)
    .filter((id) => selected.has(id));
}

export function normalizePreventiveExamOrders(
  value: readonly PreventiveExamOrder[] | undefined,
): PreventiveExamOrder[] | undefined {
  const parsed = parsePreventiveExamOrders(value);
  return parsed && parsed.length > 0 ? parsed : undefined;
}
