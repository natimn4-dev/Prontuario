import { CheckpointPlannerForm } from "@/components/oncogeriatria/checkpoint-planner-form";
import { OncogeriatricClinicalContinuity } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { RecoveryForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointStatusLabel, oncogeriatricCheckpointTypeLabel, oncogeriatricDomainLabel, oncogeriatricRecoveryStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode, selectOncogeriatricWorkingConsultation } from "@/server/oncogeriatria/read";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
}

export default async function OncogeriatricPostTreatmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de planejar as próximas consultas.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const followUps = workspace.checkpoints.filter((item) => item.type === "END_OF_TREATMENT" || item.type.startsWith("POST_"));
  const consultationOptions = workspace.consultations.map((item) => ({ id: item.id, label: `${formatClinicalDate(item.occurredAt)} · ${consultationStatusLabel(item.status)}` }));
  const workingConsultation = selectOncogeriatricWorkingConsultation(workspace);
  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="pos-tratamento" title="Planejamento das próximas consultas" description="Organize reavaliações durante a transição e o seguimento, mantendo a recuperação por domínio como registro clínico explícito." />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <OncogeriatricClinicalContinuity patientId={patientId} consultation={workingConsultation} />
      <section className="two-columns">
        <article className="panel"><h2>Agendar próxima reavaliação</h2><CheckpointPlannerForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} /><p className="muted">As avaliações de final de tratamento, 3, 6 e 12 meses são marcos previstos; nenhuma consulta clínica é criada automaticamente.</p></article>
        <article className="panel"><h2>Registrar recuperação por domínio</h2><RecoveryForm patientId={patientId} episodeId={episode.id} /><p className="muted">Use quando houver avaliação clínica. A ausência de preenchimento não é interpretada como recuperação.</p></article>
      </section>
      <OncogeriatricDomainStatusSummary history={capacityHistory} />
      <section className="two-columns">
        <article className="panel"><h2>Próximas avaliações planejadas</h2>{followUps.length ? <ul className="clean-list">{followUps.map((item) => <li key={item.id}><strong>{oncogeriatricCheckpointTypeLabel(item.type)}</strong><span>referência: {formatClinicalDate(item.occurredAt)} · próxima prevista: {formatClinicalDate(item.scheduledAt)} · {oncogeriatricCheckpointStatusLabel(item.status)}{item.consultationId ? " · avaliação por domínio vinculada" : " · sem consulta vinculada para os domínios"}</span>{item.consultationId ? <a href={`/consultations/${item.consultationId}#escalas`}>Abrir campos clínicos desta consulta →</a> : null}</li>)}</ul> : <p className="muted">Ainda não há avaliações de final de tratamento, 3, 6 ou 12 meses planejadas.</p>}</article>
        <article className="panel"><h2>Recuperação registrada pelo médico</h2>{workspace.recovery.length ? <ul className="clean-list">{workspace.recovery.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)} · {oncogeriatricRecoveryStatusLabel(item.status)}</strong><span>{formatClinicalDate(item.assessedAt)}{item.notes ? ` · ${item.notes}` : ""}</span></li>)}</ul> : <p className="muted">Nenhum domínio de recuperação avaliado.</p>}</article>
      </section>
      <section className="notice"><strong>Duas informações complementares, sem inferência automática</strong><span>A avaliação persistente por domínio vem das escalas registradas no prontuário; o mapa de recuperação permanece uma avaliação clínica explícita do profissional. O sistema não converte uma delas automaticamente na outra e não altera tratamento oncológico.</span></section>
      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="pos-tratamento" />
    </main>
  );
}
