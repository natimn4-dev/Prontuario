import test from "node:test";
import assert from "node:assert/strict";
import {
  nutrientsForGrams,
  renalProteinReference,
  roundForDisplay,
  summarizeDietaryAssessment,
  type DietaryConfirmedMeal,
  type DietaryNutrients,
} from "../../src/domain/dietary-assessment.ts";
import {
  crossCheckDietaryEnergy,
  dietaryNutrientUnit,
} from "../../src/domain/dietary-assessment-quality.ts";

const zero: DietaryNutrients = {
  energyKcal: 0,
  proteinG: 0,
  carbohydratesG: 0,
  fatG: 0,
  fiberG: 0,
  calciumMg: 0,
  sodiumMg: 0,
};

function meal(id: string, label: string, nutrients: DietaryNutrients): DietaryConfirmedMeal {
  return {
    id,
    label,
    items: [{
      id: `${id}-item`,
      label: "Alimento sintético",
      quantity: 100,
      measure: "g",
      grams: 100,
      gramsSource: "direct-grams",
      estimated: false,
      food: null,
      composition: null,
      nutrients,
    }],
  };
}

test("A — duas porções do mesmo alimento totalizam 2 × uma porção", () => {
  const per100g: DietaryNutrients = {
    energyKcal: 120,
    proteinG: 8,
    carbohydratesG: 15,
    fatG: 4,
    fiberG: 3,
    calciumMg: 80,
    sodiumMg: 40,
  };
  const onePortion = nutrientsForGrams(per100g, 75);
  const twoPortions = nutrientsForGrams(per100g, 150);
  for (const key of Object.keys(onePortion) as Array<keyof DietaryNutrients>) {
    assert.equal(twoPortions[key], onePortion[key] * 2);
  }
});

test("B — checagem energética cruza fonte com 4P + 4C + 9G e sinaliza diferença relevante", () => {
  const consistent = crossCheckDietaryEnergy({
    energyKcal: 170,
    proteinG: 10,
    carbohydratesG: 20,
    fatG: 5.5,
  });
  assert.equal(consistent.status, "consistent");

  const review = crossCheckDietaryEnergy({
    energyKcal: 160,
    proteinG: 5,
    carbohydratesG: 10,
    fatG: 2,
  });
  assert.equal(review.status, "review");
  assert.match(review.note, /fibra|álcool|polióis/i);
});

test("C — cálcio e sódio permanecem em mg e não são apresentados como g", () => {
  assert.equal(dietaryNutrientUnit("calciumMg"), "mg");
  assert.equal(dietaryNutrientUnit("sodiumMg"), "mg");
  assert.equal(dietaryNutrientUnit("proteinG"), "g");
});

test("D — 60 g de proteína para 50 kg correspondem a 1,20 g/kg/d", () => {
  const proteinMeal = meal("lunch", "Almoço", { ...zero, proteinG: 60, energyKcal: 600 });
  const { summary } = summarizeDietaryAssessment([proteinMeal], 50);
  assert.equal(roundForDisplay(summary.proteinGPerKg, 2), 1.2);
});

test("E — subtotais por refeição fecham com o total diário", () => {
  const breakfast = meal("breakfast", "Café da manhã", {
    ...zero,
    energyKcal: 350,
    proteinG: 20,
    carbohydratesG: 45,
    fatG: 10,
    fiberG: 6,
    calciumMg: 250,
    sodiumMg: 180,
  });
  const dinner = meal("dinner", "Jantar", {
    ...zero,
    energyKcal: 550,
    proteinG: 35,
    carbohydratesG: 60,
    fatG: 18,
    fiberG: 9,
    calciumMg: 180,
    sodiumMg: 320,
  });
  const breakfastSummary = summarizeDietaryAssessment([breakfast]).summary;
  const dinnerSummary = summarizeDietaryAssessment([dinner]).summary;
  const daily = summarizeDietaryAssessment([breakfast, dinner]).summary;
  assert.equal(daily.energyKcal, breakfastSummary.energyKcal + dinnerSummary.energyKcal);
  assert.equal(daily.proteinG, breakfastSummary.proteinG + dinnerSummary.proteinG);
  assert.equal(daily.calciumMg, breakfastSummary.calciumMg + dinnerSummary.calciumMg);
  assert.equal(daily.sodiumMg, breakfastSummary.sodiumMg + dinnerSummary.sodiumMg);
});

test("perfil sintético renal não recebe orientação automática para aumentar proteína", async () => {
  const { buildDietaryOrientation, buildDietaryPriorities } = await import("../../src/domain/dietary-assessment.ts");
  const syntheticMeal = meal("lunch", "Almoço", { ...zero, proteinG: 30, energyKcal: 700 });
  const { summary, proteinByMeal } = summarizeDietaryAssessment([syntheticMeal], 60);
  const priorities = buildDietaryPriorities({
    summary,
    proteinByMeal,
    targets: { proteinGPerKgMin: 1 },
    context: { weightKg: 60, ckd: true },
    meals: [syntheticMeal],
  });
  assert.equal(priorities.find((priority) => priority.code === "protein")?.title, "Revisar meta proteica no contexto renal");
  assert.match(buildDietaryOrientation({ priorities, context: { ckd: true }, meals: [syntheticMeal] }), /revise a meta e a função renal antes de orientar aumento de proteína/i);
});


test("referência proteica renal para pessoa idosa é estratificada por TFG e diálise", () => {
  assert.deepEqual(renalProteinReference({ ckd: true, ageYears: 78, renalEgfrMlMinPer1_73: 52 }), {
    code: "g3a", label: "DRC G3a — TFG 45–59 mL/min/1,73 m²", proteinGPerKgMin: 0.8, proteinGPerKgMax: 0.8,
    note: "Referência inicial: 0,8 g/kg/dia. Em fragilidade, sarcopenia, desnutrição ou baixa probabilidade de progressão, individualize com a equipe.",
  });
  assert.equal(renalProteinReference({ ckd: true, renalEgfrMlMinPer1_73: 35 })?.code, "g3b");
  assert.deepEqual(renalProteinReference({ ckd: true, renalEgfrMlMinPer1_73: 22 }), {
    code: "g4-g5", label: "DRC G4–G5 sem diálise — TFG <30 mL/min/1,73 m²", proteinGPerKgMin: 0.6, proteinGPerKgMax: 0.8,
    note: "Referência inicial: 0,6–0,8 g/kg/dia. Preferir a faixa mais alta quando houver diabetes, idade avançada, desnutrição ou outro risco nutricional.",
  });
  assert.equal(renalProteinReference({ ckd: true, renalEgfrMlMinPer1_73: 22, renalVeryLowProteinDiet: true })?.code, "g4-g5-vlpd");
  assert.deepEqual(renalProteinReference({ ckd: true, renalDialysis: true }), {
    code: "g5d", label: "DRC G5D — hemodiálise ou diálise peritoneal", proteinGPerKgMin: 1.2, proteinGPerKgMax: 1.5,
    note: "Para pessoa idosa em diálise, usar 1,2–1,5 g/kg/dia como referência inicial e individualizar pela modalidade, perdas e estado nutricional.",
  });
});

test("dieta muito baixa em proteína exige DRC sem diálise e TFG menor que 30", async () => {
  const { validateDietaryInput } = await import("../../src/domain/dietary-assessment.ts");
  const input = { schemaVersion: "dietary-assessment-v1", meals: [meal("lunch", "Almoço", zero)], targets: {}, clinicalContext: { ckd: true, renalEgfrMlMinPer1_73: 45, renalVeryLowProteinDiet: true } } as const;
  assert.match(validateDietaryInput(input).join(" "), /Dieta muito baixa em proteína/);
});
