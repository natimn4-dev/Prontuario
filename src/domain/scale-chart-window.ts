import type { ScaleChartSeries } from "./scale-chart-series.ts";

export type ScaleChartWindow = "all" | "last-6" | "last-12";

function limitFor(window: ScaleChartWindow): number | null {
  if (window === "last-6") return 6;
  if (window === "last-12") return 12;
  return null;
}

/**
 * Recorta somente a janela de apresentação do gráfico.
 *
 * Não recalcula escores, tendências ou comparabilidade. A tabela textual deve
 * continuar usando a série completa para que nenhum histórico seja descartado.
 */
export function selectScaleChartWindow(
  series: ScaleChartSeries,
  window: ScaleChartWindow,
): ScaleChartSeries {
  const limit = limitFor(window);
  if (limit === null || series.points.length <= limit) return series;

  const points = series.points.slice(-limit);
  const visibleConsultations = new Set(points.map((point) => point.consultationId));
  const segments = series.segments.filter((segment) =>
    visibleConsultations.has(segment.fromConsultationId)
      && visibleConsultations.has(segment.toConsultationId),
  );
  const versions = new Set(points.map((point) => point.version));

  return {
    ...series,
    points,
    segments,
    hasMultipleVersions: versions.size > 1,
  };
}
