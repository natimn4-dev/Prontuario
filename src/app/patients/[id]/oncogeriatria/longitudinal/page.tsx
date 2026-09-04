import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CapacityDimensionHistoryChart } from "@/components/reports/capacity-dimension-history-chart";
import { ClinicalMetricTrendChart } from "@/components/reports/clinical-metric-trend-chart";
import { SCALE_DIRECTIONS } from "@/domain/longitudinal-scales";
import { buildOncogeriatricDelta, groupComparableObservations } from "@/domain/oncogeriatria/longitudinal";
import { oncogeriatricCheckpointTypeLabel } from "@/domain/oncogeriatria/presentation-labels";
import { scaleCatalogEntry } from "@/domain/scale-catalog";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function dayKey(date: Date): string { return date.toISOString().slice(0, 10); }

function trendLabel(trend: string): string {
  if (trend === "favorable") return "tendência numérica favorável";
  if (trend === "unfavorable") return "tendência numérica desfavorável";
  if (trend === "stable") return "estável numericamente";
  return "direção clínica não configurada";
}

function directionLabel(code: string): string {
  const direction = SCALE_DIRECTIONS[code.toLocaleLowerCase("pt-BR")];
  if (direction === "higher-better") return "Nesta escala, valores maiores representam melhor resultado.";
  if (direction === "higher-worse") return "Nesta escala, valores maiores representam pior resultado.";
  return "Valores brutos registrados; direção clínica não configurada.";
}

export default async function OncogeriatricLongitudinalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico para visualizar a evolução.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const linkedConsultationIds = new Set(workspace.checkpoints.flatMap((checkpoint) => checkpoint.consultationId ? [checkpoint.consultationId] : []));
  const consultationDateById = new Map(workspace.consultations.map((consultation) => [consultation.id, consultation.occurredAt]));
  const eventsByDay = new Map<string, string[]>();
  const addEvent = (date: Date | null | undefined, label: string) => {
    if (!date) return;
    const key = dayKey(date);
    const current = eventsByDay.get(key) ?? [];
    if (!current.includes(label)) eventsByDay.set(key, [...current, label]);
  };
  workspace.courses.forEach((course) => addEvent(course.actualStartAt, `Início ${course.regimenName}`));
  workspace.checkpoints.forEach((checkpoint) => addEvent(checkpoint.occurredAt, checkpoint.type === "CYCLE" ? `Ciclo ${checkpoint.cycleNumber ?? ""}`.trim() : oncogeriatricCheckpointTypeLabel(checkpoint.type)));
  workspace.toxicities.filter((item) => item.hospitalizationAssociated).forEach((item) => addEvent(item.occurredAt, "Hospitalização"));
  workspace.problemMilestones.forEach((milestone) => addEvent(consultationDateById.get(milestone.consultationId) ?? new Date(milestone.recordedAt), `${milestone.title}${milestone.note ? ` — ${milestone.note}` : ""}`));

  const numericObservations = workspace.scaleAssessments
    .filter((item) => linkedConsultationIds.has(item.consultationId) && item.scoreNumeric !== null)
    .map((item) => ({ id: item.id, consultationId: item.consultationId, code: item.scaleCode, version: item.scaleVersion, occurredAt: item.appliedAt, value: Number(item.scoreNumeric) }))
    .filter((item) => Number.isFinite(item.value));
  const scaleGroups = groupComparableObservations(numericObservations);
  const deltas = scaleGroups.map((group) => buildOncogeriatricDelta(group.observations)).filter(Boolean);

  const weightPoints = workspace.checkpoints.flatMap((checkpoint) => {
    const data = readStructuredRecord(checkpoint.structuredData);
    const nutrition = readStructuredRecord(data.nutrition);
    const value = typeof nutrition.weightKg === "number" ? nutrition.weightKg : Number(nutrition.weightKg);
    return Number.isFinite(value) && value > 0 ? [{ at: checkpoint.occurredAt, value, label: (eventsByDay.get(dayKey(checkpoint.occurredAt)) ?? []).join(" · ") }] : [];
  });

  const chartGroups = scaleGroups.filter((group) => group.observations.length >= 1).slice(0, 8);
  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Oncogeriatria · etapa 6</p><h1>Evolução geriátrica</h1><p>{patient.fullName} · avaliação inicial → tratamento → eventos → intervenção → recuperação. Comparações são feitas apenas entre o mesmo código e a mesma versão do instrumento.</p></header>
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      <OncogeriatricDomainStatusSummary history={capacityHistory} />
      <section className="panel" aria-label="Trajetória persistente por domínio no acompanhamento oncogeriátrico">
        <div className="section-heading"><div><p className="eyebrow">Domínios</p><h2>Trajetória geriátrica vinculada ao acompanhamento</h2></div><span className="muted">Consultas não vinculadas não entram nesta visão.</span></div>
        <CapacityDimensionHistoryChart history={capacityHistory} context="patient-home" />
      </section>

      <section className="panel"><div className="section-heading"><div><p className="eyebrow">Mudança temporal</p><h2>Avaliação inicial → atual</h2></div><span className="muted">Mudança numérica não é rotulada automaticamente como clinicamente significativa.</span></div>
        {deltas.length ? <div className="evolution-list">{deltas.map((delta) => delta ? <article className="evolution-card" key={`${delta.code}-${delta.version}`}><div><h3>{scaleCatalogEntry(delta.code).name}</h3><p className="dimension">versão {delta.version}</p><p className="trend">Mudança numérica: {delta.delta > 0 ? "+" : ""}{delta.delta} · {trendLabel(delta.trend)}</p></div><div className="score-block"><span>Inicial</span><strong>{delta.baseline}</strong></div><div className="score-arrow">→</div><div className="score-block current-score"><span>Atual</span><strong>{delta.current}</strong></div><div className="score-block"><span>Data atual</span><strong>{formatClinicalDate(delta.currentAt)}</strong></div></article> : null)}</div> : <p className="muted">Dados insuficientes para comparação de escalas com código e versão compatíveis.</p>}
      </section>

      <section className="panel"><h2>Linha temporal oncológica</h2>{eventsByDay.size ? <ul className="clean-list">{[...eventsByDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, labels]) => <li key={date}><strong>{date.split("-").reverse().join("/")}</strong><span>{labels.join(" · ")}</span></li>)}</ul> : <p className="muted">Sem eventos temporais registrados.</p>}</section>

      <section className="grid" aria-label="Gráficos longitudinais oncogeriátricos">
        <ClinicalMetricTrendChart title="Peso" unit="kg" points={weightPoints.map((point, index) => ({ id: `weight-${point.at.toISOString()}-${index}`, at: point.at, value: point.value, context: point.label }))} />
        {chartGroups.map((group) => <ClinicalMetricTrendChart key={`${group.code}-${group.version}`} title={`${scaleCatalogEntry(group.code).name} · versão ${group.version}`} directionLabel={directionLabel(group.code)} points={group.observations.map((item, index) => ({ id: item.id ?? `${group.code}-${item.occurredAt.toISOString()}-${index}`, at: item.occurredAt, value: item.value, context: (eventsByDay.get(dayKey(item.occurredAt)) ?? []).join(" · ") }))} />)}
      </section>
    </main>
  );
}
