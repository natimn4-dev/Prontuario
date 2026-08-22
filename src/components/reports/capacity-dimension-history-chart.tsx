import type {
  CapacityComparableStatus,
  CapacityDimensionHistory,
  CapacityDimensionRow,
  CapacityDimensionStatus,
} from "@/domain/capacity-dimension-history";
import styles from "./capacity-dimension-history-chart.module.css";

const STATUS_LABEL: Record<CapacityDimensionStatus, string> = {
  "not-assessed": "Não avaliada",
  recorded: "Registrada sem classificação",
  preserved: "Preservada",
  attention: "Atenção",
  altered: "Alterada",
};

const STATUS_Y: Record<CapacityComparableStatus, number> = {
  preserved: 58,
  attention: 132,
  altered: 206,
};

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function isComparable(status: CapacityDimensionStatus): status is CapacityComparableStatus {
  return status === "preserved" || status === "attention" || status === "altered";
}

function lineSegments(
  dimension: CapacityDimensionRow,
  xByConsultation: ReadonlyMap<string, number>,
): Array<Array<{ x: number; y: number; consultationId: string; status: CapacityComparableStatus; instruments: string[] }>> {
  const segments: Array<Array<{ x: number; y: number; consultationId: string; status: CapacityComparableStatus; instruments: string[] }>> = [];
  let current: Array<{ x: number; y: number; consultationId: string; status: CapacityComparableStatus; instruments: string[] }> = [];

  for (const cell of dimension.cells) {
    if (!isComparable(cell.status)) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }
    const x = xByConsultation.get(cell.consultationId);
    if (x === undefined) continue;
    current.push({
      x,
      y: STATUS_Y[cell.status],
      consultationId: cell.consultationId,
      status: cell.status,
      instruments: cell.assessments.map((item) => item.scaleName),
    });
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

export function CapacityDimensionHistoryChart({
  history,
  context,
}: {
  history: CapacityDimensionHistory;
  context: "patient-home" | "final-report";
}) {
  if (!history.hasAssessmentData || history.consultations.length === 0) {
    return (
      <p className={styles.empty}>
        Ainda não há avaliações suficientes de capacidade intrínseca ou funcional para compor o gráfico longitudinal.
      </p>
    );
  }

  const description = context === "final-report"
    ? "Inclui a consulta deste relatório e as consultas anteriores disponíveis no horizonte longitudinal."
    : "Inclui as consultas com avaliações já preenchidas; a consulta mais recente aparece assim que houver dados registrados.";

  const chartWidth = Math.max(760, 180 + Math.max(history.consultations.length - 1, 1) * 145);
  const left = 112;
  const right = 34;
  const usableWidth = chartWidth - left - right;
  const denominator = Math.max(history.consultations.length - 1, 1);
  const xByConsultation = new Map(history.consultations.map((consultation, index) => [
    consultation.id,
    left + (usableWidth * index) / denominator,
  ]));
  const inflectionKeys = new Set(history.inflectionPoints.map((point) => `${point.dimensionCode}:${point.consultationId}`));
  const inflectionConsultations = new Set(history.inflectionPoints.map((point) => point.consultationId));

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <strong>Evolução da capacidade intrínseca e funcional</strong>
        <span>{description}</span>
      </figcaption>

      <div className={styles.dimensionLegend} aria-label="Dimensões do gráfico">
        {history.dimensions.map((dimension) => (
          <span key={dimension.code} data-dimension={dimension.code}>
            <i aria-hidden="true" />{dimension.label}
          </span>
        ))}
      </div>

      <div className={styles.scroll} tabIndex={0} aria-label="Gráfico longitudinal em linha, rolável por consulta">
        <svg
          className={styles.chart}
          viewBox={`0 0 ${chartWidth} 284`}
          role="img"
          aria-labelledby="capacity-line-title capacity-line-desc"
        >
          <title id="capacity-line-title">Evolução longitudinal da capacidade funcional e intrínseca</title>
          <desc id="capacity-line-desc">
            Linhas categóricas por dimensão ao longo das consultas. Preservada fica acima, atenção no centro e alterada abaixo. Lacunas indicam ausência de classificação comparável.
          </desc>

          {(["preserved", "attention", "altered"] as const).map((status) => (
            <g key={status}>
              <line className={styles.gridLine} x1={left} x2={chartWidth - right} y1={STATUS_Y[status]} y2={STATUS_Y[status]} />
              <text className={styles.axisLabel} x={left - 12} y={STATUS_Y[status] + 4} textAnchor="end">
                {STATUS_LABEL[status]}
              </text>
            </g>
          ))}

          {history.consultations.map((consultation) => {
            const x = xByConsultation.get(consultation.id) ?? left;
            const isInflectionConsultation = inflectionConsultations.has(consultation.id);
            return (
              <g key={consultation.id}>
                {isInflectionConsultation ? (
                  <line className={styles.inflectionGuide} x1={x} x2={x} y1={34} y2={218} />
                ) : null}
                {consultation.isTarget ? (
                  <line className={styles.targetGuide} x1={x} x2={x} y1={34} y2={218} />
                ) : null}
                <text className={styles.dateLabel} x={x} y={246} textAnchor="middle">
                  {displayDate(consultation.occurredAt)}
                </text>
                {consultation.isTarget ? (
                  <text className={styles.targetLabel} x={x} y={263} textAnchor="middle">
                    {context === "final-report" ? "consulta atual" : "mais recente"}
                  </text>
                ) : null}
              </g>
            );
          })}

          {history.dimensions.map((dimension) => (
            <g key={dimension.code} data-dimension={dimension.code}>
              {lineSegments(dimension, xByConsultation).map((segment, segmentIndex) => (
                <polyline
                  key={`${dimension.code}-segment-${segmentIndex}`}
                  className={styles.seriesLine}
                  points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
                />
              ))}
              {lineSegments(dimension, xByConsultation).flat().map((point) => {
                const isInflection = inflectionKeys.has(`${dimension.code}:${point.consultationId}`);
                return (
                  <circle
                    key={`${dimension.code}-${point.consultationId}`}
                    className={isInflection ? styles.inflectionPoint : styles.seriesPoint}
                    cx={point.x}
                    cy={point.y}
                    r={isInflection ? 6 : 4}
                  >
                    <title>{`${dimension.label}: ${STATUS_LABEL[point.status]}${point.instruments.length ? ` — ${point.instruments.join(", ")}` : ""}`}</title>
                  </circle>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className={styles.statusLegend} aria-label="Leitura do eixo clínico">
        <span><i data-status="preserved" aria-hidden="true" />Preservada</span>
        <span><i data-status="attention" aria-hidden="true" />Atenção</span>
        <span><i data-status="altered" aria-hidden="true" />Alterada</span>
        <span><i data-status="missing" aria-hidden="true" />Sem ponto = não avaliada ou sem classificação comparável</span>
      </div>

      {history.inflectionPoints.length > 0 ? (
        <section className={styles.inflectionSection} aria-labelledby="capacity-inflection-title">
          <h3 id="capacity-inflection-title">Pontos de inflexão observados</h3>
          <ul>
            {history.inflectionPoints.map((point) => (
              <li key={`${point.dimensionCode}-${point.consultationId}-${point.previousConsultationId}`}>
                <strong>{displayDate(point.occurredAt)} · {point.dimensionLabel}</strong>
                <span>
                  {point.direction === "worsened" ? "Piora" : "Melhora"}: {STATUS_LABEL[point.fromStatus]} → {STATUS_LABEL[point.toStatus]}.
                </span>
                {point.milestones.length > 0 ? (
                  <span>
                    Registro clínico na mesma consulta: {point.milestones.map((milestone) => (
                      milestone.note ? `${milestone.title} — ${milestone.note}` : milestone.title
                    )).join("; ")}.
                  </span>
                ) : (
                  <span>Sem evento clínico relacionado explicitamente registrado nesta consulta; o gráfico não atribui causa.</span>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.causalityNote}>
            Os marcos acima indicam coincidência temporal com registros clínicos existentes. Causalidade só deve ser descrita quando estiver documentada e confirmada pelo médico.
          </p>
        </section>
      ) : null}

      <p className={styles.frameworkNote}>
        As linhas representam categorias clínicas já persistidas, não um escore composto. Não há soma, média ou normalização entre instrumentos diferentes. Quando mais de um instrumento foi aplicado na mesma dimensão e consulta, prevalece apenas o maior nível de atenção já registrado e os instrumentos permanecem identificáveis no ponto do gráfico.
      </p>
    </figure>
  );
}
