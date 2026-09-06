import assert from "node:assert/strict";
import test from "node:test";
import { buildOncogeriatricCapacityHistory, latestOncogeriatricDomainStates } from "../../src/domain/oncogeriatria/capacity-history.ts";
import { calculateCarg, calculateG8, cargAvailability } from "../../src/domain/oncogeriatria/calculators.ts";
import { buildOncogeriatricDelta, latestRecoveryAssessmentsByDomain } from "../../src/domain/oncogeriatria/longitudinal.ts";

test("G8 original: cenário máximo resulta 17 e triagem não vulnerável", () => {
  const result = calculateG8({
    foodIntake: "NO_DECREASE",
    weightLoss: "NONE",
    mobility: "GOES_OUT",
    neuropsychological: "NONE",
    bmi: 24,
    takesMoreThanThreePrescriptionDrugs: false,
    healthStatusComparedWithPeers: "BETTER",
    ageYears: 79,
  });
  assert.equal(result.score, 17);
  assert.equal(result.classification, "NOT_VULNERABLE_SCREEN");
  assert.equal(result.cutoff, 14);
});

test("G8 original: cutoff 14 permanece triagem vulnerável", () => {
  const result = calculateG8({
    foodIntake: "NO_DECREASE",
    weightLoss: "NONE",
    mobility: "GOES_OUT",
    neuropsychological: "NONE",
    bmi: 23,
    takesMoreThanThreePrescriptionDrugs: true,
    healthStatusComparedWithPeers: "SAME",
    ageYears: 82,
  });
  assert.equal(result.score, 14);
  assert.equal(result.classification, "VULNERABLE_SCREEN");
});

test("CARG está disponível após liberação clínica documentada", () => {
  const availability = cargAvailability();
  assert.equal(availability.status, "AVAILABLE");
  assert.match(availability.message, /cálculo local versionado/i);
});

test("CARG reproduz as três faixas e percentuais observados no estudo de derivação", () => {
  const base = {
    ageYears: 70,
    cancerType: "OTHER" as const,
    standardDose: false,
    multipleChemotherapyAgents: false,
    biologicalSex: "FEMALE" as const,
    hemoglobinGdl: 12,
    creatinineClearanceMlMin: 60,
    hearing: "EXCELLENT_GOOD" as const,
    oneOrMoreFallsLastSixMonths: false,
    needsHelpTakingMedications: false,
    limitedWalkingOneBlock: false,
    decreasedSocialActivity: false,
  };
  const low = calculateCarg(base);
  const intermediate = calculateCarg({ ...base, ageYears: 72, cancerType: "GI_GU", standardDose: true });
  const high = calculateCarg({ ...base, ageYears: 72, cancerType: "GI_GU", standardDose: true, multipleChemotherapyAgents: true, oneOrMoreFallsLastSixMonths: true });

  assert.deepEqual({ score: low.score, category: low.category, percent: low.observedGradeThreeToFiveToxicityPercent }, { score: 0, category: "LOW", percent: 30 });
  assert.deepEqual({ score: intermediate.score, category: intermediate.category, percent: intermediate.observedGradeThreeToFiveToxicityPercent }, { score: 6, category: "INTERMEDIATE", percent: 52 });
  assert.deepEqual({ score: high.score, category: high.category, percent: high.observedGradeThreeToFiveToxicityPercent }, { score: 11, category: "HIGH", percent: 83 });
});

test("CARG usa limiares laboratoriais por sexo e preserva máximo teórico de 23", () => {
  const maximum = calculateCarg({
    ageYears: 72,
    cancerType: "GI_GU",
    standardDose: true,
    multipleChemotherapyAgents: true,
    biologicalSex: "MALE",
    hemoglobinGdl: 10.9,
    creatinineClearanceMlMin: 33.9,
    hearing: "FAIR_OR_WORSE",
    oneOrMoreFallsLastSixMonths: true,
    needsHelpTakingMedications: true,
    limitedWalkingOneBlock: true,
    decreasedSocialActivity: true,
  });
  assert.equal(maximum.score, 23);
  assert.equal(maximum.theoreticalMaximum, 23);
  assert.equal(maximum.observedOriginalRangeMaximum, 19);
  assert.equal(maximum.components.reduce((sum, component) => sum + component.points, 0), 23);
});

test("CARG sinaliza uso fora da faixa etária original sem impedir cálculo", () => {
  const result = calculateCarg({
    ageYears: 60,
    cancerType: "OTHER",
    standardDose: false,
    multipleChemotherapyAgents: false,
    biologicalSex: "FEMALE",
    hemoglobinGdl: 12,
    creatinineClearanceMlMin: 60,
    hearing: "EXCELLENT_GOOD",
    oneOrMoreFallsLastSixMonths: false,
    needsHelpTakingMedications: false,
    limitedWalkingOneBlock: false,
    decreasedSocialActivity: false,
  });
  assert.match(result.populationNote ?? "", /65 anos ou mais/);
});

test("delta geriátrico nunca mistura versões diferentes", () => {
  const sameVersion = buildOncogeriatricDelta([
    { code: "MNA_SF", version: "1", occurredAt: new Date("2026-01-01"), value: 13 },
    { code: "MNA_SF", version: "1", occurredAt: new Date("2026-04-01"), value: 9 },
  ]);
  assert.deepEqual(sameVersion && { baseline: sameVersion.baseline, current: sameVersion.current, delta: sameVersion.delta }, { baseline: 13, current: 9, delta: -4 });
  assert.equal(sameVersion?.trend, "unfavorable");

  const mixed = buildOncogeriatricDelta([
    { code: "MNA_SF", version: "1", occurredAt: new Date("2026-01-01"), value: 13 },
    { code: "MNA_SF", version: "2", occurredAt: new Date("2026-04-01"), value: 9 },
  ]);
  assert.equal(mixed, null);
});

test("delta oncogeriátrico respeita a direção própria de cada escala", () => {
  const ecog = buildOncogeriatricDelta([
    { code: "ecog", version: "1", occurredAt: new Date("2026-01-01"), value: 1 },
    { code: "ecog", version: "1", occurredAt: new Date("2026-04-01"), value: 3 },
  ]);
  const lawton = buildOncogeriatricDelta([
    { code: "lawton", version: "1", occurredAt: new Date("2026-01-01"), value: 18 },
    { code: "lawton", version: "1", occurredAt: new Date("2026-04-01"), value: 21 },
  ]);
  assert.equal(ecog?.trend, "unfavorable");
  assert.equal(lawton?.trend, "favorable");
});

test("gráficos numéricos usam distância temporal proporcional e identificam valores brutos", async () => {
  const { readFile } = await import("node:fs/promises");
  const chart = await readFile("src/components/reports/clinical-metric-trend-chart.tsx", "utf8");
  const generalChart = await readFile("src/components/reports/scale-history-chart.tsx", "utf8");
  assert.match(chart, /data-time-scale="proportional"/);
  assert.match(chart, /proportionalAxisPosition/);
  assert.match(chart, /Eixo vertical: intervalo observado/);
  assert.match(generalChart, /data-time-scale="proportional"/);
  assert.match(generalChart, /proportionalAxisPosition/);
});

test("relatório pós-tratamento usa a avaliação de recuperação mais recente de cada domínio", () => {
  const latest = latestRecoveryAssessmentsByDomain([
    { id: "functional-new", domain: "FUNCTIONAL", assessedAt: new Date("2026-08-01"), status: "RECOVERING" },
    { id: "nutrition-new", domain: "NUTRITION", assessedAt: new Date("2026-07-15"), status: "RECOVERED" },
    { id: "functional-old", domain: "FUNCTIONAL", assessedAt: new Date("2026-06-01"), status: "PERSISTENT_DEFICIT" },
  ]);
  assert.equal(latest.length, 2);
  assert.equal(latest.find((item) => item.domain === "FUNCTIONAL")?.id, "functional-new");
  assert.equal(latest.find((item) => item.domain === "NUTRITION")?.id, "nutrition-new");
});

test("trajetória por domínio da Oncogeriatria inclui somente consultas explicitamente vinculadas ao episódio", () => {
  const patientId = "patient-1";
  const history = buildOncogeriatricCapacityHistory({
    patientId,
    checkpoints: [{ consultationId: "consultation-linked" }],
    consultations: [
      { id: "consultation-linked", patientId, occurredAt: "2026-01-10" },
      { id: "consultation-unrelated", patientId, occurredAt: "2026-02-10" },
    ],
    assessments: [
      {
        id: "lawton-linked",
        patientId,
        consultationId: "consultation-linked",
        scaleCode: "lawton",
        scaleVersion: "v1",
        scoreNumeric: 18,
        scoreText: "18",
        classification: "dependência funcional",
        clinicalColor: "vermelho",
        appliedAt: "2026-01-10",
      },
      {
        id: "lawton-unrelated",
        patientId,
        consultationId: "consultation-unrelated",
        scaleCode: "lawton",
        scaleVersion: "v1",
        scoreNumeric: 27,
        scoreText: "27",
        classification: "independente",
        clinicalColor: "verde",
        appliedAt: "2026-02-10",
      },
    ],
  });

  assert.deepEqual(history.consultations.map((item) => item.id), ["consultation-linked"]);
  const functional = history.dimensions.find((item) => item.code === "funcionalidade");
  assert.equal(functional?.cells.length, 1);
  assert.equal(functional?.cells[0]?.status, "altered");
  assert.equal(functional?.cells[0]?.assessments[0]?.assessmentId, "lawton-linked");
});

test("último estado oncogeriátrico por domínio persiste quando checkpoint posterior não reaplica escala", () => {
  const patientId = "patient-2";
  const history = buildOncogeriatricCapacityHistory({
    patientId,
    checkpoints: [
      { consultationId: "baseline" },
      { consultationId: "cycle-2" },
    ],
    consultations: [
      { id: "baseline", patientId, occurredAt: "2026-03-01" },
      { id: "cycle-2", patientId, occurredAt: "2026-04-01" },
    ],
    assessments: [
      {
        id: "lawton-baseline",
        patientId,
        consultationId: "baseline",
        scaleCode: "lawton",
        scaleVersion: "v1",
        scoreNumeric: 20,
        scoreText: "20",
        classification: "dependência funcional",
        clinicalColor: "vermelho",
        appliedAt: "2026-03-01",
      },
    ],
  });

  const functional = history.dimensions.find((item) => item.code === "funcionalidade");
  assert.equal(functional?.cells[0]?.status, "altered");
  assert.equal(functional?.cells[1]?.status, "not-assessed");

  const latest = latestOncogeriatricDomainStates(history).find((item) => item.code === "funcionalidade");
  assert.equal(latest?.status, "altered");
  assert.equal(latest?.occurredAt?.slice(0, 10), "2026-03-01");
  assert.equal(latest?.instruments[0]?.code, "lawton");
});

test("evento oncológico vinculado contextualiza inflexão sem declarar causalidade", () => {
  const patientId = "patient-context";
  const history = buildOncogeriatricCapacityHistory({
    patientId,
    checkpoints: [{ consultationId: "baseline" }, { consultationId: "cycle" }],
    consultations: [
      { id: "baseline", patientId, occurredAt: "2026-01-01" },
      { id: "cycle", patientId, occurredAt: "2026-02-01" },
    ],
    assessments: [
      { patientId, consultationId: "baseline", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-01" },
      { patientId, consultationId: "cycle", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-02-01" },
    ],
    milestones: [{ patientId, consultationId: "cycle", title: "Hospitalização associada a toxicidade", recordedAt: "2026-02-01", source: "oncology-event" }],
  });

  assert.equal(history.inflectionPoints[0]?.milestones[0]?.title, "Hospitalização associada a toxicidade");
  assert.equal(history.inflectionPoints[0]?.milestones[0]?.source, "oncology-event");
});
