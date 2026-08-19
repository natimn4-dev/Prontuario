import assert from "node:assert/strict";
import test from "node:test";
import {
  CORE_FREITAS_SCALES,
  GDS15_FREITAS_VERSION,
  KATZ_FREITAS_VERSION,
  LAWTON_FREITAS_VERSION,
  FREITAS_SCALE_MIGRATION_INVENTORY,
  scoreCoreFreitasScale,
} from "../../src/domain/freitas-core-scales.ts";

function answers(code: "katz" | "lawton" | "gds15", value: number): Record<string, number> {
  const definition = CORE_FREITAS_SCALES.find((item) => item.code === code)!;
  return Object.fromEntries(definition.questions.map((question) => [question.id, value]));
}

test("Katz Freitas preserva faixa 0-6 sem inventar categorias intermediárias", () => {
  const independent = scoreCoreFreitasScale("katz", answers("katz", 1));
  assert.equal(independent.version, KATZ_FREITAS_VERSION);
  assert.equal(independent.result.score, 6);
  assert.equal(independent.result.classification, "Independente nas 6 ABVD");

  const partialAnswers = answers("katz", 1);
  partialAnswers.transfer = 0;
  partialAnswers.continence = 0;
  const partial = scoreCoreFreitasScale("katz", partialAnswers);
  assert.equal(partial.result.score, 4);
  assert.equal(partial.result.classification, "Dependência em 2 de 6 ABVD");
  assert.doesNotMatch(partial.result.classification, /leve|moderada|grave/i);

  const dependent = scoreCoreFreitasScale("katz", answers("katz", 0));
  assert.equal(dependent.result.score, 0);
  assert.equal(dependent.result.classification, "Dependente nas 6 ABVD");
});

test("Lawton Freitas aceita somente sete itens de 1 a 3 e totaliza 7-21", () => {
  const independent = scoreCoreFreitasScale("lawton", answers("lawton", 3));
  assert.equal(independent.version, LAWTON_FREITAS_VERSION);
  assert.equal(independent.result.score, 21);
  assert.equal(independent.result.classification, "Independente nas 7 AIVD");

  const dependent = scoreCoreFreitasScale("lawton", answers("lawton", 1));
  assert.equal(dependent.result.score, 7);
  assert.equal(dependent.result.classification, "Dependente nas 7 AIVD");

  const invalid = answers("lawton", 2);
  invalid.phone = 4;
  assert.throws(() => scoreCoreFreitasScale("lawton", invalid), /phone/);
});

test("GDS-15 Freitas aplica a chave de respostas e cortes aprovados sem diagnosticar depressão", () => {
  const definition = CORE_FREITAS_SCALES.find((item) => item.code === "gds15")!;
  const zero = Object.fromEntries(definition.questions.map((question) => {
    const choice = question.choices.find((item) => item.value === 0)!;
    return [question.id, choice.value];
  }));
  const negative = scoreCoreFreitasScale("gds15", zero);
  assert.equal(negative.version, GDS15_FREITAS_VERSION);
  assert.equal(negative.result.score, 0);
  assert.equal(negative.result.classification, "Rastreio não positivo");

  const six = { ...zero };
  for (let index = 1; index <= 6; index += 1) six[`g${index}`] = 1;
  const suggestive = scoreCoreFreitasScale("gds15", six);
  assert.equal(suggestive.result.score, 6);
  assert.equal(suggestive.result.classification, "Sugestivo de depressão");
  assert.match(suggestive.result.interpretation, /não equivale a diagnóstico/i);

  const eleven = { ...zero };
  for (let index = 1; index <= 11; index += 1) eleven[`g${index}`] = 1;
  const strong = scoreCoreFreitasScale("gds15", eleven);
  assert.equal(strong.result.score, 11);
  assert.equal(strong.result.classification, "Rastreio fortemente positivo");
});

test("resposta ausente, campo extra e valores fora das opções falham fechado", () => {
  const katz = answers("katz", 1);
  delete katz.feeding;
  assert.throws(() => scoreCoreFreitasScale("katz", katz), /feeding/);

  assert.throws(() => scoreCoreFreitasScale("katz", { ...answers("katz", 1), forged: 1 }), /não permitida/);
  assert.throws(() => scoreCoreFreitasScale("gds15", { ...answers("gds15", 0), g1: 2 }), /g1/);
});

test("inventário mantém versões não liberadas explicitamente fora do formulário automático", () => {
  assert.ok(FREITAS_SCALE_MIGRATION_INVENTORY.some((item) => item.name === "MNA completa" && item.status === "migration-required"));
  assert.ok(FREITAS_SCALE_MIGRATION_INVENTORY.some((item) => item.name === "Pfeffer — 10 itens" && item.status === "migration-required"));
  assert.ok(FREITAS_SCALE_MIGRATION_INVENTORY.some((item) => item.name.startsWith("MoCA") && item.status === "migration-required"));
  assert.deepEqual(CORE_FREITAS_SCALES.map((item) => item.code), ["katz", "lawton", "gds15"]);
});
