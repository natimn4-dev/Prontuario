import {
  hasDisplayableLongitudinalHistory,
  type CapacityComparableStatus,
  type CapacityDimensionHistory,
  type CapacityDimensionRow,
  type CapacityDimensionStatus,
} from "@/domain/capacity-dimension-history";
import styles from "./capacity-dimension-history-chart.module.css";

const STATUS_LABEL: Record<CapacityDimensionStatus, string> = {
  "not-assessed": "Não avaliada",
  recorded: "Registrada sem estado de domínio",
  indeterminate: "Indeterminada / discordante",
  preserved: "Sem redução detectada",
  attention: "Sinal de atenção",
  altered: "Redução identificada",
};

const CHART_HEIGHT = 78;
const LABEL_WIDTH = 190;
const DATE_AXIS_HEIGHT = 52;

const STATUS_Y: Record<CapacityComparableStatus, number> = {
  preserved: 16,
  attention: 39,
  altered: 62,
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

function assessmentDetail(item: CapacityDimensionRow["cells"][number]["assessments"][number]): string {
  const score = item.scoreText ? `; resultado ${item.scoreText}` : "";
  const classification = item.classification ? `; classificação ${item.classification}` : "";
  const selected = item.selectedForDomainState ? "; usado no estado do domínio" : "; complementar/contextual";
  const proxy = item.basis === "proxy" ? "; indicador proxy" : "";
  return `${item.scaleName} (${item.scaleVersion})${score}${classification}${selected}${proxy}`;
}

function lineSegments(
  dimension: CapacityDimensionRow,
  xByConsultation: ReadonlyMap<string, number>,
): Array<Array<{
  x: number;
  y: number;
  consultationId: string;
  status: CapacityComparableStatus;
  comparabilityKey: string;
  instruments: string[];
  reason: string;
}>> {
  const segments: Array<Array<{
    x: number;
    y: number;
    consultationId: string;
    status: CapacityComparableStatus;
    comparabilityKey: string;
    instruments: string[];
    reason: string;
  }>> = [];
  let current: Array<{
    x: number;
    y: number;
    consultationId: string;
    status: CapacityComparableStatus;
    comparabilityKey: string;
    instruments: string[];
    reason: string;
  }> = [];

  for (const cell of dimension.cells) {
    if (!isComparable(cell.status) || !cell.comparabilityKey) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }

    const x = xByConsultation.get(cell.consultationId);
    if (x === undefined) continue;

    if (current.length > 0 && current.at(-1)?.comparabilityKey !== cell.comparabilityKey) {
      segments.push(current);
      current = [];
    }

    current.push({
      x,
      y: STATUS_Y[cell.status],
      consultationId: cell.consultationId,
      status: cell.status,
      comparabilityKey: cell.comparabilityKey,
      instruments: cell.assessments.map(assessmentDetail),
      reason: cell.statusReason,
    });
  }

  if (current.length > 0) segments.push(current);
  return segments;
}

function latestStatus(dimension: CapacityDimensionRow): CapacityDimensionStatus {
  return dimension.cells.at(-1)?.status ?? "not-assessed";
}

function DimensionTimeline({
  dimension,
  chartWidth,
  xByConsultation,
  inflectionKeys,
  targetConsultationId,
}: {
  dimension: CapacityDimensionRow;
  chartWidth: number;
  xByConsultation: ReadonlyMap<string, number>;
  inflectionKeys: ReadonlySet<string>;
  targetConsultationId?: string;
}) {
  const segments = lineSegments(dimension, xByConsultation);
  const currentStatus = latestStatus(dimension);

  return (
    <div className={styles.dimensionRow} data-dimension={dimension.code}>
      <div className={styles.dimensionSummary}>
        <div>
          <strong>{dimension.label}</strong>
          <span>{dimension.framework === "functional-capacity" ? "Independência funcional" : "Capacidade intrínseca"}</span>
        </div>
        <span className={styles.latestBadge} data-status={currentStatus}>
          {STATUS_LABEL[currentStatus]}
        </span>
      </div>

      <svg
        className={styles.domainChart}
        viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
        width={chartWidth}
        height={CHART_HEIGHT}
        role="img"
        aria-label={`Trajetória longitudinal de ${dimension.label}`}
      >
        <line className={styles.statusGuide} x1={24} x2={chartWidth - 24} y1={STATUS_Y.preserved} y2={STATUS_Y.preserved} />
        <line className={styles.statusGuide} x1={24} x2={chartWidth - 24} y1={STATUS_Y.attention} y2={STATUS_Y.attention} />
        <line className={styles.statusGuide} x1={24} x2={chartWidth - 24} y1={STATUS_Y.altered} y2={STATUS_Y.altered} />

        {targetConsultationId ? (() => {
          const x = xByConsultation.get(targetConsultationId);
          return x === undefined ? null : (
            <line className={styles.targetGuide} x1={x} x2={x} y1={7} y2={CHART_HEIGHT - 7} />
          );
        })() : null}

        {segments.map((segment, index) => (
          <polyline
            key={`${dimension.code}-segment-${index}`}
            className={styles.seriesLine}
            points={segment.map((point) => `${point.x},${point.y}`).join(" ")}
          />
        ))}

        {dimension.cells.map((cell) => {
          const x = xByConsultation.get(cell.consultationId);
          if (x === undefined) return null;
          const instruments = cell.assessments.map(assessmentDetail);
          const title = `${dimension.label}: ${STATUS_LABEL[cell.status]}. ${cell.statusReason}${instruments.length ? ` Instrumentos: ${instruments.join(" | ")}.` : ""}`;
          const isInflection = inflectionKeys.has(`${dimension.code}:${cell.consultationId}`);

          if (isComparable(cell.status) && cell.comparabilityKey) {
            return (
              <g key={`${dimension.code}-${cell.consultationId}`}>
                {isInflection ? <circle className={styles.inflectionHalo} cx={x} cy={STATUS_Y[cell.status]} r={8} /> : null}
                <circle
                  className={styles.seriesPoint}
                  data-status={cell.status}
                  cx={x}
                  cy={STATUS_Y[cell.status]}
                  r={5}
                >
                  <title>{title}</title>
                </circle>
              </g>
            );
          }

          if (cell.status === "indeterminate") {
            const y = STATUS_Y.attention;
            const size = 6;
            return (
              <polygon
                key={`${dimension.code}-${cell.consultationId}`}
                className={styles.indeterminatePoint}
                points={`${x},${y - size} ${x + size},${y} ${x},${y + size} ${x - size},${y}`}
              >
                <title>{title}</title>
              </polygon>
            );
          }

          if (cell.status === "recorded") {
            const y = STATUS_Y.attention;
            return (
              <rect
                key={`${dimension.code}-${cell.consultationId}`}
                className={styles.recordedPoint}
                x={x - 4.5}
                y={y - 4.5}
                width={9}
                height={9}
                rx={2}
              >
                <title>{title}</title>
              </rect>
            );
          }

          return (
            <circle
              key={`${dimension.code}-${cell.consultationId}`}
              className={styles.missingPoint}
              cx={x}
              cy={STATUS_Y.attention}
              r={4}
            >
              <title>{title}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

export function CapacityDimensionHistoryChart({
  history,
  context,
}: {
  history: CapacityDimensionHistory;
  context: "patient-home" | "final-report";
}) {
  if (!hasDisplayableLongitudinalHistory(history)) {
    return (
      <p className={styles.empty}>
        O gráfico longitudinal será exibido a partir de uma consulta subsequente com um novo resultado registrado no mesmo domínio. Depois disso, consultas sem reaplicação não apagam o histórico.
      </p>
    );
  }

  const chartWidth = Math.max(700, 96 + Math.max(history.consultations.length - 1, 1) * 150);
  const timelineWidth = LABEL_WIDTH + chartWidth;
  const left = 24;
  const right = 24;
  const usableWidth = chartWidth - left - right;
  const times = history.consultations.map((consultation) => new Date(consultation.occurredAt).getTime());
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = maxTime - minTime;
  const xByConsultation = new Map(history.consultations.map((consultation) => {
    const currentTime = new Date(consultation.occurredAt).getTime();
    const x = timeSpan > 0
      ? left + usableWidth * ((currentTime - minTime) / timeSpan)
      : left + usableWidth / 2;
    return [consultation.id, x] as const;
  }));
  const targetConsultationId = history.consultations.find((consultation) => consultation.isTarget)?.id;
  const inflectionKeys = new Set(history.inflectionPoints.map((point) => `${point.dimensionCode}:${point.consultationId}`));
  const functionalDimension = history.dimensions.find((dimension) => dimension.framework === "functional-capacity");
  const intrinsicDimensions = history.dimensions.filter((dimension) => dimension.framework === "intrinsic-capacity");
  return (
    <figure className={styles.figure} data-chart="line-small-multiples">
      <figcaption className={styles.caption}>
        <div>
          <strong>Evolução da capacidade intrínseca e da independência funcional</strong>
          <span>Uma trajetória por domínio. O tempo real entre consultas é preservado.</span>
        </div>
        <span className={styles.methodologyBadge}>{history.methodologyVersion}</span>
      </figcaption>

      <div className={styles.statusLegend} aria-label="Legenda dos estados clínicos">
        <span><i data-status="preserved" aria-hidden="true" />Sem redução detectada</span>
        <span><i data-status="attention" aria-hidden="true" />Sinal de atenção</span>
        <span><i data-status="altered" aria-hidden="true" />Redução identificada</span>
        <span><i data-status="indeterminate" aria-hidden="true" />Discordante</span>
        <span><i data-status="missing" aria-hidden="true" />Não avaliada</span>
      </div>

      {!history.hasLongitudinalTrendData ? (
        <p className={styles.continuityNote}>
          Histórico preservado: há resultados deste domínio em mais de uma consulta, mas os trechos sem o mesmo instrumento e versão permanecem desconectados. Uma consulta sem reaplicação não apaga os pontos anteriores.
        </p>
      ) : null}

      <div className={styles.scroll} tabIndex={0} aria-label="Evolução longitudinal por domínio, rolável por consulta">
        <div className={styles.timelineCanvas} style={{ width: `${timelineWidth}px` }}>
          <div className={styles.dateRow}>
            <div className={styles.dateRowLabel}>Consultas</div>
            <svg
              className={styles.dateAxis}
              viewBox={`0 0 ${chartWidth} ${DATE_AXIS_HEIGHT}`}
              width={chartWidth}
              height={DATE_AXIS_HEIGHT}
              aria-hidden="true"
            >
              <line className={styles.dateBaseline} x1={left} x2={chartWidth - right} y1={14} y2={14} />
              {history.consultations.map((consultation) => {
                const x = xByConsultation.get(consultation.id) ?? left;
                return (
                  <g key={consultation.id}>
                    <line className={styles.dateTick} x1={x} x2={x} y1={10} y2={18} />
                    <text className={styles.dateLabel} x={x} y={32} textAnchor="middle">
                      {displayDate(consultation.occurredAt)}
                    </text>
                    {consultation.isTarget ? (
                      <text className={styles.targetLabel} x={x} y={43} textAnchor="middle">
                        mais recente
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>

          <section className={styles.dimensionGroup} aria-label="Independência funcional e domínios de capacidade intrínseca">
            {functionalDimension ? (
              <>
                <div className={styles.frameworkHeader}>
                  <strong>Independência funcional</strong>
                  <span>ABVD/AIVD — apresentada separadamente da capacidade intrínseca</span>
                </div>
                <DimensionTimeline
                  dimension={functionalDimension}
                  chartWidth={chartWidth}
                  xByConsultation={xByConsultation}
                  inflectionKeys={inflectionKeys}
                  targetConsultationId={targetConsultationId}
                />
              </>
            ) : null}
            <div className={styles.frameworkHeader}>
              <strong>Capacidade intrínseca</strong>
              <span>Cinco domínios OMS — cada um com sua própria trajetória</span>
            </div>
            {intrinsicDimensions.map((dimension) => (
              <DimensionTimeline
                key={dimension.code}
                dimension={dimension}
                chartWidth={chartWidth}
                xByConsultation={xByConsultation}
                inflectionKeys={inflectionKeys}
                targetConsultationId={targetConsultationId}
              />
            ))}
          </section>
        </div>
      </div>

      <div className={styles.readingGuide}>
        <strong>Como ler</strong>
        <span>Acima = sem redução • centro = atenção • abaixo = redução. A linha só continua quando instrumento e versão são comparáveis.</span>
        <span>Círculo cinza = não avaliada • quadrado = registro sem estado • losango = resultados discordantes. O estado mais recente fica no badge à esquerda.</span>
      </div>

      {history.inflectionPoints.length > 0 ? (
        <section className={styles.inflectionSection} aria-labelledby="capacity-inflection-title">
          <h3 id="capacity-inflection-title">
            {history.inflectionPoints.length === 1 ? "Ponto de inflexão observado" : "Pontos de inflexão observados"}
          </h3>
          <ul>
            {history.inflectionPoints.map((point) => (
              <li key={`${point.dimensionCode}-${point.consultationId}-${point.previousConsultationId}`}>
                <strong>
                  {displayDate(point.occurredAt)} · {point.dimensionLabel} — {point.direction === "worsened" ? "piora observada" : "melhora observada"} em avaliações comparáveis.
                </strong>
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
          <p className={styles.causalityNote}>O software registra coincidência temporal, mas não atribui causalidade.</p>
        </section>
      ) : null}

      {context === "patient-home" ? (
        <details className={styles.methodDetails}>
          <summary>Critérios metodológicos e proveniência</summary>
          <p>Versão metodológica: {history.methodologyVersion}.</p>
          <p>{history.methodologyNote}</p>
          <p>Resultados originais, versões, classificação e fonte permanecem vinculados aos pontos. Quando o instrumento muda, a linha é interrompida em vez de fabricar uma tendência.</p>
        </details>
      ) : (
        <p className={styles.frameworkNote}>
          Versão metodológica: {history.methodologyVersion}. {history.methodologyNote} Resultados originais, versões, classificação e fonte permanecem vinculados aos pontos.
        </p>
      )}
    </figure>
  );
}
