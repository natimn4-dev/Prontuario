import {
  hasDisplayableLongitudinalHistory,
  type CapacityComparableStatus,
  type CapacityDimensionHistory,
  type CapacityDimensionRow,
  type CapacityDimensionStatus,
} from "@/domain/capacity-dimension-history";
import { proportionalAxisPosition } from "@/domain/chart-geometry";
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
const STATUS_Y: Record<CapacityComparableStatus, number> = { preserved: 16, attention: 39, altered: 62 };

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "2-digit" }).format(new Date(value));
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

type SegmentPoint = { x: number; y: number; consultationId: string; status: CapacityComparableStatus; comparabilityKey: string };
function lineSegments(dimension: CapacityDimensionRow, xByConsultation: ReadonlyMap<string, number>) {
  const segments: Array<{ crossesUnassessedVisit: boolean; points: SegmentPoint[] }> = [];
  let previous: SegmentPoint | undefined;
  let crossesUnassessedVisit = false;
  for (const cell of dimension.cells) {
    if (cell.status === "not-assessed") { if (previous) crossesUnassessedVisit = true; continue; }
    if (!isComparable(cell.status) || !cell.comparabilityKey) { previous = undefined; crossesUnassessedVisit = false; continue; }
    const x = xByConsultation.get(cell.consultationId); if (x === undefined) continue;
    const point: SegmentPoint = { x, y: STATUS_Y[cell.status], consultationId: cell.consultationId, status: cell.status, comparabilityKey: cell.comparabilityKey };
    if (previous?.comparabilityKey === point.comparabilityKey) segments.push({ crossesUnassessedVisit, points: [previous, point] });
    previous = point; crossesUnassessedVisit = false;
  }
  return segments;
}
function latestRecordedCell(dimension: CapacityDimensionRow) { return [...dimension.cells].reverse().find((cell) => cell.assessments.length > 0); }

function DimensionTimeline({ dimension, chartWidth, xByConsultation, inflectionKeys, targetConsultationId, dateByConsultation }: {
  dimension: CapacityDimensionRow; chartWidth: number; xByConsultation: ReadonlyMap<string, number>; inflectionKeys: ReadonlySet<string>; targetConsultationId?: string; dateByConsultation: ReadonlyMap<string, string>;
}) {
  const segments = lineSegments(dimension, xByConsultation);
  const currentCell = dimension.cells.at(-1);
  const latestRecorded = latestRecordedCell(dimension);
  const currentStatus = latestRecorded?.status ?? "not-assessed";
  const latestDate = latestRecorded ? dateByConsultation.get(latestRecorded.consultationId) : undefined;
  const notReappliedNow = Boolean(latestRecorded && currentCell && latestRecorded.consultationId !== currentCell.consultationId);
  return <div className={styles.dimensionRow} data-dimension={dimension.code}>
    <div className={styles.dimensionSummary}><div><strong>{dimension.label}</strong><span>{dimension.framework === "functional-capacity" ? "Independência funcional" : "Capacidade intrínseca"}</span></div><div className={styles.latestState}><span className={styles.latestBadge} data-status={currentStatus}>{latestRecorded ? `Último: ${STATUS_LABEL[currentStatus]}` : STATUS_LABEL[currentStatus]}</span>{latestDate ? <small>{displayDate(latestDate)}{notReappliedNow ? " · não reaplicada na mais recente" : ""}</small> : null}</div></div>
    <svg className={styles.domainChart} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`} width={chartWidth} height={CHART_HEIGHT} role="img" aria-label={`Trajetória longitudinal de ${dimension.label}`}>
      <line className={styles.statusGuide} x1={24} x2={chartWidth - 24} y1={STATUS_Y.preserved} y2={STATUS_Y.preserved}/><line className={styles.statusGuide} x1={24} x2={chartWidth - 24} y1={STATUS_Y.attention} y2={STATUS_Y.attention}/><line className={styles.statusGuide} x1={24} x2={chartWidth - 24} y1={STATUS_Y.altered} y2={STATUS_Y.altered}/>
      {targetConsultationId ? (() => { const x = xByConsultation.get(targetConsultationId); return x === undefined ? null : <line className={styles.targetGuide} x1={x} x2={x} y1={7} y2={CHART_HEIGHT - 7}/>; })() : null}
      {segments.map((segment, index) => <polyline key={`${dimension.code}-segment-${index}`} className={styles.seriesLine} data-gap={segment.crossesUnassessedVisit ? "unassessed" : "none"} points={segment.points.map((point) => `${point.x},${point.y}`).join(" ")}/>)}
      {dimension.cells.map((cell) => {
        const x = xByConsultation.get(cell.consultationId); if (x === undefined) return null;
        const instruments = cell.assessments.map(assessmentDetail); const title = `${dimension.label}: ${STATUS_LABEL[cell.status]}. ${cell.statusReason}${instruments.length ? ` Instrumentos: ${instruments.join(" | ")}.` : ""}`; const isInflection = inflectionKeys.has(`${dimension.code}:${cell.consultationId}`);
        if (isComparable(cell.status)) return <g key={`${dimension.code}-${cell.consultationId}`}>{isInflection ? <circle className={styles.inflectionHalo} cx={x} cy={STATUS_Y[cell.status]} r={8}/> : null}<circle className={styles.seriesPoint} data-status={cell.status} cx={x} cy={STATUS_Y[cell.status]} r={5}><title>{title}</title></circle></g>;
        if (cell.status === "indeterminate") { const y = STATUS_Y.attention, size = 6; return <polygon key={`${dimension.code}-${cell.consultationId}`} className={styles.indeterminatePoint} points={`${x},${y-size} ${x+size},${y} ${x},${y+size} ${x-size},${y}`}><title>{title}</title></polygon>; }
        if (cell.status === "recorded") return <rect key={`${dimension.code}-${cell.consultationId}`} className={styles.recordedPoint} x={x-4.5} y={STATUS_Y.attention-4.5} width={9} height={9} rx={2}><title>{title}</title></rect>;
        return <circle key={`${dimension.code}-${cell.consultationId}`} className={styles.missingPoint} cx={x} cy={STATUS_Y.attention} r={4}><title>{title}</title></circle>;
      })}
    </svg>
  </div>;
}

export function CapacityDimensionHistoryChart({ history, context }: { history: CapacityDimensionHistory; context: "patient-home" | "final-report" }) {
  if (!hasDisplayableLongitudinalHistory(history)) return <p className={styles.empty}>O gráfico longitudinal será exibido a partir de uma consulta subsequente com um novo resultado registrado no mesmo domínio. Depois disso, consultas sem reaplicação não apagam o histórico.</p>;
  const chartWidth = Math.max(700, 96 + Math.max(history.consultations.length - 1, 1) * 150); const timelineWidth = LABEL_WIDTH + chartWidth; const left = 24, right = 24, usableWidth = chartWidth - left - right;
  const times = history.consultations.map((consultation) => new Date(consultation.occurredAt).getTime()); const minTime = Math.min(...times), maxTime = Math.max(...times);
  const xByConsultation = new Map(history.consultations.map((consultation) => [consultation.id, proportionalAxisPosition({ value: new Date(consultation.occurredAt).getTime(), min: minTime, max: maxTime, start: left, end: left + usableWidth })] as const));
  const targetConsultationId = history.consultations.find((consultation) => consultation.isTarget)?.id; const dateByConsultation = new Map(history.consultations.map((consultation) => [consultation.id, consultation.occurredAt])); const inflectionKeys = new Set(history.inflectionPoints.map((point) => `${point.dimensionCode}:${point.consultationId}`));
  const functionalDimension = history.dimensions.find((dimension) => dimension.framework === "functional-capacity"); const intrinsicDimensions = history.dimensions.filter((dimension) => dimension.framework === "intrinsic-capacity");
  const assessedByConsultation = history.consultations.map((consultation) => { const unique = new Map<string,{name:string;version:string}>(); for (const dimension of history.dimensions) { const cell = dimension.cells.find((item) => item.consultationId === consultation.id); for (const assessment of cell?.assessments ?? []) unique.set(`${assessment.scaleCode}@${assessment.scaleVersion}`, { name: assessment.scaleName, version: assessment.scaleVersion }); } return { consultation, scales: [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")) }; }).filter((item)=>item.scales.length>0);
  return <figure className={styles.figure} data-chart="line-small-multiples">
    <figcaption className={styles.caption}><div><strong>Evolução da capacidade intrínseca e da independência funcional</strong><span>Uma trajetória por domínio. O tempo real entre consultas é preservado.</span></div><span className={styles.methodologyBadge}>{history.methodologyVersion}</span></figcaption>
    <div className={styles.statusLegend} aria-label="Legenda dos estados clínicos"><span><i data-status="preserved" aria-hidden="true"/>Sem redução detectada</span><span><i data-status="attention" aria-hidden="true"/>Sinal de atenção</span><span><i data-status="altered" aria-hidden="true"/>Redução identificada</span><span><i data-status="indeterminate" aria-hidden="true"/>Discordante</span><span><i data-status="missing" aria-hidden="true"/>Não avaliada</span></div>
    {!history.hasLongitudinalTrendData ? <p className={styles.continuityNote}>Histórico preservado: há resultados deste domínio em mais de uma consulta, mas os trechos sem o mesmo instrumento e versão permanecem desconectados. Uma consulta sem reaplicação não apaga os pontos anteriores.</p> : null}
    <div className={styles.scroll} tabIndex={0} aria-label="Evolução longitudinal por domínio, rolável por consulta"><div className={styles.timelineCanvas} style={{ width: `${timelineWidth}px` }}><div className={styles.dateRow}><div className={styles.dateRowLabel}>Consultas</div><svg className={styles.dateAxis} viewBox={`0 0 ${chartWidth} ${DATE_AXIS_HEIGHT}`} width={chartWidth} height={DATE_AXIS_HEIGHT} aria-hidden="true"><line className={styles.dateBaseline} x1={left} x2={chartWidth-right} y1={14} y2={14}/>{history.consultations.map((consultation)=>{const x=xByConsultation.get(consultation.id)??left;return <g key={consultation.id}><line className={styles.dateTick} x1={x} x2={x} y1={10} y2={18}/><text className={styles.dateLabel} x={x} y={32} textAnchor="middle">{displayDate(consultation.occurredAt)}</text>{consultation.isTarget?<text className={styles.targetLabel} x={x} y={43} textAnchor="middle">mais recente</text>:null}</g>;})}</svg></div>
      <section className={styles.dimensionGroup} aria-label="Independência funcional e domínios de capacidade intrínseca">{functionalDimension?<><div className={styles.frameworkHeader}><strong>Independência funcional</strong><span>ABVD/AIVD — apresentada separadamente da capacidade intrínseca</span></div><DimensionTimeline dimension={functionalDimension} chartWidth={chartWidth} xByConsultation={xByConsultation} inflectionKeys={inflectionKeys} targetConsultationId={targetConsultationId} dateByConsultation={dateByConsultation}/></>:null}<div className={styles.frameworkHeader}><strong>Capacidade intrínseca</strong><span>Locomoção, cognição, humor, vitalidade, audição e visão — trajetórias separadas</span></div>{intrinsicDimensions.map((dimension)=><DimensionTimeline key={dimension.code} dimension={dimension} chartWidth={chartWidth} xByConsultation={xByConsultation} inflectionKeys={inflectionKeys} targetConsultationId={targetConsultationId} dateByConsultation={dateByConsultation}/>)}</section>
    </div></div>
    {assessedByConsultation.length>0?<details className={styles.assessmentIndex} open={context==="final-report"}><summary>Escalas registradas por consulta ({assessedByConsultation.length})</summary><div>{assessedByConsultation.map(({consultation,scales})=><section key={consultation.id}><strong>{displayDate(consultation.occurredAt)}{consultation.isTarget?" · mais recente":""}</strong><span>{scales.map((scale)=>`${scale.name} (${scale.version})`).join(" · ")}</span></section>)}</div></details>:null}
    <div className={styles.readingGuide}><strong>Como ler</strong><span>Acima = sem redução • centro = atenção • abaixo = redução. Todo estado válido é exibido; a linha só continua quando instrumento e versão são comparáveis.</span><span>Trecho tracejado = houve consulta intermediária sem reaplicação; compara somente os dois resultados medidos e não implica estabilidade no intervalo.</span><span>Círculo cinza = não avaliada • quadrado = registro sem estado • losango = resultados discordantes. O estado mais recente fica no badge à esquerda.</span></div>
    {history.inflectionPoints.length>0?<section className={styles.inflectionSection} aria-labelledby="capacity-inflection-title"><h3 id="capacity-inflection-title">{history.inflectionPoints.length===1?"Ponto de inflexão observado":"Pontos de inflexão observados"}</h3><ul>{history.inflectionPoints.map((point)=><li key={`${point.dimensionCode}-${point.consultationId}-${point.previousConsultationId}`}><strong>{displayDate(point.occurredAt)} · {point.dimensionLabel} — {point.direction==="worsened"?"piora observada":"melhora observada"} em avaliações comparáveis.</strong>{point.milestones.length>0?<span>Registro temporal associado: {point.milestones.map((milestone)=>milestone.note?`${milestone.title} — ${milestone.note}`:milestone.title).join("; ")}.</span>:<span>Sem motivo associado registrado nesta consulta; o gráfico não atribui causa.</span>}</li>)}</ul><p className={styles.causalityNote}>O software registra coincidência temporal, mas não atribui causalidade.</p></section>:null}
    {context==="patient-home"?<details className={styles.methodDetails}><summary>Critérios metodológicos e proveniência</summary><p>Versão metodológica: {history.methodologyVersion}.</p><p>{history.methodologyNote}</p><p>Resultados originais, versões, classificação e fonte permanecem vinculados aos pontos. Quando o instrumento muda, a linha é interrompida em vez de fabricar uma tendência.</p></details>:<p className={styles.frameworkNote}>Versão metodológica: {history.methodologyVersion}. {history.methodologyNote} Resultados originais, versões, classificação e fonte permanecem vinculados aos pontos.</p>}
  </figure>;
}
