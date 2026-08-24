import type { AgaScaleReportSection } from "./aga-report.ts";
import type { ScaleDirection } from "./longitudinal-scales.ts";

interface ReportScaleSpec {
  key: string;
  codes: readonly string[];
  label: string;
  min: number;
  max: number;
  direction: ScaleDirection;
  tone: "blue" | "green" | "orange" | "red" | "purple" | "pink";
}

const REPORT_SCALE_SPECS: readonly ReportScaleSpec[] = [
  { key: "cognition", codes: ["dez_cs"], label: "10-CS (Cognição)", min: 0, max: 10, direction: "higher-better", tone: "blue" },
  { key: "function", codes: ["lawton"], label: "AIVD (Funcionalidade)", min: 7, max: 21, direction: "higher-better", tone: "green" },
  { key: "mood", codes: ["gds15"], label: "GDS-15 (Humor)", min: 0, max: 15, direction: "higher-worse", tone: "orange" },
  { key: "sleep", codes: ["isi"], label: "ISI (Sono)", min: 0, max: 28, direction: "higher-worse", tone: "red" },
  { key: "performance", codes: ["sppb_freitas", "sppb"], label: "SPPB (Desempenho físico)", min: 0, max: 12, direction: "higher-better", tone: "purple" },
  { key: "burden-full", codes: ["zarit_br_22", "zarit_22"], label: "Zarit (Sobrecarga)", min: 0, max: 88, direction: "higher-worse", tone: "pink" },
  { key: "burden-reduced", codes: ["zarit_reduzida"], label: "Zarit (Sobrecarga)", min: 0, max: 28, direction: "higher-worse", tone: "pink" },
  { key: "burden-palliative", codes: ["zarit_paliativo_7_ms2013"], label: "Zarit (Sobrecarga)", min: 7, max: 35, direction: "higher-worse", tone: "pink" },
] as const;

export interface ReportScaleEvolutionConsultation {
  id: string;
  occurredAt: string;
}

export interface ReportScaleEvolutionPoint {
  consultationId: string;
  occurredAt: string;
  score: number;
  percentOfRange: number;
}

export interface ReportScaleEvolutionSeries {
  key: string;
  code: string;
  label: string;
  direction: ScaleDirection;
  tone: ReportScaleSpec["tone"];
  trendLabel: string;
  hasMultipleVersions: boolean;
  points: ReportScaleEvolutionPoint[];
  drawableSegments: Array<{ fromConsultationId: string; toConsultationId: string }>;
}

export interface ReportScaleEvolutionModel {
  consultations: ReportScaleEvolutionConsultation[];
  series: ReportScaleEvolutionSeries[];
}

function percentOfRange(score: number, min: number, max: number): number {
  if (!Number.isFinite(score) || score < min || score > max) {
    throw new Error(`Valor ${score} fora da faixa válida ${min}-${max} para o gráfico consolidado.`);
  }
  const percentage = ((score - min) / (max - min)) * 100;
  return Number(percentage.toFixed(2));
}

function bestCandidate(
  scales: readonly AgaScaleReportSection[],
  codes: readonly string[],
): AgaScaleReportSection | null {
  return scales
    .filter((scale) => codes.includes(scale.code))
    .sort((a, b) => b.chartSeries.points.length - a.chartSeries.points.length)[0] ?? null;
}

/**
 * Projeta somente séries já validadas pelo domínio para o gráfico compacto do
 * relatório. A altura é uma normalização visual pela faixa possível do próprio
 * instrumento; valores exatos, direção clínica e interrupções permanecem
 * explícitos. Nenhum escore clínico, corte ou tendência é recalculado aqui.
 */
export function buildReportScaleEvolution(
  scales: readonly AgaScaleReportSection[],
): ReportScaleEvolutionModel {
  const patientIds = new Set(
    scales.map((scale) => scale.chartSeries.patientId).filter(Boolean),
  );
  if (patientIds.size > 1) {
    throw new Error("Gráfico consolidado não pode misturar pacientes.");
  }

  const usedScaleCodes = new Set<string>();
  const usedLabels = new Set<string>();
  const series: ReportScaleEvolutionSeries[] = [];

  for (const spec of REPORT_SCALE_SPECS) {
    const scale = bestCandidate(scales, spec.codes);
    if (!scale || usedScaleCodes.has(scale.code) || usedLabels.has(spec.label)) continue;

    const points = scale.chartSeries.points.flatMap((point): ReportScaleEvolutionPoint[] => {
      if (point.score === null) return [];
      return [{
        consultationId: point.consultationId,
        occurredAt: point.appliedAt,
        score: point.score,
        percentOfRange: percentOfRange(point.score, spec.min, spec.max),
      }];
    });
    if (points.length === 0) continue;

    const numericConsultations = new Set(points.map((point) => point.consultationId));
    const drawableSegments = scale.chartSeries.segments
      .filter((segment) => segment.drawable
        && numericConsultations.has(segment.fromConsultationId)
        && numericConsultations.has(segment.toConsultationId))
      .map((segment) => ({
        fromConsultationId: segment.fromConsultationId,
        toConsultationId: segment.toConsultationId,
      }));

    usedScaleCodes.add(scale.code);
    usedLabels.add(spec.label);
    series.push({
      key: spec.key,
      code: scale.code,
      label: spec.label,
      direction: spec.direction,
      tone: spec.tone,
      trendLabel: scale.evolution.vsPrevious,
      hasMultipleVersions: scale.chartSeries.hasMultipleVersions,
      points,
      drawableSegments,
    });
  }

  const consultationById = new Map<string, ReportScaleEvolutionConsultation>();
  for (const item of series) {
    for (const point of item.points) {
      const existing = consultationById.get(point.consultationId);
      if (!existing || new Date(point.occurredAt).getTime() > new Date(existing.occurredAt).getTime()) {
        consultationById.set(point.consultationId, {
          id: point.consultationId,
          occurredAt: point.occurredAt,
        });
      }
    }
  }

  const consultations = [...consultationById.values()].sort((a, b) =>
    new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    || a.id.localeCompare(b.id));

  return { consultations, series };
}
