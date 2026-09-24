import { notFound } from "next/navigation";
import { ClinicalScalesWorkspace } from "@/components/scales/clinical-scales-workspace";
import { OncogeriatricNav, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { buildOncogeriatricCargHref, buildOncogeriatricScalesHref } from "@/domain/oncogeriatria/return-navigation";
import { formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

export default async function OncogeriatricScalesPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string; consultation?: string }>;
}) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode || (query.episode && episode.id !== query.episode)) notFound();

  const workspace = await loadEpisodeWorkspace(patientId, episode.id, "scales");
  const linked = [...workspace.checkpoints].reverse().find((item) => item.consultationId && (!query.consultation || item.consultationId === query.consultation));
  const consultation = query.consultation
    ? workspace.consultations.find((item) => item.id === query.consultation)
    : workspace.consultations.find((item) => item.id === linked?.consultationId);
  if (query.consultation && !consultation) notFound();
  const checkpoint = [...workspace.checkpoints].reverse().find((item) => item.consultationId === consultation?.id);
  const cargHref = checkpoint
    ? buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: checkpoint.id })
    : `${buildOncogeriatricCargHref({ patientId, episodeId: episode.id, consultationId: consultation?.status === "FINALIZED" ? null : consultation?.id })}&new=1`;

  return <main className="shell">
    <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="escalas" title="Demais escalas clínicas" description="Aplique as escalas do prontuário geral na consulta escolhida e retorne ao CARG do mesmo momento." />
    <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
    <section className="panel" aria-labelledby="onco-scale-context">
      <h2 id="onco-scale-context">Momento e consulta</h2>
      {consultation ? <>
        <p><strong>Paciente:</strong> {patient.fullName} · <strong>Episódio:</strong> {episode.diagnosis} · <strong>Consulta:</strong> {formatClinicalDate(consultation.occurredAt)} · {consultation.status === "FINALIZED" ? "finalizada, somente leitura" : "disponível para registro"}</p>
        <p><a href={cargHref}>{checkpoint ? "Abrir ou revisar CARG deste momento" : consultation.status === "FINALIZED" ? "Iniciar nova avaliação para preencher CARG" : "Iniciar momento clínico e preencher CARG nesta consulta"} →</a></p>
        {!checkpoint ? <p className="clinical-caution">Esta consulta ainda não está vinculada a um momento oncogeriátrico. Registre o CARG no momento correspondente antes de interpretar a avaliação longitudinal.</p> : null}
      </> : <>
        <p>Não há consulta vinculada a um momento deste episódio. Selecione a consulta correta ou inicie uma avaliação para registrar CARG e demais escalas.</p>
        <p><a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id })}>Abrir CARG e vincular uma consulta →</a></p>
      </>}
      {workspace.consultations.length > 1 ? <details><summary>Selecionar outra consulta deste paciente</summary><ul className="clean-list">{workspace.consultations.map((item) => <li key={item.id}><a href={buildOncogeriatricScalesHref({ patientId, episodeId: episode.id, consultationId: item.id })}>{formatClinicalDate(item.occurredAt)} · {item.status === "FINALIZED" ? "finalizada" : "em andamento"}{workspace.checkpoints.some((checkpoint) => checkpoint.consultationId === item.id) ? " · vinculada a este episódio" : " · sem vínculo neste episódio"}</a></li>)}</ul></details> : null}
    </section>
    {consultation ? <section className="panel" id="escalas" aria-label="Escalas clínicas da consulta"><ClinicalScalesWorkspace consultationId={consultation.id} /></section> : null}
  </main>;
}
