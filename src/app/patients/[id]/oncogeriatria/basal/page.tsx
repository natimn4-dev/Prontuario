import { OncogeriatricClinicalContinuity } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricDomainStatusSummary } from "@/components/oncogeriatria/domain-status-summary";
import { BaselineCheckpointForm } from "@/components/oncogeriatria/oncogeriatric-forms";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { CONSULTATION_STATUS_LABELS, type ConsultationContextStatus } from "@/domain/consultation-context";
import { oncogeriatricCheckpointStatusLabel, oncogeriatricCourseStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { buildOncogeriatricCargHref } from "@/domain/oncogeriatria/return-navigation";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode, selectOncogeriatricWorkingConsultation } from "@/server/oncogeriatria/read";
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

  const consultationOptions = workspace.consultations.filter((item) => item.status !== "FINALIZED").map((item) => ({
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
  const hasConsultation = Boolean(current?.consultationId);

  return (
    <main className="shell">
      <OncogeriatricWorkspaceHeader
        patientId={patientId}
        patientName={patient.fullName}
        episodeLabel={episode.diagnosis}
        currentStep="basal"
        title="Avaliação inicial oncogeriátrica"
        description="Registre o contexto pré tratamento e acompanhe o estado das escalas na avaliação do momento."
      />
      <OncogeriatricNav patientId={patientId} episodeId={episode.id} />

      <section className={styles.stageIntro} aria-label="Situação da avaliação inicial">
        <div className={styles.stageCopy}>
          <p className="eyebrow">Antes do tratamento</p>
          <h2>Uma única página para organizar a avaliação inicial</h2>
          <p>O preenchimento das escalas ocorre na Avaliação do momento, vinculada a este checkpoint.</p>
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
            <p>Depois de criar esta avaliação, a avaliação do momento abrirá com o CARG em primeiro lugar.</p>
          </div>
          <BaselineCheckpointForm patientId={patientId} episodeId={episode.id} consultations={consultationOptions} courses={courseOptions} />
        </section>
      ) : (
        <>
          <p><a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: current.id })}>Abrir CARG, G8 e demais escalas deste momento →</a></p>

          {!hasConsultation ? (
            <p className="clinical-caution">Sem consulta vinculada: o CARG aceita rascunho. Vincule ou crie uma consulta na avaliação do momento para registrar as escalas.</p>
          ) : (
            <OncogeriatricClinicalContinuity patientId={patientId} consultation={workingConsultation} episodeId={episode.id} returnStage="basal" />
          )}

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
                {item.consultationId ? <a href={buildOncogeriatricCargHref({ patientId, episodeId: episode.id, checkpointId: item.id })}>Abrir escalas desta consulta →</a> : null}
              </li>
            ))}
          </ul>
        ) : <p className="muted">Ainda não há avaliação inicial registrada.</p>}
      </section>

      <OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="basal" />
    </main>
  );
}
