import { DomainLinkedOncogeriatricCheckForm } from "@/components/oncogeriatria/domain-linked-check-form";
import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { ToxicityForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointTypeLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, hasRelevantCheckpointAlert, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
}

export default async function OncogeriatricCheckPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de registrar reavaliações.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const checks = workspace.checkpoints.filter((item) => item.type === "CYCLE" || item.type === "PERIODIC_REASSESSMENT" || item.type === "EVENT_DRIVEN").reverse();
  const courseOptions = workspace.courses.map((item) => ({ id: item.id, label: `${item.regimenName} · ${oncogeriatricCourseStatusLabel(item.status)}` }));
  const consultationOptions = workspace.consultations.map((item) => ({ id: item.id, label: `${formatClinicalDate(item.occurredAt)} · ${consultationStatusLabel(item.status)}` }));
  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Oncogeriatria · etapa 3</p><h1>Reavaliação durante o tratamento</h1><p>{patient.fullName}. Registre mudanças desde a última avaliação sem substituir uma reavaliação geriátrica ampliada quando ela for necessária.</p></header>
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <section className="two-columns">
        <article className="panel"><h2>Nova reavaliação</h2><DomainLinkedOncogeriatricCheckForm patientId={patientId} episodeId={episode.id} courses={courseOptions} consultations={consultationOptions} /></article>
        <article className="panel"><h2>Registrar toxicidade relevante</h2><ToxicityForm patientId={patientId} episodeId={episode.id} courses={courseOptions} /></article>
      </section>
      <OncogeriatricDomainStatusSummary history={capacityHistory} />
      <section className="panel"><div className="section-heading"><div><p className="eyebrow">Histórico</p><h2>Mudanças desde avaliações anteriores</h2></div></div>{checks.length ? <ul className="clean-list">{checks.map((checkpoint) => {
        const data = readStructuredRecord(checkpoint.structuredData);
        const notes = typeof data.notes === "string" ? data.notes : null;
        return <li key={checkpoint.id}><strong>{formatClinicalDate(checkpoint.occurredAt)} · {oncogeriatricCheckpointTypeLabel(checkpoint.type)}{checkpoint.cycleNumber ? ` · ciclo ${checkpoint.cycleNumber}` : ""}</strong><span>{hasRelevantCheckpointAlert(checkpoint.structuredData) ? "Mudança relevante registrada — reavaliação médica indicada." : "Sem sinal estruturado de mudança registrado."}{checkpoint.consultationId ? " · avaliação por domínio vinculada à consulta" : " · sem consulta vinculada para os domínios"}{notes ? ` · ${notes}` : ""}</span>{checkpoint.consultationId ? <a href={`/consultations/${checkpoint.consultationId}#escalas`}>Abrir escalas desta consulta →</a> : null}</li>;
      })}</ul> : <p className="muted">Nenhuma reavaliação registrada.</p>}</section>
      <section className="panel"><h2>Eventos de toxicidade</h2>{workspace.toxicities.length ? <ul className="clean-list">{workspace.toxicities.map((event) => <li key={event.id}><strong>{event.toxicityType} · {formatClinicalDate(event.occurredAt)}</strong><span>grau: {event.grade ?? "não registrado"} · hospitalização: {event.hospitalizationAssociated ? "sim" : "não"} · atraso de ciclo: {event.cycleDelayAssociated ? "sim" : "não"}{event.treatmentModificationRecorded ? ` · modificação previamente registrada: ${event.treatmentModificationRecorded}` : ""}</span></li>)}</ul> : <p className="muted">Nenhuma toxicidade registrada.</p>}</section>
    </main>
  );
}
