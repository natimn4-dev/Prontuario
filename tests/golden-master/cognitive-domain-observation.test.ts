import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { AgaScaleReportSection } from "../../src/domain/aga-report.ts";
import {
  COGNITIVE_DOMAIN_OBSERVATION_FIELDS,
  scoreCognitiveDomainObservation,
} from "../../src/domain/cognitive-domain-observation.ts";
import { buildCognitiveDomainSnapshot } from "../../src/domain/cognitive-domain-profile.ts";
import type { IntrinsicCapacityGuidance } from "../../src/domain/intrinsic-capacity-guidance.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";

test("perfil clínico exige estado explícito para cada domínio e não calcula escore proprietário", () => {
  const answers = Object.fromEntries(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => [field.id, "not_assessed"]));
  answers.delayed_recall = "change_observed";
  answers.language = "no_change_observed";
  const scored = scoreCognitiveDomainObservation(answers);

  assert.equal(scored.result.score, null);
  assert.match(scored.result.scoreText, /1 domínio/i);
  assert.match(scored.result.interpretation, /Memória recente \/ evocação tardia/i);
  assert.match(scored.result.interpretation, /não corresponde a subescore de MEEM ou MoCA/i);
  assert.equal(scored.result.clinicalColor, "amarelo");
});

test("perfil clínico mantém não avaliado separado de sem alteração observada", () => {
  const missing = Object.fromEntries(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => [field.id, "not_assessed"]));
  const scored = scoreCognitiveDomainObservation(missing);
  assert.equal(scored.result.classification, "Domínios não avaliados nesta consulta");
  assert.equal(scored.result.clinicalColor, "cinza");
  assert.throws(() => scoreCognitiveDomainObservation({ ...missing, delayed_recall: "normal" }), /inválido/i);
});

test("perfil independente alimenta a matriz por domínios sem inventar subtotal", () => {
  const answers = Object.fromEntries(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => [field.id, "not_assessed"]));
  answers.delayed_recall = "change_observed";
  answers.attention_working_memory = "no_change_observed";
  const snapshot = buildCognitiveDomainSnapshot([{
    scaleCode: "cognitive_domain_observation",
    scaleVersion: "clinical-cognitive-domain-observation-2026-09-v1",
    answers,
    scoreNumeric: null,
    scoreText: "1 domínio com alteração observada",
    appliedAt: "2026-09-17T12:00:00.000Z",
  }]);

  assert.equal(snapshot.domains.find((item) => item.key === "delayed_recall")?.status, "CLINICAL_ALTERATION_RECORDED");
  assert.equal(snapshot.domains.find((item) => item.key === "delayed_recall")?.observations[0]?.display, "Alteração observada");
  assert.equal(snapshot.domains.find((item) => item.key === "attention_working_memory")?.status, "NO_RECORDED_ERROR");
  assert.equal(snapshot.profile, "AMNESTIC");
});

test("perfil identifica MEEM/MoCA e preserva escore total informado sem calculá-lo", () => {
  const scored = scoreCognitiveDomainObservation({
    instrument: "moca",
    moca_visuospatial: 4,
    moca_naming: 3,
    moca_attention: 5,
    moca_language: 3,
    moca_abstraction: 2,
    moca_delayed_recall: 3,
    moca_orientation: 6,
    moca_education_years: 12,
  });
  assert.equal(scored.result.score, 27);
  assert.match(scored.result.scoreText, /MoCA.*bruto 26\/30.*corrigido 27\/30/);
  assert.equal(scored.answers.instrument, "moca");
  assert.equal(scored.answers.moca_education_years, 12);
  assert.throws(() => scoreCognitiveDomainObservation({ instrument: "meem", score: 22 }), /subtotais/i);
});

test("subtotais MEEM/MoCA alimentam a matriz cognitiva por domínio", () => {
  const scale = scoreCognitiveDomainObservation({
    instrument: "meem",
    meem_orientation_temporal: 3,
    meem_orientation_spatial: 5,
    meem_registration: 3,
    meem_attention: 5,
    meem_recall: 1,
    meem_naming: 2,
    meem_repetition: 1,
    meem_writing: 1,
    meem_commands: 3,
    meem_reading: 1,
    meem_diagram_copy: 1,
    meem_education: 5,
  });
  const snapshot = buildCognitiveDomainSnapshot([{
    scaleCode: "cognitive_domain_observation",
    scaleVersion: scale.version,
    answers: scale.answers,
    scoreNumeric: scale.result.score,
    scoreText: scale.result.scoreText,
    appliedAt: "2026-09-18T12:00:00.000Z",
  }]);
  assert.equal(scale.result.score, 26);
  assert.equal(snapshot.domains.find((item) => item.key === "orientation_temporal")?.observations[0]?.display, "3/5");
  assert.equal(snapshot.domains.find((item) => item.key === "delayed_recall")?.status, "ERRORS_PRESENT");
});

test("relatório familiar enumera somente domínios com alteração observada", () => {
  const scale: AgaScaleReportSection = {
    code: "cognitive_domain_observation",
    version: "clinical-cognitive-domain-observation-2026-09-v1",
    name: "Perfil cognitivo por domínios — registro clínico",
    dimension: "cognicao",
    assessedInTargetConsultation: true,
    lastKnown: { consultationId: "c1", appliedAt: "2026-09-17T12:00:00.000Z", score: null, version: "clinical-cognitive-domain-observation-2026-09-v1" },
    collectedData: [
      { field: "delayed_recall", value: "change_observed" },
      { field: "language", value: "no_change_observed" },
      { field: "orientation", value: "not_assessed" },
    ],
    result: { score: null, scoreText: "1 domínio com alteração observada", classification: "Alterações cognitivas clínicas registradas" },
    clinicalColor: "amarelo",
    relatedProblemProposals: [],
    interventionSuggestions: [],
    evolution: { previous: null, previousVersion: null, baseline: null, baselineVersion: "clinical-cognitive-domain-observation-2026-09-v1", current: null, currentVersion: "clinical-cognitive-domain-observation-2026-09-v1", trend: "insufficient-data", vsPrevious: "Dados insuficientes", vsBaseline: "insufficient-data" },
    chartSeries: { patientId: "p1", scaleCode: "cognitive_domain_observation", points: [], segments: [], hasMultipleVersions: false },
    source: { status: "needs-review", note: "Registro clínico" },
  };
  const intrinsic = { alteredDomains: [] } as unknown as IntrinsicCapacityGuidance;
  const summary = buildReportDomainSummaries([scale], intrinsic)[0]!;
  assert.match(summary.results[0]!.value, /Memória recente \/ evocação tardia/);
  assert.doesNotMatch(summary.results[0]!.value, /Linguagem|Orientação/);
  assert.match(summary.results[0]!.value, /sem diagnóstico automático/i);
});

test("API e workspace devolvem as respostas persistidas para reabertura segura", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
  assert.match(route, /scaleVersion:\s*true,\s*answers:\s*true/);
  assert.match(workspace, /storedAnswerStrings/);
  assert.match(workspace, /complementaryView\?\.latest\?\.find/);
});
