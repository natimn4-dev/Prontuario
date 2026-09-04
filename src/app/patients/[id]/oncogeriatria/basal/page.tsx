import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { BaselineCheckpointForm, G8Form } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointStatusLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
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

  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Oncogeriatria · etapa 1</p><h1>Avaliação antes do tratamento</h1><p>{patient.fullName} · {episode.diagnosis}. Registre o estado geriátrico inicial e aplique apenas as escalas pertinentes, escolhidas pelo geriatra.</p></header>
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <section className="two-columns">
        <article className="panel"><h2>Registrar avaliação inicial</h2><BaselineCheckpointForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} courses={courseOptions} /></article>
        <article className="panel"><h2>Histórico antes do tratamento</h2>{initialAssessments.length ? <ul className="clean-list">{initialAssessments.map((item) => <li key={item.id}><strong>{formatClinicalDate(item.occurredAt)}</strong><span>{oncogeriatricCheckpointStatusLabel(item.status)} · {item.consultationId ? "vinculada a uma consulta e aos domínios registrados nela" : "sem consulta vinculada"}</span>{item.consultationId ? <a href={`/consultations/${item.consultationId}#escalas`}>Abrir escalas desta consulta →</a> : null}</li>)}</ul> : <p className="muted">Ainda não há avaliação inicial registrada.</p>}</article>
      </section>
      <OncogeriatricDomainStatusSummary history={capacityHistory} />
      {current ? <section className="two-columns">
        <article className="panel">{current.consultationId ? <><G8Form patientId={patientId} episodeId={episode.id} checkpointId={current.id} /><p><a href={`/consultations/${current.consultationId}#escalas`}>Abrir todas as escalas clínicas desta consulta →</a></p></> : <p className="clinical-caution">Para registrar o G8 no sistema único de escalas, a avaliação inicial precisa estar vinculada a uma consulta existente. O sistema não cria consulta artificialmente.</p>}</article>
        <article className="panel"><h3>CARG — indisponível nesta versão</h3><p className="clinical-caution">A implementação eletrônica local permanece bloqueada até a liberação formal das condições de uso da ferramenta. O restante da oncogeriatria e todas as demais escalas continuam disponíveis.</p><p className="muted">Nenhuma informação clínica é enviada a calculadoras externas.</p></article>
      </section> : null}
    </main>
  );
}
