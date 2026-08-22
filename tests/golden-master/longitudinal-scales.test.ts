import assert from "node:assert/strict";
import test from "node:test";
import { buildScaleEvolution, compareScalePoints } from "../../src/domain/longitudinal-scales.ts";

const point = (score:number, date:string, extra:Record<string,unknown>={}) => ({
  patientId:"p1", consultationId:`c-${date}`, scaleCode:"barthel", scaleVersion:"1.0", score, appliedAt:date, ...extra,
});

test("escala higher-better classifica aumento como tendência favorável", () => {
  const result = compareScalePoints(point(60,"2026-01-01"), point(80,"2026-02-01"));
  assert.equal(result.trend, "favorable");
  assert.equal(result.delta, 20);
});

test("escala higher-worse classifica aumento como tendência desfavorável", () => {
  const a = { ...point(5,"2026-01-01"), scaleCode:"gds15" };
  const b = { ...point(8,"2026-02-01"), scaleCode:"gds15" };
  assert.equal(compareScalePoints(a,b).trend, "unfavorable");
});

test("ISI usa direção higher-worse no histórico longitudinal", () => {
  const improved = compareScalePoints(
    { ...point(16,"2026-01-01"), scaleCode:"isi", scaleVersion:"ISI-7-scoring-2001-BR-validation-2011-v1" },
    { ...point(10,"2026-02-01"), scaleCode:"isi", scaleVersion:"ISI-7-scoring-2001-BR-validation-2011-v1" },
  );
  const worsened = compareScalePoints(
    { ...point(10,"2026-02-01"), scaleCode:"isi", scaleVersion:"ISI-7-scoring-2001-BR-validation-2011-v1" },
    { ...point(16,"2026-03-01"), scaleCode:"isi", scaleVersion:"ISI-7-scoring-2001-BR-validation-2011-v1" },
  );
  assert.equal(improved.trend, "favorable");
  assert.equal(improved.delta, -6);
  assert.equal(worsened.trend, "unfavorable");
  assert.equal(worsened.delta, 6);
});

test("versões diferentes nunca são comparadas silenciosamente", () => {
  const a = point(60,"2026-01-01");
  const b = { ...point(70,"2026-02-01"), scaleVersion:"2.0" };
  assert.equal(compareScalePoints(a,b).trend, "not-comparable");
});

test("evolução compara atual com anterior e baseline explicitamente", () => {
  const result = buildScaleEvolution([
    point(80,"2026-01-01", { isBaseline:true }),
    point(70,"2026-03-01"),
    point(60,"2026-06-01"),
  ]);
  assert.equal(result.baseline?.score, 80);
  assert.equal(result.previous?.score, 70);
  assert.equal(result.current?.score, 60);
  assert.equal(result.vsPrevious.trend, "unfavorable");
  assert.equal(result.vsBaseline.delta, -20);
});

test("consolida gravações da mesma consulta antes de escolher anterior e atual", () => {
  const result = buildScaleEvolution([
    { ...point(80, "2026-01-01"), consultationId: "baseline", isBaseline: true },
    { ...point(70, "2026-03-01"), consultationId: "consultation-a" },
    { ...point(60, "2026-06-01T10:00:00Z"), consultationId: "consultation-b" },
    { ...point(65, "2026-06-01T11:00:00Z"), consultationId: "consultation-b" },
  ]);

  assert.equal(result.baseline?.score, 80);
  assert.equal(result.previous?.score, 70);
  assert.equal(result.previous?.consultationId, "consultation-a");
  assert.equal(result.current?.score, 65);
  assert.equal(result.current?.consultationId, "consultation-b");
});

test("baseline usa a gravação efetiva mais recente da consulta baseline", () => {
  const result = buildScaleEvolution([
    { ...point(75, "2026-01-01T09:00:00Z"), consultationId: "baseline", isBaseline: true },
    { ...point(80, "2026-01-01T10:00:00Z"), consultationId: "baseline", isBaseline: true },
    { ...point(70, "2026-03-01"), consultationId: "consultation-a" },
  ]);

  assert.equal(result.baseline?.score, 80);
  assert.equal(result.current?.score, 70);
});
