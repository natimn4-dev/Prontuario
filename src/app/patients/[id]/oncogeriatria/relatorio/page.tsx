import { OncogeriatricNav } from "@/components/oncogeriatria/oncogeriatric-nav";
import { OncogeriatricReportActions } from "@/components/oncogeriatria/report-actions";
import { latestRecoveryAssessmentsByDomain } from "@/domain/oncogeriatria/longitudinal";
import { oncogeriatricCheckpointTypeLabel, oncogeriatricCourseStatusLabel, oncogeriatricDomainLabel, oncogeriatricIntentLabel, oncogeriatricModalityLabel, oncogeriatricRecoveryStatusLabel } from "@/domain/oncogeriatria/presentation-labels";
import { buildProfessionalIdentity } from "@/domain/professional-identity";
import { formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function latestAssessmentByIds(ids: (string | null)[], assessments: { id: string; scaleCode: string; scoreText: string | null; classification: string | null; appliedAt: Date }[]) {
  for (const id of ids.filter(Boolean).reverse()) {
    const found = assessments.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

function scaleTrajectory(codeFragment: string, assessments: { scaleCode: string; scaleVersion: string; scoreText: string | null; scoreNumeric: unknown; appliedAt: Date }[]) {
  const candidates = assessments.filter((item) => item.scaleCode.toUpperCase().includes(codeFragment.toUpperCase()));
  if (!candidates.length) return "Não avaliado";
  const version = candidates[candidates.length - 1]?.scaleVersion;
  const compatible = candidates.filter((item) => item.scaleVersion === version);
  const first = compatible[0];
  const last = compatible[compatible.length - 1];
  const display = (item: typeof first) => item?.scoreText ?? (item?.scoreNumeric !== null && item?.scoreNumeric !== undefined ? String(item.scoreNumeric) : "sem escore");
  return first && last ? `${display(first)} → ${display(last)} (versão ${version})` : "Não avaliado";
}

function summarizeCheckpointChanges(value: unknown): string[] {
  const data = readStructuredRecord(value);
  const labels: Record<string, string> = {
    newIadlHelp: "nova necessidade de ajuda em AIVD", newAdlHelp: "nova necessidade de ajuda em ABVD",
    fall: "queda", nearFall: "quase queda", newWalkingAid: "novo dispositivo de marcha", worsenedMobility: "piora de mobilidade",
    reducedIntake: "redução da ingestão", anorexia: "anorexia", nausea: "náusea", dysphagia: "disfagia", mucositis: "mucosite",
    confusion: "confusão", delirium: "delirium", perceivedDecline: "piora cognitiva percebida", medicationDifficulty: "nova dificuldade com medicamentos",
    emergency: "atendimento de emergência", hospitalization: "hospitalização", infection: "infecção", treatmentInterruption: "interrupção de tratamento registrada",
    cycleDelay: "atraso de ciclo registrado", doseReductionRecorded: "redução de dose registrada pela equipe oncológica",
  };
  const changes: string[] = [];
  for (const sectionName of ["functional", "mobility", "nutrition", "cognition", "careEvents"]) {
    const section = readStructuredRecord(data[sectionName]);
    for (const [key, item] of Object.entries(section)) if (item === true && labels[key]) changes.push(labels[key]);
  }
  const nutrition = readStructuredRecord(data.nutrition);
  if (typeof nutrition.weightKg === "number") changes.push(`peso registrado: ${nutrition.weightKg} kg`);
  if (typeof data.notes === "string" && data.notes.trim()) changes.push(data.notes.trim());
  return changes;
}

export default async function OncogeriatricReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ episode?: string }> }) {
  const { user } = await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de gerar o relatório.</p></main>;

  const workspace = await loadEpisodeWorkspace(patientId, episode.id);
  const professional = buildProfessionalIdentity({ name: user.name, email: user.email, brandOwnerEmail: process.env.PROFESSIONAL_BRAND_OWNER_EMAIL });
  const currentCourse = workspace.courses.find((item) => item.status === "ACTIVE") ?? workspace.courses[0];
  const latestCheckpoint = workspace.checkpoints[workspace.checkpoints.length - 1];
  const g8 = latestAssessmentByIds(workspace.checkpoints.map((item) => item.g8AssessmentId), workspace.scaleAssessments);
  const carg = latestAssessmentByIds(workspace.checkpoints.map((item) => item.cargAssessmentId), workspace.scaleAssessments);
  const baseline = workspace.checkpoints.find((item) => item.type === "PRE_TREATMENT");
  const baselineData = readStructuredRecord(baseline?.structuredData);
  const whatMatters = typeof baselineData.whatMatters === "string" && baselineData.whatMatters.trim() ? baselineData.whatMatters : "Não registrado";

  const activeInterventions = workspace.interventions.filter((item) => item.status !== "COMPLETED");
  const completedInterventions = workspace.interventions.filter((item) => item.status === "COMPLETED");
  const recentEvents = workspace.toxicities;
  const changes = summarizeCheckpointChanges(latestCheckpoint?.structuredData);
  const reportDate = new Date();
  const latestRecoveryByDomain = latestRecoveryAssessmentsByDomain(workspace.recovery);
  const trajectories = {
    abvd: scaleTrajectory("ABVD", workspace.scaleAssessments),
    aivd: scaleTrajectory("AIVD", workspace.scaleAssessments),
    nutrition: scaleTrajectory("MNA", workspace.scaleAssessments),
    frailty: scaleTrajectory("FRAIL", workspace.scaleAssessments),
    mobility: scaleTrajectory("10-CS", workspace.scaleAssessments),
    cognitionMeem: scaleTrajectory("MEEM", workspace.scaleAssessments),
    cognitionMoca: scaleTrajectory("MOCA", workspace.scaleAssessments),
    symptoms: scaleTrajectory("ESAS", workspace.scaleAssessments),
  };

  const snapshotContent = {
    schemaVersion: "oncogeriatria-report-v2",
    generatedAt: reportDate.toISOString(),
    patientId,
    episodeId: episode.id,
    diagnosis: { diagnosis: episode.diagnosis, primarySite: episode.primarySite, histology: episode.histology, stage: episode.stage, diseaseStatus: episode.diseaseStatus },
    treatment: currentCourse ? { regimenName: currentCourse.regimenName, modality: currentCourse.modality, intent: currentCourse.intent, therapyLine: currentCourse.therapyLine, status: currentCourse.status } : null,
    g8: g8 ? { score: g8.scoreText, classification: g8.classification } : null,
    carg: carg ? { score: carg.scoreText, classification: carg.classification, historicalResult: true } : null,
    cargImplementationStatus: "LICENSE_REVIEW_REQUIRED",
    trajectories,
    changes,
    activeInterventions: activeInterventions.map((item) => ({ domain: item.domain, vulnerability: item.description, recommendation: item.intervention, responsibleProfessional: item.responsibleProfessional, dueAt: item.dueAt?.toISOString() ?? null, status: item.status })),
    completedInterventions: completedInterventions.map((item) => ({ domain: item.domain, vulnerability: item.description, recommendation: item.intervention, responsibleProfessional: item.responsibleProfessional, result: item.result, status: item.status })),
    recentEvents: recentEvents.map((item) => ({ type: item.toxicityType, occurredAt: item.occurredAt.toISOString(), grade: item.grade, hospitalizationAssociated: item.hospitalizationAssociated, cycleDelayAssociated: item.cycleDelayAssociated })),
    recovery: latestRecoveryByDomain.map((item) => ({ domain: item.domain, status: item.status, notes: item.notes, assessedAt: item.assessedAt.toISOString() })),
    whatMatters,
  };

  return (
    <main className="shell">
      <header className="hero compact-hero no-print">
        <p className="eyebrow">Oncogeriatria · etapa 8</p>
        <h1>Relatório oncogeriátrico</h1>
        <p>Documento específico da linha oncológica, com trajetória geriátrica, vulnerabilidades, recomendações registradas, eventos durante o tratamento e recuperação. A revisão clínica é obrigatória antes de copiar, imprimir ou arquivar uma versão.</p>
      </header>
      <div className="no-print"><OncogeriatricNav patientId={patientId} episodeId={episode.id} /></div>
      <OncogeriatricReportActions patientId={patientId} episodeId={episode.id} content={snapshotContent} />

      <article id="oncogeriatric-report" className="aga-report">
        <header>
          <p className="eyebrow">Prontuário Aprimorado · Oncogeriatria</p>
          <h1>Relatório oncogeriátrico</h1>
          <p><strong>Paciente:</strong> {patient.fullName} · <strong>Data:</strong> {formatClinicalDate(reportDate)}</p>
          <p><strong>Profissional:</strong> {professional.displayName} · {professional.roleLabel}</p>
        </header>

        <section>
          <h2>1. Contexto oncológico</h2>
          <p><strong>Diagnóstico:</strong> {episode.diagnosis}{episode.primarySite ? ` · sítio: ${episode.primarySite}` : ""}{episode.histology ? ` · histologia: ${episode.histology}` : ""}{episode.stage ? ` · estágio: ${episode.stage}` : ""}{episode.diseaseStatus ? ` · situação: ${episode.diseaseStatus}` : ""}</p>
          <p><strong>Tratamento:</strong> {currentCourse ? `${currentCourse.regimenName} · ${oncogeriatricModalityLabel(currentCourse.modality)} · intenção ${oncogeriatricIntentLabel(currentCourse.intent)} · ${currentCourse.therapyLine ?? "linha não registrada"} · ${oncogeriatricCourseStatusLabel(currentCourse.status)}` : "Tratamento não registrado"}</p>
          <p><strong>Última avaliação:</strong> {latestCheckpoint ? `${oncogeriatricCheckpointTypeLabel(latestCheckpoint.type)} · ${formatClinicalDate(latestCheckpoint.occurredAt)}${latestCheckpoint.cycleNumber ? ` · ciclo ${latestCheckpoint.cycleNumber}` : ""}` : "Não registrada"}</p>
        </section>

        <section className="two-columns">
          <div>
            <h2>2. Triagem G8</h2>
            <p>{g8 ? `${g8.scoreText ?? "sem escore"} · ${g8.classification ?? "sem classificação"}` : "Não avaliado"}</p>
            <p className="muted">Instrumento de rastreio geriátrico; não determina conduta oncológica isoladamente.</p>
          </div>
          <div>
            <h2>3. CARG</h2>
            {carg ? <p>{carg.scoreText ?? "sem escore"} · {carg.classification ?? "sem classificação"} <span className="muted">(resultado histórico previamente registrado)</span></p> : <p>Não calculado nesta versão.</p>}
            <p className="muted">A implementação eletrônica local permanece bloqueada enquanto se aguarda liberação formal das condições de uso. Nenhuma informação clínica é enviada a calculadoras externas.</p>
          </div>
        </section>

        <section>
          <h2>4. Trajetória geriátrica — avaliação inicial → avaliação atual</h2>
          <table>
            <thead><tr><th scope="col">Domínio / instrumento</th><th scope="col">Trajetória</th></tr></thead>
            <tbody>
              <tr><th scope="row">ABVD</th><td>{trajectories.abvd}</td></tr>
              <tr><th scope="row">AIVD</th><td>{trajectories.aivd}</td></tr>
              <tr><th scope="row">Nutrição — MNA</th><td>{trajectories.nutrition}</td></tr>
              <tr><th scope="row">Fragilidade — FRAIL</th><td>{trajectories.frailty}</td></tr>
              <tr><th scope="row">Mobilidade — 10-CS</th><td>{trajectories.mobility}</td></tr>
              <tr><th scope="row">Cognição — MEEM</th><td>{trajectories.cognitionMeem}</td></tr>
              <tr><th scope="row">Cognição — MoCA</th><td>{trajectories.cognitionMoca}</td></tr>
              <tr><th scope="row">Sintomas — ESAS</th><td>{trajectories.symptoms}</td></tr>
            </tbody>
          </table>
          <p className="muted">Comparações usam somente versões compatíveis do mesmo instrumento. A significância clínica da mudança permanece sob julgamento médico.</p>
        </section>

        <section>
          <h2>5. Vulnerabilidades e recomendações geriátricas registradas</h2>
          {activeInterventions.length ? (
            <ol>
              {activeInterventions.map((item) => (
                <li key={item.id}>
                  <strong>{oncogeriatricDomainLabel(item.domain)}:</strong> {item.description}
                  {item.intervention ? <> — <strong>recomendação:</strong> {item.intervention}</> : ""}
                  {item.responsibleProfessional ? <> · <strong>responsável:</strong> {item.responsibleProfessional}</> : ""}
                  {item.dueAt ? <> · <strong>prazo:</strong> {formatClinicalDate(item.dueAt)}</> : ""}
                </li>
              ))}
            </ol>
          ) : <p>Sem recomendação geriátrica ativa registrada neste acompanhamento.</p>}
          {completedInterventions.length ? <><h3>Intervenções concluídas previamente</h3><ul>{completedInterventions.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)}:</strong> {item.intervention ?? item.description}{item.result ? ` · resultado: ${item.result}` : ""}</li>)}</ul></> : null}
        </section>

        <section>
          <h2>6. Mudanças e sinais de atenção desde a última avaliação</h2>
          {changes.length ? <ul>{changes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Sem mudança estruturada registrada.</p>}
          <p className="muted">Os itens acima são fatos registrados para reavaliação clínica; não geram ajuste automático do tratamento antineoplásico.</p>
        </section>

        <section>
          <h2>7. Eventos durante o tratamento</h2>
          {recentEvents.length ? <ul>{recentEvents.map((event) => <li key={event.id}>{formatClinicalDate(event.occurredAt)} · {event.toxicityType}{event.grade ? ` · grau ${event.grade}` : ""}{event.hospitalizationAssociated ? " · hospitalização associada" : ""}{event.cycleDelayAssociated ? " · atraso de ciclo registrado" : ""}{event.treatmentModificationRecorded ? ` · modificação documentada: ${event.treatmentModificationRecorded}` : ""}</li>)}</ul> : <p>Nenhum evento relevante registrado.</p>}
        </section>

        <section>
          <h2>8. Recuperação e pós-tratamento</h2>
          {latestRecoveryByDomain.length ? <ul>{latestRecoveryByDomain.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)}:</strong> {oncogeriatricRecoveryStatusLabel(item.status).toLocaleLowerCase("pt-BR")} · {formatClinicalDate(item.assessedAt)}{item.notes ? ` · ${item.notes}` : ""}</li>)}</ul> : <p>Ainda sem avaliação de recuperação registrada.</p>}
        </section>

        <section>
          <h2>9. Objetivo prioritário informado pelo paciente</h2>
          <p>{whatMatters}</p>
        </section>

        <section>
          <h2>10. Integração com a equipe oncológica</h2>
          <p>Este relatório organiza vulnerabilidades geriátricas, intervenções e mudanças longitudinais para apoiar a discussão entre geriatria e oncologia. Escolha de esquema, dose, intervalo, adiamento, suspensão ou modificação do tratamento antineoplásico permanecem decisões clínicas humanas.</p>
        </section>

        <footer>
          <p className="muted">Documento de apoio à comunicação médica, longitudinal e específico para Oncogeriatria. Deve ser revisado clinicamente antes de compartilhamento.</p>
        </footer>
      </article>
    </main>
  );
}
