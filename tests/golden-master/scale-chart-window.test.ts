import assert from "node:assert/strict";
import test from "node:test";
import { selectScaleChartWindow } from "../../src/domain/scale-chart-window.ts";
import type { ScaleChartSeries } from "../../src/domain/scale-chart-series.ts";

function series(pointCount = 14): ScaleChartSeries {
  const points = Array.from({ length: pointCount }, (_, index) => ({
    consultationId: `c-${index + 1}`,
    appliedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    score: index + 1,
    version: index < 2 ? "v1" : "v2",
    isBaseline: index === 0,
  }));
  return {
    patientId: "patient-1",
    scaleCode: "test",
    points,
    segments: points.slice(1).map((point, index) => ({
      fromConsultationId: points[index]!.consultationId,
      toConsultationId: point.consultationId,
      trend: "stable" as const,
      drawable: true,
    })),
    hasMultipleVersions: true,
  };
}

test("janela completa preserva a série original", () => {
  const input = series();
  assert.equal(selectScaleChartWindow(input, "all"), input);
});

test("últimos 6 limita somente a apresentação e mantém segmentos internos", () => {
  const selected = selectScaleChartWindow(series(), "last-6");
  assert.equal(selected.points.length, 6);
  assert.equal(selected.points[0]?.consultationId, "c-9");
  assert.equal(selected.points.at(-1)?.consultationId, "c-14");
  assert.equal(selected.segments.length, 5);
});

test("janela recalcula apenas a presença visual de múltiplas versões", () => {
  const selected = selectScaleChartWindow(series(), "last-6");
  assert.equal(selected.hasMultipleVersions, false);
});

test("série menor que a janela não é truncada", () => {
  const input = series(4);
  assert.equal(selectScaleChartWindow(input, "last-12"), input);
});
