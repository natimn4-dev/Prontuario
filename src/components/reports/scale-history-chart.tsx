"use client";

import { useState } from "react";
import type { AgaScaleReportSection } from "@/domain/aga-report";
import { buildScaleChartPresentation } from "@/domain/scale-chart-presentation";
import { selectScaleChartWindow, type ScaleChartWindow } from "@/domain/scale-chart-window";
import styles from "./scale-history-chart.module.css";

const HEIGHT = 220;
const LEFT = 62;
const RIGHT = 26;
const TOP = 28;
const BOTTOM = 52;
const MIN_WIDTH = 720;

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function pointLabel(point: AgaScaleReportSection["chartSeries"]["points"][number]): string {
  return point.isBaseline ? `AGA inicial · ${displayDate(point.appliedAt)}` : displayDate(point.appliedAt);
}

function pointSpacing(pointCount: number): number {
  if (pointCount <= 8) return 112;
  if (pointCount <= 16) return 88;
  return 72;
}

function chartWidth(pointCount: number): number {
  return Math.max(MIN_WIDTH, LEFT + RIGHT + Math.max(1, pointCount - 1) * pointSpacing(pointCount));
}

function positionX(index: number, total: number, width: number): number {
  const usable = width - LEFT - RIGHT;
  if (total <= 1) return LEFT + usable / 2;
  return LEFT + (usable * index) / (total - 1);
}

function positionY(score: number, min: number, max: number): number {
  const usable = HEIGHT - TOP - BOTTOM;
  if (max === min) return TOP + usable / 2;
  return TOP + ((max - score) / (max - min)) * usable;
}

export function ScaleHistoryChart({ scale }: { scale: AgaScaleReportSection }) {
  const [window, setWindow] = useState<ScaleChartWindow>("all");
  const fullSeries = scale.chartSeries;
  const chartSeries = selectScaleChartWindow(fullSeries, window);
  const presentation = buildScaleChartPresentation(chartSeries);
  if (!presentation.hasHistory) return null;

  const points = chartSeries.points;
  const numeric = points.filter((point): point is typeof point & { score: number } => point.score !== null);
  const min = presentation.canPlot ? Math.min(...numeric.map((point) => point.score)) : 0;
  const max = presentation.canPlot ? Math.max(...numeric.map((point) => point.score)) : 0;
  const width = chartWidth(points.length);
  const chartTitle = `Trajetória de ${scale.name}`;
  const chartDescription = `Janela visual com ${points.length} de ${fullSeries.points.length} registro(s). Trechos incompatíveis ou sem dados suficientes são exibidos com uma interrupção, sem conexão visual.`;
  const pointIndex = new Map(points.map((point, index) => [point.consultationId, index]));
  const visibleDateLabels = new Set(presentation.visibleDateLabelIndexes);
  const canChooseWindow = fullSeries.points.length > 6;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <strong>{chartTitle}</strong>
        <span>
          Histórico dos escores registrados. Linhas aparecem somente entre pontos que o domínio considera comparáveis; interrupções são preservadas explicitamente.
        </span>
      </figcaption>

      {canChooseWindow ? (
        <div className={styles.windowControl}>
          <label htmlFor={`scale-window-${scale.code}`}>Período exibido no gráfico</label>
          <select
            id={`scale-window-${scale.code}`}
            value={window}
            onChange={(event) => setWindow(event.target.value as ScaleChartWindow)}
          >
            <option value="all">Todo o histórico</option>
            <option value="last-12">Últimos 12 registros</option>
            <option value="last-6">Últimos 6 registros</option>
          </select>
          <span>A tabela abaixo permanece completa, independentemente da janela escolhida.</span>
        </div>
      ) : null}

      {presentation.canPlot ? (
        <div
          className={styles.chartWrap}
          tabIndex={0}
          aria-label={`${chartTitle}. Região rolável horizontalmente quando o histórico é extenso.`}
        >
          <svg
            className={styles.chart}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width={width}
            role="img"
            aria-label={`${chartTitle}. ${chartDescription}`}
          >
            <line x1={LEFT} y1={HEIGHT - BOTTOM} x2={width - RIGHT} y2={HEIGHT - BOTTOM} className={styles.axis} />

            {chartSeries.segments.map((segment) => {
              if (!segment.drawable) return null;
              const fromIndex = pointIndex.get(segment.fromConsultationId);
              const toIndex = pointIndex.get(segment.toConsultationId);
              if (fromIndex === undefined || toIndex === undefined) return null;
              const from = points[fromIndex];
              const to = points[toIndex];
              if (!from || !to || from.score === null || to.score === null) return null;
              return (
                <line
                  key={`${segment.fromConsultationId}-${segment.toConsultationId}`}
                  x1={positionX(fromIndex, points.length, width)}
                  y1={positionY(from.score, min, max)}
                  x2={positionX(toIndex, points.length, width)}
                  y2={positionY(to.score, min, max)}
                  className={styles.axis}
                  aria-hidden="true"
                />
              );
            })}

            {points.map((point, index) => {
              const x = positionX(index, points.length, width);
              const score = point.score;
              return (
                <g key={`${point.consultationId}-${point.appliedAt}`}>
                  <line x1={x} y1={TOP} x2={x} y2={HEIGHT - BOTTOM} className={styles.guide} />
                  {visibleDateLabels.has(index) ? (
                    <text x={x} y={HEIGHT - 21} textAnchor="middle" className={styles.axisLabel}>{pointLabel(point)}</text>
                  ) : null}
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
      ) : (
        <p className={styles.emptyState}>
          Histórico registrado, mas ainda não há pelo menos dois escores numéricos nesta janela para desenhar uma trajetória. Os registros permanecem disponíveis na tabela abaixo.
        </p>
      )}

      <p className={styles.trendNote}>
        Tendência mais recente registrada: <strong>{scale.evolution.vsPrevious}</strong>.
        {fullSeries.hasMultipleVersions ? " O histórico contém versões diferentes do instrumento; os trechos incompatíveis permanecem desconectados." : ""}
        {scale.evolution.trend === "insufficient-data" ? " Há dados insuficientes para a comparação mais recente." : ""}
      </p>

      <table className={styles.dataTable}>
        <caption>Alternativa textual ao gráfico de {scale.name}</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Momento</th>
            <th scope="col">Escore registrado</th>
          </tr>
        </thead>
        <tbody>
          {fullSeries.points.map((point) => (
            <tr key={`row-${point.consultationId}-${point.appliedAt}`}>
              <td>{displayDate(point.appliedAt)}</td>
              <th scope="row">{point.isBaseline ? "AGA inicial" : "Acompanhamento"}</th>
              <td>{point.score ?? "Sem dado registrado"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
