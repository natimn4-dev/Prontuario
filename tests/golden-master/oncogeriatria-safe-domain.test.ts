import assert from "node:assert/strict";
import test from "node:test";
import { CARG_TREATMENT_COURSE_COMPLETION_POLICY, diffCargInputs, summarizeCargCompleteness } from "../../src/domain/oncogeriatria/carg-audit.ts";
import { isPrimaryOncogeriatricScale, sortOncogeriatricScaleGroups } from "../../src/domain/oncogeriatria/chart-priority.ts";
import { buildOncogeriatricTemporalMarkers, temporalMarkerContext } from "../../src/domain/oncogeriatria/temporal-markers.ts";

const completeCarg = {
  ageYears: 76,
  cancerType: "OTHER" as const,
  standardDose: true,
  multipleChemotherapyAgents: false,
  biologicalSex: "FEMALE" as const,
  hemoglobinGdl: 11,
  creatinineClearanceMlMin: 55,
  hearing: "EXCELLENT_GOOD" as const,
  oneOrMoreFallsLastSixMonths: false,
  needsHelpTakingMedications: false,
  limitedWalkingOneBlock: false,
  decreasedSocialActivity: false,
};

test("CARG mantém exatamente 11 fatores de completude e não cria regra de curso terapêutico", () => {
  const summary = summarizeCargCompleteness(completeCarg);
  assert.equal(summary.totalFactors, 11);
  assert.equal(summary.completedCount, 11);
  assert.deepEqual(summary.pendingLabels, []);
  assert.equal(CARG_TREATMENT_COURSE_COMPLETION_POLICY, "PRESERVE_CURRENT");
});

test("CARG aponta pendências objetivamente e trata sexo laboratorial como requisito da hemoglobina", () => {
  const { biologicalSex: _sex, hearing: _hearing, ...partial } = completeCarg;
  const summary = summarizeCargCompleteness(partial);
  assert.equal(summary.completedCount, 9);
  assert.ok(summary.pendingLabels.includes("Hemoglobina e sexo de referência laboratorial"));
  assert.ok(summary.pendingLabels.includes("Audição"));
});

test("diferença de CARG é factual e não atribui melhora ou piora", () => {
  const changes = diffCargInputs(completeCarg, { ...completeCarg, hearing: "FAIR_OR_WORSE" });
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.label, "Audição");
  assert.ok(!JSON.stringify(changes).toLowerCase().includes("melhora"));
  assert.ok(!JSON.stringify(changes).toLowerCase().includes("piora"));
});

test("prioridade longitudinal mantém CARG e escalas clínicas principais antes das demais sem limite arbitrário", () => {
  const sorted = sortOncogeriatricScaleGroups([
    { code: "MOCA", version: "1" },
    { code: "ESAS", version: "1" },
    { code: "CARG", version: "HURRIA_2011" },
    { code: "G8", version: "ORIGINAL_2012" },
    { code: "KPS", version: "1" },
  ]);
  assert.deepEqual(sorted.map((item) => item.code), ["CARG", "G8", "KPS", "ESAS", "MOCA"]);
  assert.equal(isPrimaryOncogeriatricScale("CARG"), true);
  assert.equal(sorted.length, 5);
});

test("toxicidade sem hospitalização permanece como marco temporal sem fabricar consulta", () => {
  const markers = buildOncogeriatricTemporalMarkers({
    patientId: "synthetic-patient",
    episodeId: "synthetic-episode",
    courses: [], checkpoints: [], interventions: [], recovery: [], problemMilestones: [],
    toxicities: [{ id: "tox-1", occurredAt: "2026-09-10T12:00:00Z", toxicityType: "fadiga", hospitalizationAssociated: false }],
  });
  assert.equal(markers.length, 1);
  assert.equal(markers[0]?.title, "Toxicidade registrada: fadiga");
  assert.equal(markers[0]?.consultationId ?? null, null);
});

test("contexto de inflexão sem marco documentado não atribui causa", () => {
  const context = temporalMarkerContext([]);
  assert.equal(context, "Sem motivo associado registrado nesta consulta");
  assert.ok(!context.toLowerCase().includes("caus"));
});

test("AVC e início de intervenção permanecem marcos factuais com vínculo explícito quando documentado", () => {
  const markers = buildOncogeriatricTemporalMarkers({
    patientId: "synthetic-patient",
    episodeId: "synthetic-episode",
    courses: [],
    checkpoints: [{
      id: "cp-1",
      consultationId: "consultation-1",
      occurredAt: "2026-09-11T12:00:00Z",
      structuredData: { careEvents: { stroke: true } },
    }],
    toxicities: [],
    interventions: [{
      id: "intervention-1",
      consultationId: "consultation-2",
      startedAt: "2026-09-12T12:00:00Z",
      createdAt: "2026-09-13T12:00:00Z",
      domain: "MOBILITY",
      description: "Perda funcional registrada",
      intervention: "Início de fisioterapia",
    }],
    recovery: [],
    problemMilestones: [],
  });
  const stroke = markers.find((item) => item.title === "AVC registrado");
  const physiotherapy = markers.find((item) => item.source === "intervention");
  assert.equal(stroke?.consultationId, "consultation-1");
  assert.equal(physiotherapy?.consultationId, "consultation-2");
  assert.equal(new Date(physiotherapy?.occurredAt ?? 0).toISOString(), "2026-09-12T12:00:00.000Z");
  assert.equal(physiotherapy?.detail, "Início de fisioterapia");
});
