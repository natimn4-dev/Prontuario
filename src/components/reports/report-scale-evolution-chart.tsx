import type { AgaScaleReportSection } from "@/domain/aga-report";
import {
  buildReportScaleEvolution,
  type ReportScaleEvolutionSeries,
} from "@/domain/report-scale-evolution";
import styles from "./report-scale-evolution-chart.module.css";

const WIDTH = 560;
const HEIGHT = 270;
const LEFT = 44;
const RIGHT = 34;
const TOP = 16;
const BOTTOM = 42;
const Y_TICKS = [0, 25, 50, 75, 100] as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function xPosition(index: number, total: number): number {
  const available = WIDTH - LEFT - RIGHT;
  return total <= 1 ? LEFT + available / 2 : LEFT + (available * index) / (total - 1);
}

function yPosition(percent: number): number {
  const available = HEIGHT - TOP - BOTTOM;
  return TOP + ((100 - percent) / 100) * available;
}

function directionLabel(series: ReportScaleEvolutionSeries): string {
  return series.direction === "higher-better" ? "maior pontuação = melhor" : "menor pontuação = melhor";
}

export function ReportScaleEvolutionChart({ scales }: { scales: readonly AgaScaleReportSection[] }) {
  const model = buildReportScaleEvolution(scales);
  if (model.series.length === 0 || model.consultations.length === 0) {
    return <p className={styles.empty}>Dados insuficientes para o gráfico de evolução das escalas.</p>;
  }

  const consultationIndex = new Map(model.consultations.map((item, index) => [item.id, index]));

  return (
    <figure className={styles.figure} aria-label="Evolução das escalas — Acompanhamento ao longo das consultas">
      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Gráfico longitudinal das escalas selecionadas, normalizadas pela faixa possível de cada instrumento."
      >
        {Y_TICKS.map((tick) => {
          const y = yPosition(tick);
          return (
            <g key={tick}>
              <line x1={LEFT} y1={y} x2={WIDTH - RIGHT} y2={y} className={styles.gridLine} />
              <text x={LEFT - 10} y={y + 4} textAnchor="end" className={styles.axisLabel}>{tick}</text>
            </g>
          );
        })}

        {model.consultations.map((consultation, index) => (
          <text
            key={consultation.id}
            x={xPosition(index, model.consultations.length)}
            y={HEIGHT - 14}
            textAnchor="middle"
            className={styles.dateLabel}
          >
            {formatDate(consultation.occurredAt)}
          </text>
        ))}

        {model.series.flatMap((series) => {
          const pointByConsultation = new Map(series.points.map((point) => [point.consultationId, point]));
          const segments = series.drawableSegments.flatMap((segment) => {
            const from = pointByConsultation.get(segment.fromConsultationId);
            const to = pointByConsultation.get(segment.toConsultationId);
            const fromIndex = consultationIndex.get(segment.fromConsultationId);
            const toIndex = consultationIndex.get(segment.toConsultationId);
            if (!from || !to || fromIndex === undefined || toIndex === undefined) return [];
            return [(
              <line
                key={`${series.key}-${segment.fromConsultationId}-${segment.toConsultationId}`}
                x1={xPosition(fromIndex, model.consultations.length)}
                y1={yPosition(from.percentOfRange)}
                x2={xPosition(toIndex, model.consultations.length)}
                y2={yPosition(to.percentOfRange)}
                className={styles.seriesLine}
                data-tone={series.tone}
              />
            )];
          });
          const points = series.points.flatMap((point) => {
            const index = consultationIndex.get(point.consultationId);
            if (index === undefined) return [];
            return [(
              <circle
                key={`${series.key}-${point.consultationId}`}
                cx={xPosition(index, model.consultations.length)}
                cy={yPosition(point.percentOfRange)}
                r="4.5"
                className={styles.seriesPoint}
                data-tone={series.tone}
              >
                <title>{`${series.label} · ${formatDate(point.occurredAt)} · ${point.score} pontos`}</title>
              </circle>
            )];
          });
          return [...segments, ...points];
        })}
      </svg>

      <div className={styles.legend} aria-label="Legenda das escalas">
        {model.series.map((series) => (
          <div key={series.key} className={styles.legendItem}>
            <span className={styles.legendDot} data-tone={series.tone} aria-hidden="true" />
            <span><strong>{series.label}</strong><small>{directionLabel(series)} · {series.trendLabel}</small></span>
          </div>
        ))}
      </div>

      <p className={styles.methodNote}>
        O eixo de 0 a 100 representa o percentual da faixa possível de cada instrumento apenas para apresentação conjunta. Os valores exatos permanecem na tabela. Linhas só conectam registros comparáveis do mesmo instrumento e versão.
      </p>

      <table className={styles.screenReaderTable}>
        <caption>Alternativa textual do gráfico de evolução das escalas</caption>
        <thead><tr><th scope="col">Escala</th><th scope="col">Data</th><th scope="col">Valor registrado</th></tr></thead>
        <tbody>
          {model.series.flatMap((series) => series.points.map((point) => (
            <tr key={`${series.key}-table-${point.consultationId}`}>
              <th scope="row">{series.label}</th><td>{formatDate(point.occurredAt)}</td><td>{point.score}</td>
            </tr>
          )))}
        </tbody>
      </table>
    </figure>
  );
}
