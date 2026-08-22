import assert from "node:assert/strict";
import test from "node:test";
import { classifyIsi, ISI_QUICK_DEFINITION, scoreIsi } from "../../src/domain/isi.ts";

test("ISI quick entry exposes only one numeric total-score field", () => {
  assert.equal(ISI_QUICK_DEFINITION.dimension, "sono");
  assert.equal(ISI_QUICK_DEFINITION.fields.length, 1);
  assert.equal(ISI_QUICK_DEFINITION.fields[0].id, "score");
  assert.equal(ISI_QUICK_DEFINITION.fields[0].number.min, 0);
  assert.equal(ISI_QUICK_DEFINITION.fields[0].number.max, 28);
  assert.match(ISI_QUICK_DEFINITION.instruction, /não reproduz os sete itens/i);
});

test("ISI accepts only an integer total from 0 to 28", () => {
  assert.throws(() => scoreIsi({}), /ISI_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreIsi({ score: -1 }), /ISI_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreIsi({ score: 29 }), /ISI_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreIsi({ score: 8.5 }), /ISI_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreIsi({ score: 8, item1: 1 }), /ISI_UNEXPECTED_FIELD:item1/);
});

test("ISI score-only preserves total and does not derive it from questionnaire items", () => {
  const scored = scoreIsi({ score: 16 });
  assert.deepEqual(scored.answers, { score: 16 });
  assert.equal(scored.result.score, 16);
  assert.equal(scored.result.scoreText, "16/28");
});

test("ISI boundary 7 -> first classification and 8 -> second", () => {
  assert.match(classifyIsi(7).classification, /sem sintomas clinicamente significativos/i);
  assert.match(classifyIsi(8).classification, /abaixo do limiar/i);
});

test("ISI boundary 14 -> second classification and 15 -> third", () => {
  assert.match(classifyIsi(14).classification, /abaixo do limiar/i);
  assert.match(classifyIsi(15).classification, /moderada/i);
});

test("ISI boundary 21 -> third classification and 22 -> fourth", () => {
  assert.match(classifyIsi(21).classification, /moderada/i);
  assert.match(classifyIsi(22).classification, /grave/i);
});

test("ISI interpretation is screening-safe and never emits an automatic prescription", () => {
  for (const total of [0, 8, 15, 22, 28]) {
    const result = scoreIsi({ score: total }).result;
    const text = `${result.classification} ${result.interpretation}`.toLocaleLowerCase("pt-BR");
    assert.match(text, /não estabelece diagnóstico/);
    assert.doesNotMatch(text, /prescrev|iniciar melatonina|iniciar antidepress|hipnótico|ajustar dose|suspender medicamento/);
  }
});
