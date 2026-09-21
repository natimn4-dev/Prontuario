import { CargChecklistForm, G8ChecklistForm } from "@/components/oncogeriatria/checklist-scales";
import { CheckpointConsultationLinker } from "@/components/oncogeriatria/checkpoint-consultation-linker";
import { OncogeriatricClinicalContinuity } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { BaselineCheckpointForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointStatusLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { buildOncogeriatricCargHref, buildOncogeriatricConsultationHref } from "@/domain/oncogeriatria/return-navigation";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricAuthorNames, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode, selectOncogeriatricWorkingConsultation } from "@/server/oncogeriatria/read";
import styles from "./oncogeriatric-baseline.module.css";

function consultationStatusLabel(value: string): string {
  return CONSULTATION_STATUS_LABELS[value as ConsultationContextStatus] ?? "Situação não informada";
}

function ageOnDate(birthDate: Date | null, referenceDate: Date): number | undefined {
  if (!birthDate) return undefined;
  let years = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const before =
    referenceDate.getUTCMonth() < birthDate.getUTCMonth()
    || (referenceDate.getUTCMonth() === birthDate.getUTCMonth() && referenceDate.getUTCDate() < birthDate.getUTCDate());
  if (before) years -= 1;
  return years >= 0 ? years : undefined;
}

function cargReferenceSex(value: string | null): "FEMALE" | "MALE" | undefined {
  const normalized = value?.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "feminino" || normalized === "female" || normalized === "f") return "FEMALE";
  if (normalized === "masculino" || normalized === "male" || normalized === "m") return "MALE";
  return undefined;
}

export default async function OncogeriatricBaselinePage({
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

  if (!episode) {
    return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico no resumo do paciente.</p></main>;
  }

  const workspace = await loadEpisodeWorkspace(patientId, episode.id, "baseline");
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const initialAssessments = workspace.checkpoints.filter((item) => item.type === "PRE_TREATMENT");
  const current = initialAssessments[initialAssessments.length - 1];

  const consultationOptions = workspace.consultations.map((item) => ({
    id: item.id,
    label: `${formatClinicalDate(item.occurredAt)} · ${consultationStatusLabel(item.status)}`,
  }));
  const courseOptions = workspace.courses.map((item) => ({
    id: item.id,
    label: `${item.regimenName} · ${oncogeriatricCourseStatusLabel(item.status)}`,
  }));

  const currentAge = current ? ageOnDate(patient.birthDate, current.occurredAt) : undefined;
  const workingConsultation = selectOncogeriatricWorkingConsultation(workspace, current?.consultationId);
  const g8Assessment = current?.g8AssessmentId ? workspace.scaleAssessments.find((item) => item.id === current.g8AssessmentId) : null;
  const cargAssessment = current?.cargAssessmentId ? workspace.scaleAssessments.find((item) => item.id === current.cargAssessmentId) : null;
  const authorNames = await loadOncogeriatricAuthorNames(current?.cargSavedById ? [current.cargSavedById] : []);
  const cargInitialAnswers = cargAssessment?.answers ?? current?.cargDraft;
  const hasConsultation = Boolean(current?.consultationId);

  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader
        patientId={patientId}
        patientName={patient.fullName}
        episodeLabel={episode.diagnosis}
        currentStep="basal"
        title="Avaliação inicial oncogeriátrica"
        description="Defina o contexto mínimo antes do tratamento. O CARG é a primeira escala e tem uma entrada própria para esta consulta."
      />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      <section className={styles.stageIntro} aria-label="Situação da avaliação inicial">
        <div className={styles.stageCopy}>
          <p className="eyebrow">Antes do tratamento</p>
          <h2>Uma única página para organizar a avaliação inicial</h2>
          <p>CARG, G8, vínculo da consulta e acesso às demais escalas ficam reunidos nesta etapa para reduzir cliques e evitar perda de contexto durante o atendimento.</p>
        </div>
        <div className={styles.stageStatus}>
          <div className={styles.statusItem}><span>Avaliação inicial</span><strong>{current ? formatClinicalDate(current.occurredAt) : "Ainda não iniciada"}</strong></div>
          <div className={styles.statusItem}><span>Consulta vinculada</span><strong>{hasConsultation ? "Sim" : "Não"}</strong></div>
          <div className={styles.statusItem}><span>CARG</span><strong>{cargAssessment ? cargAssessment.scoreText ?? "Registrado" : current?.cargSavedAt ? "Rascunho salvo" : "Não preenchido"}</strong></div>
          <div className={styles.statusItem}><span>G8</span><strong>{g8Assessment ? g8Assessment.scoreText ?? "Registrado" : "Não preenchido"}</strong></div>
        </div>
      </section>

      {!current ? (
        <section className={`panel ${styles.startPanel}`}>
          <div className={styles.startPanelHeader}>
            <p className="eyebrow">Começar</p>
            <h2>Iniciar avaliação antes do tratamento</h2>
            <p>Depois de criar esta avaliação, o CARG aparecerá imediatamente nesta mesma página.</p>
          </div>
          <BaselineCheckpointForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} courses={courseOptions} />
        </section>
      ) : (
        <>
          <section className={styles.instrumentHub} aria-labelledby="essential-tools-title">
            <p className="eyebrow">Instrumentos principais</p>
            <h2 id="essential-tools-title">Acesso direto</h2>
            <nav className={styles.instrumentLinks} aria-label="Instrumentos da avaliação inicial">
              <a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: current.id })}><strong>CARG</strong><span>Primeira escala desta consulta · risco de toxicidade da quimioterapia</span><small>{cargAssessment ? "Resultado registrado" : current.cargSavedAt ? "Continuar rascunho" : "Abrir agora"}</small></a>
              <a href="#g8"><strong>G8</strong><span>Triagem oncogeriátrica</span><small>{g8Assessment ? "Resultado registrado" : hasConsultation ? "Abrir agora" : "Disponível após vínculo da consulta"}</small></a>
              <a href={hasConsultation && current.consultationId ? buildOncogeriatricConsultationHref({ consultationId: current.consultationId, section: "escalas", episodeId: episode.id, returnStage: "basal" }) : "#consultation-link"}>
                <strong>Demais escalas</strong><span>Funcionalidade, mobilidade, cognição, humor e outros domínios</span><small>{hasConsultation ? "Abrir escalas da consulta" : "Vincule uma consulta primeiro"}</small>
              </a>
            </nav>
          </section>

          {!hasConsultation ? (
            <section id="consultation-link" className={styles.linkPanel}>
              <p className="eyebrow">Vínculo clínico</p>
              <h2>Vincule a consulta sem perder o CARG já preenchido</h2>
              <p>O CARG pode ser preenchido e salvo como rascunho antes desse vínculo. A consulta é necessária apenas para registrar o resultado final no histórico único de escalas.</p>
              <CheckpointConsultationLinker
                patientId={patientId}
                episodeId={episode.id}
                checkpointId={current.id}
                expectedRevision={current.revision}
                consultations={consultationOptions}
              />
            </section>
          ) : (
            <OncogeriatricClinicalContinuity patientId={patientId} consultation={workingConsultation} episodeId={episode.id} returnStage="basal" />
          )}

          <article id="carg" className={styles.primaryScale}>
            <CargChecklistForm
              patientId={patientId}
              episodeId={episode.id}
              checkpointId={current.id}
              initialAgeYears={currentAge}
              initialBiologicalSex={cargReferenceSex(patient.sex)}
              initialAnswers={readStructuredRecord(cargInitialAnswers)}
              initialProvenance={readStructuredRecord(current.cargLabProvenance)}
              initialSavedAt={current.cargSavedAt?.toISOString() ?? null}
              initialSavedBy={current.cargSavedById ? authorNames.get(current.cargSavedById) ?? null : null}
              canFinalize={hasConsultation}
              finalizationMessage="Vincule esta avaliação a uma consulta clínica para registrar o CARG definitivamente. O rascunho permanece salvo."
            />
          </article>

          <article id="g8" className={`panel ${styles.secondaryScale}`}>
            {hasConsultation ? (
              <G8ChecklistForm
                patientId={patientId}
                episodeId={episode.id}
                checkpointId={current.id}
                initialAgeYears={currentAge}
                initialAnswers={readStructuredRecord(g8Assessment?.answers)}
              />
            ) : (
              <div className={styles.lockedScale}>
                <p className="eyebrow">G8</p>
                <h3>Triagem oncogeriátrica</h3>
                <p>O G8 será liberado para registro assim que esta avaliação estiver vinculada a uma consulta. O CARG acima continua disponível para preenchimento e rascunho.</p>
                <a href="#consultation-link">Vincular consulta →</a>
              </div>
            )}
          </article>

          <OncogeriatricDomainStatusSummary history={capacityHistory} />
        </>
      )}

      <section className={`panel ${styles.historyPanel}`}>
        <h2>Histórico antes do tratamento</h2>
        {initialAssessments.length ? (
          <ul className="clean-list">
            {initialAssessments.map((item) => (
              <li key={item.id}>
                <strong>{formatClinicalDate(item.occurredAt)}</strong>
                <span>{oncogeriatricCheckpointStatusLabel(item.status)} · {item.consultationId ? "vinculada a uma consulta" : "sem consulta vinculada"}</span>
                {item.consultationId ? <a href={buildOncogeriatricConsultationHref({ consultationId: item.consultationId, section: "escalas", episodeId: episode.id, returnStage: "basal" })}>Abrir escalas desta consulta →</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="muted">Ainda não há avaliação inicial registrada.</p>}
      </section>

      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="basal" />
    </main>
  );
}
