import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmedGlimSummaryFromStructuredData,
  evaluateGlim,
  GLIM_IMPLEMENTATION_VERSION,
  storedGlimRecordFromStructuredData,
  type StoredGlimRecord,
} from "../../src/domain/program55/glim.ts";

const base = {
  ageYears: 65,
  weightLossPercent: null,
  weightLossPeriod: "NOT_ASSESSED" as const,
  bmi: null,
  reducedMuscleMass: "NOT_ASSESSED" as const,
  reducedFoodIntakeOrAssimilation: "NOT_ASSESSED" as const,
  inflammationOrDiseaseBurden: "NOT_ASSESSED" as const,
};

test("GLIM exige pelo menos um critério fenotípico e um etiológico", () => {
  const phenotypeOnly = evaluateGlim({ ...base, bmi: 19.2 });
  assert.equal(phenotypeOnly.phenotypeCount, 1);
  assert.equal(phenotypeOnly.etiologicCount, 0);
  assert.equal(phenotypeOnly.diagnosticCriteriaMet, false);
  assert.equal(phenotypeOnly.severity, null);

  const complete = evaluateGlim({ ...base, bmi: 19.2, reducedFoodIntakeOrAssimilation: "YES" });
  assert.equal(complete.diagnosticCriteriaMet, true);
  assert.equal(complete.severity, "STAGE_1");
});

test("GLIM aplica corte de IMC específico para idade e inclui 70 anos no grupo >=70", () => {
  const age69 = evaluateGlim({ ...base, ageYears: 69, bmi: 19.9, inflammationOrDiseaseBurden: "YES" });
  assert.equal(age69.phenotypic.lowBmi.present, true);
  assert.equal(age69.phenotypic.lowBmi.severity, "STAGE_1");

  const age70Moderate = evaluateGlim({ ...base, ageYears: 70, bmi: 21.9, inflammationOrDiseaseBurden: "YES" });
  assert.equal(age70Moderate.phenotypic.lowBmi.present, true);
  assert.equal(age70Moderate.phenotypic.lowBmi.severity, "STAGE_1");

  const age70Severe = evaluateGlim({ ...base, ageYears: 70, bmi: 19.9, inflammationOrDiseaseBurden: "YES" });
  assert.equal(age70Severe.phenotypic.lowBmi.severity, "STAGE_2");
  assert.equal(age70Severe.severity, "STAGE_2");
});

test("GLIM usa o critério fenotípico mais grave entre perda de peso e IMC", () => {
  const result = evaluateGlim({
    ...base,
    weightLossPercent: 12,
    weightLossPeriod: "WITHIN_6_MONTHS",
    bmi: 19.4,
    reducedFoodIntakeOrAssimilation: "YES",
  });
  assert.equal(result.phenotypic.weightLoss.severity, "STAGE_2");
  assert.equal(result.phenotypic.lowBmi.severity, "STAGE_1");
  assert.equal(result.severity, "STAGE_2");
  assert.match(result.decisionSupportLabel, /desnutrição grave/i);
});

test("massa muscular reduzida pode confirmar fenótipo, mas não gradua gravidade automaticamente", () => {
  const result = evaluateGlim({
    ...base,
    reducedMuscleMass: "YES",
    inflammationOrDiseaseBurden: "YES",
  });
  assert.equal(result.diagnosticCriteriaMet, true);
  assert.equal(result.phenotypic.reducedMuscleMass.present, true);
  assert.equal(result.phenotypic.reducedMuscleMass.severity, null);
  assert.equal(result.severity, "NOT_GRADABLE");
  assert.match(result.decisionSupportLabel, /não classificável automaticamente/i);
});

test("limites exatos de perda ponderal são sinalizados para revisão clínica por divergência entre tabelas diagnóstica e de gravidade", () => {
  const sixMonths = evaluateGlim({ ...base, weightLossPercent: 5, weightLossPeriod: "WITHIN_6_MONTHS", reducedFoodIntakeOrAssimilation: "YES" });
  assert.equal(sixMonths.phenotypic.weightLoss.present, false);
  assert.equal(sixMonths.phenotypic.weightLoss.severity, "STAGE_1");
  assert.equal(sixMonths.boundaryReviewRequired, true);

  const beyondSixMonths = evaluateGlim({ ...base, weightLossPercent: 10, weightLossPeriod: "BEYOND_6_MONTHS", reducedFoodIntakeOrAssimilation: "YES" });
  assert.equal(beyondSixMonths.phenotypic.weightLoss.present, false);
  assert.equal(beyondSixMonths.phenotypic.weightLoss.severity, "STAGE_1");
  assert.equal(beyondSixMonths.boundaryReviewRequired, true);
});

test("MAPA 55+ só compartilha resultado GLIM após confirmação profissional explícita", () => {
  const result = evaluateGlim({ ...base, bmi: 18.2, reducedFoodIntakeOrAssimilation: "YES" });
  const record: StoredGlimRecord = {
    implementationVersion: GLIM_IMPLEMENTATION_VERSION,
    ageYears: 65,
    screeningRisk: "YES",
    weightLossPercent: null,
    weightLossPeriod: "NOT_ASSESSED",
    bmi: 18.2,
    reducedMuscleMass: "NOT_ASSESSED",
    muscleMassMethod: null,
    reducedFoodIntakeOrAssimilation: "YES",
    inflammationOrDiseaseBurden: "NO",
    etiologicNotes: null,
    result,
    clinicianDecision: "PENDING",
    clinicianNote: null,
  };
  assert.equal(confirmedGlimSummaryFromStructuredData({ glim: record }), null);
  record.clinicianDecision = "CONFIRMED";
  assert.match(confirmedGlimSummaryFromStructuredData({ glim: record }) ?? "", /desnutrição grave/i);
});

test("leitura persistida valida campos e recalcula o resultado em vez de confiar em resultado armazenado", () => {
  const stored = {
    implementationVersion: GLIM_IMPLEMENTATION_VERSION,
    ageYears: 70,
    screeningRisk: "YES",
    weightLossPercent: null,
    weightLossPeriod: "NOT_ASSESSED",
    bmi: 19.5,
    reducedMuscleMass: "NOT_ASSESSED",
    muscleMassMethod: null,
    reducedFoodIntakeOrAssimilation: "YES",
    inflammationOrDiseaseBurden: "NO",
    etiologicNotes: null,
    clinicianDecision: "CONFIRMED",
    clinicianNote: null,
    result: { decisionSupportLabel: "resultado adulterado", diagnosticCriteriaMet: false },
  };
  const parsed = storedGlimRecordFromStructuredData({ glim: stored });
  assert.equal(parsed?.result.severity, "STAGE_2");
  assert.match(parsed?.result.decisionSupportLabel ?? "", /desnutrição grave/i);
  assert.doesNotMatch(parsed?.result.decisionSupportLabel ?? "", /adulterado/i);
});
