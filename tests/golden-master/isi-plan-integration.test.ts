import assert from "node:assert/strict";
import test from "node:test";
import type { LongitudinalAssessment } from "../../src/domain/clinical-change-summary.ts";
import { proposeProblemsFromAssessments } from "../../src/domain/problem-proposals.ts";
import { buildProfessionalPlanSuggestions } from "../../src/domain/professional-plan-suggestions.ts";

const isiAssessment: LongitudinalAssessment = {
  patientId: "patient-1",
  consultationId: "consultation-current",
  scaleCode: "isi",
  scaleVersion: "ISI-7-scoring-2001-BR-validation-2011-v1",
  score: 16,
  scoreText: "16/28",
  classification: "Sintomas de insônia de intensidade moderada",
  color: "vermelho",
  appliedAt: "2026-08-21T20:00:00.000Z",
};

test("altered ISI proposes a sleep problem without declaring an insomnia diagnosis", () => {
  const proposals = proposeProblemsFromAssessments([isiAssessment]);
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0]?.key, "sleep-insomnia-symptoms");
  assert.equal(proposals[0]?.title, "Sintomas de insônia / alteração do sono");
  assert.equal(proposals[0]?.requiresPhysicianConfirmation, true);
  assert.doesNotMatch(proposals[0]?.title ?? "", /^Insônia$/i);
});

test("ISI professional plan is contextual, evidence-backed, editable and non-prescriptive", () => {
  const suggestions = buildProfessionalPlanSuggestions({
    targetConsultationId: "consultation-current",
    patientId: "patient-1",
    problems: [{
      id: "sleep-problem",
      patientId: "patient-1",
      title: "Sintomas de insônia / alteração do sono",
      status: "ACTIVE",
    }],
    assessments: [isiAssessment],
  });

  assert.equal(suggestions.length, 1);
  const suggestion = suggestions[0]!;
  assert.equal(suggestion.requiresPhysicianReview, true);
  assert.equal(suggestion.evidence[0]?.scaleCode, "isi");
  assert.deepEqual(suggestion.sources.map((source) => source.pmid), ["33164742", "38016484"]);

  const text = suggestion.actions.join(" ").toLocaleLowerCase("pt-BR");
  for (const expected of ["padrão sono-vigília", "dor", "noctúria", "apneia", "pernas inquietas", "medicamentos", "terapia cognitivo-comportamental"]) {
    assert.match(text, new RegExp(expected, "i"));
  }
  assert.match(text, /decisão médica explícita/);
  assert.doesNotMatch(text, /prescrever|iniciar melatonina|iniciar antidepress|iniciar hipnótico|suspender [a-z]|ajustar dose/);
});

test("preserved ISI does not generate a sleep problem or professional plan", () => {
  const preserved = { ...isiAssessment, score: 7, scoreText: "7/28", classification: "Ausência de insônia clinicamente significativa", color: "verde" as const };
  assert.deepEqual(proposeProblemsFromAssessments([preserved]), []);
  assert.deepEqual(buildProfessionalPlanSuggestions({
    targetConsultationId: "consultation-current",
    patientId: "patient-1",
    problems: [{ id: "sleep-problem", patientId: "patient-1", title: "Sintomas de insônia / alteração do sono", status: "ACTIVE" }],
    assessments: [preserved],
  }), []);
});
