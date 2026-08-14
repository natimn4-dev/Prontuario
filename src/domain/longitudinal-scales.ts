export type ScaleDirection = "higher-better" | "higher-worse";
export type ScaleTrend = "favorable" | "stable" | "unfavorable" | "not-comparable" | "insufficient-data";

export interface LongitudinalScalePoint {
  patientId: string;
  consultationId: string;
  scaleCode: string;
  scaleVersion: string;
  score: number | null;
  appliedAt: Date | string;
  consultationOccurredAt?: Date | string;
  consultationCreatedAt?: Date | string;
  isBaseline?: boolean;
}

export interface ScaleComparison {
  trend: ScaleTrend;
  delta: number | null;
  fromScore: number | null;
  toScore: number | null;
  reason?: string;
}

function timestamp(value: Date | string | undefined): number {
  return value === undefined ? Number.NEGATIVE_INFINITY : new Date(value).getTime();
}

/**
 * Mantém a rastreabilidade dos registros persistidos fora desta projeção e
 * escolhe somente o ponto efetivo mais recente de cada consulta.
 */
export function effectiveScalePoints(
  points: readonly LongitudinalScalePoint[],
): LongitudinalScalePoint[] {
  if (points.length === 0) return [];

  const patientIds = new Set(points.map((point) => point.patientId));
  const scaleCodes = new Set(points.map((point) => point.scaleCode));
  if (patientIds.size !== 1 || scaleCodes.size !== 1) {
    throw new Error("Evolução de escala não pode misturar pacientes ou instrumentos diferentes.");
  }

  const byConsultation = new Map<string, LongitudinalScalePoint>();
  for (const point of points) {
    const existing = byConsultation.get(point.consultationId);
    if (!existing || timestamp(point.appliedAt) >= timestamp(existing.appliedAt)) {
      byConsultation.set(point.consultationId, {
        ...point,
        isBaseline: Boolean(point.isBaseline || existing?.isBaseline),
      });
    } else if (point.isBaseline && !existing.isBaseline) {
      byConsultation.set(point.consultationId, { ...existing, isBaseline: true });
    }
  }
  return [...byConsultation.values()];
}

export const SCALE_DIRECTIONS: Record<string, ScaleDirection> = {
  ecog: "higher-worse",
  crash_mna_sf: "higher-worse",
  katz: "higher-better", lawton: "higher-better", barthel: "higher-better",
  pfeffer: "higher-worse", gds15: "higher-worse", cornell: "higher-worse",
  moca: "higher-better", meem: "higher-better", dez_cs: "higher-better",
  frail_br: "higher-worse", sarcf: "higher-worse", preensao: "higher-better",
  velocidade_marcha: "higher-better", sentar_levantar_5x: "higher-worse", sppb: "higher-better",
  polifarmacia: "higher-worse", stoppfall: "higher-worse", kps: "higher-better",
  lace: "higher-worse", g8: "higher-better", apgar_familiar: "higher-better",
  zarit_reduzida: "higher-worse", zarit_paliativo_7_ms2013: "higher-worse",
  charlson: "higher-worse", ves13: "higher-worse", mna_sf: "higher-better",
  fast: "higher-worse", pps: "higher-better", esas: "higher-worse",
};

export function compareScalePoints(
  from: LongitudinalScalePoint | null | undefined,
  to: LongitudinalScalePoint | null | undefined,
  direction?: ScaleDirection,
): ScaleComparison {
  if (!from || !to || from.score === null || to.score === null) {
    return { trend: "insufficient-data", delta: null, fromScore: from?.score ?? null, toScore: to?.score ?? null };
  }
  if (from.patientId !== to.patientId || from.scaleCode !== to.scaleCode || from.scaleVersion !== to.scaleVersion) {
    return {
      trend: "not-comparable", delta: null, fromScore: from.score, toScore: to.score,
      reason: "Paciente, instrumento ou versão diferentes não podem ser comparados diretamente.",
    };
  }
  const resolvedDirection = direction ?? SCALE_DIRECTIONS[to.scaleCode];
  if (!resolvedDirection) {
    return { trend: "not-comparable", delta: null, fromScore: from.score, toScore: to.score, reason: "Direção clínica da escala não configurada." };
  }
  const delta = Number((to.score - from.score).toFixed(4));
  if (delta === 0) return { trend: "stable", delta, fromScore: from.score, toScore: to.score };
  const favorable = resolvedDirection === "higher-better" ? delta > 0 : delta < 0;
  return { trend: favorable ? "favorable" : "unfavorable", delta, fromScore: from.score, toScore: to.score };
}

export function buildScaleEvolution(points: readonly LongitudinalScalePoint[]) {
  if (points.length === 0) {
    return { current: null, previous: null, baseline: null, vsPrevious: compareScalePoints(null, null), vsBaseline: compareScalePoints(null, null) };
  }
  const sorted = effectiveScalePoints(points).sort((a, b) =>
    new Date(a.consultationOccurredAt ?? a.appliedAt).getTime() - new Date(b.consultationOccurredAt ?? b.appliedAt).getTime()
    || new Date(a.consultationCreatedAt ?? a.appliedAt).getTime() - new Date(b.consultationCreatedAt ?? b.appliedAt).getTime()
    || new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
    || a.consultationId.localeCompare(b.consultationId));
  const current = sorted.at(-1)!;
  const previous = sorted.length > 1 ? sorted.at(-2)! : null;
  const baseline = sorted.find((point) => point.isBaseline) ?? sorted[0]!;
  return {
    current, previous, baseline,
    vsPrevious: compareScalePoints(previous, current),
    vsBaseline: compareScalePoints(baseline, current),
  };
}
