import assert from "node:assert/strict";
import test from "node:test";
import { buildScaleChartSeries } from "../../src/domain/scale-chart-series.ts";

const point = (input: {
  consultationId: string;
  appliedAt: string;
  score: number | null;
  version?: string;
  baseline?: boolean;
}) => ({
  patientId: "p1",
  consultationId: input.consultationId,
  scaleCode: "barthel",
  scaleVersion: input.version ?? "1.0",
  score: input.score,
  appliedAt: input.appliedAt,
  isBaseline: input.baseline,
});

test("série gráfica ordena consultas e preserva baseline sem recalcular score", () => {
  const series = buildScaleChartSeries([
    point({ consultationId: "c3", appliedAt: "2026-06-01", score: 60 }),
    point({ consultationId: "c1", appliedAt: "2026-01-01", score: 80, baseline: true }),
    point({ consultationId: "c2", appliedAt: "2026-03-01", score: 70 }),
  ]);

  assert.deepEqual(series.points.map((item) => item.consultationId), ["c1", "c2", "c3"]);
  assert.deepEqual(series.points.map((item) => item.score), [80, 70, 60]);
  assert.equal(series.points[0]?.isBaseline, true);
  assert.deepEqual(series.segments.map((item) => item.trend), ["unfavorable", "unfavorable"]);
});

test("série gráfica consolida reaplicações da mesma consulta no último ponto efetivo", () => {
  const series = buildScaleChartSeries([
    point({ consultationId: "c1", appliedAt: "2026-01-01", score: 80, baseline: true }),
    point({ consultationId: "c2", appliedAt: "2026-03-01T10:00:00Z", score: 70 }),
    point({ consultationId: "c2", appliedAt: "2026-03-01T11:00:00Z", score: 75 }),
  ]);

  assert.equal(series.points.length, 2);
  assert.equal(series.points[1]?.score, 75);
});

test("troca de versão interrompe a linha em vez de sugerir comparação clínica", () => {
  const series = buildScaleChartSeries([
    point({ consultationId: "c1", appliedAt: "2026-01-01", score: 80, baseline: true }),
    point({ consultationId: "c2", appliedAt: "2026-03-01", score: 70, version: "2.0" }),
  ]);

  assert.equal(series.hasMultipleVersions, true);
  assert.equal(series.segments[0]?.trend, "not-comparable");
  assert.equal(series.segments[0]?.drawable, false);
});

test("score ausente permanece como ponto registrado mas não cria trecho desenhável", () => {
  const series = buildScaleChartSeries([
    point({ consultationId: "c1", appliedAt: "2026-01-01", score: 80, baseline: true }),
    point({ consultationId: "c2", appliedAt: "2026-03-01", score: null }),
  ]);

  assert.equal(series.points[1]?.score, null);
  assert.equal(series.segments[0]?.trend, "insufficient-data");
  assert.equal(series.segments[0]?.drawable, false);
});

test("série gráfica falha fechada quando recebe pacientes diferentes", () => {
  assert.throws(() => buildScaleChartSeries([
    point({ consultationId: "c1", appliedAt: "2026-01-01", score: 80 }),
    { ...point({ consultationId: "c2", appliedAt: "2026-03-01", score: 70 }), patientId: "p2" },
  ]), /misturar pacientes ou instrumentos diferentes/);
});
