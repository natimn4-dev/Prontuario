import { CheckpointRevisionEditor } from "@/components/oncogeriatria/checkpoint-revision-editor";
import { DomainLinkedOncogeriatricCheckForm } from "@/components/oncogeriatria/domain-linked-check-form";
import { OncogeriatricClinicalContinuity, OncogeriatricDomainReview } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { InterventionForm, ToxicityForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointTypeLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { buildOncogeriatricCargHref, buildOncogeriatricConsultationHref } from "@/domain/oncogeriatria/return-navigation";
import {
  capacityHistoryForOncogeriatricEpisode,
  formatClinicalDate,
  hasRelevantCheckpointAlert,
  loadEpisodeWorkspace,
  loadOncogeriatricPatient,
  readStructuredRecord,
  requireOncogeriatricReadAccess,
  resolveOncogeriatricEpisode,
  selectOncogeriatricWorkingConsultation,
} from "@/server/oncogeriatria/read";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
}

export default async function OncogeriatricCheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
}) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de registrar reavaliações.</p></main>;

  const workspace = await loadEpisodeWorkspace(patientId, episode.id, "check");
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const checks = workspace.checkpoints
    .filter((item) => item.type === "CYCLE" || item.type === "PERIODIC_REASSESSMENT" || item.type === "EVENT_DRIVEN")
    .reverse();
  const courseOptions = workspace.courses.map((item) => ({
    id: item.id,
    label: `${item.regimenName} · ${oncogeriatricCourseStatusLabel(item.status)}`,
  }));
  const consultationOptions = workspace.consultations.map((item) => ({
    id: item.id,
    label: `${formatClinicalDate(item.occurredAt)} · ${consultationStatusLabel(item.status)}`,
  }));
  const checkpointOptions = workspace.checkpoints.map((item) => ({
    id: item.id,
    label: `${formatClinicalDate(item.occurredAt)} · ${oncogeriatricCheckpointTypeLabel(item.type)}${item.cycleNumber ? ` · ciclo ${item.cycleNumber}` : ""}`,
  }));
  const latestCheckConsultationId = checks.find((item) => item.consultationId)?.consultationId;
  const workingConsultation = selectOncogeriatricWorkingConsultation(workspace, latestCheckConsultationId);

  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader
        patientId={patientId}
        patientName={patient.fullName}
        episodeLabel={episode.diagnosis}
        currentStep="check"
        title="Reavaliação durante o tratamento"
        description="Registre mudanças desde a última avaliação sem substituir uma reavaliação geriátrica ampliada quando ela for necessária."
      />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <OncogeriatricClinicalContinuity patientId={patientId} consultation={workingConsultation} episodeId={episode.id} returnStage="check" />
      <section className="panel" aria-labelledby="check-carg-title">
        <div className="section-heading"><div><p className="eyebrow">Primeira escala do momento clínico</p><h2 id="check-carg-title">CARG</h2></div><span className="muted">Disponível, não obrigatório</span></div>
        {checks[0] ? <><p>{oncogeriatricCheckpointTypeLabel(checks[0].type)} · {formatClinicalDate(checks[0].occurredAt)} · {checks[0].cargAssessmentId ? "resultado registrado" : checks[0].cargSavedAt ? `rascunho salvo · ${checks[0].cargCompletionCount}/11` : "não avaliado nesta consulta"}</p><a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: checks[0].id })}>{checks[0].cargAssessmentId ? "Reabrir CARG desta consulta →" : checks[0].cargSavedAt ? "Continuar CARG desta consulta →" : "Abrir CARG desta consulta →"}</a></> : <p className="muted">Ao registrar uma nova reavaliação, o sistema abrirá o CARG imediatamente antes dos demais domínios.</p>}
      </section>
      <OncogeriatricDomainReview history={capacityHistory} workingConsultation={workingConsultation} episodeId={episode.id} returnStage="check" />

      <section className="two-columns">
        <article className="panel">
          <h2>Nova reavaliação</h2>
          <DomainLinkedOncogeriatricCheckForm patientId={patientId} episodeId={episode.id} courses={courseOptions} consultations={consultationOptions} />
        </article>
        <article className="panel">
          <h2>Registrar toxicidade relevante</h2>
          <ToxicityForm patientId={patientId} episodeId={episode.id} courses={courseOptions} consultations={consultationOptions} checkpoints={checkpointOptions} />
        </article>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><p className="eyebrow">Marco clínico</p><h2>Registrar intervenção</h2></div>
          <span className="muted">Ex.: início de fisioterapia ou outra intervenção documentada.</span>
        </div>
        <InterventionForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} checkpoints={checkpointOptions} />
      </section>

      <OncogeriatricDomainStatusSummary history={capacityHistory} />

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Histórico</p><h2>Mudanças desde avaliações anteriores</h2></div></div>
        {checks.length ? (
          <ul className="clean-list">
            {checks.map((checkpoint) => {
              const data = readStructuredRecord(checkpoint.structuredData);
              const notes = typeof data.notes === "string" ? data.notes : null;
              return (
                <li key={checkpoint.id}>
                  <strong>{formatClinicalDate(checkpoint.occurredAt)} · {oncogeriatricCheckpointTypeLabel(checkpoint.type)}{checkpoint.cycleNumber ? ` · ciclo ${checkpoint.cycleNumber}` : ""}</strong>
                  <span>{hasRelevantCheckpointAlert(checkpoint.structuredData) ? "Mudança relevante registrada — reavaliação médica indicada." : "Sem sinal estruturado de mudança registrado."}{checkpoint.consultationId ? " · avaliação por domínio vinculada à consulta" : " · sem consulta vinculada para os domínios"}{notes ? ` · ${notes}` : ""}</span>
                  <a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: checkpoint.id })}>{checkpoint.cargAssessmentId ? "Reabrir CARG desta consulta →" : checkpoint.cargSavedAt ? "Continuar CARG desta consulta →" : "Abrir CARG desta consulta →"}</a>
                  {checkpoint.consultationId ? <a href={buildOncogeriatricConsultationHref({ consultationId: checkpoint.consultationId, section: "escalas", episodeId: episode.id, returnStage: "check" })}>Abrir escalas desta consulta →</a> : null}
                  <CheckpointRevisionEditor
                    patientId={patientId}
                    episodeId={episode.id}
                    checkpointId={checkpoint.id}
                    initialRevision={checkpoint.revision}
                    initialStatus={checkpoint.status}
                    initialStructuredData={data}
                  />
                </li>
              );
            })}
          </ul>
        ) : <p className="muted">Nenhuma reavaliação registrada.</p>}
      </section>

      <section className="panel">
        <h2>Eventos de toxicidade</h2>
        {workspace.toxicities.length ? (
          <ul className="clean-list">
            {workspace.toxicities.map((event) => (
              <li key={event.id}>
                <strong>{event.toxicityType} · {formatClinicalDate(event.occurredAt)}</strong>
                <span>grau: {event.grade ?? "não registrado"} · hospitalização: {event.hospitalizationAssociated ? "sim" : "não"} · atraso de ciclo: {event.cycleDelayAssociated ? "sim" : "não"}{event.consultationId ? " · consulta vinculada" : " · marco temporal sem consulta vinculada"}{event.treatmentModificationRecorded ? ` · modificação previamente registrada: ${event.treatmentModificationRecorded}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Nenhuma toxicidade registrada.</p>}
      </section>

      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="check" />
    </main>
  );
}
