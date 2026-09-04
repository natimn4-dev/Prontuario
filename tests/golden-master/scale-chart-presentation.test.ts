import assert from "node:assert/strict";
import test from "node:test";
import {
  buildScaleChartPresentation,
  isOrdinalScaleChart,
  resolveScaleChartAxisRange,
} from "../../src/domain/scale-chart-presentation.ts";
import type { ScaleChartSeries } from "../../src/domain/scale-chart-series.ts";

function series(scores: readonly (number | null)[], baselineIndex = 0): ScaleChartSeries {
  return {
    patientId: "patient-test",
    scaleCode: "scale-test",
    points: scores.map((score, index) => ({
      consultationId: `consultation-${index}`,
      appliedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      score,
      version: "1.0",
      isBaseline: index === baselineIndex,
    })),
    segments: [],
    hasMultipleVersions: false,
  };
}

test("mantém a seção histórica quando existe registro mesmo sem dois escores numéricos", () => {
  const presentation = buildScaleChartPresentation(series([null, 4, null]));
  assert.equal(presentation.hasHistory, true);
  assert.equal(presentation.canPlot, false);
  assert.equal(presentation.numericPointCount, 1);
  assert.equal(presentation.totalPointCount, 3);
  assert.deepEqual(presentation.visibleDateLabelIndexes, [0, 1, 2]);
});

test("sem registros não cria seção histórica nem gráfico", () => {
  const presentation = buildScaleChartPresentation(series([]));
  assert.equal(presentation.hasHistory, false);
  assert.equal(presentation.canPlot, false);
  assert.deepEqual(presentation.visibleDateLabelIndexes, []);
});

test("habilita gráfico somente com pelo menos dois escores numéricos", () => {
  assert.equal(buildScaleChartPresentation(series([2, 3])).canPlot, true);
  assert.equal(buildScaleChartPresentation(series([2, null])).canPlot, false);
});

test("histórico longo reduz apenas rótulos de data e preserva extremos e baseline", () => {
  const presentation = buildScaleChartPresentation(
    series(Array.from({ length: 20 }, (_, index) => index), 7),
    8,
  );

  assert.equal(presentation.canPlot, true);
  assert.equal(presentation.totalPointCount, 20);
  assert.ok(presentation.visibleDateLabelIndexes.length < 20);
  assert.ok(presentation.visibleDateLabelIndexes.includes(0));
  assert.ok(presentation.visibleDateLabelIndexes.includes(7));
  assert.ok(presentation.visibleDateLabelIndexes.includes(19));
});

test("histórico curto mantém rótulo de todas as datas", () => {
  const presentation = buildScaleChartPresentation(series([1, 2, 3, 4]), 8);
  assert.deepEqual(presentation.visibleDateLabelIndexes, [0, 1, 2, 3]);
});

test("alvo inválido de rótulos falha antes de projetar a apresentação", () => {
  assert.throws(
    () => buildScaleChartPresentation(series([1, 2]), 1),
    /maior ou igual a 2/,
  );
});

test("eixo vertical usa a amplitude configurada da escala em vez de amplificar pequena variação observada", () => {
  assert.deepEqual(resolveScaleChartAxisRange("katz", [5, 6]), {
    min: 0,
    max: 6,
    source: "configured",
  });
  assert.deepEqual(resolveScaleChartAxisRange("pfeffer", [5, 6]), {
    min: 0,
    max: 33,
    source: "configured",
  });
});

test("valor histórico fora da faixa atual permanece visível no eixo", () => {
  assert.deepEqual(resolveScaleChartAxisRange("katz", [-1, 5]), {
    min: -1,
    max: 6,
    source: "configured",
  });
});

test("instrumento sem amplitude finita configurada mantém fallback observado", () => {
  assert.deepEqual(resolveScaleChartAxisRange("preensao", [16, 17]), {
    min: 16,
    max: 17,
    source: "observed",
  });
});

test("FAST é explicitamente tratado como estadiamento ordinal", () => {
  assert.equal(isOrdinalScaleChart("fast"), true);
  assert.equal(isOrdinalScaleChart("katz"), false);
});
