import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { clinicalAlertsFor } from "../../src/domain/clinical-alerts.ts";
import {
  CORNELL_ITEM_IDS,
  CORNELL_STRUCTURED_DEFINITION,
  CORNELL_STRUCTURED_VERSION,
  scoreCornellStructured,
} from "../../src/domain/cornell-structured.ts";

function answers(value = 0): Record<string, number> {
  return Object.fromEntries(CORNELL_ITEM_IDS.map((id) => [id, value]));
}

function answersForTotal(total: number): Record<string, number> {
  let remaining = total;
  return Object.fromEntries(CORNELL_ITEM_IDS.map((id) => {
    const value = Math.min(2, remaining);
    remaining -= value;
    return [id, value];
  }));
}

test("Cornell estruturada expõe os 19 itens oficiais, sem campo de total manual", () => {
  assert.equal(CORNELL_STRUCTURED_DEFINITION.fields.length, 19);
  assert.deepEqual(CORNELL_STRUCTURED_DEFINITION.fields.map((field) => field.id), [...CORNELL_ITEM_IDS]);
  assert.equal(CORNELL_STRUCTURED_DEFINITION.fields.some((field) => field.id === "score"), false);
  for (const field of CORNELL_STRUCTURED_DEFINITION.fields) {
    assert.deepEqual(field.choices.map((choice) => choice.value), [0, 1, 2, "NA"]);
  }
});

test("Cornell calcula automaticamente e preserva as faixas validadas", () => {
  const expected = [
    [0, "verde"], [7, "verde"], [8, "amarelo"], [11, "amarelo"],
    [12, "vermelho"], [38, "vermelho"],
  ] as const;
  for (const [total, color] of expected) {
    const scored = scoreCornellStructured(answersForTotal(total));
    assert.equal(scored.result.score, total);
    assert.equal(scored.result.clinicalColor, color);
    assert.equal(scored.version, CORNELL_STRUCTURED_VERSION);
  }
});

test("Cornell persiste os itens e mantém co16 disponível para alerta de segurança", () => {
  const raw = answers();
  raw.co16 = 1;
  const scored = scoreCornellStructured(raw);
  assert.equal(scored.answers.co16, 1);
  assert.equal(Object.keys(scored.answers).length, 19);
  assert.equal(clinicalAlertsFor("cornell", { answers: scored.answers }).some((alert) => alert.severity === "urgent"), true);
});

test("Cornell falha fechada para item ausente, não avaliável, inválido ou extra", () => {
  const missing = answers();
  delete missing.co4;
  assert.throws(() => scoreCornellStructured(missing), /co4/);

  assert.throws(() => scoreCornellStructured({ ...answers(), co7: "NA" }), /incompleta.*co7/i);
  assert.throws(() => scoreCornellStructured({ ...answers(), co2: 3 }), /inválida.*co2/i);
  assert.throws(() => scoreCornellStructured({ ...answers(), score: 10 }), /campo não permitido/i);
});

test("endpoint publica e pontua Cornell estruturada antes do fallback legado", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /item\.code === CORNELL_STRUCTURED_CODE[^;]+CORNELL_STRUCTURED_DEFINITION/s);
  assert.match(route, /scaleCode === CORNELL_STRUCTURED_CODE[^;]+scoreCornellStructured\(answers\)/s);
});
