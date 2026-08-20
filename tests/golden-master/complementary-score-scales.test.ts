import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPLEMENTARY_SCORE_SCALES,
  scoreComplementaryScale,
} from "../../src/domain/complementary-score-scales.ts";

test("restores the complementary scale inventory without duplicating Freitas/Py core forms", () => {
  const codes = new Set(COMPLEMENTARY_SCORE_SCALES.map((item) => item.code));
  for (const expected of [
    "moca", "meem", "barthel", "cornell", "cam", "dez_cs", "frail_br", "sarcf",
    "preensao", "velocidade_marcha", "sentar_levantar_5x", "polifarmacia", "stoppfall",
    "kps", "lace", "g8", "ves13", "mna_sf", "charlson", "fast", "pps", "esas",
  ]) {
    assert.ok(codes.has(expected as never), `missing complementary scale ${expected}`);
  }
  assert.equal(codes.has("katz" as never), false);
  assert.equal(codes.has("lawton" as never), false);
  assert.equal(codes.has("pfeffer10" as never), false);
});

test("MoCA quick entry preserves screening semantics and never labels a diagnosis", () => {
  const lower = scoreComplementaryScale("moca", { score: 22 });
  assert.equal(lower.result.score, 22);
  assert.match(lower.result.classification, /abaixo/i);
  assert.match(lower.result.interpretation, /não estabelece diagnóstico/i);

  const preserved = scoreComplementaryScale("moca", { score: 27 });
  assert.match(preserved.result.classification, /referência histórica/i);
});

test("MEEM quick entry requires education and applies the historical education reference", () => {
  const result = scoreComplementaryScale("meem", { score: 24, education: "1 a 4 anos" });
  assert.equal(result.result.score, 24);
  assert.match(result.result.classification, /abaixo/i);
  assert.match(result.result.interpretation, /25 pontos/i);
  assert.throws(() => scoreComplementaryScale("meem", { score: 24 }), /education/);
});

test("restored functional and frailty totals use the preserved golden-master cutoffs", () => {
  assert.match(scoreComplementaryScale("barthel", { score: 100 }).result.classification, /independente/i);
  assert.match(scoreComplementaryScale("frail_br", { score: 2 }).result.classification, /pré-frágil/i);
  assert.match(scoreComplementaryScale("sarcf", { score: 4 }).result.classification, /positivo|provável/i);
});

test("CAM quick entry records only the already-applied conclusion and preserves urgency", () => {
  const positive = scoreComplementaryScale("cam", { status: 1 });
  assert.equal(positive.result.score, 1);
  assert.match(positive.result.classification, /delirium provável/i);
  assert.match(positive.result.interpretation, /imediata/i);
});

test("mobility quick entries keep historical thresholds", () => {
  assert.match(scoreComplementaryScale("velocidade_marcha", { score: 0.8 }).result.classification, /reduzida/i);
  assert.match(scoreComplementaryScale("velocidade_marcha", { score: 0.81 }).result.classification, /preservada/i);
  assert.match(scoreComplementaryScale("sentar_levantar_5x", { score: 16 }).result.classification, /reduzida/i);
  assert.match(scoreComplementaryScale("preensao", { score: 15, sex: "Feminino" }).result.classification, /reduzida/i);
});

test("FAST and PPS preserve discrete-version semantics", () => {
  assert.equal(scoreComplementaryScale("fast", { score: 7.6 }).result.score, 7.6);
  assert.equal(scoreComplementaryScale("pps", { score: 40 }).result.score, 40);
  assert.match(scoreComplementaryScale("fast", { score: 6.7 }).result.classification, /não permitido/i);
});

test("medication-related scales never encode an automatic prescription", () => {
  const poly = scoreComplementaryScale("polifarmacia", { score: 4 });
  const falls = scoreComplementaryScale("stoppfall", { score: 3 });
  const combined = `${poly.result.interpretation} ${falls.result.interpretation}`.toLocaleLowerCase("pt-BR");
  assert.doesNotMatch(combined, /prescrever|iniciar estatina|vitamina d/);
});
