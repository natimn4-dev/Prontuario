import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  usesContinuousMeasurementEntry,
  withStructuredScaleEntry,
  type StructuredEntryDefinition,
} from "../../src/domain/structured-scale-entry.ts";

test("discrete numeric score becomes a selection list without changing the numeric rule", () => {
  const definition = withStructuredScaleEntry({
    code: "stoppfall",
    fields: [{ id: "score", label: "Classes", number: { min: 0, max: 14, step: 1 } }],
  });

  const field = definition.fields[0]!;
  assert.deepEqual(field.number, { min: 0, max: 14, step: 1 });
  assert.equal(field.choices?.length, 15);
  assert.deepEqual(field.choices?.slice(0, 3).map((choice) => choice.value), [0, 1, 2]);
  assert.equal(field.choices?.at(-1)?.value, 14);
});

test("fractional discrete scores are exposed as exact selectable values", () => {
  const definition = withStructuredScaleEntry({
    code: "g8",
    fields: [{ id: "score", label: "G8", number: { min: 0, max: 17, step: 0.5 } }],
  });

  const values = definition.fields[0]!.choices?.map((choice) => choice.value);
  assert.equal(values?.length, 35);
  assert.deepEqual(values?.slice(0, 4), [0, 0.5, 1, 1.5]);
  assert.equal(values?.at(-1), 17);
});

test("continuous physical measurements remain exact numeric measurements", () => {
  for (const code of ["preensao", "velocidade_marcha", "sentar_levantar_5x"]) {
    assert.equal(usesContinuousMeasurementEntry(code), true);
    const original: StructuredEntryDefinition = {
      code,
      fields: [{ id: "score", label: "Medida", number: { min: 0, max: 100, step: 0.01, unit: "un" } }],
    };
    const definition = withStructuredScaleEntry(original);
    assert.equal(definition, original);
    assert.equal(definition.fields[0]!.choices, undefined);
  }
});

test("already structured item choices remain unchanged", () => {
  const choices = [{ value: 0, label: "Não" }, { value: 1, label: "Sim" }] as const;
  const definition = withStructuredScaleEntry({
    code: "frail_itemized",
    fields: [{ id: "fatigue", label: "Fadiga", choices }],
  });
  assert.equal(definition.fields[0]!.choices, choices);
});

test("complementary endpoint structures legacy discrete scales before appending cognitive entries and ISI", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /withStructuredScaleEntry/);
  assert.match(route, /\.map\(\(item\) => withStructuredScaleEntry\(item\)\)/);
  assert.match(route, /\.\.\.COGNITIVE_QUICK_DEFINITIONS,\s*COGNITIVE_DOMAIN_OBSERVATION_DEFINITION,\s*ISI_QUICK_DEFINITION/);
});
