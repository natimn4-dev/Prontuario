import {
  hasDisplayableLongitudinalHistory,
  type CapacityComparableStatus,
  type CapacityDimensionHistory,
  type CapacityDimensionRow,
  type CapacityDimensionStatus,
} from "@/domain/capacity-dimension-history";
import { CAPACITY_STATUS_LABEL as STATUS_LABEL, capacityChartDimensions, capacityChartPositions, capacityChartSegments } from "@/domain/capacity-chart-presentation";
import styles from "./capacity-dimension-history-chart.module.css";

const CHART_HEIGHT = 210;
const LABEL_WIDTH = 190;
const DATE_AXIS_HEIGHT = 52;
const STATUS_Y: Record<CapacityComparableStatus, number> = { preserved: 32, attention: 96, altered: 160 };

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

function lineSegments(dimension: CapacityDimensionRow, xByConsultation: ReadonlyMap<string, number>) {
  return capacityChartSegments(dimension).filter((segment) => xByConsultation.has(segment.from) && xByConsultation.has(segment.to)).map((segment) => ({
    crossesUnassessedVisit: segment.crossesUnassessedVisit,
    points: [segment.from, segment.to].map((id) => {
      const cell = dimension.cells.find((item) => item.consultationId === id)!;
      return { x: xByConsultation.get(id)!, y: STATUS_Y[cell.status as CapacityComparableStatus] };
    }),
  }));
}
function latestRecordedCell(dimension: CapacityDimensionRow) { return [...dimension.cells].reverse().find((cell) => cell.assessments.length > 0); }

type InflectionDisplay = { shortLabel: string; fullLabel: string };

function inflectionDisplay(point: CapacityDimensionHistory["inflectionPoints"][number]): InflectionDisplay {
  const fullLabel = point.milestones.length
    ? point.milestones.map((milestone) => milestone.note ? `${milestone.title} — ${milestone.note}` : milestone.title).join("; ")
    : "Sem motivo associado registrado nesta consulta";
  const primary = point.milestones[0]?.title ?? "Sem motivo registrado";
  const withCount = point.milestones.length > 1 ? `${primary} +${point.milestones.length - 1}` : primary;
  const shortLabel = withCount.length > 28 ? `${withCount.slice(0, 27)}…` : withCount;
  return { shortLabel, fullLabel };
}

function inflectionLabelY(status: CapacityComparableStatus): number {
  if (status === "preserved") return 52;
  if (status === "attention") return 82;
  return 146;
}

function DimensionTimeline({ dimension, chartWidth, xByConsultation, inflectionByKey, targetConsultationId, dateByConsultation }: {
  dimension: CapacityDimensionRow; chartWidth: number; xByConsultation: ReadonlyMap<string, number>; inflectionByKey: ReadonlyMap<string, InflectionDisplay>; targetConsultationId?: string; dateByConsultation: ReadonlyMap<string, string>;
}) {
  const segments = lineSegments(dimension, xByConsultation);
  const axisLeft = 145;
  const currentCell = dimension.cells.at(-1);
  const latestRecorded = latestRecordedCell(dimension);
  const currentStatus = latestRecorded?.status ?? "not-assessed";
  const latestDate = latestRecorded ? dateByConsultation.get(latestRecorded.consultationId) : undefined;
  const notReappliedNow = Boolean(latestRecorded && currentCell && latestRecorded.consultationId !== currentCell.consultationId);
  return <div className={styles.dimensionRow} data-dimension={dimension.code}>
    <div className={styles.dimensionSummary}><div><strong>{dimension.label}</strong><span>{dimension.framework === "functional-capacity" ? "Independência funcional" : "Capacidade intrínseca"}</span></div><div className={styles.latestState}><span className={styles.latestBadge} data-status={currentStatus}>{latestRecorded ? `Último: ${STATUS_LABEL[currentStatus]}` : STATUS_LABEL[currentStatus]}</span>{latestDate ? <small>{displayDate(latestDate)}{notReappliedNow ? " · não reaplicada na mais recente" : ""}</small> : null}</div></div>
    <svg className={styles.domainChart} viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`} width={chartWidth} height={CHART_HEIGHT} role="img" aria-label={`Trajetória longitudinal de ${dimension.label}`}>
      <line className={styles.statusGuide} x1={axisLeft} x2={chartWidth - 24} y1={STATUS_Y.preserved} y2={STATUS_Y.preserved}/><line className={styles.statusGuide} x1={axisLeft} x2={chartWidth - 24} y1={STATUS_Y.attention} y2={STATUS_Y.attention}/><line className={styles.statusGuide} x1={axisLeft} x2={chartWidth - 24} y1={STATUS_Y.altered} y2={STATUS_Y.altered}/>
      <line className={styles.dateBaseline} x1={axisLeft} x2={axisLeft} y1={16} y2={180}/>
      <line className={styles.dateBaseline} x1={axisLeft} x2={chartWidth - 24} y1={180} y2={180}/>
      {(["preserved", "attention", "altered"] as const).map((status) => <text key={status} className={styles.statusAxisLabel} x={axisLeft - 10} y={STATUS_Y[status] + 4} textAnchor="end">{STATUS_LABEL[status]}</text>)}
      {dimension.cells.map((cell) => { const x = xByConsultation.get(cell.consultationId); return x === undefined ? null : <g key={`grid-${cell.consultationId}`}><line className={styles.statusGuide} x1={x} x2={x} y1={16} y2={180}/><text className={styles.domainDateLabel} x={x} y={202} textAnchor="middle">{displayDate(dateByConsultation.get(cell.consultationId)!)}</text></g>; })}
      {targetConsultationId ? (() => { const x = xByConsultation.get(targetConsultationId); return x === undefined ? null : <line className={styles.targetGuide} x1={x} x2={x} y1={7} y2={CHART_HEIGHT - 7}/>; })() : null}
      {segments.map((segment, index) => <polyline key={`${dimension.code}-segment-${index}`} className={styles.seriesLine} stroke="currentColor" strokeWidth={3} fill="none" data-gap={segment.crossesUnassessedVisit ? "unassessed" : "none"} points={segment.points.map((point) => `${point.x},${point.y}`).join(" ")}/>)}
      {dimension.cells.map((cell) => {
        const x = xByConsultation.get(cell.consultationId); if (x === undefined) return null;
        const instruments = cell.assessments.map(assessmentDetail);
        const inflection = inflectionByKey.get(`${dimension.code}:${cell.consultationId}`);
        const title = `${dimension.label}: ${STATUS_LABEL[cell.status]}. ${cell.statusReason}${instruments.length ? ` Instrumentos: ${instruments.join(" | ")}.` : ""}${inflection ? ` Registro temporal associado: ${inflection.fullLabel}. O gráfico não atribui causalidade.` : ""}`;
        if (isComparable(cell.status)) return <g key={`${dimension.code}-${cell.consultationId}`}>{inflection ? <><circle className={styles.inflectionHalo} cx={x} cy={STATUS_Y[cell.status]} r={8}/><text className={styles.inflectionLabel} data-inflection="true" x={x} y={inflectionLabelY(cell.status)} textAnchor="middle"><title>{inflection.fullLabel}</title>↳ {inflection.shortLabel}</text></> : null}<circle className={styles.seriesPoint} data-status={cell.status} cx={x} cy={STATUS_Y[cell.status]} r={5}><title>{title}</title></circle></g>;
        if (cell.status === "indeterminate") { const y = STATUS_Y.attention, size = 6; return <polygon key={`${dimension.code}-${cell.consultationId}`} className={styles.indeterminatePoint} points={`${x},${y-size} ${x+size},${y} ${x},${y+size} ${x-size},${y}`}><title>{title}</title></polygon>; }
        if (cell.status === "recorded") return <rect key={`${dimension.code}-${cell.consultationId}`} className={styles.recordedPoint} x={x-4.5} y={STATUS_Y.attention-4.5} width={9} height={9} rx={2}><title>{title}</title></rect>;
        return <circle key={`${dimension.code}-${cell.consultationId}`} className={styles.missingPoint} cx={x} cy={STATUS_Y.attention} r={4}><title>{title}</title></circle>;
      })}
    </svg>
  </div>;
}

export function CapacityDimensionHistoryChart({ history, context }: { history: CapacityDimensionHistory; context: "patient-home" | "final-report" }) {
  const dimensions = capacityChartDimensions(history.dimensions);
  if (!hasDisplayableLongitudinalHistory({ ...history, dimensions })) return <p className={styles.empty}>O gráfico longitudinal será exibido quando houver escalas preenchidas em pelo menos duas consultas no mesmo domínio. Retornos sem reaplicação não criam novos resultados e preservam o histórico já registrado.</p>;
  const inflectionPoints = history.inflectionPoints.filter((point) => dimensions.some((dimension) => dimension.code === point.dimensionCode));
  const chartWidth = Math.max(700, 96 + Math.max(history.consultations.length - 1, 1) * 150); const timelineWidth = LABEL_WIDTH + chartWidth; const left = 160, right = 24, usableWidth = chartWidth - left - right;
  const positions = capacityChartPositions(history.consultations, left, left + usableWidth);
  const xByConsultation = new Map(positions.map((item) => [item.id, item.x]));
  const targetConsultationId = history.consultations.find((consultation) => consultation.isTarget)?.id; const dateByConsultation = new Map(history.consultations.map((consultation) => [consultation.id, consultation.occurredAt])); const inflectionByKey = new Map(inflectionPoints.map((point) => [`${point.dimensionCode}:${point.consultationId}`, inflectionDisplay(point)] as const));
  const functionalDimension = dimensions.find((dimension) => dimension.framework === "functional-capacity"); const intrinsicDimensions = dimensions.filter((dimension) => dimension.framework === "intrinsic-capacity");
  const assessedByConsultation = history.consultations.map((consultation) => { const unique = new Map<string,{name:string;version:string}>(); for (const dimension of dimensions) { const cell = dimension.cells.find((item) => item.consultationId === consultation.id); for (const assessment of cell?.assessments ?? []) unique.set(`${assessment.scaleCode}@${assessment.scaleVersion}`, { name: assessment.scaleName, version: assessment.scaleVersion }); } return { consultation, scales: [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR")) }; }).filter((item)=>item.scales.length>0);
  return <figure className={styles.figure} data-chart="line-small-multiples">
    <figcaption className={styles.caption}><div><strong>Evolução da capacidade intrínseca e da independência funcional</strong><span>Linhas e pontos por domínio, com grade e datas das consultas. O tempo real entre consultas é preservado. As faixas não mostram todas as mudanças de pontuação; confira os resultados registrados abaixo.</span></div><span className={styles.methodologyBadge}>{history.methodologyVersion}</span></figcaption>
    <div className={styles.statusLegend} aria-label="Legenda dos estados clínicos"><span><i data-status="preserved" aria-hidden="true"/>Sem redução detectada</span><span><i data-status="attention" aria-hidden="true"/>Sinal de atenção</span><span><i data-status="altered" aria-hidden="true"/>Redução identificada</span><span><i data-status="indeterminate" aria-hidden="true"/>Discordante</span><span><i data-status="missing" aria-hidden="true"/>Não avaliada</span></div>
    {!dimensions.some((dimension) => capacityChartSegments(dimension).length > 0) ? <p className={styles.continuityNote}>Histórico preservado. A linha exige os mesmos instrumentos e versões; dados insuficientes não formam uma tendência. Uma consulta sem reaplicação não apaga os resultados anteriores.</p> : null}
    <div className={styles.scroll} tabIndex={0} aria-label="Evolução longitudinal por domínio, rolável por consulta"><div className={styles.timelineCanvas} style={{ width: `${timelineWidth}px` }}><div className={styles.dateRow}><div className={styles.dateRowLabel}>Consultas</div><svg className={styles.dateAxis} viewBox={`0 0 ${chartWidth} ${DATE_AXIS_HEIGHT}`} width={chartWidth} height={DATE_AXIS_HEIGHT} aria-hidden="true"><line className={styles.dateBaseline} x1={left} x2={chartWidth-right} y1={14} y2={14}/>{history.consultations.map((consultation)=>{const x=xByConsultation.get(consultation.id)??left;return <g key={consultation.id}><line className={styles.dateTick} x1={positions.find((item) => item.id === consultation.id)?.anchor ?? x} x2={x} y1={14} y2={24}/><line className={styles.dateTick} x1={x} x2={x} y1={10} y2={18}/><text className={styles.dateLabel} x={x} y={32} textAnchor="middle">{history.consultations.indexOf(consultation) + 1}</text>{consultation.isTarget?<text className={styles.targetLabel} x={x} y={43} textAnchor="middle">mais recente</text>:null}</g>;})}</svg></div>
      <section className={styles.dimensionGroup} aria-label="Independência funcional e domínios de capacidade intrínseca">{functionalDimension?<><div className={styles.frameworkHeader}><strong>Independência funcional</strong><span>ABVD/AIVD — apresentada separadamente da capacidade intrínseca</span></div><DimensionTimeline dimension={functionalDimension} chartWidth={chartWidth} xByConsultation={xByConsultation} inflectionByKey={inflectionByKey} targetConsultationId={targetConsultationId} dateByConsultation={dateByConsultation}/></>:null}<div className={styles.frameworkHeader}><strong>Capacidade intrínseca</strong><span>Cognição, locomoção, humor e vitalidade — trajetórias separadas</span></div>{intrinsicDimensions.map((dimension)=><DimensionTimeline key={dimension.code} dimension={dimension} chartWidth={chartWidth} xByConsultation={xByConsultation} inflectionByKey={inflectionByKey} targetConsultationId={targetConsultationId} dateByConsultation={dateByConsultation}/>)}</section>
    </div></div>
    <div className={styles.printTimeline}>
      {Array.from({ length: Math.ceil(Math.max(history.consultations.length - 1, 1) / 5) }, (_, block) => {
        const visits = history.consultations.slice(block * 5, block * 5 + 6);
        const printPositions = capacityChartPositions(visits, 160, 576);
        const printX = new Map(printPositions.map((item) => [item.id, item.x]));
        return <section key={block}>
          <h4>Consultas {block * 5 + 1} a {block * 5 + visits.length}</h4>
          <div className={styles.dateRow}><div className={styles.dateRowLabel}>Consultas</div><svg className={styles.dateAxis} viewBox="0 0 600 36" width={600} height={36} aria-hidden="true">{visits.map((visit) => <text className={styles.dateLabel} key={visit.id} x={printX.get(visit.id)} y={24} textAnchor="middle">{history.consultations.findIndex((item) => item.id === visit.id) + 1}</text>)}</svg></div>
          {dimensions.map((dimension) => <DimensionTimeline key={dimension.code} dimension={dimension} chartWidth={600} xByConsultation={printX} inflectionByKey={inflectionByKey} targetConsultationId={targetConsultationId} dateByConsultation={dateByConsultation}/>)}
        </section>;
      })}
    </div>
    {assessedByConsultation.length>0?<details className={styles.assessmentIndex} open={context==="final-report"}><summary>Escalas registradas por consulta ({assessedByConsultation.length})</summary><div>{assessedByConsultation.map(({consultation,scales})=><section key={consultation.id}><strong>{displayDate(consultation.occurredAt)}{consultation.isTarget?" · mais recente":""}</strong><span>{scales.map((scale)=>`${scale.name} (${scale.version})`).join(" · ")}</span></section>)}</div></details>:null}
    <div className={styles.resultsHistory}>
      <div className={styles.resultsTableWrap} tabIndex={0} aria-label="Resultados longitudinais por consulta">
        <table className={styles.resultsTable}>
          <caption>Resultados registrados por consulta</caption>
          <thead><tr><th scope="col">Consulta</th><th scope="col">Domínio</th><th scope="col">Escala</th><th scope="col">Resultado</th><th scope="col">Classificação</th></tr></thead>
          <tbody>{history.consultations.flatMap((consultation, index) => dimensions.flatMap((dimension) => {
            const cell = dimension.cells.find((item) => item.consultationId === consultation.id);
            return (cell?.assessments ?? []).map((assessment) => <tr key={`${consultation.id}-${dimension.code}-${assessment.scaleCode}-${assessment.scaleVersion}`}>
              <th scope="row">Consulta {index + 1}<span>{displayDate(consultation.occurredAt)}{consultation.isTarget ? " · mais recente" : ""}</span></th>
              <td>{dimension.label}</td><td>{assessment.scaleName}<small>{assessment.scaleVersion}</small></td>
              <td>{assessment.scoreText?.trim() || (assessment.scoreNumeric === null || assessment.scoreNumeric === undefined ? "—" : String(assessment.scoreNumeric))}</td>
              <td>{assessment.classification || "—"}</td>
            </tr>);
          }))}</tbody>
        </table>
      </div>
    </div>
    <div className={styles.readingGuide}><strong>Como ler</strong><span>Acima = sem redução • centro = atenção • abaixo = redução. Todo estado válido é exibido; a linha só continua quando os instrumentos e versões são comparáveis.</span><span>Trecho tracejado = houve consulta intermediária sem reaplicação; compara somente os dois resultados medidos e não implica estabilidade no intervalo.</span><span>Círculo cinza = não avaliada • quadrado = registro sem estado • losango = resultados discordantes. O estado mais recente fica no badge à esquerda.</span></div>
    {inflectionPoints.length>0?<section className={styles.inflectionSection} aria-labelledby="capacity-inflection-title"><h3 id="capacity-inflection-title">{inflectionPoints.length===1?"Ponto de inflexão observado":"Pontos de inflexão observados"}</h3><ul>{inflectionPoints.map((point)=><li key={`${point.dimensionCode}-${point.consultationId}-${point.previousConsultationId}`}><strong>{displayDate(point.occurredAt)} · {point.dimensionLabel} — {point.direction==="worsened"?"piora observada":"melhora observada"} em avaliações comparáveis.</strong>{point.milestones.length>0?<span>Registro temporal associado: {point.milestones.map((milestone)=>milestone.note?`${milestone.title} — ${milestone.note}`:milestone.title).join("; ")}.</span>:<span>Sem motivo associado registrado nesta consulta; o gráfico não atribui causa.</span>}</li>)}</ul><p className={styles.causalityNote}>O software registra coincidência temporal, mas não atribui causalidade.</p></section>:null}
    {context==="patient-home"?<details className={styles.methodDetails}><summary>Critérios metodológicos e proveniência</summary><p>Versão metodológica: {history.methodologyVersion}.</p><p>{history.methodologyNote.replace("Audição e visão permanecem em trajetórias independentes e nunca são combinadas aritmeticamente.", "Audição e visão permanecem registradas sem gerar gráficos.")}</p><p>Resultados originais, versões, classificação e fonte permanecem vinculados aos pontos. Quando o instrumento muda, a linha é interrompida em vez de fabricar uma tendência.</p></details>:<p className={styles.frameworkNote}>Versão metodológica: {history.methodologyVersion}. {history.methodologyNote.replace("Audição e visão permanecem em trajetórias independentes e nunca são combinadas aritmeticamente.", "Audição e visão permanecem registradas sem gerar gráficos.")} Resultados originais, versões, classificação e fonte permanecem vinculados aos pontos.</p>}
  </figure>;
}
