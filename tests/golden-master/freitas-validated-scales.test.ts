import assert from "node:assert/strict";
import test from "node:test";
import { VALIDATED_FREITAS_SCALES, scoreValidatedFreitasScale } from "../../src/domain/freitas-validated-scales.ts";

function choicesFor(code: "mna_full" | "pfeffer10" | "poma_freitas", pick: "min" | "max") {
  const definition = VALIDATED_FREITAS_SCALES.find((item) => item.code === code)!;
  return Object.fromEntries(definition.questions.map((question) => {
    const values = question.choices!.map((choice) => choice.value);
    return [question.id, pick === "min" ? Math.min(...values) : Math.max(...values)];
  }));
}

test("MNA completa preserva 0-30 e classificação validada", () => {
  const normal = scoreValidatedFreitasScale("mna_full", choicesFor("mna_full", "max"));
  assert.equal(normal.result.score, 30);
  assert.equal(normal.result.classification, "Estado nutricional normal");
  assert.match(normal.result.scoreText, /30\/30/);

  const malnourished = scoreValidatedFreitasScale("mna_full", choicesFor("mna_full", "min"));
  assert.equal(malnourished.result.score, 0);
  assert.equal(malnourished.result.classification, "Desnutrição pelo MNA");

  const risk = choicesFor("mna_full", "min");
  risk.b_weight = 3; risk.c_mobility = 2; risk.d_stress = 2; risk.e_neuropsych = 2; risk.f_bmi = 3;
  risk.g_home = 1; risk.h_meds = 1; risk.i_skin = 1; risk.j_meals = 2; risk.k_protein = 1; risk.l_produce = 1;
  assert.equal(scoreValidatedFreitasScale("mna_full", risk).result.classification, "Risco de desnutrição");
});

test("Pfeffer Freitas usa exatamente 10 itens e total 0-30", () => {
  const independent = scoreValidatedFreitasScale("pfeffer10", choicesFor("pfeffer10", "min"));
  assert.equal(Object.keys(independent.answers).length, 10);
  assert.equal(independent.result.score, 0);
  assert.match(independent.result.classification, /Sem prejuízo/);

  const affected = choicesFor("pfeffer10", "min");
  affected.finance = 3; affected.business = 3;
  const result = scoreValidatedFreitasScale("pfeffer10", affected);
  assert.equal(result.result.score, 6);
  assert.equal(result.result.classification, "Rastreio de prejuízo funcional positivo");
  assert.match(result.result.interpretation, /não estabelece diagnóstico/i);
});

test("SPPB preserva tempos brutos e limites Freitas para 3 m/cadeira", () => {
  const best = scoreValidatedFreitasScale("sppb_freitas", { balance: 4, gait_seconds: 3.61, chair_seconds: 11.19 });
  assert.equal(best.result.score, 12);
  assert.deepEqual(best.answers, { balance: 4, gait_seconds: 3.61, chair_seconds: 11.19 });

  const boundary = scoreValidatedFreitasScale("sppb_freitas", { balance: 2, gait_seconds: 6.52, chair_seconds: 16.7 });
  assert.equal(boundary.result.score, 5);
  assert.equal(boundary.result.classification, "Baixo desempenho físico");

  const unable = scoreValidatedFreitasScale("sppb_freitas", { balance: 0, gait_seconds: 0, chair_seconds: 0 });
  assert.equal(unable.result.score, 0);
});

test("POMA Freitas mantém versão 57 pontos sem aplicar corte Tinetti 28", () => {
  const best = scoreValidatedFreitasScale("poma_freitas", choicesFor("poma_freitas", "max"));
  assert.equal(best.result.score, 57);
  assert.match(best.result.scoreText, /equilíbrio 39\/39/);
  assert.match(best.result.scoreText, /marcha 18\/18/);
  assert.match(best.result.interpretation, /não foi aplicado corte/i);

  const worst = scoreValidatedFreitasScale("poma_freitas", choicesFor("poma_freitas", "min"));
  assert.equal(worst.result.score, 22);
});

test("respostas extras, ausentes ou numéricas fora da faixa falham fechado", () => {
  assert.throws(() => scoreValidatedFreitasScale("sppb_freitas", { balance: 4, gait_seconds: 3, chair_seconds: 10, forged: 1 }), /Resposta não permitida/);
  assert.throws(() => scoreValidatedFreitasScale("sppb_freitas", { balance: 4, gait_seconds: 3 }), /chair_seconds/);
  assert.throws(() => scoreValidatedFreitasScale("sppb_freitas", { balance: 4, gait_seconds: 999, chair_seconds: 10 }), /gait_seconds/);
});
