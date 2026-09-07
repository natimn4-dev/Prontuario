import { CargChecklistForm, G8ChecklistForm } from "@/components/oncogeriatria/checklist-scales";
import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { BaselineCheckpointForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointStatusLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
}

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

export default async function OncogeriatricBaselinePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico no resumo do paciente.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const initialAssessments = workspace.checkpoints.filter((item) => item.type === "PRE_TREATMENT");
  const current = initialAssessments[initialAssessments.length - 1];
  const consultationOptions = workspace.consultations.map((item) => ({ id: item.id, label: `${formatClinicalDate(item.occurredAt)} · ${consultationStatusLabel(item.status)}` }));
  const courseOptions = workspace.courses.map((item) => ({ id: item.id, label: `${item.regimenName} · ${oncogeriatricCourseStatusLabel(item.status)}` }));
  const currentAge = current ? ageOnDate(patient.birthDate, current.occurredAt) : undefined;
  const g8Assessment = current?.g8AssessmentId ? workspace.scaleAssessments.find((item) => item.id === current.g8AssessmentId) : null;
  const cargAssessment = current?.cargAssessmentId ? workspace.scaleAssessments.find((item) => item.id === current.cargAssessmentId) : null;

  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="basal" title="Avaliação antes do tratamento" description="Registre o estado geriátrico inicial e aplique somente as escalas pertinentes, escolhidas pelo geriatra." />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <section className="two-columns">
        <article className="panel"><h2>Registrar avaliação inicial</h2><BaselineCheckpointForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} courses={courseOptions} /></article>
        <article className="panel"><h2>Histórico antes do tratamento</h2>{initialAssessments.length ? <ul className="clean-list">{initialAssessments.map((item) => <li key={item.id}><strong>{formatClinicalDate(item.occurredAt)}</strong><span>{oncogeriatricCheckpointStatusLabel(item.status)} · {item.consultationId ? "vinculada a uma consulta e aos domínios registrados nela" : "sem consulta vinculada"}</span>{item.consultationId ? <a href={`/consultations/${item.consultationId}#escalas`}>Abrir escalas desta consulta →</a> : null}</li>)}</ul> : <p className="muted">Ainda não há avaliação inicial registrada.</p>}</article>
      </section>
      <OncogeriatricDomainStatusSummary history={capacityHistory} />
      {current ? current.consultationId ? (
        <section className="oncogeriatric-scale-stack" aria-label="Instrumentos oncogeriátricos da avaliação inicial">
          <article className="panel"><G8ChecklistForm patientId={patientId} episodeId={episode.id} checkpointId={current.id} initialAgeYears={currentAge} initialAnswers={readStructuredRecord(g8Assessment?.answers)} /></article>
          <article className="panel"><CargChecklistForm patientId={patientId} episodeId={episode.id} checkpointId={current.id} initialAgeYears={currentAge} initialBiologicalSex={cargReferenceSex(patient.sex)} initialAnswers={readStructuredRecord(cargAssessment?.answers)} /></article>
          <p><a href={`/consultations/${current.consultationId}#escalas`}>Abrir as demais escalas clínicas desta consulta →</a></p>
        </section>
      ) : <section className="panel"><p className="clinical-caution">Para registrar G8 e CARG no sistema único de escalas, a avaliação inicial precisa estar vinculada a uma consulta existente. O sistema não cria consulta artificialmente.</p></section> : null}
      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="basal" />
    </main>
  );
}
