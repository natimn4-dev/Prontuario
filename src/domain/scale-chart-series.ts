import {
  compareScalePoints,
  effectiveScalePoints,
  type LongitudinalScalePoint,
  type ScaleTrend,
} from "./longitudinal-scales.ts";

export interface ScaleChartPoint {
  consultationId: string;
  appliedAt: string;
  score: number | null;
  version: string;
  isBaseline: boolean;
}

export interface ScaleChartSegment {
  fromConsultationId: string;
  toConsultationId: string;
  trend: ScaleTrend;
  drawable: boolean;
}

export interface ScaleChartSeries {
  patientId: string;
  scaleCode: string;
  points: ScaleChartPoint[];
  segments: ScaleChartSegment[];
  hasMultipleVersions: boolean;
}

function pointTime(point: LongitudinalScalePoint): number {
  return new Date(point.consultationOccurredAt ?? point.appliedAt).getTime();
}

function createdTime(point: LongitudinalScalePoint): number {
  return new Date(point.consultationCreatedAt ?? point.appliedAt).getTime();
}

function appliedTime(point: LongitudinalScalePoint): number {
  return new Date(point.appliedAt).getTime();
}

function sortChronologically(points: LongitudinalScalePoint[]): LongitudinalScalePoint[] {
  return points.sort((a, b) =>
    pointTime(a) - pointTime(b)
    || createdTime(a) - createdTime(b)
    || appliedTime(a) - appliedTime(b)
    || a.consultationId.localeCompare(b.consultationId));
}

/**
 * Projeta avaliações persistidas em uma série segura para gráficos.
 *
 * Não recalcula score nem interpreta direção clínica. Reutiliza as mesmas
 * regras longitudinais do domínio, mantém apenas o ponto efetivo mais recente
 * de cada consulta e marca como não desenháveis trechos sem comparação válida
 * (por exemplo, troca de versão ou score ausente).
 */
export function buildScaleChartSeries(
  points: readonly LongitudinalScalePoint[],
): ScaleChartSeries {
  if (points.length === 0) {
    return {
      patientId: "",
      scaleCode: "",
      points: [],
      segments: [],
      hasMultipleVersions: false,
    };
  }

  const effective = sortChronologically(effectiveScalePoints(points));
  const versions = new Set(effective.map((point) => point.scaleVersion));

  const chartPoints: ScaleChartPoint[] = effective.map((point) => ({
    consultationId: point.consultationId,
    appliedAt: new Date(point.appliedAt).toISOString(),
    score: point.score,
    version: point.scaleVersion,
    isBaseline: Boolean(point.isBaseline),
  }));

  const segments: ScaleChartSegment[] = [];
  for (let index = 1; index < effective.length; index += 1) {
    const from = effective[index - 1]!;
    const to = effective[index]!;
    const comparison = compareScalePoints(from, to);
    segments.push({
      fromConsultationId: from.consultationId,
      toConsultationId: to.consultationId,
      trend: comparison.trend,
      drawable: comparison.trend !== "not-comparable" && comparison.trend !== "insufficient-data",
    });
  }

  return {
    patientId: effective[0]!.patientId,
    scaleCode: effective[0]!.scaleCode,
    points: chartPoints,
    segments,
    hasMultipleVersions: versions.size > 1,
  };
}
