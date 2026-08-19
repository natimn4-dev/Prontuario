import type { ScaleChartSeries } from "./scale-chart-series.ts";

export const DEFAULT_SCALE_CHART_DATE_LABEL_TARGET = 8;

export interface ScaleChartPresentation {
  hasHistory: boolean;
  canPlot: boolean;
  numericPointCount: number;
  totalPointCount: number;
  visibleDateLabelIndexes: number[];
}

/**
 * Prepara somente decisões de apresentação para a série já validada pelo
 * domínio clínico. Não recalcula escore, tendência, classificação nem
 * comparabilidade entre pontos.
 */
export function buildScaleChartPresentation(
  series: ScaleChartSeries,
  targetDateLabelCount = DEFAULT_SCALE_CHART_DATE_LABEL_TARGET,
): ScaleChartPresentation {
  if (!Number.isInteger(targetDateLabelCount) || targetDateLabelCount < 2) {
    throw new Error("A quantidade alvo de rótulos do gráfico deve ser um inteiro maior ou igual a 2.");
  }

  const totalPointCount = series.points.length;
  const numericPointCount = series.points.filter((point) => point.score !== null).length;
  const hasHistory = totalPointCount > 0;

  if (!hasHistory) {
    return {
      hasHistory,
      canPlot: false,
      numericPointCount,
      totalPointCount,
      visibleDateLabelIndexes: [],
    };
  }

  if (totalPointCount <= targetDateLabelCount) {
    return {
      hasHistory,
      canPlot: numericPointCount >= 2,
      numericPointCount,
      totalPointCount,
      visibleDateLabelIndexes: series.points.map((_, index) => index),
    };
  }

  const visible = new Set<number>();
  const lastIndex = totalPointCount - 1;
  for (let slot = 0; slot < targetDateLabelCount; slot += 1) {
    visible.add(Math.round((slot * lastIndex) / (targetDateLabelCount - 1)));
  }

  series.points.forEach((point, index) => {
    if (point.isBaseline) visible.add(index);
  });

  return {
    hasHistory,
    canPlot: numericPointCount >= 2,
    numericPointCount,
    totalPointCount,
    visibleDateLabelIndexes: [...visible].sort((a, b) => a - b),
  };
}
