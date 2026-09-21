import { CargCheckpointStartForm } from "@/components/oncogeriatria/carg-entry";
import { CargChecklistForm } from "@/components/oncogeriatria/checklist-scales";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { buildOncogeriatricCargHref, buildOncogeriatricReturnPath } from "@/domain/oncogeriatria/return-navigation";
import { formatClinicalDate, loadOncogeriatricAuthorNames, loadOncogeriatricCargWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";
import { oncogeriatricCheckpointTypeLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";

function ageOnDate(birthDate: Date | null, referenceDate: Date): number | undefined {
  if (!birthDate) return undefined;
  let years = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday = referenceDate.getUTCMonth() < birthDate.getUTCMonth()
    || (referenceDate.getUTCMonth() === birthDate.getUTCMonth() && referenceDate.getUTCDate() < birthDate.getUTCDate());
  if (beforeBirthday) years -= 1;
  return years >= 0 ? years : undefined;
}

function cargReferenceSex(value: string | null): "FEMALE" | "MALE" | undefined {
  const normalized = value?.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "feminino" || normalized === "female" || normalized === "f") return "FEMALE";
  if (normalized === "masculino" || normalized === "male" || normalized === "m") return "MALE";
  return undefined;
}

export default async function OncogeriatricCargPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string; checkpoint?: string; consultation?: string }>;
}) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);

  if (!episode) {
    return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de abrir o CARG.</p></main>;
  }

  const workspace = await loadOncogeriatricCargWorkspace(patientId, episode.id, query.checkpoint, query.consultation);
  const consultationOptions = workspace.consultations.map((item) => ({ id: item.id, label: `${formatClinicalDate(item.occurredAt)} · ${item.status === "FINALIZED" ? "Finalizada" : item.status === "IN_REVIEW" ? "Em revisão" : "Em rascunho"}` }));
  const courseOptions = workspace.courses.map((item) => ({ id: item.id, label: `${item.regimenName} · ${oncogeriatricCourseStatusLabel(item.status)}` }));

  if (!workspace.checkpoint) {
    return (
      <main className="shell">
        <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="carg" title="CARG · primeira escala" description="Defina o momento clínico e abra o CARG imediatamente, sem passar pela avaliação inicial." />
        <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
        <section className="notice"><strong>Nenhum checkpoint selecionado</strong><span>O sistema não criará uma consulta ou avaliação silenciosamente. Confirme o contexto abaixo para abrir o CARG deste momento.</span></section>
        <section className="panel"><h2>Iniciar momento clínico</h2><CargCheckpointStartForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} courses={courseOptions} initialConsultationId={workspace.requestedConsultation?.id} /></section>
        <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="carg" />
      </main>
    );
  }

  const checkpoint = workspace.checkpoint;
  const authorNames = await loadOncogeriatricAuthorNames(checkpoint.cargSavedById ? [checkpoint.cargSavedById] : []);
  const initialAnswers = workspace.cargAssessment?.answers ?? checkpoint.cargDraft;
  const hasConsultation = Boolean(checkpoint.consultationId);
  const status = workspace.cargAssessment
    ? `${workspace.cargAssessment.scoreText ?? "Resultado registrado"} · ${workspace.cargAssessment.classification ?? "classificação registrada"}`
    : checkpoint.cargSavedAt
      ? `Rascunho salvo · ${checkpoint.cargCompletionCount}/11 fatores`
      : "Não avaliado nesta consulta";

  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="carg" title="CARG · primeira escala desta consulta" description="Registre ou revise os 11 fatores deste momento clínico. A avaliação fica vinculada a este checkpoint e não sobrescreve consultas anteriores." />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      <section className="panel" aria-labelledby="carg-context-title">
        <div className="section-heading"><div><p className="eyebrow">Contexto clínico</p><h2 id="carg-context-title">{oncogeriatricCheckpointTypeLabel(checkpoint.type)}</h2></div><strong>{status}</strong></div>
        <p><strong>Data:</strong> {formatClinicalDate(checkpoint.occurredAt)} · <strong>Consulta:</strong> {checkpoint.consultationId ? "vinculada ao prontuário" : "ainda não vinculada"}</p>
        <p className="muted">O CARG é a primeira escala priorizada neste checkpoint. G8, ECOG/KPS e demais instrumentos continuam disponíveis depois, somente quando escolhidos pelo geriatra.</p>
        {!hasConsultation ? <p className="clinical-caution">É possível preencher e salvar o rascunho agora. Para registrar o resultado final no motor único de escalas, vincule este checkpoint a uma consulta clínica existente.</p> : null}
      </section>

      <article id="carg" className="panel">
        <CargChecklistForm
          patientId={patientId}
          episodeId={episode.id}
          checkpointId={checkpoint.id}
          initialAgeYears={ageOnDate(patient.birthDate, checkpoint.occurredAt)}
          initialBiologicalSex={cargReferenceSex(patient.sex)}
          initialAnswers={readStructuredRecord(initialAnswers)}
          initialProvenance={readStructuredRecord(checkpoint.cargLabProvenance)}
          initialSavedAt={checkpoint.cargSavedAt?.toISOString() ?? null}
          initialSavedBy={checkpoint.cargSavedById ? authorNames.get(checkpoint.cargSavedById) ?? null : null}
          canFinalize={hasConsultation}
          finalizationMessage="Vincule este checkpoint a uma consulta clínica para registrar o CARG definitivamente. O rascunho permanece salvo."
        />
      </article>

      <section className="panel">
        <div className="section-heading"><div><p className="eyebrow">Continuidade</p><h2>Próximos caminhos</h2></div></div>
        <p>Depois de salvar, retorne à visão geral para conferir a trajetória ou abra as demais escalas da consulta. Uma consulta sem CARG continuará identificada como “Não avaliado nesta consulta”.</p>
        <p><a href={buildOncogeriatricReturnPath({ patientId, episodeId: episode.id, stage: "overview" })}>Voltar à visão geral do acompanhamento →</a>{checkpoint.consultationId ? <> · <a href={`/consultations/${encodeURIComponent(checkpoint.consultationId)}?oncogeriatriaReturn=overview&episode=${encodeURIComponent(episode.id)}#escalas`}>Abrir demais escalas desta consulta →</a></> : null}</p>
        <p><a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: checkpoint.id })}>Reabrir este CARG</a> · <a href={buildOncogeriatricReturnPath({ patientId, episodeId: episode.id, stage: "longitudinal" })}>Ver trajetória longitudinal →</a></p>
      </section>
      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="carg" />
    </main>
  );
}
