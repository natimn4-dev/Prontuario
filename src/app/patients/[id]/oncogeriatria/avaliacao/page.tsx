import { CargCheckpointStartForm } from "@/components/oncogeriatria/carg-entry";
import { notFound } from "next/navigation";
import { CargChecklistForm, G8ChecklistForm } from "@/components/oncogeriatria/checklist-scales";
import { CheckpointConsultationLinker } from "@/components/oncogeriatria/checkpoint-consultation-linker";
import { ClinicalScalesWorkspace } from "@/components/scales/clinical-scales-workspace";
import { OncogeriatricNav, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { buildOncogeriatricCargHref, buildOncogeriatricReturnPath } from "@/domain/oncogeriatria/return-navigation";
import { formatClinicalDate, loadOncogeriatricAuthorNames, loadOncogeriatricCargWorkspace, loadOncogeriatricMomentOptions, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";
import { oncogeriatricCheckpointTypeLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { prisma } from "@/server/db";
import styles from "./avaliacao.module.css";

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
  searchParams: Promise<{ episode?: string; checkpoint?: string; consultation?: string; new?: string }>;
}) {
  await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (query.episode && !episode) notFound();

  if (!episode) {
    return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de abrir o CARG.</p></main>;
  }

  const workspace = await loadOncogeriatricCargWorkspace(patientId, episode.id, query.checkpoint, query.consultation);
  const moments = await loadOncogeriatricMomentOptions(patientId, episode.id);
  const consultationOptions = workspace.consultations.filter((item) => item.status !== "FINALIZED").map((item) => ({ id: item.id, label: `${formatClinicalDate(item.occurredAt)} · ${item.status === "IN_REVIEW" ? "Em revisão" : "Em rascunho"}` }));
  const courseOptions = workspace.courses.map((item) => ({ id: item.id, label: `${item.regimenName} · ${oncogeriatricCourseStatusLabel(item.status)}` }));

  if (!workspace.checkpoint || (query.new === "1" && !query.checkpoint && !query.consultation)) {
    return (
      <main className="shell">
        <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="avaliacao" title="Avaliação do momento" description="Selecione ou crie um momento clínico para preencher CARG e demais escalas." />
        <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
        <section className="notice"><strong>Nenhum checkpoint selecionado</strong><span>O sistema não criará uma consulta ou avaliação silenciosamente. Confirme o contexto abaixo para abrir o CARG deste momento.</span></section>
        {moments.length ? <details className="panel"><summary>Retomar momento anterior ({moments.length})</summary><ul className="clean-list">{moments.map((item) => <li key={item.id}><a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: item.id })}>{formatClinicalDate(item.occurredAt)} · {oncogeriatricCheckpointTypeLabel(item.type)}</a></li>)}</ul></details> : null}
        <section className="panel"><h2>Iniciar momento clínico</h2><CargCheckpointStartForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} courses={courseOptions} initialConsultationId={workspace.requestedConsultation?.id} /></section>
      </main>
    );
  }

  const checkpoint = workspace.checkpoint;
  const authorNames = await loadOncogeriatricAuthorNames(checkpoint.cargSavedById ? [checkpoint.cargSavedById] : []);
  const initialAnswers = workspace.cargAssessment?.answers ?? checkpoint.cargDraft;
  const g8Assessment = checkpoint.g8AssessmentId && checkpoint.consultationId
    ? await prisma.scaleAssessment.findFirst({ where: { id: checkpoint.g8AssessmentId, patientId, consultationId: checkpoint.consultationId }, select: { answers: true, scoreText: true } })
    : null;
  const hasConsultation = Boolean(checkpoint.consultationId);
  const consultation = workspace.consultations.find((item) => item.id === checkpoint.consultationId);
  if (hasConsultation && !consultation) throw new Error("Consulta vinculada indisponível para este paciente.");
  const finalized = consultation?.status === "FINALIZED";
  const status = workspace.cargAssessment
    ? `${finalized ? "Finalizado" : "Completo"} · ${workspace.cargAssessment.scoreText ?? "Resultado registrado"} · ${workspace.cargAssessment.classification ?? "classificação registrada"}`
    : checkpoint.cargSavedAt
      ? `Rascunho salvo · ${checkpoint.cargCompletionCount}/11 fatores`
      : "Não avaliado nesta consulta";

  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="avaliacao" title="Avaliação do momento" description="CARG e escalas gerais deste checkpoint, vinculados à consulta identificada abaixo." />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />
      <details className="panel no-print"><summary>Selecionar outro momento clínico ({moments.length})</summary><ul className="clean-list">{moments.map((item) => <li key={item.id}><a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: item.id })}>{formatClinicalDate(item.occurredAt)} · {oncogeriatricCheckpointTypeLabel(item.type)} · {item.consultationId ? "consulta vinculada" : "sem consulta"}</a></li>)}</ul><a href={`/patients/${encodeURIComponent(patientId)}/oncogeriatria/avaliacao?episode=${encodeURIComponent(episode.id)}&new=1`}>Criar outro momento clínico →</a></details>

      <section className={`panel ${hasConsultation ? styles.context : ""}`} aria-labelledby="carg-context-title">
        <div className="section-heading"><div><p className="eyebrow">Contexto clínico</p><h2 id="carg-context-title">{oncogeriatricCheckpointTypeLabel(checkpoint.type)}</h2></div><strong>{status}</strong></div>
        <p className={styles.identity}><strong>Paciente:</strong> {patient.fullName} · <strong>Episódio:</strong> {episode.diagnosis} · <strong>Momento:</strong> {checkpoint.id} · <strong>Data:</strong> {formatClinicalDate(checkpoint.occurredAt)} · <strong>Consulta:</strong> {consultation ? `${formatClinicalDate(consultation.occurredAt)} · ${consultation.status === "FINALIZED" ? "finalizada" : consultation.status === "IN_REVIEW" ? "em revisão" : "rascunho"}` : "sem vínculo"}</p>
        {finalized ? <p className="clinical-caution">Esta consulta está finalizada e permanece em somente leitura. <a href={`/patients/${encodeURIComponent(patientId)}/oncogeriatria/avaliacao?episode=${encodeURIComponent(episode.id)}&new=1`}>Iniciar nova consulta para reavaliação →</a></p> : null}
        {!hasConsultation ? <details open><summary>Vincular ou criar consulta para registrar as escalas</summary><CheckpointConsultationLinker patientId={patientId} episodeId={episode.id} checkpointId={checkpoint.id} expectedRevision={checkpoint.revision} consultations={consultationOptions} baselineConsultationId={patient.baselineConsultationId} /></details> : null}
      </section>

      <div className="panel no-print" aria-label="Acesso às escalas gerais"><a href="#escalas">Abrir demais escalas clínicas ↓</a></div>\n\n      <article id="carg" className="panel">
        <CargChecklistForm
          key={checkpoint.id}
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
          readOnly={finalized}
          finalizationMessage="Vincule este checkpoint a uma consulta clínica para registrar o CARG definitivamente. O rascunho permanece salvo."
        />
      </article>

      <details className="panel"><summary>G8 · triagem oncogeriátrica {g8Assessment?.scoreText ?? ""}</summary>
        {consultation && !finalized ? <G8ChecklistForm key={checkpoint.id} patientId={patientId} episodeId={episode.id} checkpointId={checkpoint.id} initialAgeYears={ageOnDate(patient.birthDate, checkpoint.occurredAt)} initialAnswers={readStructuredRecord(g8Assessment?.answers)} /> : <p className="muted">{finalized ? "Consulta finalizada: G8 em somente leitura." : "Vincule uma consulta para registrar o G8."}</p>}
      </details>

      <section className="panel" id="escalas"><h2>Demais escalas por domínio</h2>
        {consultation ? <ClinicalScalesWorkspace key={`${checkpoint.id}:${consultation.id}`} consultationId={consultation.id} /> : <p className="muted">Selecione ou crie uma consulta acima. O rascunho do CARG continua disponível sem vínculo.</p>}
      </section>
      <nav className="panel no-print" aria-label="Retorno à trajetória"><a href={buildOncogeriatricReturnPath({ patientId, episodeId: episode.id, stage: "longitudinal" })}>Concluir e retornar à trajetória →</a></nav>
    </main>
  );
}
