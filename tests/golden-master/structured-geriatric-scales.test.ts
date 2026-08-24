import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BARTHEL_STRUCTURED_DEFINITION,
  BARTHEL_STRUCTURED_VERSION,
  FRAIL_BR_STRUCTURED_DEFINITION,
  FRAIL_BR_STRUCTURED_VERSION,
  MNA_SF_STRUCTURED_DEFINITION,
  MNA_SF_STRUCTURED_VERSION,
  scoreBarthelStructured,
  scoreFrailBrStructured,
  scoreMnaSfStructured,
} from "../../src/domain/structured-geriatric-scales.ts";

test("Barthel estruturado exige dez itens e calcula o total sem campo numérico manual", () => {
  assert.equal(BARTHEL_STRUCTURED_DEFINITION.fields.length, 10);
  assert.ok(BARTHEL_STRUCTURED_DEFINITION.fields.every((field) => field.choices.length >= 2));
  const scored = scoreBarthelStructured({
    feeding: 10,
    bathing: 5,
    grooming: 5,
    dressing: 10,
    bowels: 10,
    bladder: 10,
    toilet: 10,
    transfers: 15,
    mobility: 15,
    stairs: 10,
  });
  assert.equal(scored.result.score, 100);
  assert.equal(scored.version, BARTHEL_STRUCTURED_VERSION);
  assert.throws(() => scoreBarthelStructured({ feeding: 10 }), /Resposta inválida/);
});

test("FRAIL-BR usa cinco checkboxes binários e soma somente riscos presentes", () => {
  assert.equal(FRAIL_BR_STRUCTURED_DEFINITION.fields.length, 5);
  assert.ok(FRAIL_BR_STRUCTURED_DEFINITION.fields.every((field) => field.display === "checkbox"));
  const scored = scoreFrailBrStructured({
    fatigue: 1,
    resistance: 1,
    ambulation: 0,
    illnesses: 0,
    weight_loss: 1,
  });
  assert.equal(scored.result.score, 3);
  assert.match(scored.result.classification, /frágil/i);
  assert.equal(scored.version, FRAIL_BR_STRUCTURED_VERSION);
});

test("MNA-SF estruturada usa seis listas e preserva total e faixas validadas", () => {
  assert.equal(MNA_SF_STRUCTURED_DEFINITION.fields.length, 6);
  assert.ok(MNA_SF_STRUCTURED_DEFINITION.fields.every((field) => field.choices.length >= 2));
  const scored = scoreMnaSfStructured({
    intake: 2,
    weight_loss: 3,
    mobility: 2,
    acute_stress: 2,
    neuropsychological: 2,
    anthropometry: 3,
  });
  assert.equal(scored.result.score, 14);
  assert.match(scored.result.classification, /normal/i);
  assert.equal(scored.version, MNA_SF_STRUCTURED_VERSION);
});

test("endpoint publica e pontua as três versões estruturadas antes do fallback legado", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  for (const token of [
    "BARTHEL_STRUCTURED_DEFINITION",
    "FRAIL_BR_STRUCTURED_DEFINITION",
    "MNA_SF_STRUCTURED_DEFINITION",
    "scoreBarthelStructured",
    "scoreFrailBrStructured",
    "scoreMnaSfStructured",
  ]) assert.match(route, new RegExp(token));
});
