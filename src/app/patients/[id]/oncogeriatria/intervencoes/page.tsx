import { InterventionForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricClinicalContinuity, OncogeriatricDomainReview } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { oncogeriatricDomainLabel, oncogeriatricInterventionStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode, selectOncogeriatricWorkingConsultation } from "@/server/oncogeriatria/read";

export default async function OncogeriatricInterventionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de registrar intervenções.</p></main>;
  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const workingConsultation = selectOncogeriatricWorkingConsultation(workspace);
  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="intervencoes" title="Plano geriátrico por vulnerabilidade" description="Revise o domínio e a escala que fundamentam cada prioridade; depois registre objetivo, ação, responsável, prazo e resultado." />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <OncogeriatricClinicalContinuity patientId={patientId} consultation={workingConsultation} />
      <OncogeriatricDomainReview history={capacityHistory} workingConsultation={workingConsultation} mode="care-plan" />
      <section className="two-columns">
        <article className="panel"><h2>Registrar ação do plano</h2><InterventionForm patientId={patientId} episodeId={episode.id} /></article>
        <article className="panel"><h2>Plano consolidado</h2>{workspace.interventions.length ? <ul className="clean-list">{workspace.interventions.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)} · {oncogeriatricInterventionStatusLabel(item.status)}</strong><span>{item.description}{item.intervention ? ` · ação: ${item.intervention}` : ""}{item.responsibleProfessional ? ` · responsável: ${item.responsibleProfessional}` : ""}{item.dueAt ? ` · prevista: ${formatClinicalDate(item.dueAt)}` : ""}{item.result ? ` · resultado: ${item.result}` : ""}</span></li>)}</ul> : <p className="muted">Nenhuma ação registrada no plano.</p>}</article>
      </section>
      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="intervencoes" />
    </main>
  );
}
