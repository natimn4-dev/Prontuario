import assert from "node:assert/strict";
import test from "node:test";
import { COGNITIVE_FREITAS_SCALES, scoreCognitiveFreitasScale } from "../../src/domain/freitas-cognitive-scales.ts";

function answerChoices(code: string, value: "min" | "max") {
  const definition = COGNITIVE_FREITAS_SCALES.find((item) => item.code === code)!;
  return Object.fromEntries(definition.questions.map((q) => {
    if (q.choices) {
      const values = q.choices.map((option) => option.value);
      return [q.id, value === "min" ? Math.min(...values) : Math.max(...values)];
    }
    return [q.id, value === "min" ? q.number!.min : q.number!.max];
  }));
}

test("Mini-Cog soma evocação 0–3 e relógio 0/2 com corte convencional 0–2", () => {
  const positive = scoreCognitiveFreitasScale("minicog_freitas", { recall: 2, clock: 0 });
  assert.equal(positive.result.score, 2);
  assert.match(positive.result.classification, /positivo/i);
  assert.match(positive.result.interpretation, /não estabelece diagnóstico/i);

  const negative = scoreCognitiveFreitasScale("minicog_freitas", { recall: 1, clock: 2 });
  assert.equal(negative.result.score, 3);
  assert.match(negative.result.classification, /não positivo/i);
});

test("MEEM totaliza 0–30 sem somar escolaridade e usa mediana apenas como referência", () => {
  const answers = { time:5, place:5, registration:3, attention:5, recall:3, language:9, education:5 };
  const result = scoreCognitiveFreitasScale("meem_freitas", answers);
  assert.equal(result.result.score, 30);
  assert.match(result.result.interpretation, /mediana 26.5\/30/i);
  assert.match(result.result.interpretation, /não constitui ponto diagnóstico/i);
});

test("relógio Shulman mantém 4–5 normal e 0–3 alterado", () => {
  assert.match(scoreCognitiveFreitasScale("clock_shulman", { score: 4 }).result.classification, /normal/i);
  assert.match(scoreCognitiveFreitasScale("clock_shulman", { score: 3 }).result.classification, /alterado/i);
});

test("MoCA aplica correção educacional sem ultrapassar 30 e não cria corte abaixo de 4 anos", () => {
  const full = { visuospatial:5,naming:3,attention:6,language:3,abstraction:2,delayed_recall:5,orientation:6,education_years:8 };
  const max = scoreCognitiveFreitasScale("moca_br_freitas", full);
  assert.equal(max.result.score, 30);
  assert.match(max.result.interpretation, /correção educacional \+1/i);

  const lowEducation = scoreCognitiveFreitasScale("moca_br_freitas", { ...full, visuospatial:1, education_years:2 });
  assert.match(lowEducation.result.interpretation, /não sustenta um ponto de corte automático/i);

  const fourToTwelve = scoreCognitiveFreitasScale("moca_br_freitas", { ...full, visuospatial:0,naming:0,attention:4,language:2,abstraction:1,delayed_recall:4,orientation:5,education_years:8 });
  assert.equal(fourToTwelve.result.score, 17);
  assert.match(fourToTwelve.result.classification, /alterado/i);
});

test("IQCODE-Br 26 calcula média 1–5 e usa 3,52 somente como referência de rastreio", () => {
  const neutral = answerChoices("iqcode_br_26", "min");
  for (const key of Object.keys(neutral)) neutral[key] = 3;
  const stable = scoreCognitiveFreitasScale("iqcode_br_26", neutral);
  assert.equal(stable.result.score, 3);
  assert.match(stable.result.classification, /abaixo/i);

  const worse = { ...neutral, i1:5,i2:5,i3:5,i4:5,i5:5,i6:5,i7:5 };
  const positive = scoreCognitiveFreitasScale("iqcode_br_26", worse);
  assert.ok(positive.result.score >= 3.52);
  assert.match(positive.result.classification, /acima/i);
  assert.match(positive.result.interpretation, /não deve ser usado isoladamente/i);
});

test("escalas cognitivas rejeitam respostas extras, faltantes e fora da faixa", () => {
  assert.throws(() => scoreCognitiveFreitasScale("minicog_freitas", { recall:3, clock:2, forged:1 }), /não permitida/);
  assert.throws(() => scoreCognitiveFreitasScale("minicog_freitas", { recall:3 }), /clock/);
  assert.throws(() => scoreCognitiveFreitasScale("meem_freitas", { time:6, place:5, registration:3, attention:5, recall:3, language:9, education:5 }), /time/);
});
