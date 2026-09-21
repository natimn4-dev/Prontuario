import type { DietaryClinicalContext, DietaryNutrients } from "./dietary-assessment.js";

export type DietaryPortionDefinition = {
  id: "eggs" | "meat-fish-poultry" | "milk" | "yogurt" | "cheese";
  label: string;
  description: string;
  examples: string[];
};

export const DIETARY_PORTION_DEFINITIONS: readonly DietaryPortionDefinition[] = [
  { id: "eggs", label: "Ovos", description: "1 porção = 3 ovos inteiros", examples: ["3 ovos"] },
  { id: "meat-fish-poultry", label: "Carne, frango ou peixe", description: "porção aproximada do tamanho da palma da mão; confirmar peso quando possível", examples: ["1 filé", "1 bife", "1 pedaço"] },
  { id: "milk", label: "Leite", description: "1 porção = 1 copo", examples: ["1 copo"] },
  { id: "yogurt", label: "Iogurte", description: "1 porção = 1 unidade", examples: ["1 unidade"] },
  { id: "cheese", label: "Queijo", description: "1 porção = 2 fatias", examples: ["2 fatias"] },
] as const;

export type DietaryGuidance = {
  code: "protein" | "potassium" | "phosphorus" | "calcium" | "produce" | "sodium" | "fluids";
  title: string;
  text: string;
  severity: "info" | "attention" | "review";
  evidenceRefs: string[];
};

type GuidanceInput = {
  context: DietaryClinicalContext;
  items: Array<{
    label: string;
    qualityFlags?: string[];
    nutrients?: Pick<DietaryNutrients, "proteinG" | "calciumMg"> | null;
  }>;
  summary: Pick<DietaryNutrients, "proteinG" | "calciumMg" | "sodiumMg">;
};

const hasAny = (labels: string[], patterns: RegExp[]) => labels.some((label) => patterns.some((pattern) => pattern.test(label)));

const formatAmount = (value: number, digits: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);

function contributors(
  items: GuidanceInput["items"],
  nutrient: "proteinG" | "calciumMg",
  unit: "g" | "mg",
) {
  return items
    .map((item) => ({ label: item.label, amount: item.nutrients?.[nutrient] ?? 0 }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((item) => `${item.label} (${formatAmount(item.amount, unit === "g" ? 1 : 0)} ${unit})`)
    .join(", ");
}

export function buildConditionalDietaryGuidance(input: GuidanceInput): DietaryGuidance[] {
  const labels = input.items.map((item) => item.label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase());
  const flags = input.items.flatMap((item) => item.qualityFlags ?? []);
  const guidance: DietaryGuidance[] = [];
  const proteinSources = contributors(input.items, "proteinG", "g");
  const calciumSources = contributors(input.items, "calciumMg", "mg");

  if (input.context.ckd && input.context.renalDialysis) {
    guidance.push({
      code: "protein",
      title: "Proteína na diálise",
      text: "A pessoa está em diálise: use o fluxo específico e confirme modalidade, peso de referência, perdas e estado nutricional. Não aplique automaticamente a regra de DRC não dialítica.",
      severity: "review",
      evidenceRefs: ["KDOQI-2020", "KDIGO-CKD-2024"],
    });
  }

  if (input.context.ckd && input.context.renalPotassiumMmolL != null && input.context.renalPotassiumMmolL >= 5.5) {
    guidance.push({
      code: "potassium",
      title: "Potássio acima da faixa definida",
      text: "Individualize a orientação conforme potássio sérico, função renal, medicamentos, diurese e porções registradas. Não excluir automaticamente frutas, verduras ou leguminosas.",
      severity: "attention",
      evidenceRefs: ["CKD-DIETARY-POTASSIUM-2020", "CKD-POTASSIUM-RESTRICTION-2019"],
    });
  }

  if (input.context.ckd && input.context.renalPhosphorusMgDl != null && input.context.renalPhosphorusMgDl > 4.5) {
    guidance.push({
      code: "phosphorus",
      title: "Fósforo acima da faixa definida",
      text: "Verifique fontes processadas e aditivos fosfatados e individualize a seleção alimentar. Não recomendar exclusão automática de leite, derivados ou leguminosas.",
      severity: "attention",
      evidenceRefs: ["CKD-PHOSPHORUS-SOURCES-2010", "CKD-PROTEIN-PHOSPHORUS-2021"],
    });
  }

  if (proteinSources && !(input.context.ckd && input.context.renalDialysis)) {
    guidance.push({
      code: "protein",
      title: "Proteína registrada no relato",
      text: `Total estimado: ${formatAmount(input.summary.proteinG, 1)} g/dia. Principais contribuições: ${proteinSources}. Compare com peso, meta individual e contexto clínico antes de orientar aumento ou redução.`,
      severity: "info",
      evidenceRefs: ["ESPEN-GERIATRICS-2022", "KDOQI-2020"],
    });
  }

  if (calciumSources) {
    guidance.push({
      code: "calcium",
      title: "Cálcio registrado no relato",
      text: `Total estimado: ${formatAmount(input.summary.calciumMg, 0)} mg/dia. Principais contribuições: ${calciumSources}. Confirme se o relato representa o consumo habitual e não acrescente suplementação automaticamente.`,
      severity: "info",
      evidenceRefs: ["ESPEN-GERIATRICS-2022", "KDOQI-2020"],
    });
  } else if (input.summary.calciumMg > 0) {
    guidance.push({
      code: "calcium",
      title: "Cálcio calculado; fontes a confirmar",
      text: `O total estimado foi ${formatAmount(input.summary.calciumMg, 0)} mg/dia, mas o detalhamento por alimento não está disponível neste snapshot. Revise os itens antes de orientar mudanças ou suplementação.`,
      severity: "review",
      evidenceRefs: ["ESPEN-GERIATRICS-2022", "KDOQI-2020"],
    });
  } else {
    guidance.push({
      code: "calcium",
      title: "Cálcio não calculado no relato",
      text: "Nenhum item calculável contribuiu com cálcio. Confirme alimentos e quantidades antes de orientar fontes alimentares ou suplementação; nenhum suplemento é prescrito automaticamente.",
      severity: "review",
      evidenceRefs: ["ESPEN-GERIATRICS-2022", "KDOQI-2020"],
    });
  }

  if (!hasAny(labels, [/fruta/, /verdura/, /legume/, /feijao/, /lentilha/, /grao de bico/])) {
    guidance.push({
      code: "produce",
      title: "Variedade de alimentos vegetais não identificada",
      text: "Avalie aumento gradual de frutas, verduras, legumes e leguminosas, respeitando aceitação, mastigação/deglutição, potássio, medicamentos e plano nutricional. DRC isolada não determina exclusão automática.",
      severity: "info",
      evidenceRefs: ["KDIGO-CKD-2024", "MEDITERRANEAN-DASH-2020"],
    });
  }

  if (flags.some((flag) => ["ultraprocessed", "free-sugar", "refined"].includes(flag))) {
    guidance.push({
      code: "sodium",
      title: "Qualidade e sódio dos alimentos",
      text: "Priorize substituições graduais e verifique sódio e fosfatos adicionados em embutidos, enlatados, refeições prontas, salgadinhos, refrigerantes e temperos prontos. Não restringir energia ou carboidratos indiscriminadamente em risco nutricional.",
      severity: "attention",
      evidenceRefs: ["MEDITERRANEAN-DASH-2020", "CKD-PHOSPHORUS-SOURCES-2010"],
    });
  }

  if (input.context.edema || input.context.heartFailure || input.context.reducedUrineOutput || input.context.hyponatremia) {
    guidance.push({
      code: "fluids",
      title: "Hidratação exige avaliação clínica",
      text: "Não gerar recomendação hídrica automática. Relacione líquidos a edema, insuficiência cardíaca, diurese, hiponatremia e diálise, com decisão individualizada.",
      severity: "review",
      evidenceRefs: ["ESPEN-GERIATRICS-2022", "KDIGO-CKD-2024"],
    });
  }

  return guidance;
}

export function guidanceAsText(guidance: DietaryGuidance[]): string {
  if (!guidance.length) return "";
  return [
    "Orientações condicionais para revisão clínica",
    ...guidance.map((item) => `- [${item.severity}] ${item.title}: ${item.text}`),
  ].join("\n");
}
