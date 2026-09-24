import { TreatmentCourseForm, TreatmentSafetyEditForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricClinicalContinuity } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { oncogeriatricCourseStatusLabel, oncogeriatricIntentLabel, oncogeriatricModalityLabel, oncogeriatricRiskFlagLabel } from "@/domain/oncogeriatria/presentation-labels";
import { formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode, selectOncogeriatricWorkingConsultation } from "@/server/oncogeriatria/read";

export default async function OncogeriatricTreatmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de registrar tratamento.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id, "treatment");
  const workingConsultation = selectOncogeriatricWorkingConsultation(workspace);

  return <main className="shell">
    <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="tratamento" title="Tratamento oncológico" description="Registre o esquema e revise riscos e orientações para cada tratamento existente." />
    <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
    <OncogeriatricClinicalContinuity patientId={patientId} consultation={workingConsultation} episodeId={episode.id} returnStage="tratamento" />
    <section className="panel"><h2>Tratamentos registrados</h2>
      {workspace.courses.length ? <ul className="clean-list">{workspace.courses.map((course) => {
        const riskData = readStructuredRecord(course.riskFlags);
        const flags = Array.isArray(riskData.selected) ? riskData.selected.filter((item): item is string => typeof item === "string").map(oncogeriatricRiskFlagLabel) : [];
        return <li key={course.id}>
          <strong>{course.regimenName}</strong>
          <span>{oncogeriatricModalityLabel(course.modality)} · {oncogeriatricIntentLabel(course.intent)} · {oncogeriatricCourseStatusLabel(course.status)}<br />início: {formatClinicalDate(course.actualStartAt ?? course.plannedStartAt)} · ciclos previstos: {course.plannedCycles ?? "não registrado"}<br />riscos selecionados: {flags.length ? flags.join(", ") : "nenhum registrado"}</span>
          <details><summary>Revisar riscos, efeitos e orientações deste tratamento</summary><TreatmentSafetyEditForm key={`${course.id}:${course.updatedAt.toISOString()}`} patientId={patientId} episodeId={episode.id} courseId={course.id} updatedAt={course.updatedAt.toISOString()} initial={riskData} /></details>
        </li>;
      })}</ul> : <p className="muted">Nenhum tratamento registrado.</p>}
    </section>
    <section className="panel"><details><summary>Registrar novo tratamento</summary><TreatmentCourseForm patientId={patientId} episodeId={episode.id} /></details></section>
    <section className="notice"><strong>Proteção de decisão clínica</strong><span>Riscos e efeitos do esquema são confirmados manualmente. O sistema não infere toxicidade pelo nome do antineoplásico nem altera o tratamento.</span></section>
    <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="tratamento" />
  </main>;
}
