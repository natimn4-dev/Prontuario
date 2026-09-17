import type { DietaryGuidance } from "./dietary-guidance.js";

export type DietaryNutrients = {
  energyKcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG: number;
  calciumMg: number;
  sodiumMg: number;
};

export type DietaryFoodReference = {
  provider: "USDA_FDC" | "TBCA";
  sourceId: string;
  description: string;
  dataType?: string;
};

export type DietaryFoodComposition = DietaryFoodReference & {
  sourceVersion?: string;
  nutrientsPer100g: DietaryNutrients;
};

export const HOUSEHOLD_MEASURES = [
  "g",
  "ml",
  "colher-cha",
  "colher-sobremesa",
  "colher-sopa",
  "concha",
  "escumadeira",
  "xicara",
  "copo",
  "prato",
  "fatia",
  "unidade",
  "porcao",
  "file",
  "bife",
  "pedaco",
  "palma-mao",
  "file-pequeno",
  "file-medio",
  "file-grande",
] as const;

export type HouseholdMeasure = (typeof HOUSEHOLD_MEASURES)[number];

export type PortionSource =
  | "direct-grams"
  | "provider-portion"
  | "clinician-estimate";

export type DietaryQuantitySource =
  | "peso informado"
  | "medida caseira confirmada"
  | "unidade informada"
  | "estimativa visual"
  | "dado ausente";

export type DietaryUncertainty = "baixa" | "moderada" | "alta" | "desconhecida";

export type DietaryFoodDraft = {
  id: string;
  label: string;
  quantity: number;
  measure: HouseholdMeasure;
  grams: number | null;
  gramsSource: PortionSource | null;
  estimated: boolean;
  quantitySource?: DietaryQuantitySource;
  uncertainty?: DietaryUncertainty;
  quantityNote?: string;
  food: DietaryFoodReference | null;
  qualityFlags?: Array<"refined" | "ultraprocessed" | "free-sugar" | "whole-food">;
};

export type DietaryFoodItem = DietaryFoodDraft & {
  composition: DietaryFoodComposition | null;
  nutrients: DietaryNutrients | null;
};

export type DietaryMeal = { id: string; label: string; items: DietaryFoodDraft[] };
export type DietaryConfirmedMeal = Omit<DietaryMeal, "items"> & { items: DietaryFoodItem[] };

export type DietaryTargets = {
  energyKcalPerKgMin?: number | null;
  energyKcalPerKgMax?: number | null;
  proteinGPerKgMin?: number | null;
  proteinGPerKgMax?: number | null;
  proteinTargetSource?: "clinician-manual" | "reference-suggestion" | null;
  proteinTargetReference?: string | null;
  calciumMg?: number | null;
  fiberG?: number | null;
  note?: string;
};

export type DietaryAssessmentStatus = "DRAFT" | "IN_REVIEW" | "FINALIZED";

export type DietaryClinicalContext = {
  ageYears?: number | null;
  sex?: string | null;
  weightKg?: number | null;
  weightSource?: "program55" | "clinician" | null;
  ckd?: boolean;
  renalEgfrMlMinPer1_73?: number | null;
  renalDialysis?: boolean;
  renalDialysisModality?: "hemodialysis" | "peritoneal" | "other" | null;
  renalVeryLowProteinDiet?: boolean;
  renalVeryLowProteinDietConfirmed?: boolean;
  diabetes?: boolean;
  sarcopenia?: boolean;
  frailty?: boolean;
  malnutrition?: boolean;
  involuntaryWeightLoss?: boolean;
  acuteIllness?: boolean;
  cancer?: boolean;
  dementia?: boolean;
  dysphagia?: boolean;
  renalPotassiumMmolL?: number | null;
  renalPhosphorusMgDl?: number | null;
  serumBicarbonateMmolL?: number | null;
  appetiteReduced?: boolean;
  reducedIntake?: boolean;
  hydrationMl?: number | null;
  edema?: boolean;
  heartFailure?: boolean;
  reducedUrineOutput?: boolean;
  hyponatremia?: boolean;
  allergies?: string[];
  intolerances?: string[];
  dietaryRestrictions?: string[];
};

export type DietaryRenalProteinReference = {
  code: "missing-egfr" | "g1-g2" | "g3a" | "g3b" | "g4-g5" | "g4-g5-vlpd" | "g5d";
  label: string;
  proteinGPerKgMin: number | null;
  proteinGPerKgMax: number | null;
  note: string;
};

export type DietaryAssessmentInput = {
  schemaVersion: "dietary-assessment-v1";
  meals: DietaryMeal[];
  targets: DietaryTargets;
  clinicalContext: DietaryClinicalContext;
  orientationDraft?: string;
  orientationReviewed?: boolean;
  includeInReport?: boolean;
  includeInSoap?: boolean;
};

export type DietarySummary = DietaryNutrients & {
  energyKcalPerKg: number | null;
  proteinGPerKg: number | null;
  carbohydrateEnergyPercent: number | null;
  incompleteItems: number;
};

export type DietaryPriority = {
  code: "energy" | "protein" | "calcium" | "fiber" | "carbohydrate-quality";
  title: string;
  rationale: string;
};

export type DietaryRuleTrace = {
  rule: string;
  reference: string;
  version: string;
  condition: string;
  result: string;
};

export type DietaryProteinComparison = {
  weightKg: number | null;
  weightSource: DietaryClinicalContext["weightSource"];
  targetGPerKgMin: number | null;
  targetGPerKgMax: number | null;
  targetTotalGMin: number | null;
  targetTotalGMax: number | null;
  targetSource: DietaryTargets["proteinTargetSource"];
  targetReference: string | null;
  intakeG: number;
  intakeGPerKg: number | null;
  differenceToMinG: number | null;
  differenceToMaxG: number | null;
};

export type DietaryAssessmentSnapshot = {
  schemaVersion: "dietary-assessment-v1";
  meals: DietaryConfirmedMeal[];
  targets: DietaryTargets;
  clinicalContext: DietaryClinicalContext;
  summary: DietarySummary;
  proteinByMeal: Array<{ mealId: string; label: string; proteinG: number }>;
  proteinComparison?: DietaryProteinComparison;
  priorities: DietaryPriority[];
  generatedOrientation: string;
  orientationDraft: string;
  orientationReviewed: boolean;
  includeInReport: boolean;
  includeInSoap: boolean;
  confirmedBy: { userId: string; name: string };
  confirmedAt: string;
  updatedAt: string;
  ruleTrace: DietaryRuleTrace[];
  assessmentStatus?: DietaryAssessmentStatus;
  conditionalGuidance?: DietaryGuidance[];
};

/**
 * Snapshots anteriores à camada de orientação condicional permanecem válidos,
 * mas precisam de revisão explícita antes de serem tratados como atuais.
 * A função é deliberadamente conservadora: dados incompletos nunca são
 * promovidos silenciosamente para uma versão nova.
 */
export function dietarySnapshotNeedsRuleReview(snapshot: DietaryAssessmentSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  return snapshot.assessmentStatus == null || !Array.isArray(snapshot.conditionalGuidance);
}

export const DIETARY_CLINICAL_REFERENCES = [
  {
    id: "KDOQI-2020",
    citation: "KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update",
    version: "2020",
    url: "https://pubmed.ncbi.nlm.nih.gov/32829751/",
  },
  {
    id: "ESPEN-GERIATRICS-2022",
    citation: "ESPEN practical guideline: Clinical nutrition and hydration in geriatrics",
    version: "2022",
    url: "https://pubmed.ncbi.nlm.nih.gov/35306388/",
  },
  {
    id: "MALMO-DIETARY-METHODS-1993",
    citation: "Dietary assessment methods evaluated in the Malmö food study",
    version: "1993",
    url: "https://pubmed.ncbi.nlm.nih.gov/8429287/",
  },
  {
    id: "EATWELLQ8-2021",
    citation: "Web-Based Dietary Intake Estimation: validation study with portion-size images",
    version: "2021",
    url: "https://pubmed.ncbi.nlm.nih.gov/33650974/",
  },
  {
    id: "DEDIPAC-PORTION-STANDARDIZATION-2018",
    citation: "Systematic review highlighting standardization of portion-size estimation and food-composition sources",
    version: "2018",
    url: "https://pubmed.ncbi.nlm.nih.gov/32153884/",
  },
  {
    id: "BRASPEN-SBN-ASBRAN-RENAL-2021",
    citation: "Diretriz BRASPEN de Terapia Nutricional no Paciente com Doença Renal",
    version: "2021",
    url: "https://www.asbran.org.br/storage/downloads/files/2021/07/diretriz-de-terapia-nutricional-no-paciente-com-doenca-renal.pdf",
  },
  {
    id: "KDIGO-CKD-2024",
    citation: "KDIGO 2024 CKD Guideline Executive Summary",
    version: "2024",
    url: "https://kdigo.org/wp-content/uploads/2017/02/KDIGO-2024-CKD-Guideline-Executive-Summary.pdf",
  },
  {
    id: "KDIGO-CKD-2024-PUBMED",
    citation: "KDIGO 2024 Clinical Practice Guideline for Evaluation and Management of CKD",
    version: "2024",
    url: "https://pubmed.ncbi.nlm.nih.gov/38519239/",
  },
  {
    id: "CKD-DIETARY-POTASSIUM-2020",
    citation: "Dietary Potassium and Risk of CKD Progression",
    version: "2020",
    url: "https://pubmed.ncbi.nlm.nih.gov/32191264/",
  },
  {
    id: "CKD-POTASSIUM-RESTRICTION-2019",
    citation: "Dietary Potassium Restriction in CKD",
    version: "2019",
    url: "https://pubmed.ncbi.nlm.nih.gov/31734057/",
  },
  {
    id: "CKD-PHOSPHORUS-SOURCES-2010",
    citation: "Dietary Phosphorus and CKD: Organic, Inorganic, and Additive Sources",
    version: "2010",
    url: "https://pubmed.ncbi.nlm.nih.gov/20404416/",
  },
  {
    id: "CKD-PROTEIN-PHOSPHORUS-2021",
    citation: "Dietary Protein Source and Phosphorus in CKD",
    version: "2021",
    url: "https://pubmed.ncbi.nlm.nih.gov/34113962/",
  },
  {
    id: "MEDITERRANEAN-DASH-2020",
    citation: "Mediterranean and DASH Dietary Patterns in CKD",
    version: "2020",
    url: "https://pubmed.ncbi.nlm.nih.gov/32671570/",
  },
] as const;

export const DEFAULT_MEALS: DietaryMeal[] = [
  { id: "breakfast", label: "Café da manhã", items: [] },
  { id: "morning-snack", label: "Lanche da manhã", items: [] },
  { id: "lunch", label: "Almoço", items: [] },
  { id: "afternoon-snack", label: "Lanche da tarde", items: [] },
  { id: "dinner", label: "Jantar", items: [] },
  { id: "supper", label: "Ceia", items: [] },
];

export const ZERO_NUTRIENTS: DietaryNutrients = {
  energyKcal: 0,
  proteinG: 0,
  carbohydratesG: 0,
  fatG: 0,
  fiberG: 0,
  calciumMg: 0,
  sodiumMg: 0,
};

const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const nonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const nutritionRisk = (context: DietaryClinicalContext) =>
  Boolean(
    context.frailty ||
    context.sarcopenia ||
    context.malnutrition ||
    context.involuntaryWeightLoss ||
    context.acuteIllness,
  );

export function portionMetadata(
  measure: HouseholdMeasure,
  grams: number | null,
): {
  quantitySource: DietaryQuantitySource;
  uncertainty: DietaryUncertainty;
  estimated: boolean;
  gramsSource: PortionSource | null;
} {
  if (measure === "g") {
    return {
      quantitySource: "peso informado",
      uncertainty: "baixa",
      estimated: false,
      gramsSource: "direct-grams",
    };
  }

  if (measure === "palma-mao") {
    return {
      quantitySource: "estimativa visual",
      uncertainty: "alta",
      estimated: true,
      gramsSource: grams != null ? "clinician-estimate" : null,
    };
  }

  if (["unidade", "file", "bife", "pedaco", "file-pequeno", "file-medio", "file-grande"].includes(measure)) {
    return {
      quantitySource: "unidade informada",
      uncertainty: grams != null ? "moderada" : "alta",
      estimated: true,
      gramsSource: grams != null ? "clinician-estimate" : null,
    };
  }

  return {
    quantitySource: "medida caseira confirmada",
    uncertainty: grams != null ? "moderada" : "alta",
    estimated: true,
    gramsSource: grams != null ? "clinician-estimate" : null,
  };
}

export function validateDietaryInput(input: DietaryAssessmentInput): string[] {
  const errors: string[] = [];

  if (input.schemaVersion !== "dietary-assessment-v1") errors.push("Versão inválida.");
  if (!input.meals?.length) errors.push("Registre ao menos uma refeição.");
  if (input.meals.length > 12) errors.push("Máximo de 12 refeições.");

  const ids = new Set<string>();
  for (const meal of input.meals) {
    if (!meal.id || !meal.label.trim()) errors.push("Refeição sem identificação.");
    if (meal.items.length > 40) errors.push(`Há alimentos demais em ${meal.label}.`);

    for (const item of meal.items) {
      if (ids.has(item.id)) errors.push("Há itens duplicados.");
      ids.add(item.id);

      if (!positive(item.quantity)) errors.push(`Quantidade inválida para ${item.label || "alimento"}.`);
      if (item.grams !== null && !positive(item.grams)) errors.push(`Peso inválido para ${item.label || "alimento"}.`);
      if (item.measure === "g" && item.grams !== null && Math.abs(item.grams - item.quantity) > 0.001) {
        errors.push(`Quantidade e peso devem coincidir em gramas para ${item.label || "alimento"}.`);
      }
    }
  }

  const targetNumbers = [
    input.targets.energyKcalPerKgMin,
    input.targets.energyKcalPerKgMax,
    input.targets.proteinGPerKgMin,
    input.targets.proteinGPerKgMax,
    input.targets.calciumMg,
    input.targets.fiberG,
  ];
  if (targetNumbers.some((value) => value != null && !positive(value))) {
    errors.push("Metas clínicas devem ser positivas.");
  }
  if (
    input.targets.energyKcalPerKgMin != null &&
    input.targets.energyKcalPerKgMax != null &&
    input.targets.energyKcalPerKgMin > input.targets.energyKcalPerKgMax
  ) {
    errors.push("Faixa de energia inválida.");
  }
  if (
    input.targets.proteinGPerKgMin != null &&
    input.targets.proteinGPerKgMax != null &&
    input.targets.proteinGPerKgMin > input.targets.proteinGPerKgMax
  ) {
    errors.push("Faixa de proteína inválida.");
  }

  const context = input.clinicalContext;
  if (context.weightKg != null && !positive(context.weightKg)) errors.push("Peso deve ser positivo.");
  if (context.renalEgfrMlMinPer1_73 != null && !nonNegative(context.renalEgfrMlMinPer1_73)) {
    errors.push("TFG deve ser zero ou positiva.");
  }

  if (context.renalDialysis && !context.renalDialysisModality) {
    errors.push("Pessoa em diálise: confirme a modalidade antes de definir a meta proteica.");
  }
  if (!context.renalDialysis && context.renalDialysisModality) {
    errors.push("Modalidade de diálise só deve ser registrada quando a pessoa estiver em diálise.");
  }

  if (
    context.renalVeryLowProteinDiet &&
    (!context.ckd ||
      context.renalDialysis ||
      context.renalEgfrMlMinPer1_73 == null ||
      context.renalEgfrMlMinPer1_73 >= 30)
  ) {
    errors.push("Dieta muito baixa em proteína só pode ser registrada para DRC sem diálise e TFG menor que 30.");
  }
  if (context.renalVeryLowProteinDiet && !context.renalVeryLowProteinDietConfirmed) {
    errors.push("Confirme explicitamente a decisão clínica antes de registrar dieta muito baixa em proteína.");
  }

  return errors;
}

export function nutrientAmount(per100g: number, grams: number) {
  return nonNegative(per100g) && positive(grams) ? per100g * grams / 100 : 0;
}

export function nutrientsForGrams(
  nutrients: DietaryNutrients,
  grams: number,
): DietaryNutrients {
  return {
    energyKcal: nutrientAmount(nutrients.energyKcal, grams),
    proteinG: nutrientAmount(nutrients.proteinG, grams),
    carbohydratesG: nutrientAmount(nutrients.carbohydratesG, grams),
    fatG: nutrientAmount(nutrients.fatG, grams),
    fiberG: nutrientAmount(nutrients.fiberG, grams),
    calciumMg: nutrientAmount(nutrients.calciumMg, grams),
    sodiumMg: nutrientAmount(nutrients.sodiumMg, grams),
  };
}

const add = (a: DietaryNutrients, b: DietaryNutrients): DietaryNutrients => ({
  energyKcal: a.energyKcal + b.energyKcal,
  proteinG: a.proteinG + b.proteinG,
  carbohydratesG: a.carbohydratesG + b.carbohydratesG,
  fatG: a.fatG + b.fatG,
  fiberG: a.fiberG + b.fiberG,
  calciumMg: a.calciumMg + b.calciumMg,
  sodiumMg: a.sodiumMg + b.sodiumMg,
});

export function summarizeDietaryAssessment(
  meals: DietaryConfirmedMeal[],
  weightKg?: number | null,
) {
  let total = { ...ZERO_NUTRIENTS };
  let incompleteItems = 0;

  const proteinByMeal = meals.map((meal) => {
    let proteinG = 0;
    for (const item of meal.items) {
      if (!item.nutrients) {
        incompleteItems++;
        continue;
      }
      total = add(total, item.nutrients);
      proteinG += item.nutrients.proteinG;
    }
    return { mealId: meal.id, label: meal.label, proteinG };
  });

  const weight = positive(weightKg) ? weightKg : null;
  return {
    summary: {
      ...total,
      energyKcalPerKg: weight ? total.energyKcal / weight : null,
      proteinGPerKg: weight ? total.proteinG / weight : null,
      carbohydrateEnergyPercent: total.energyKcal > 0
        ? total.carbohydratesG * 4 * 100 / total.energyKcal
        : null,
      incompleteItems,
    },
    proteinByMeal,
  };
}

export function calciumReferenceMg(age?: number | null, sex?: string | null) {
  if (!nonNegative(age)) return null;
  const normalizedSex = (sex ?? "").toLowerCase();
  const female = normalizedSex.startsWith("f") || normalizedSex.includes("mulher");
  if (age > 70) return 1200;
  if (age >= 51) return female ? 1200 : 1000;
  if (age >= 19) return 1000;
  return null;
}

export function fiberReferenceG(age?: number | null, sex?: string | null) {
  if (!nonNegative(age) || age < 51) return null;
  const normalizedSex = (sex ?? "").toLowerCase();
  if (normalizedSex.startsWith("f") || normalizedSex.includes("mulher")) return 21;
  if (normalizedSex.startsWith("m") || normalizedSex.includes("homem")) return 30;
  return null;
}

export function renalProteinReference(
  context: DietaryClinicalContext,
): DietaryRenalProteinReference | null {
  if (!context.ckd) return null;

  if (context.renalDialysis) {
    if (!context.renalDialysisModality) {
      return {
        code: "g5d",
        label: "Pessoa em diálise — modalidade não confirmada",
        proteinGPerKgMin: null,
        proteinGPerKgMax: null,
        note: "Pessoa em diálise: confirme modalidade, peso de referência, perdas e estado nutricional antes de definir a meta proteica.",
      };
    }
    return {
      code: "g5d",
      label: "DRC G5D — em diálise",
      proteinGPerKgMin: 1.2,
      proteinGPerKgMax: 1.5,
      note: "Referência inicial para pessoa idosa em diálise: 1,2–1,5 g/kg/dia. Individualizar conforme modalidade, perdas e estado nutricional.",
    };
  }

  const egfr = context.renalEgfrMlMinPer1_73;
  if (egfr == null) {
    return {
      code: "missing-egfr",
      label: "DRC sem TFG registrada",
      proteinGPerKgMin: null,
      proteinGPerKgMax: null,
      note: "TFG não informada. Não é possível sugerir uma meta renal específica. Registre a TFG ou defina manualmente a meta proteica.",
    };
  }

  const riskSuffix = nutritionRisk(context)
    ? " Há fragilidade, sarcopenia, desnutrição, perda de peso involuntária ou doença aguda: não reduza proteína automaticamente; individualize a meta."
    : "";

  if (egfr >= 60) {
    return {
      code: "g1-g2",
      label: "DRC G1–G2 — TFG ≥60 mL/min/1,73 m²",
      proteinGPerKgMin: null,
      proteinGPerKgMax: null,
      note: `Não aplicar automaticamente restrição proteica por DRC; individualizar conforme risco de progressão e estado nutricional.${riskSuffix}`,
    };
  }

  if (egfr >= 45) {
    return {
      code: "g3a",
      label: "DRC G3a — TFG 45–59 mL/min/1,73 m²",
      proteinGPerKgMin: 0.8,
      proteinGPerKgMax: 0.8,
      note: `Referência inicial: aproximadamente 0,8 g/kg/dia, sempre sujeita a revisão clínica.${riskSuffix}`,
    };
  }

  if (egfr >= 30) {
    return {
      code: "g3b",
      label: "DRC G3b — TFG 30–44 mL/min/1,73 m²",
      proteinGPerKgMin: 0.8,
      proteinGPerKgMax: 0.8,
      note: `Referência inicial: aproximadamente 0,8 g/kg/dia, sempre sujeita a revisão clínica.${riskSuffix}`,
    };
  }

  if (context.renalVeryLowProteinDiet && context.renalVeryLowProteinDietConfirmed) {
    return {
      code: "g4-g5-vlpd",
      label: "DRC G4–G5 sem diálise — dieta muito baixa em proteína confirmada",
      proteinGPerKgMin: 0.3,
      proteinGPerKgMax: 0.4,
      note: "Somente para casos selecionados, com supervisão nefrológica e nutricional rigorosa e, quando aplicável, cetoanálogos ou aminoácidos essenciais.",
    };
  }

  return {
    code: "g4-g5",
    label: "DRC G4–G5 sem diálise — TFG <30 mL/min/1,73 m²",
    proteinGPerKgMin: 0.6,
    proteinGPerKgMax: 0.8,
    note: `Referência inicial: 0,6–0,8 g/kg/dia. Não aplicar a faixa mais baixa automaticamente em pessoa idosa com risco nutricional.${riskSuffix}`,
  };
}

const bound = (a?: number | null, b?: number | null) =>
  positive(a) ? a : positive(b) ? b : null;

export function buildProteinComparison(
  summary: DietarySummary,
  targets: DietaryTargets,
  context: DietaryClinicalContext,
): DietaryProteinComparison {
  const weight = positive(context.weightKg) ? context.weightKg : null;
  const min = positive(targets.proteinGPerKgMin) ? targets.proteinGPerKgMin : null;
  const max = positive(targets.proteinGPerKgMax) ? targets.proteinGPerKgMax : null;
  const targetTotalGMin = weight && min ? weight * min : null;
  const targetTotalGMax = weight && max ? weight * max : null;

  return {
    weightKg: weight,
    weightSource: context.weightSource ?? null,
    targetGPerKgMin: min,
    targetGPerKgMax: max,
    targetTotalGMin,
    targetTotalGMax,
    targetSource: targets.proteinTargetSource ?? null,
    targetReference: targets.proteinTargetReference ?? null,
    intakeG: summary.proteinG,
    intakeGPerKg: summary.proteinGPerKg,
    differenceToMinG: targetTotalGMin == null ? null : summary.proteinG - targetTotalGMin,
    differenceToMaxG: targetTotalGMax == null ? null : summary.proteinG - targetTotalGMax,
  };
}

export function buildDietaryPriorities(x: {
  summary: DietarySummary;
  proteinByMeal: Array<{ mealId: string; label: string; proteinG: number }>;
  targets: DietaryTargets;
  context: DietaryClinicalContext;
  meals: DietaryConfirmedMeal[];
}): DietaryPriority[] {
  const priorities: DietaryPriority[] = [];

  const energyTarget = bound(x.targets.energyKcalPerKgMin, x.targets.energyKcalPerKgMax);
  if (
    energyTarget &&
    x.summary.energyKcalPerKg != null &&
    x.summary.energyKcalPerKg < energyTarget
  ) {
    priorities.push({
      code: "energy",
      title: "Rever adequação energética",
      rationale: "A estimativa por quilo ficou abaixo da meta clínica definida.",
    });
  }

  const proteinTarget = bound(x.targets.proteinGPerKgMin, x.targets.proteinGPerKgMax);
  if (
    proteinTarget &&
    x.summary.proteinGPerKg != null &&
    x.summary.proteinGPerKg < proteinTarget
  ) {
    priorities.push({
      code: "protein",
      title: x.context.ckd
        ? "Revisar meta proteica no contexto renal"
        : "Revisar ingestão proteica",
      rationale: "A ingestão proteica estimada ficou abaixo da meta registrada. Revise a qualidade do relato, as porções confirmadas, o peso utilizado e o contexto clínico antes de orientar aumento de proteína.",
    });
  }

  const calciumTarget = x.targets.calciumMg ?? calciumReferenceMg(x.context.ageYears, x.context.sex);
  if (calciumTarget && x.summary.calciumMg < calciumTarget) {
    priorities.push({
      code: "calcium",
      title: "Revisar ingestão de cálcio",
      rationale: "A ingestão estimada ficou abaixo da referência selecionada. A escolha de fontes alimentares depende do contexto clínico e não implica suplementação automática.",
    });
  }

  const fiberTarget = x.targets.fiberG ?? fiberReferenceG(x.context.ageYears, x.context.sex);
  if (fiberTarget && x.summary.fiberG < fiberTarget) {
    priorities.push({
      code: "fiber",
      title: "Revisar ingestão de fibras",
      rationale: "A ingestão estimada ficou abaixo da referência selecionada.",
    });
  }

  const flags = x.meals.flatMap((meal) =>
    meal.items.flatMap((item) => item.qualityFlags ?? []),
  );
  if (flags.some((flag) => flag === "refined" || flag === "ultraprocessed" || flag === "free-sugar")) {
    priorities.push({
      code: "carbohydrate-quality",
      title: "Melhorar a qualidade das fontes de carboidrato",
      rationale: "Foram marcadas fontes refinadas, ultraprocessadas ou com açúcares livres; priorize qualidade e fibras, não apenas quantidade.",
    });
  }

  return priorities.slice(0, 5);
}

export function buildDietaryOrientation(x: {
  priorities: DietaryPriority[];
  context: DietaryClinicalContext;
  meals: DietaryConfirmedMeal[];
  summary?: DietarySummary;
}) {
  const keep: string[] = [];
  const improve: string[] = [];
  const confirm: string[] = [];
  const decide: string[] = [];

  const confirmedItems = x.meals.flatMap((meal) => meal.items).filter((item) => item.nutrients);
  const estimatedItems = x.meals.flatMap((meal) => meal.items).filter((item) => item.estimated);

  if (confirmedItems.length) {
    keep.push("Manter os alimentos e porções que já foram confirmados no relato, respeitando preferências, tolerância e plano clínico.");
  } else {
    keep.push("Nenhum item possui quantidade suficiente para uma orientação automática de manutenção.");
  }

  for (const priority of x.priorities) {
    if (priority.code === "protein") {
      improve.push("A ingestão proteica estimada ficou abaixo da meta registrada. Revise a qualidade do relato, as porções confirmadas, o peso utilizado e o contexto clínico antes de orientar aumento de proteína.");
    }
    if (priority.code === "calcium") {
      improve.push("A ingestão estimada de cálcio ficou abaixo da referência. Considere revisar leite, iogurte, queijo, alimentos fortificados, tofu com cálcio ou sardinha com espinha, respeitando função renal, fósforo, cálcio sérico, tolerância e preferências.");
    }
    if (priority.code === "fiber") {
      improve.push("A ingestão estimada de fibras ficou abaixo da referência. Revise frutas, verduras, legumes, feijões, aveia e cereais integrais conforme tolerância e segurança de deglutição.");
    }
    if (priority.code === "carbohydrate-quality") {
      improve.push("Revise a distribuição e a qualidade dos carboidratos, priorizando alimentos menos refinados e fontes de fibras. Não reduzir carboidratos automaticamente apenas porque a quantidade total está elevada.");
    }
    if (priority.code === "energy") {
      improve.push("A ingestão energética estimada ficou abaixo da meta registrada. Revise aceitação, sintomas limitantes e a qualidade do relato antes de propor aumento da densidade energética.");
    }
  }

  if ((x.summary?.incompleteItems ?? 0) > 0 || estimatedItems.length > 0) {
    confirm.push("A estimativa está limitada por informações incompletas sobre quantidade, preparo ou porção. Confirme os itens principais antes de interpretar o resultado clinicamente.");
  } else {
    confirm.push("As quantidades principais utilizadas no cálculo estão registradas; ainda assim, o recordatório é autorreferido e sujeito a erro de memória e estimativa de porções.");
  }

  if (x.context.ckd) {
    decide.push("A meta de proteína no contexto de DRC exige decisão médica ou nutricional individualizada. Não aplicar aumento ou restrição automaticamente a partir da calculadora.");
    decide.push("Fontes de cálcio devem ser escolhidas conforme função renal, fósforo, cálcio sérico, tolerância e plano nutricional.");
  } else {
    decide.push("Metas, restrições, suplementação e orientação final exigem revisão médica ou nutricional antes de uso no SOAP ou no relatório.");
  }

  if (nutritionRisk(x.context)) {
    decide.push("Fragilidade, sarcopenia, desnutrição, perda de peso involuntária ou doença aguda impedem redução proteica automática e exigem individualização.");
  }

  return [
    "O que manter",
    ...keep.map((item) => `- ${item}`),
    "",
    "O que melhorar",
    ...(improve.length ? improve : ["Nenhuma mudança automática foi proposta a partir das metas registradas."]).map((item) => `- ${item}`),
    "",
    "O que precisa ser confirmado",
    ...confirm.map((item) => `- ${item}`),
    "",
    "O que exige decisão médica ou nutricional",
    ...decide.map((item) => `- ${item}`),
  ].join("\n");
}

const measures: Array<{ re: RegExp; m: HouseholdMeasure }> = [
  { re: /\bcolher(?:es)?\s+de\s+chá\b/i, m: "colher-cha" },
  { re: /\bcolher(?:es)?\s+de\s+sobremesa\b/i, m: "colher-sobremesa" },
  { re: /\bcolher(?:es)?(?:\s+de)?\s+sopa\b/i, m: "colher-sopa" },
  { re: /\bconcha(?:s)?\b/i, m: "concha" },
  { re: /\bescumadeira(?:s)?\b/i, m: "escumadeira" },
  { re: /\bxícara(?:s)?\b/i, m: "xicara" },
  { re: /\bcopo(?:s)?\b/i, m: "copo" },
  { re: /\bfatia(?:s)?\b/i, m: "fatia" },
  { re: /\bunidade(?:s)?\b/i, m: "unidade" },
  { re: /\bfilé(?:s)?\b/i, m: "file" },
  { re: /\bbife(?:s)?\b/i, m: "bife" },
  { re: /\bpedaço(?:s)?\b/i, m: "pedaco" },
  { re: /\b(?:palmo|palma\s+da\s+mão|palma\s+da\s+mao)\b/i, m: "palma-mao" },
  { re: /\b\d+(?:[.,]\d+)?\s*g\b/i, m: "g" },
  { re: /\b\d+(?:[.,]\d+)?\s*ml\b/i, m: "ml" },
];

const words: Record<string, number> = {
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  três: 3,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
};

export type ParsedDietaryPhrase = {
  raw: string;
  quantity: number | null;
  measure: HouseholdMeasure | null;
  foodQuery: string;
  estimated: boolean;
  issue: string | null;
};

export function parseDietaryNaturalLanguage(text: string): ParsedDietaryPhrase[] {
  return text
    .split(/\s*(?:,|;|\be\b)\s*/i)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((raw) => {
      const numberMatch = raw.match(/\b(\d+(?:[.,]\d+)?)\b/);
      const wordMatch = raw.toLowerCase().match(/\b(um|uma|dois|duas|três|tres|quatro|cinco|seis)\b/);
      const quantity = numberMatch
        ? Number(numberMatch[1].replace(",", "."))
        : wordMatch
          ? words[wordMatch[1]]
          : null;

      const lower = raw.toLowerCase();
      const omelet = /\bomelete\b/i.test(raw);
      const egg = /\bovos?\b/i.test(raw);
      const found = measures.find((item) => item.re.test(raw));

      let measure = found?.m ?? null;
      let issue: string | null = null;
      let estimated = measure === "palma-mao";

      if (egg && !omelet && measure == null) {
        if (quantity == null) {
          issue = "Ovo: informe quantas unidades foram consumidas. Exemplo: 1 ovo = 1 unidade média; 2 ovos = 2 unidades médias.";
        } else {
          measure = "unidade";
        }
      }

      if (omelet) {
        measure = null;
        issue = "Omelete: informe quantos ovos foram usados e quantas pessoas consumiram a preparação. Não inferir o número de ovos pelo tamanho.";
      }

      if (measure === "palma-mao") {
        issue = "Estimativa — confirmar quantidade. A palma da mão, sem os dedos, é apenas referência visual e varia com mão, espessura e preparo.";
        estimated = true;
      }

      if ((measure === "file" || measure === "bife" || measure === "pedaco") && quantity == null) {
        issue = "Dados insuficientes: informe o número de unidades e confirme o peso quando possível.";
      }

      if (/\bfrango\b/i.test(raw) && measure === "pedaco" && !/\b(coxa|sobrecoxa|peito|asa)\b/i.test(raw)) {
        issue = "Pedaço de frango: informe se era coxa, sobrecoxa, peito ou outro corte e confirme o peso quando possível.";
      }

      let foodQuery = raw
        .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
        .replace(/\b(um|uma|dois|duas|três|tres|quatro|cinco|seis)\b/gi, " ");

      for (const item of measures) {
        if (["file", "bife", "pedaco"].includes(item.m)) continue;
        foodQuery = foodQuery.replace(item.re, " ");
      }

      foodQuery = foodQuery
        .replace(/\b(de|do|da)\b/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (!foodQuery && lower) {
        foodQuery = lower
          .replace(/\b\d+(?:[.,]\d+)?\b/g, " ")
          .replace(/\b(um|uma|dois|duas|três|tres|quatro|cinco|seis)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      return { raw, quantity, measure, foodQuery, estimated, issue };
    });
}

export function roundForDisplay(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
