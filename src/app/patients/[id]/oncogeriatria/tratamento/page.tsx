import { TreatmentCourseForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { oncogeriatricCourseStatusLabel, oncogeriatricIntentLabel, oncogeriatricModalityLabel, oncogeriatricRiskFlagLabel } from "@/domain/oncogeriatria/presentation-labels";
import { formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

export default async function OncogeriatricTreatmentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de registrar tratamento.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Oncogeriatria · etapa 2</p><h1>Tratamento oncológico</h1><p>{patient.fullName} · {episode.diagnosis}. Registre a trajetória antineoplásica separadamente das medicações crônicas do paciente.</p></header>
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <section className="two-columns">
        <article className="panel"><h2>Registrar tratamento</h2><TreatmentCourseForm patientId={patientId} episodeId={episode.id} /></article>
        <article className="panel"><h2>Tratamentos registrados</h2>{workspace.courses.length ? <ul className="clean-list">{workspace.courses.map((course) => {
          const flags = readStructuredRecord(course.riskFlags).selected;
          const riskLabels = Array.isArray(flags) ? flags.filter((item): item is string => typeof item === "string").map(oncogeriatricRiskFlagLabel) : [];
          return <li key={course.id}><strong>{course.regimenName}</strong><span>{oncogeriatricModalityLabel(course.modality)} · {oncogeriatricIntentLabel(course.intent)} · {oncogeriatricCourseStatusLabel(course.status)}<br />início: {formatClinicalDate(course.actualStartAt ?? course.plannedStartAt)} · ciclos previstos: {course.plannedCycles ?? "não registrado"}<br />riscos selecionados manualmente: {riskLabels.length ? riskLabels.join(", ") : "nenhum registrado"}</span></li>;
        })}</ul> : <p className="muted">Nenhum tratamento registrado.</p>}</article>
      </section>
      <section className="notice"><strong>Proteção de decisão clínica</strong><span>Riscos dependentes do tratamento são selecionados manualmente nesta versão. O sistema não infere toxicidade pelo nome do antineoplásico e não escolhe, reduz, suspende ou troca esquema.</span></section>
    </main>
  );
}
