import type { AgaScaleReportSection } from "@/domain/aga-report";
import styles from "./scale-history-chart.module.css";

interface DisplayPoint {
  key: "baseline" | "previous" | "current";
  label: string;
  score: number | null;
}

const WIDTH = 720;
const HEIGHT = 220;
const LEFT = 62;
const RIGHT = 26;
const TOP = 28;
const BOTTOM = 46;

function pointsFor(scale: AgaScaleReportSection): DisplayPoint[] {
  return [
    { key: "baseline", label: "AGA inicial", score: scale.evolution.baseline },
    { key: "previous", label: "Consulta anterior", score: scale.evolution.previous },
    {
      key: "current",
      label: scale.assessedInTargetConsultation ? "Consulta atual" : "Último registro",
      score: scale.assessedInTargetConsultation ? scale.evolution.current : scale.lastKnown.score,
    },
  ];
}

function positionX(index: number, total: number): number {
  const usable = WIDTH - LEFT - RIGHT;
  if (total <= 1) return LEFT + usable / 2;
  return LEFT + (usable * index) / (total - 1);
}

function positionY(score: number, min: number, max: number): number {
  const usable = HEIGHT - TOP - BOTTOM;
  if (max === min) return TOP + usable / 2;
  return TOP + ((max - score) / (max - min)) * usable;
}

export function ScaleHistoryChart({ scale }: { scale: AgaScaleReportSection }) {
  const points = pointsFor(scale);
  const numeric = points.filter((point): point is DisplayPoint & { score: number } => point.score !== null);
  if (numeric.length < 2) return null;

  const min = Math.min(...numeric.map((point) => point.score));
  const max = Math.max(...numeric.map((point) => point.score));
  const chartTitle = `Trajetória de ${scale.name}`;
  const chartDescription = `Escores registrados em até três momentos: AGA inicial, consulta anterior e ${scale.assessedInTargetConsultation ? "consulta atual" : "último registro"}. O gráfico não define sozinho melhora ou piora clínica.`;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <strong>{chartTitle}</strong>
        <span>
          Visualização dos escores registrados. A direção clínica depende da interpretação validada de cada instrumento.
        </span>
      </figcaption>

      <div className={styles.chartWrap}>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`${chartTitle}. ${chartDescription}`}
        >
          <line x1={LEFT} y1={HEIGHT - BOTTOM} x2={WIDTH - RIGHT} y2={HEIGHT - BOTTOM} className={styles.axis} />
          {points.map((point, index) => {
            const x = positionX(index, points.length);
            const score = point.score;
            return (
              <g key={point.key}>
                <line x1={x} y1={TOP} x2={x} y2={HEIGHT - BOTTOM} className={styles.guide} />
                <text x={x} y={HEIGHT - 18} textAnchor="middle" className={styles.axisLabel}>{point.label}</text>
                {score === null ? (
                  <text x={x} y={TOP + 18} textAnchor="middle" className={styles.missing}>sem dado</text>
                ) : (
                  <>
                    <circle cx={x} cy={positionY(score, min, max)} r="7" className={styles.point} />
                    <text
                      x={x}
                      y={positionY(score, min, max) - 14}
                      textAnchor="middle"
                      className={styles.score}
                    >
                      {score}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className={styles.trendNote}>
        Tendência registrada: <strong>{scale.evolution.vsPrevious}</strong>.
        {scale.evolution.trend === "not-comparable" ? " Há diferença que impede comparação direta entre os registros." : ""}
        {scale.evolution.trend === "insufficient-data" ? " Há dados insuficientes para comparação." : ""}
      </p>

      <table className={styles.dataTable}>
        <caption>Alternativa textual ao gráfico de {scale.name}</caption>
        <thead>
          <tr>
            <th scope="col">Momento</th>
            <th scope="col">Escore registrado</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={`row-${point.key}`}>
              <th scope="row">{point.label}</th>
              <td>{point.score ?? "Sem dado registrado"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
