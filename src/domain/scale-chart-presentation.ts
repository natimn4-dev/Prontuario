import type { ScaleChartSeries } from "./scale-chart-series.ts";
import {
  APGAR_FAMILY,
  BARTHEL,
  CHARLSON_RANGES,
  CORNELL,
  ESAS,
  FRAIL_BR,
  G8,
  GDS15,
  KATZ,
  KPS,
  LACE,
  LAWTON,
  MNA_SF,
  MOCA_RANGES,
  PFEFFER,
  POLYPHARMACY,
  PPS_RANGES,
  SARCF,
  SPPB,
  STOPP_FALL,
  TEN_CS,
  VES13,
  ZARIT_REDUCED,
} from "./clinical-config/legacy-core.ts";

export const DEFAULT_SCALE_CHART_DATE_LABEL_TARGET = 8;

export interface ScaleChartPresentation {
  hasHistory: boolean;
  canPlot: boolean;
  numericPointCount: number;
  totalPointCount: number;
  visibleDateLabelIndexes: number[];
}

export interface ScaleChartAxisRange {
  min: number;
  max: number;
  source: "configured" | "observed";
}

type RangeLike = { min: number; max: number };

const CONFIGURED_SCALE_RANGES: Readonly<Record<string, readonly RangeLike[]>> = {
  katz: KATZ.ranges,
  lawton: LAWTON.ranges,
  barthel: BARTHEL.ranges,
  pfeffer: PFEFFER.ranges,
  gds15: GDS15.ranges,
  cornell: CORNELL.ranges,
  moca: MOCA_RANGES,
  dez_cs: TEN_CS.ranges,
  frail_br: FRAIL_BR.ranges,
  sarcf: SARCF.ranges,
  sppb: SPPB.ranges,
  polifarmacia: POLYPHARMACY.ranges,
  stoppfall: STOPP_FALL.ranges,
  kps: KPS.ranges,
  lace: LACE.ranges,
  g8: G8.ranges,
  apgar_familiar: APGAR_FAMILY.ranges,
  zarit_reduzida: ZARIT_REDUCED.ranges,
  charlson: CHARLSON_RANGES,
  ves13: VES13.ranges,
  mna_sf: MNA_SF.ranges,
  pps: PPS_RANGES,
  esas: ESAS.ranges,
};

const ORDINAL_SCALE_CODES = new Set(["fast"]);

export function isOrdinalScaleChart(scaleCode: string): boolean {
  return ORDINAL_SCALE_CODES.has(scaleCode);
}

function finiteConfiguredRange(scaleCode: string): { min: number; max: number } | null {
  const ranges = CONFIGURED_SCALE_RANGES[scaleCode];
  if (!ranges || ranges.length === 0) return null;

  const minima = ranges.map((range) => range.min).filter(Number.isFinite);
  const maxima = ranges.map((range) => range.max).filter(Number.isFinite);
  if (minima.length === 0 || maxima.length === 0) return null;

  const min = Math.min(...minima);
  const max = Math.max(...maxima);

  // Alguns instrumentos contínuos usam sentinelas muito altas apenas para
  // classificação. Elas não representam uma amplitude clínica fechada e não
  // devem achatar o gráfico longitudinal.
  if (!(max > min) || max >= 900) return null;
  return { min, max };
}

/**
 * Resolve a amplitude vertical sem transformar a pequena variação observada
 * em toda a altura do gráfico quando o próprio motor clínico já possui uma
 * faixa finita para o instrumento. Valores históricos fora da faixa atual
 * nunca são ocultados: expandem a amplitude para continuar visíveis.
 */
export function resolveScaleChartAxisRange(
  scaleCode: string,
  scores: readonly number[],
): ScaleChartAxisRange {
  if (scores.length === 0 || scores.some((score) => !Number.isFinite(score))) {
    throw new Error("O eixo do gráfico exige pelo menos um escore numérico finito.");
  }

  const observedMin = Math.min(...scores);
  const observedMax = Math.max(...scores);
  const configured = finiteConfiguredRange(scaleCode);

  if (!configured) {
    return { min: observedMin, max: observedMax, source: "observed" };
  }

  return {
    min: Math.min(configured.min, observedMin),
    max: Math.max(configured.max, observedMax),
    source: "configured",
  };
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
