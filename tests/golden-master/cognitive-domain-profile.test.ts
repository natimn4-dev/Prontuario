import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCognitiveDomainSnapshot,
  synthesizeCognitiveEtiology,
  type CognitiveScaleInput,
} from "../../src/domain/cognitive-domain-profile.ts";

const appliedAt = "2026-09-14T12:00:00.000Z";

function meem(overrides: Record<string, number> = {}): CognitiveScaleInput {
  return {
    scaleCode: "meem_freitas",
    scaleVersion: "freitas-py-meem-brucki-2026-09-v2",
    appliedAt,
    scoreNumeric: 30,
    scoreText: "30/30",
    answers: {
      time: 5,
      place: 5,
      registration: 3,
      attention: 5,
      recall: 3,
      naming: 2,
      repetition: 1,
      writing: 1,
      commands: 3,
      reading: 1,
      diagram_copy: 1,
      education: 5,
      ...overrides,
    },
  };
}

function moca(overrides: Record<string, number> = {}): CognitiveScaleInput {
  return {
    scaleCode: "moca_br_freitas",
    scaleVersion: "freitas-py-moca-br-experimental-2026-09-v2",
    appliedAt,
    scoreNumeric: 30,
    scoreText: "Bruto 30/30 · corrigido 30/30",
    answers: {
      visuospatial: 5,
      naming: 3,
      attention: 6,
      language: 3,
      abstraction: 2,
      delayed_recall: 5,
      orientation: 6,
      education_years: 13,
      ...overrides,
    },
  };
}

test("MEEM é decomposto por dimensão sem transformar subtotal em diagnóstico", () => {
  const snapshot = buildCognitiveDomainSnapshot([meem({ time: 4, recall: 1, reading: 0 })]);
  const temporal = snapshot.domains.find((item) => item.key === "orientation_temporal")!;
  const memory = snapshot.domains.find((item) => item.key === "delayed_recall")!;
  const reading = snapshot.domains.find((item) => item.key === "reading")!;
  assert.equal(temporal.observations[0].display, "4/5");
  assert.equal(memory.observations[0].display, "1/3");
  assert.equal(reading.observations[0].display, "0/1");
  assert.equal(memory.status, "ERRORS_PRESENT");
  assert.match(memory.interpretation, /não define etiologia isoladamente/i);
});

test("MoCA incorpora visuoespacial, nomeação, atenção, linguagem, abstração, evocação e orientação", () => {
  const snapshot = buildCognitiveDomainSnapshot([moca({ visuospatial: 3, abstraction: 1 })]);
  const keys = new Set(snapshot.domains.map((item) => item.key));
  for (const key of ["executive_visuospatial", "naming", "attention_working_memory", "language", "abstraction", "delayed_recall", "orientation_global"]) {
    assert.ok(keys.has(key), key);
  }
  assert.equal(snapshot.domains.find((item) => item.key === "executive_visuospatial")?.status, "ERRORS_PRESENT");
});

test("relógio Shulman usa somente a regra validada 0–3 alterado e 4–5 normal", () => {
  const altered = buildCognitiveDomainSnapshot([{
    scaleCode: "clock_shulman",
    scaleVersion: "clock-shulman-0-5-br-2026-08-v1",
    answers: { score: 3 },
    scoreNumeric: 3,
    scoreText: "3/5",
    appliedAt,
  }]);
  assert.equal(altered.domains[0]?.key, "executive_visuospatial");
  assert.equal(altered.domains[0]?.status, "ALTERED_VALIDATED_RULE");

  const normal = buildCognitiveDomainSnapshot([{
    scaleCode: "clock_shulman",
    scaleVersion: "clock-shulman-0-5-br-2026-08-v1",
    answers: { score: 4 },
    scoreNumeric: 4,
    scoreText: "4/5",
    appliedAt,
  }]);
  assert.equal(normal.domains[0]?.status, "NO_RECORDED_ERROR");
});

test("fluência verbal permanece valor bruto sem ser classificada automaticamente como alterada", () => {
  const snapshot = buildCognitiveDomainSnapshot([{
    scaleCode: "verbal_fluency_animals",
    scaleVersion: "verbal-fluency-animals-br-2026-09-v1",
    answers: { animal_count: 8, education_years: 4 },
    scoreNumeric: 8,
    scoreText: "8 animais/60 s",
    appliedAt,
  }]);
  const fluency = snapshot.domains.find((item) => item.key === "verbal_fluency")!;
  assert.equal(fluency.status, "RECORDED_NO_CUTOFF");
  assert.doesNotMatch(fluency.interpretation, /demência provável|alzheimer provável/i);
});

test("registro rápido score-only nunca inventa subtotais cognitivos", () => {
  const snapshot = buildCognitiveDomainSnapshot([{
    scaleCode: "meem",
    scaleVersion: "legacy-score-only",
    answers: { score: 22, educationBand: "4_11" },
    scoreNumeric: 22,
    scoreText: "22/30",
    appliedAt,
  }]);
  assert.equal(snapshot.domains.length, 0);
  assert.equal(snapshot.profile, "INSUFFICIENT");
  assert.match(snapshot.missingDetail.join(" "), /subtotais não podem ser inferidos/i);
});

test("predomínio amnéstico descreve erros de memória e não cria etiologia sem fluxo clínico", () => {
  const snapshot = buildCognitiveDomainSnapshot([meem({ recall: 1 })]);
  assert.equal(snapshot.profile, "AMNESTIC");
  const synthesis = synthesizeCognitiveEtiology(snapshot, null);
  assert.equal(synthesis.status, "INSUFFICIENT_CLINICAL_DATA");
  assert.equal(synthesis.leadingLabel, undefined);
  assert.match(synthesis.disclaimer, /não constitui diagnóstico/i);
});

test("erros em memória e executivo/visuoespacial geram perfil multidomínio", () => {
  const snapshot = buildCognitiveDomainSnapshot([meem({ recall: 1, attention: 3 })]);
  assert.equal(snapshot.profile, "MULTIDOMAIN");
});

test("via aguda ou interrompida impede priorização etiológica mesmo com hipótese previamente registrada", () => {
  const snapshot = buildCognitiveDomainSnapshot([meem({ recall: 1 })]);
  const synthesis = synthesizeCognitiveEtiology(snapshot, {
    pathway: "ACUTE_REDIRECT",
    hypotheses: [{ etiology: "ALZHEIMER", label: "Doença de Alzheimer", support: "HIGH" }],
  });
  assert.equal(synthesis.status, "INTERRUPTED_PATHWAY");
  assert.equal(synthesis.leadingLabel, undefined);
});

test("hipótese clínica moderada pode ser priorizada quando o perfil é concordante, sempre com ressalva", () => {
  const snapshot = buildCognitiveDomainSnapshot([meem({ recall: 1 })]);
  const synthesis = synthesizeCognitiveEtiology(snapshot, {
    pathway: "CONTINUE_ELECTIVE",
    hypotheses: [
      { etiology: "ALZHEIMER", label: "Doença de Alzheimer", support: "MODERATE" },
      { etiology: "VASCULAR", label: "Comprometimento cognitivo vascular", support: "LOW" },
    ],
  });
  assert.equal(synthesis.status, "AVAILABLE");
  assert.equal(synthesis.leadingEtiology, "ALZHEIMER");
  assert.equal(synthesis.support, "MODERATE");
  assert.match(synthesis.rationale, /compatível/i);
  assert.match(synthesis.disclaimer, /confirmação permanece médica/i);
});

test("empate entre hipóteses permanece misto ou indeterminado", () => {
  const snapshot = buildCognitiveDomainSnapshot([meem({ recall: 1 })]);
  const synthesis = synthesizeCognitiveEtiology(snapshot, {
    pathway: "CONTINUE_ELECTIVE",
    hypotheses: [
      { etiology: "ALZHEIMER", label: "Doença de Alzheimer", support: "MODERATE" },
      { etiology: "LATE", label: "LATE", support: "MODERATE" },
    ],
  });
  assert.equal(synthesis.status, "MIXED_OR_INDETERMINATE");
  assert.equal(synthesis.leadingLabel, undefined);
});

test("predomínio de linguagem apenas sugere ampliar diferencial frontotemporal sem auto-diagnóstico", () => {
  const snapshot = buildCognitiveDomainSnapshot([moca({ language: 1 })]);
  assert.equal(snapshot.profile, "LANGUAGE");
  const synthesis = synthesizeCognitiveEtiology(snapshot, null);
  assert.match(synthesis.additionalDifferential ?? "", /frontotemporal|afasias progressivas/i);
  assert.notEqual(synthesis.leadingEtiology, "FRONTOTEMPORAL");
});
