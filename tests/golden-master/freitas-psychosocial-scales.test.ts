import assert from "node:assert/strict";
import test from "node:test";
import { PSYCHOSOCIAL_FREITAS_SCALES, scorePsychosocialFreitasScale } from "../../src/domain/freitas-psychosocial-scales.ts";

function filled(code: string, value: number): Record<string, number> {
  const definition = PSYCHOSOCIAL_FREITAS_SCALES.find((item) => item.code === code)!;
  return Object.fromEntries(definition.questions.map((question) => {
    const allowed = question.choices!.map((choice) => choice.value);
    assert.ok(allowed.includes(value), `${question.id} não aceita ${value}`);
    return [question.id, value];
  }));
}

test("CES-D usa 20 itens, reversão já codificada nas opções e corte brasileiro >=12", () => {
  const zero = filled("cesd_br_elderly", 0);
  const negative = scorePsychosocialFreitasScale("cesd_br_elderly", zero);
  assert.equal(Object.keys(negative.answers).length, 20);
  assert.equal(negative.result.score, 0);
  assert.match(negative.result.classification, /não positivo/i);

  const eleven = { ...zero, i1: 3, i2: 3, i3: 3, i5: 2 };
  assert.equal(scorePsychosocialFreitasScale("cesd_br_elderly", eleven).result.score, 11);
  assert.match(scorePsychosocialFreitasScale("cesd_br_elderly", eleven).result.classification, /não positivo/i);

  const twelve = { ...eleven, i5: 3 };
  const positive = scorePsychosocialFreitasScale("cesd_br_elderly", twelve);
  assert.equal(positive.result.score, 12);
  assert.match(positive.result.classification, /positivo/i);
  assert.match(positive.result.interpretation, /não estabelece diagnóstico/i);

  const definition = PSYCHOSOCIAL_FREITAS_SCALES.find((item) => item.code === "cesd_br_elderly")!;
  assert.equal(definition.questions[3].choices?.find((choice) => choice.label.startsWith("Raramente"))?.value, 3);
  assert.equal(definition.questions[7].choices?.find((choice) => choice.label.startsWith("A maior parte"))?.value, 0);
});

test("MOS-SSS transforma 19 itens 0–4 em 0–100 sem inventar cutoff", () => {
  const low = scorePsychosocialFreitasScale("mos_sss_br_19", filled("mos_sss_br_19", 0));
  assert.equal(low.result.score, 0);
  assert.equal(low.result.scoreText, "0.0/100");
  assert.match(low.result.classification, /registrado/i);
  assert.match(low.result.interpretation, /não há cutoff universal/i);

  const high = scorePsychosocialFreitasScale("mos_sss_br_19", filled("mos_sss_br_19", 4));
  assert.equal(high.result.score, 100);
  assert.match(high.result.interpretation, /Material 100.0\/100/);
  assert.match(high.result.interpretation, /afetivo 100.0\/100/);
  assert.match(high.result.interpretation, /emocional\/informacional 100.0\/100/);
});

test("APGAR familiar usa faixas brasileiras validadas para idosos", () => {
  const base = filled("family_apgar_br_elderly", 0);
  const four = { ...base, adaptation: 2, partnership: 2 };
  assert.equal(scorePsychosocialFreitasScale("family_apgar_br_elderly", four).result.score, 4);
  assert.match(scorePsychosocialFreitasScale("family_apgar_br_elderly", four).result.classification, /Elevada disfunção/i);

  const five = { ...four, growth: 1 };
  assert.match(scorePsychosocialFreitasScale("family_apgar_br_elderly", five).result.classification, /Moderada disfunção/i);

  const six = { ...four, growth: 2 };
  assert.match(scorePsychosocialFreitasScale("family_apgar_br_elderly", six).result.classification, /Moderada disfunção/i);

  const seven = { ...six, affection: 1 };
  const good = scorePsychosocialFreitasScale("family_apgar_br_elderly", seven);
  assert.equal(good.result.score, 7);
  assert.match(good.result.classification, /Boa funcionalidade/i);
  assert.match(good.result.interpretation, /rastreio/i);
});

test("Zarit brasileira mantém 22 itens, total 0–88 e item 22 de intensidade", () => {
  const none = scorePsychosocialFreitasScale("zarit_br_22", filled("zarit_br_22", 0));
  assert.equal(none.result.score, 0);
  assert.equal(none.result.scoreText, "0/88");
  assert.match(none.result.classification, /registrado/i);
  assert.match(none.result.interpretation, /sem faixas automáticas/i);

  const max = scorePsychosocialFreitasScale("zarit_br_22", filled("zarit_br_22", 4));
  assert.equal(max.result.score, 88);

  const definition = PSYCHOSOCIAL_FREITAS_SCALES.find((item) => item.code === "zarit_br_22")!;
  assert.equal(definition.questions.length, 22);
  assert.match(definition.questions[15].label, /incapaz de cuidar/i);
  assert.deepEqual(definition.questions[21].choices?.map((choice) => choice.label), ["Nem um pouco", "Um pouco", "Moderadamente", "Muito", "Extremamente"]);
});

test("escalas psicossociais falham fechado em resposta faltante, extra ou inválida", () => {
  const apgar = filled("family_apgar_br_elderly", 0);
  delete apgar.resolve;
  assert.throws(() => scorePsychosocialFreitasScale("family_apgar_br_elderly", apgar), /resolve/);
  assert.throws(() => scorePsychosocialFreitasScale("family_apgar_br_elderly", { ...filled("family_apgar_br_elderly", 0), forged: 1 }), /não permitida/);
  assert.throws(() => scorePsychosocialFreitasScale("zarit_br_22", { ...filled("zarit_br_22", 0), i1: 7 }), /i1/);
});
