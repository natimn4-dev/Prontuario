import { InterventionForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { oncogeriatricDomainLabel, oncogeriatricInterventionStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

export default async function OncogeriatricInterventionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de registrar intervenções.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="intervencoes" title="Plano geriátrico" description="Registre vulnerabilidades, intervenção revisada, responsável, prazo e resultado. Achados não são transformados em condutas automáticas." />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <section className="two-columns">
        <article className="panel"><h2>Nova intervenção</h2><InterventionForm patientId={patientId} episodeId={episode.id} /></article>
        <article className="panel"><h2>Plano em andamento</h2>{workspace.interventions.length ? <ul className="clean-list">{workspace.interventions.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)} · {oncogeriatricInterventionStatusLabel(item.status)}</strong><span>{item.description}{item.intervention ? ` · intervenção: ${item.intervention}` : ""}{item.responsibleProfessional ? ` · responsável: ${item.responsibleProfessional}` : ""}{item.dueAt ? ` · prevista: ${formatClinicalDate(item.dueAt)}` : ""}{item.result ? ` · resultado: ${item.result}` : ""}</span></li>)}</ul> : <p className="muted">Nenhuma intervenção registrada.</p>}</article>
      </section>
      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="intervencoes" />
    </main>
  );
}
