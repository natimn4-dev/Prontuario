import assert from "node:assert/strict";
import test from "node:test";
import { buildCargReportModel } from "../../src/domain/oncogeriatria/carg-report.ts";

const completeCarg = {
  ageYears: 80,
  cancerType: "OTHER" as const,
  standardDose: false,
  multipleChemotherapyAgents: true,
  biologicalSex: "FEMALE" as const,
  hemoglobinGdl: 8.5,
  creatinineClearanceMlMin: 1.25,
  hearing: "FAIR_OR_WORSE" as const,
  oneOrMoreFallsLastSixMonths: false,
  needsHelpTakingMedications: true,
  limitedWalkingOneBlock: true,
  decreasedSocialActivity: true,
};

test("relatório recupera CARG completo salvo apenas como rascunho e mantém o status explícito", () => {
  const report = buildCargReportModel({ draft: completeCarg });

  assert.ok(report);
  assert.equal(report.source, "draft");
  assert.equal(report.scoreText, "16/23");
  assert.equal(report.categoryLabel, "Alto risco");
  assert.equal(report.observedGradeThreeToFiveToxicityPercent, 83);
  assert.match(report.sourceLabel, /rascunho completo/i);
  assert.ok(report.attentionFactors.some((factor) => /hemoglobina/i.test(factor.label)));
  assert.match(report.clinicianGuidance, /Orientação ao oncologista/);
  assert.match(report.clinicianGuidance, /não indica isoladamente redução de dose/i);
});

test("rascunho CARG incompleto aparece com fatores pendentes sem inventar risco", () => {
  const report = buildCargReportModel({ draft: { ageYears: 76, cancerType: "OTHER" } });

  assert.ok(report);
  assert.equal(report.source, "draft");
  assert.equal(report.score, null);
  assert.equal(report.category, null);
  assert.equal(report.observedGradeThreeToFiveToxicityPercent, null);
  assert.ok(report.pendingLabels.length > 0);
  assert.match(report.clinicianGuidance, /dados suficientes/i);
});

test("CARG registrado mantém a fonte final e a orientação clínica contextual", () => {
  const report = buildCargReportModel({
    assessment: {
      scaleCode: "CARG",
      scaleVersion: "HURRIA_2011",
      answers: completeCarg,
      scoreNumeric: 16,
      scoreText: "16/23",
      classification: "Alto risco",
      interpretation: "Interpretação persistida para revisão clínica.",
    },
  });

  assert.ok(report);
  assert.equal(report.source, "registered");
  assert.equal(report.sourceLabel, "CARG registrado");
  assert.equal(report.interpretation, "Interpretação persistida para revisão clínica.");
  assert.match(report.clinicianGuidance, /toxicidade grau 3 a 5/i);
});
