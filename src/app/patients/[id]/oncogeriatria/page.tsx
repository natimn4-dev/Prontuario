import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { OncogeriatricNav, OncogeriatricQuickActions, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import styles from "./oncogeriatric-overview.module.css";
import { StartEpisodeForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import {
  oncogeriatricCheckpointStatusLabel,
  oncogeriatricCheckpointTypeLabel,
  oncogeriatricCourseStatusLabel,
  oncogeriatricEpisodeStatusLabel,
  oncogeriatricIntentLabel,
} from "@/domain/oncogeriatria/presentation-labels";
import { buildOncogeriatricConsultationHref } from "@/domain/oncogeriatria/return-navigation";
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
      <OncogeriatricWorkspaceHeader
        patientId={patientId}
        patientName={patient.fullName}
        episodeLabel={episode.diagnosis}
        currentStep="overview"
        title="Visão geral do acompanhamento"
        description="Consulte o estado atual, identifique sinais de atenção e escolha o próximo passo clínico sem alterar automaticamente a conduta antineoplásica."
      />

      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      {activeAlerts.length ? <section className="visible-alerts" role="status"><strong>Mudança clinicamente relevante registrada. Reavaliação médica indicada.</strong><ul>{activeAlerts.map((alert) => <li key={alert}>{alert}</li>)}</ul></section> : null}

      <section className={`panel ${styles.summaryPanel}`} aria-labelledby="clinical-summary-title">
        <div className="section-heading"><div><p className="eyebrow">Leitura rápida</p><h2 id="clinical-summary-title">Situação clínica atual</h2></div><a href={`/patients/${patientId}/oncogeriatria/longitudinal?episode=${episode.id}`}>Ver evolução geriátrica →</a></div>
        <div className={styles.summaryGroup}>
          <div className={styles.groupHeading}><strong>Contexto oncológico</strong><a href={`/patients/${patientId}/oncogeriatria/tratamento?episode=${episode.id}`}>Editar tratamento</a></div>
          <dl className={styles.summaryGrid}>
            <div><dt>Diagnóstico</dt><dd>{episode.primarySite ?? episode.diagnosis}</dd><small>{episode.histology ?? "Histologia não registrada"} · {episode.stage ?? "Estágio não registrado"}</small></div>
            <div><dt>Tratamento</dt><dd>{currentCourse?.regimenName ?? "Não registrado"}</dd><small>{currentCourse ? `${oncogeriatricIntentLabel(currentCourse.intent)} · ${oncogeriatricCourseStatusLabel(currentCourse.status)}` : "Sem tratamento registrado"}</small></div>
            <div><dt>Última avaliação</dt><dd>{latestCheckpoint ? formatClinicalDate(latestCheckpoint.occurredAt) : "Não registrada"}</dd><small>{latestCheckpoint ? oncogeriatricCheckpointTypeLabel(latestCheckpoint.type) : "Nenhuma avaliação registrada"}</small></div>
            <div><dt>Ciclo atual</dt><dd>{latestCheckpoint?.cycleNumber ?? "Não registrado"}</dd><small>{currentCourse?.plannedCycles ? `de ${currentCourse.plannedCycles} previstos` : "Ciclos previstos não registrados"}</small></div>
          </dl>
        </div>
        <div className={styles.summaryGroup}>
          <div className={styles.groupHeading}><strong>Estado oncogeriátrico</strong></div>
          <dl className={styles.summaryGrid}>
            <div><dt>G8</dt><dd>{g8?.scoreText ?? "Não avaliado"}</dd><small>{g8?.classification ?? "Sem classificação"}</small></div>
            <div><dt>CARG</dt><dd>{carg?.scoreText ?? "Não avaliado"}</dd><small>{carg?.classification ?? "Sem classificação"}</small></div>
            <div><dt>Eventos registrados</dt><dd>{workspace.toxicities.length}</dd><small>{latestRelevantEvent ? `${latestRelevantEvent.toxicityType} · ${formatClinicalDate(latestRelevantEvent.occurredAt)}` : "Nenhum evento registrado"}</small></div>
            <div><dt>Avaliações registradas</dt><dd>{workspace.checkpoints.length}</dd><small>neste acompanhamento</small></div>
          </dl>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Ações frequentes</p><h2>Próximo passo clínico</h2></div><span className="muted">Escolha apenas o que faz sentido nesta consulta.</span></div>
        <OncogeriatricQuickActions patientId={patientId} episodeId={episode.id} />
      </section>

      <OncogeriatricDomainStatusSummary history={capacityHistory} />

      {episodes.length > 1 ? <section className="panel"><div className="section-heading"><div><p className="eyebrow">Histórico</p><h2>História oncológica</h2></div></div><ul className="clean-list">{episodes.map((item) => <li key={item.id}><a href={`/patients/${patientId}/oncogeriatria?episode=${item.id}`}>{item.diagnosis}</a><span>{item.primarySite ?? "Sítio não registrado"} · {oncogeriatricEpisodeStatusLabel(item.status)} · iniciado em {formatClinicalDate(item.createdAt)}</span></li>)}</ul></section> : null}

      <section className="two-columns">
        <article className="panel"><h2>Avaliação mais recente</h2>{latestCheckpoint ? <><p><strong>{oncogeriatricCheckpointTypeLabel(latestCheckpoint.type)}</strong> · {formatClinicalDate(latestCheckpoint.occurredAt)}</p><p className="muted">Situação: {oncogeriatricCheckpointStatusLabel(latestCheckpoint.status)}. Consulte “Durante o tratamento” para os detalhes estruturados.</p>{latestCheckpoint.consultationId ? <p><a href={buildOncogeriatricConsultationHref({ consultationId: latestCheckpoint.consultationId, section: "escalas", episodeId: episode.id, returnStage: "overview" })}>Abrir escalas clínicas desta consulta →</a></p> : null}</> : <p className="muted">Sem dados registrados.</p>}</article>
        <article className="panel"><h2>Princípio de decisão</h2><p>G8, CARG, tendências e alertas são apoio à decisão clínica compartilhada. O sistema não indica, contraindica, reduz, suspende nem modifica esquema antineoplásico.</p></article>
      </section>
      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="overview" />
    </main>
  );
}
