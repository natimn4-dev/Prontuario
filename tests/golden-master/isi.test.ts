import assert from "node:assert/strict";
import test from "node:test";
import { classifyIsi, ISI_ITEM_IDS, parseIsiAnswers, scoreIsi } from "../../src/domain/isi.ts";

function answersForTotal(total: number): Record<string, number> {
  if (!Number.isInteger(total) || total < 0 || total > 28) throw new Error("invalid fixture total");
  let remaining = total;
  return Object.fromEntries(ISI_ITEM_IDS.map((itemId) => {
    const value = Math.min(4, remaining);
    remaining -= value;
    return [itemId, value];
  }));
}

test("ISI requires all seven structured answers and rejects manual/out-of-range values", () => {
  assert.throws(() => parseIsiAnswers({}), /ISI_MISSING_ANSWER:item1/);
  assert.throws(() => parseIsiAnswers({ ...answersForTotal(0), item3: 5 }), /ISI_INVALID_ANSWER:item3/);
  assert.throws(() => parseIsiAnswers({ ...answersForTotal(0), total: 12 }), /ISI_UNEXPECTED_ANSWER:total/);
});

test("ISI all zero scores 0/28", () => {
  const scored = scoreIsi(answersForTotal(0));
  assert.equal(scored.result.score, 0);
  assert.equal(scored.result.scoreText, "0/28");
  assert.match(scored.result.classification, /ausência/i);
});

test("ISI all four scores 28/28", () => {
  const scored = scoreIsi(answersForTotal(28));
  assert.equal(scored.result.score, 28);
  assert.equal(scored.result.scoreText, "28/28");
  assert.match(scored.result.classification, /grave/i);
});

test("ISI calculates intermediate totals without a manually supplied total", () => {
  const scored = scoreIsi({ item1: 1, item2: 2, item3: 3, item4: 4, item5: 1, item6: 2, item7: 3 });
  assert.equal(scored.result.score, 16);
  assert.equal(scored.result.scoreText, "16/28");
});

test("ISI boundary 7 -> first classification and 8 -> second", () => {
  assert.match(classifyIsi(7).classification, /ausência/i);
  assert.match(classifyIsi(8).classification, /abaixo do limiar|subclín/i);
});

test("ISI boundary 14 -> second classification and 15 -> third", () => {
  assert.match(classifyIsi(14).classification, /abaixo do limiar|subclín/i);
  assert.match(classifyIsi(15).classification, /moderada/i);
});

test("ISI boundary 21 -> third classification and 22 -> fourth", () => {
  assert.match(classifyIsi(21).classification, /moderada/i);
  assert.match(classifyIsi(22).classification, /grave/i);
});

test("ISI interpretation is screening-safe and never emits an automatic prescription", () => {
  for (const total of [0, 8, 15, 22, 28]) {
    const result = scoreIsi(answersForTotal(total)).result;
    const text = `${result.classification} ${result.interpretation}`.toLocaleLowerCase("pt-BR");
    assert.match(text, /não estabelece diagnóstico/);
    assert.doesNotMatch(text, /prescrev|iniciar melatonina|iniciar antidepress|hipnótico|ajustar dose|suspender medicamento/);
  }
});
