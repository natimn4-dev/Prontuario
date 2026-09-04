import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { StartEpisodeForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import {
  oncogeriatricCheckpointStatusLabel,
  oncogeriatricCheckpointTypeLabel,
  oncogeriatricCourseStatusLabel,
  oncogeriatricEpisodeStatusLabel,
  oncogeriatricIntentLabel,
} from "@/domain/oncogeriatria/presentation-labels";
import {
  capacityHistoryForOncogeriatricEpisode,
  formatClinicalDate,
  hasRelevantCheckpointAlert,
  loadEpisodeWorkspace,
  loadOncogeriatricEpisodes,
  loadOncogeriatricPatient,
  requireOncogeriatricReadAccess,
  resolveOncogeriatricEpisode,
} from "@/server/oncogeriatria/read";

function scaleForCheckpoint(
  ids: (string | null)[],
  assessments: { id: string; scoreText: string | null; scoreNumeric: unknown; classification: string | null }[],
) {
  for (const id of ids.filter(Boolean).reverse()) {
    const assessment = assessments.find((item) => item.id === id);
    if (assessment) return assessment;
  }
  return null;
}

export default async function OncogeriatricPatientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episodes = await loadOncogeriatricEpisodes(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);

  if (!episode) {
    return (
      <main className="shell narrow-shell">
        <header className="hero compact-hero"><p className="eyebrow">Oncogeriatria · início manual</p><h1>{patient.fullName}</h1><p>Este paciente ainda não possui acompanhamento oncogeriátrico. A inclusão depende de confirmação médica explícita e não é determinada pela idade.</p></header>
        <section className="panel form-panel"><h2>Iniciar acompanhamento oncológico</h2><StartEpisodeForm patientId={patientId} /></section>
        <p><a href="/oncogeriatria">← Voltar à Oncogeriatria</a></p>
      </main>
    );
  }

  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const currentCourse = workspace.courses.find((course) => course.status === "ACTIVE") ?? workspace.courses[0];
  const latestCheckpoint = workspace.checkpoints[workspace.checkpoints.length - 1];
  const g8 = scaleForCheckpoint(workspace.checkpoints.map((checkpoint) => checkpoint.g8AssessmentId), workspace.scaleAssessments);
  const carg = scaleForCheckpoint(workspace.checkpoints.map((checkpoint) => checkpoint.cargAssessmentId), workspace.scaleAssessments);
  const latestRelevantEvent = workspace.toxicities[0] ?? null;
  const activeAlerts = [
    workspace.checkpoints.some((checkpoint) => hasRelevantCheckpointAlert(checkpoint.structuredData)) ? "Mudança registrada em reavaliação durante o tratamento" : null,
    workspace.toxicities.some((item) => item.hospitalizationAssociated) ? "Hospitalização associada a evento registrado" : null,
    workspace.toxicities.length ? "Toxicidade relevante registrada" : null,
  ].filter(Boolean) as string[];

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Oncogeriatria · acompanhamento longitudinal</p>
        <h1>{patient.fullName}</h1>
        <p>O mesmo cadastro do paciente acompanha toda a trajetória oncológica. A área organiza vulnerabilidades e mudanças ao longo do tratamento sem decidir conduta antineoplásica.</p>
      </header>

      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Ações frequentes</p><h2>Próximo passo clínico</h2></div><span className="muted">Escolha apenas o que faz sentido nesta consulta.</span></div>
        <div className="program55-nav">
          <a href={`/patients/${patientId}/oncogeriatria/basal?episode=${episode.id}`}>Avaliação antes do tratamento</a>
          <a href={`/patients/${patientId}/oncogeriatria/check?episode=${episode.id}`}>Reavaliar durante o tratamento</a>
          <a href={`/patients/${patientId}/oncogeriatria/escalas?episode=${episode.id}`}>Aplicar/revisar escalas</a>
          <a href={`/patients/${patientId}/oncogeriatria/relatorio?episode=${episode.id}`}>Revisar relatório</a>
        </div>
      </section>

      {episodes.length > 1 ? <section className="panel"><div className="section-heading"><div><p className="eyebrow">Histórico</p><h2>História oncológica</h2></div></div><ul className="clean-list">{episodes.map((item) => <li key={item.id}><a href={`/patients/${patientId}/oncogeriatria?episode=${item.id}`}>{item.diagnosis}</a><span>{item.primarySite ?? "Sítio não registrado"} · {oncogeriatricEpisodeStatusLabel(item.status)} · iniciado em {formatClinicalDate(item.createdAt)}</span></li>)}</ul></section> : null}

      <section className="panel" aria-labelledby="oncologic-block-title">
        <div className="section-heading"><div><p className="eyebrow">Contexto oncológico</p><h2 id="oncologic-block-title">Diagnóstico e tratamento</h2></div><a href={`/patients/${patientId}/oncogeriatria/tratamento?episode=${episode.id}`}>Editar tratamento →</a></div>
        <div className="metrics">
          <article><span>Diagnóstico</span><strong>{episode.primarySite ?? episode.diagnosis}</strong><small>{episode.histology ?? "Histologia não registrada"} · {episode.stage ?? "Estágio não registrado"}</small></article>
          <article><span>Tratamento</span><strong>{currentCourse?.regimenName ?? "Não registrado"}</strong><small>{currentCourse ? `${oncogeriatricIntentLabel(currentCourse.intent)} · ${oncogeriatricCourseStatusLabel(currentCourse.status)}` : "Sem tratamento registrado"}</small></article>
          <article><span>Última avaliação</span><strong>{latestCheckpoint ? formatClinicalDate(latestCheckpoint.occurredAt) : "—"}</strong><small>{latestCheckpoint ? oncogeriatricCheckpointTypeLabel(latestCheckpoint.type) : "Nenhuma avaliação registrada"}</small></article>
          <article><span>Ciclo atual</span><strong>{latestCheckpoint?.cycleNumber ?? "—"}</strong><small>{currentCourse?.plannedCycles ? `de ${currentCourse.plannedCycles} previstos` : "Ciclos previstos não registrados"}</small></article>
        </div>
      </section>

      {activeAlerts.length ? <section className="visible-alerts" role="status"><strong>Mudança clinicamente relevante registrada. Reavaliação médica indicada.</strong><ul>{activeAlerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></section> : null}

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Resumo oncogeriátrico</p><h2>Estado atual</h2></div><a href={`/patients/${patientId}/oncogeriatria/longitudinal?episode=${episode.id}`}>Ver evolução geriátrica →</a></div>
        <div className="metrics">
          <article><span>G8</span><strong>{g8?.scoreText ?? "Não avaliado"}</strong><small>{g8?.classification ?? "Sem classificação"}</small></article>
          <article><span>CARG</span><strong>{carg?.scoreText ?? "Indisponível nesta versão"}</strong><small>{carg?.classification ?? "Aguardando liberação formal para implementação"}</small></article>
          <article><span>Eventos</span><strong>{workspace.toxicities.length}</strong><small>{latestRelevantEvent ? `${latestRelevantEvent.toxicityType} · ${formatClinicalDate(latestRelevantEvent.occurredAt)}` : "Nenhum evento registrado"}</small></article>
          <article><span>Intervenções</span><strong>{workspace.interventions.filter((item) => item.status !== "COMPLETED").length}</strong><small>ativas ou pendentes</small></article>
        </div>
      </section>

      <OncogeriatricDomainStatusSummary history={capacityHistory} />

      <section className="two-columns">
        <article className="panel"><h2>Avaliação mais recente</h2>{latestCheckpoint ? <><p><strong>{oncogeriatricCheckpointTypeLabel(latestCheckpoint.type)}</strong> · {formatClinicalDate(latestCheckpoint.occurredAt)}</p><p className="muted">Situação: {oncogeriatricCheckpointStatusLabel(latestCheckpoint.status)}. Consulte “Durante o tratamento” para os detalhes estruturados.</p>{latestCheckpoint.consultationId ? <p><a href={`/consultations/${latestCheckpoint.consultationId}#escalas`}>Abrir escalas clínicas desta consulta →</a></p> : null}</> : <p className="muted">Sem dados registrados.</p>}</article>
        <article className="panel"><h2>Princípio de decisão</h2><p>G8, CARG histórico, tendências e alertas são apoio à decisão clínica compartilhada. O sistema não indica, contraindica, reduz, suspende nem modifica esquema antineoplásico.</p></article>
      </section>
    </main>
  );
}
