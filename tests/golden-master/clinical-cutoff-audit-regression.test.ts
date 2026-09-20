import assert from "node:assert/strict";
import test from "node:test";
import { scoreComplementaryScale } from "../../src/domain/complementary-score-scales.ts";
import {
  CHARLSON_STRUCTURED_DEFINITION,
  scoreStructuredCharlson,
  scoreStructuredEsas,
} from "../../src/domain/structured-g8-charlson-esas.ts";
import { scoreValidatedFreitasScale } from "../../src/domain/freitas-validated-scales.ts";
import { scoreSarcfStructured } from "../../src/domain/sarcf-structured.ts";
import {
  STOPPFALL_STRUCTURED_DEFINITION,
  scoreStoppfallStructured,
} from "../../src/domain/stoppfall-structured.ts";
import {
  TEN_CS_STRUCTURED_DEFINITION,
  scoreTenCsStructured,
} from "../../src/domain/ten-cs-structured.ts";

test("SARC-F positivo permanece rastreio e não vira sarcopenia provável isoladamente", () => {
  const result = scoreSarcfStructured({
    strength: 1,
    walking: 1,
    chair: 1,
    stairs: 1,
    falls: 0,
  }).result;

  assert.equal(result.score, 4);
  assert.match(result.classification, /rastreio positivo/i);
  assert.doesNotMatch(result.classification, /sarcopenia provável/i);
  assert.match(result.interpretation, /força muscular/i);
  assert.match(result.interpretation, /não estabelece sarcopenia provável/i);
});

test("10-CS-Edu explicita 0 anos +2, 1–3 anos +1 e 4+ anos sem ajuste", () => {
  const field = TEN_CS_STRUCTURED_DEFINITION.fields.find((item) => item.id === "educationAdjustment");
  assert.ok(field && "choices" in field && field.choices);
  assert.deepEqual(field.choices.map((choice) => choice.value), [2, 1, 0]);
  assert.match(field.choices[0]!.label, /sem escolaridade formal.*2/i);
  assert.match(field.choices[1]!.label, /1 a 3 anos.*1/i);
  assert.match(field.choices[2]!.label, /4 anos ou mais.*sem ajuste/i);

  const base = {
    orientationYear: 1,
    orientationMonth: 1,
    orientationDate: 1,
    animalFluency: 2,
    recall1: 1,
    recall2: 0,
    recall3: 0,
  };
  assert.equal(scoreTenCsStructured({ ...base, educationAdjustment: 0 }).result.score, 6);
  assert.equal(scoreTenCsStructured({ ...base, educationAdjustment: 1 }).result.score, 7);
});

test("SPPB atual usa corte EWGSOP2 <=8 e não as três faixas históricas", () => {
  const low = scoreValidatedFreitasScale("sppb_freitas", {
    balance: 4,
    gait_seconds: 5,
    chair_seconds: 14,
  });
  assert.equal(low.result.score, 8);
  assert.equal(low.result.classification, "Baixo desempenho físico");

  const above = scoreValidatedFreitasScale("sppb_freitas", {
    balance: 4,
    gait_seconds: 4,
    chair_seconds: 14,
  });
  assert.equal(above.result.score, 9);
  assert.match(above.result.classification, /acima do corte/i);
});

test("STOPPFall mantém as 14 classes, mas identifica as faixas por contagem como locais", () => {
  const one = Object.fromEntries(STOPPFALL_STRUCTURED_DEFINITION.fields.map((field) => [field.id, 0]));
  one.anticholinergics = 1;
  const oneResult = scoreStoppfallStructured(one).result;
  assert.equal(oneResult.score, 1);
  assert.match(oneResult.classification, /faixa local/i);
  assert.match(oneResult.interpretation, /regra local/i);

  const three = { ...one, diuretics: 1, benzodiazepines: 1 };
  const threeResult = scoreStoppfallStructured(three).result;
  assert.equal(threeResult.score, 3);
  assert.match(threeResult.classification, /faixa local/i);
  assert.match(threeResult.interpretation, /não um ponto de corte validado/i);
});

test("Charlson, PPS e ESAS distinguem escore validado de agrupamentos locais de apresentação", () => {
  const charlsonAnswers = Object.fromEntries(
    CHARLSON_STRUCTURED_DEFINITION.fields.map((field) => [field.id, 0]),
  );
  const charlson = scoreStructuredCharlson(charlsonAnswers).result;
  assert.match(charlson.classification, /faixa local/i);
  assert.match(charlson.interpretation, /não.*mortalidade individual validada/i);

  const pps = scoreComplementaryScale("pps", { score: 70 }).result;
  assert.match(pps.classification, /faixa local/i);
  assert.match(pps.interpretation, /não estima tempo de vida individual/i);

  const esasAnswers = {
    pain: 0,
    tiredness: 0,
    drowsiness: 0,
    nausea: 0,
    appetite: 0,
    dyspnea: 0,
    depression: 0,
    anxiety: 0,
    wellbeing: 0,
  };
  const esas = scoreStructuredEsas(esasAnswers).result;
  assert.match(esas.classification, /faixa local/i);
  assert.match(esas.interpretation, /sintoma individual/i);
});
