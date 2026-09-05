import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clinicalScaleDomain } from "../../src/domain/clinical-scale-workspace.ts";
import {
  CHARLSON_STRUCTURED_DEFINITION,
  ESAS_STRUCTURED_DEFINITION,
  G8_STRUCTURED_DEFINITION,
  scoreStructuredCharlson,
  scoreStructuredEsas,
  scoreStructuredG8,
} from "../../src/domain/structured-g8-charlson-esas.ts";

test("G8 estruturado usa oito itens e preserva pontuação e corte histórico", () => {
  assert.equal(G8_STRUCTURED_DEFINITION.fields.length, 8);
  const scored = scoreStructuredG8({
    foodIntake: "NO_DECREASE",
    weightLoss: "NONE",
    mobility: "GOES_OUT",
    neuropsychological: "NONE",
    bmi: 23,
    polypharmacy: "NO",
    health: "BETTER",
    ageYears: 70,
  });
  assert.equal(scored.result.score, 17);
  assert.match(scored.result.classification, /negativo/i);

  const vulnerable = scoreStructuredG8({
    foodIntake: "SEVERE_DECREASE",
    weightLoss: "GT_3_KG",
    mobility: "BED_OR_CHAIR",
    neuropsychological: "SEVERE",
    bmi: 18,
    polypharmacy: "YES",
    health: "WORSE",
    ageYears: 90,
  });
  assert.equal(vulnerable.result.score, 0);
  assert.match(vulnerable.result.classification, /positivo/i);
});

test("Charlson estruturado usa checkboxes e grupos exclusivos sem dupla contagem", () => {
  const checkboxFields = CHARLSON_STRUCTURED_DEFINITION.fields.filter((field) => "display" in field && field.display === "checkbox");
  assert.equal(checkboxFields.length, 13);

  const scored = scoreStructuredCharlson({
    mi: 1,
    heartFailure: 1,
    peripheralVascular: 0,
    cerebrovascular: 0,
    dementia: 0,
    chronicPulmonary: 0,
    connectiveTissue: 0,
    pepticUlcer: 0,
    hemiplegia: 0,
    renal: 0,
    leukemia: 0,
    lymphoma: 0,
    aids: 0,
    diabetes: 2,
    liver: 3,
    solidTumor: 6,
    ageAdjustment: 4,
  });
  assert.equal(scored.result.score, 17);
  assert.match(scored.result.classification, /alta/i);
});

test("ESAS estruturada soma nove sintomas e destaca sintomas individuais >=7", () => {
  assert.equal(ESAS_STRUCTURED_DEFINITION.fields.length, 9);
  assert.ok(ESAS_STRUCTURED_DEFINITION.fields.every((field) => "number" in field && field.number.min === 0 && field.number.max === 10));

  const scored = scoreStructuredEsas({
    pain: 7,
    tiredness: 8,
    drowsiness: 0,
    nausea: 0,
    appetite: 0,
    dyspnea: 0,
    depression: 0,
    anxiety: 0,
    wellbeing: 0,
  });
  assert.equal(scored.result.score, 15);
  assert.equal(scored.result.scoreText, "15/90");
  assert.match(scored.result.classification, /moderada/i);
  assert.match(scored.result.interpretation, /Dor 7\/10/);
  assert.match(scored.result.interpretation, /Cansaço 8\/10/);
});

test("SARC-F aparece em Vitalidade e nutrição no workspace unificado", () => {
  assert.equal(clinicalScaleDomain("sarcf", "mobilidade"), "Vitalidade e nutrição");
});

test("endpoint complementar usa as versões estruturadas antes do fallback legado", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  for (const token of [
    "G8_STRUCTURED_DEFINITION",
    "CHARLSON_STRUCTURED_DEFINITION",
    "ESAS_STRUCTURED_DEFINITION",
    "scoreStructuredG8",
    "scoreStructuredCharlson",
    "scoreStructuredEsas",
  ]) assert.match(route, new RegExp(token));
});

test("oncogeriatria usa o G8 em formulário visível no pré-tratamento", () => {
  const page = readFileSync("src/app/patients/[id]/oncogeriatria/basal/page.tsx", "utf8");
  assert.match(page, /G8ChecklistForm/);
});
