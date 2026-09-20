import test from "node:test";
import assert from "node:assert/strict";
import {
  DIETARY_CLINICAL_REFERENCES,
  buildDietaryOrientation,
  buildDietaryPriorities,
  buildProteinComparison,
  confirmDietaryDraftItem,
  dietaryFoodSearchQuery,
  nutrientsForGrams,
  parseDietaryNaturalLanguage,
  portionMetadata,
  renalProteinReference,
  roundForDisplay,
  summarizeDietaryAssessment,
  validateDietaryInput,
  dietarySnapshotNeedsRuleReview,
  type DietaryAssessmentInput,
  type DietaryConfirmedMeal,
  type DietaryNutrients,
} from "../../src/domain/dietary-assessment.ts";
import { crossCheckDietaryEnergy, dietaryNutrientUnit } from "../../src/domain/dietary-assessment-quality.ts";

const zero: DietaryNutrients = { energyKcal: 0, proteinG: 0, carbohydratesG: 0, fatG: 0, fiberG: 0, calciumMg: 0, sodiumMg: 0 };
function meal(id: string, label: string, nutrients: DietaryNutrients): DietaryConfirmedMeal {
  return { id, label, items: [{ id: `${id}-item`, label: "Alimento sintético", quantity: 100, measure: "g", grams: 100, gramsSource: "direct-grams", estimated: false, quantitySource: "peso informado", uncertainty: "baixa", food: null, composition: null, nutrients }] };
}

test("A — duas porções do mesmo alimento totalizam 2 × uma porção", () => {
  const per100g: DietaryNutrients = { energyKcal: 120, proteinG: 8, carbohydratesG: 15, fatG: 4, fiberG: 3, calciumMg: 80, sodiumMg: 40 };
  const one = nutrientsForGrams(per100g, 75); const two = nutrientsForGrams(per100g, 150);
  for (const key of Object.keys(one) as Array<keyof DietaryNutrients>) assert.equal(two[key], one[key] * 2);
});

test("alimento selecionado vira item calculável com proteína e cálcio", () => {
  const composition = {
    provider: "USDA_FDC" as const,
    sourceId: "123",
    description: "Alimento sintético",
    nutrientsPer100g: {
      energyKcal: 100,
      proteinG: 20,
      carbohydratesG: 5,
      fatG: 2,
      fiberG: 1,
      calciumMg: 80,
      sodiumMg: 10,
    },
  };
  const item = confirmDietaryDraftItem(
    {
      id: "item",
      label: composition.description,
      quantity: 75,
      measure: "g",
      grams: 75,
      gramsSource: "direct-grams",
      estimated: false,
      food: composition,
    },
    composition,
  );
  assert.equal(item.nutrients?.proteinG, 15);
  assert.equal(item.nutrients?.calciumMg, 60);
});

test("B — checagem energética cruza fonte com 4P + 4C + 9G", () => {
  assert.equal(crossCheckDietaryEnergy({ energyKcal: 170, proteinG: 10, carbohydratesG: 20, fatG: 5.5 }).status, "consistent");
  const review = crossCheckDietaryEnergy({ energyKcal: 160, proteinG: 5, carbohydratesG: 10, fatG: 2 });
  assert.equal(review.status, "review"); assert.match(review.note, /fibra|álcool|polióis/i);
});

test("C — cálcio e sódio permanecem em mg", () => {
  assert.equal(dietaryNutrientUnit("calciumMg"), "mg"); assert.equal(dietaryNutrientUnit("sodiumMg"), "mg"); assert.equal(dietaryNutrientUnit("proteinG"), "g");
});

test("D — 60 g de proteína para 50 kg correspondem a 1,20 g/kg/d", () => {
  const { summary } = summarizeDietaryAssessment([meal("lunch", "Almoço", { ...zero, proteinG: 60, energyKcal: 600 })], 50);
  assert.equal(roundForDisplay(summary.proteinGPerKg, 2), 1.2);
});

test("E — subtotais por refeição fecham com o total diário", () => {
  const a = meal("breakfast", "Café", { ...zero, energyKcal: 350, proteinG: 20, calciumMg: 250, sodiumMg: 180 });
  const b = meal("dinner", "Jantar", { ...zero, energyKcal: 550, proteinG: 35, calciumMg: 180, sodiumMg: 320 });
  const sa = summarizeDietaryAssessment([a]).summary, sb = summarizeDietaryAssessment([b]).summary, total = summarizeDietaryAssessment([a, b]).summary;
  assert.equal(total.energyKcal, sa.energyKcal + sb.energyKcal); assert.equal(total.proteinG, sa.proteinG + sb.proteinG); assert.equal(total.calciumMg, sa.calciumMg + sb.calciumMg);
});

test("ovo explícito é unidade e não é convertido em porção de carne", () => {
  for (const [text, quantity] of [["1 ovo", 1], ["2 ovos", 2], ["3 ovos", 3]] as const) {
    const parsed = parseDietaryNaturalLanguage(text)[0];
    assert.equal(parsed.quantity, quantity); assert.equal(parsed.measure, "unidade"); assert.notEqual(parsed.measure, "palma-mao");
  }
});

test("ovo sem quantidade e omelete permanecem dados insuficientes", () => {
  const egg = parseDietaryNaturalLanguage("comi ovo")[0]; assert.equal(egg.quantity, null); assert.match(egg.issue ?? "", /informe quantas unidades/i);
  const omelet = parseDietaryNaturalLanguage("omelete")[0]; assert.equal(omelet.measure, null); assert.match(omelet.issue ?? "", /quantos ovos.*quantas pessoas/i);
});

test("fallback USDA adapta somente equivalências explícitas em português", () => {
  assert.equal(dietaryFoodSearchQuery("ovo"), "egg whole");
  assert.equal(dietaryFoodSearchQuery("  OVO COZIDO  "), "egg whole cooked");
  assert.equal(dietaryFoodSearchQuery("arroz cozido"), "rice cooked");
  assert.equal(dietaryFoodSearchQuery("frango"), "chicken");
  assert.equal(dietaryFoodSearchQuery("alimento não mapeado"), "alimento não mapeado");
});

test("palma da mão é estimativa visual de alta incerteza, nunca peso exato", () => {
  const parsed = parseDietaryNaturalLanguage("1 porção do tamanho da palma da mão de peixe")[0];
  assert.equal(parsed.measure, "palma-mao"); assert.equal(parsed.estimated, true); assert.match(parsed.issue ?? "", /Estimativa — confirmar quantidade/i);
  assert.deepEqual(portionMetadata("palma-mao", null), { quantitySource: "estimativa visual", uncertainty: "alta", estimated: true, gramsSource: null });
});

test("medida caseira sem gramas não é transformada silenciosamente em peso", () => {
  const metadata = portionMetadata("colher-sopa", null); assert.equal(metadata.gramsSource, null); assert.equal(metadata.uncertainty, "alta");
});

test("referência renal é estratificada e protege risco nutricional", () => {
  const g3a = renalProteinReference({ ckd: true, renalEgfrMlMinPer1_73: 52 }); assert.equal(g3a?.code, "g3a"); assert.equal(g3a?.proteinGPerKgMin, 0.8);
  const g3b = renalProteinReference({ ckd: true, renalEgfrMlMinPer1_73: 35 }); assert.equal(g3b?.code, "g3b");
  const g45 = renalProteinReference({ ckd: true, renalEgfrMlMinPer1_73: 22, sarcopenia: true }); assert.equal(g45?.proteinGPerKgMin, 0.6); assert.match(g45?.note ?? "", /não reduza proteína automaticamente|Não aplicar a faixa mais baixa automaticamente/i);
  const missing = renalProteinReference({ ckd: true }); assert.match(missing?.note ?? "", /TFG não informada.*Não é possível sugerir uma meta renal específica/i);
  const dialysisMissing = renalProteinReference({ ckd: true, renalDialysis: true }); assert.equal(dialysisMissing?.proteinGPerKgMin, null); assert.match(dialysisMissing?.note ?? "", /confirme modalidade, peso de referência, perdas e estado nutricional/i);
  const dialysis = renalProteinReference({ ckd: true, renalDialysis: true, renalDialysisModality: "hemodialysis" }); assert.equal(dialysis?.proteinGPerKgMin, 1.2); assert.equal(dialysis?.proteinGPerKgMax, 1.5);
});

test("dieta muito baixa exige critérios e confirmação explícita", () => {
  const base: DietaryAssessmentInput = { schemaVersion: "dietary-assessment-v1", meals: [meal("lunch", "Almoço", zero)], targets: {}, clinicalContext: { ckd: true, renalEgfrMlMinPer1_73: 22, renalVeryLowProteinDiet: true } };
  assert.match(validateDietaryInput(base).join(" "), /Confirme explicitamente/);
  const confirmed = { ...base, clinicalContext: { ...base.clinicalContext, renalVeryLowProteinDietConfirmed: true } };
  assert.equal(validateDietaryInput(confirmed).length, 0); assert.equal(renalProteinReference(confirmed.clinicalContext)?.code, "g4-g5-vlpd");
});

test("cálculo por peso explicita faixa diária e diferença", () => {
  const summary = { ...zero, proteinG: 40, energyKcalPerKg: null, proteinGPerKg: 40 / 60, carbohydrateEnergyPercent: null, incompleteItems: 0 };
  const comparison = buildProteinComparison(summary, { proteinGPerKgMin: 0.6, proteinGPerKgMax: 0.8, proteinTargetSource: "reference-suggestion" }, { weightKg: 60, weightSource: "clinician" });
  assert.equal(comparison.targetTotalGMin, 36); assert.equal(comparison.targetTotalGMax, 48); assert.equal(comparison.differenceToMinG, 4); assert.equal(comparison.differenceToMaxG, -8);
});

test("orientação separa revisão e não prescreve aumento renal automaticamente", () => {
  const synthetic = meal("lunch", "Almoço", { ...zero, proteinG: 30, calciumMg: 300 });
  const { summary, proteinByMeal } = summarizeDietaryAssessment([synthetic], 60);
  const context = { ckd: true, weightKg: 60, frailty: true };
  const priorities = buildDietaryPriorities({ summary, proteinByMeal, targets: { proteinGPerKgMin: 1, calciumMg: 1000 }, context, meals: [synthetic] });
  const orientation = buildDietaryOrientation({ priorities, context, meals: [synthetic], summary });
  assert.match(orientation, /O que manter/); assert.match(orientation, /O que melhorar/); assert.match(orientation, /O que precisa ser confirmado/); assert.match(orientation, /O que exige decisão médica ou nutricional/);
  assert.match(orientation, /Revise a qualidade do relato, as porções confirmadas, o peso utilizado e o contexto clínico antes de orientar aumento de proteína/i);
  assert.match(orientation, /Fontes de cálcio devem ser escolhidas conforme função renal, fósforo, cálcio sérico, tolerância e plano nutricional/i);
});

test("fontes clínicas obrigatórias permanecem rastreáveis", () => {
  const urls = DIETARY_CLINICAL_REFERENCES.map((source) => source.url).join(" ");
  for (const token of ["32829751", "35306388", "8429287", "33650974", "32153884", "asbran.org.br", "KDIGO-2024"]) assert.match(urls, new RegExp(token, "i"));
  assert.equal(DIETARY_CLINICAL_REFERENCES.length, 13);
});

test("snapshot alimentar antigo exige revisão explícita sem ser apagado", () => {
  const legacy = { assessmentStatus: undefined, conditionalGuidance: undefined } as never;
  assert.equal(dietarySnapshotNeedsRuleReview(legacy), true);
  assert.equal(dietarySnapshotNeedsRuleReview({ assessmentStatus: "DRAFT", conditionalGuidance: [] } as never), false);
  assert.equal(dietarySnapshotNeedsRuleReview(null), false);
});
