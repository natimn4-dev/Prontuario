import { OncogeriatricTrajectoryTable } from "@/components/oncogeriatria/clinical-continuity";
import { OncogeriatricNav, OncogeriatricStepActions, OncogeriatricWorkspaceHeader } from "@/components/oncogeriatria/oncogeriatric-nav";
import { OncogeriatricReportActions } from "@/components/oncogeriatria/report-actions";
import { CapacityDimensionHistoryChart } from "@/components/reports/capacity-dimension-history-chart";
import { buildCargReportModel } from "@/domain/oncogeriatria/carg-report";
import { buildOncogeriatricReportGuidance } from "@/domain/oncogeriatria/domain-review";
import { latestRecoveryAssessmentsByDomain } from "@/domain/oncogeriatria/longitudinal";
import { oncogeriatricCheckpointTypeLabel, oncogeriatricCourseStatusLabel, oncogeriatricDomainLabel, oncogeriatricIntentLabel, oncogeriatricModalityLabel, oncogeriatricRecoveryStatusLabel, oncogeriatricRiskFlagLabel } from "@/domain/oncogeriatria/presentation-labels";
import { buildProfessionalIdentity } from "@/domain/professional-identity";
import { capacityHistoryForOncogeriatricEpisode, formatClinicalDate, loadEpisodeWorkspace, loadOncogeriatricPatient, readStructuredRecord, requireOncogeriatricReadAccess, resolveOncogeriatricEpisode } from "@/server/oncogeriatria/read";

function latestAssessmentByIds(
  ids: (string | null)[],
  assessments: { id: string; scaleCode: string; answers: unknown; scoreText: string | null; classification: string | null; interpretation: string | null; appliedAt: Date }[],
) {
  for (const id of ids.filter(Boolean).reverse()) {
    const found = assessments.find((item) => item.id === id);
    if (found) return found;
  }
  return null;
}

function scaleTrajectory(
  codeFragment: string,
  assessments: { scaleCode: string; scaleVersion: string; scoreText: string | null; scoreNumeric: unknown; appliedAt: Date }[],
) {
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

export default async function OncogeriatricReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
}) {
  const { user } = await requireOncogeriatricReadAccess();
  const { id: patientId } = await params;
  const query = await searchParams;
  const patient = await loadOncogeriatricPatient(patientId);
  const episode = await resolveOncogeriatricEpisode(patientId, query.episode);
  if (!episode) return <main className="shell"><p>Inicie um acompanhamento oncogeriátrico antes de gerar o relatório.</p></main>;

  const workspace = await loadEpisodeWorkspace(patientId, episode.id, "report");
  const capacityHistory = capacityHistoryForOncogeriatricEpisode(patientId, workspace);
  const domainGuidance = buildOncogeriatricReportGuidance(capacityHistory);
  const professional = buildProfessionalIdentity({ name: user.name, email: user.email, brandOwnerEmail: process.env.PROFESSIONAL_BRAND_OWNER_EMAIL });
  const currentCourse = workspace.courses.find((item) => item.status === "ACTIVE") ?? workspace.courses[0];
  const currentCourseRiskData = readStructuredRecord(currentCourse?.riskFlags);
  const selectedRiskFlags = Array.isArray(currentCourseRiskData.selected)
    ? currentCourseRiskData.selected.filter((item): item is string => typeof item === "string").map(oncogeriatricRiskFlagLabel)
    : [];
  const commonAdverseEffects = typeof currentCourseRiskData.commonAdverseEffects === "string" ? currentCourseRiskData.commonAdverseEffects.trim() : "";
  const commonAdverseEffectsSource = typeof currentCourseRiskData.commonAdverseEffectsSource === "string" ? currentCourseRiskData.commonAdverseEffectsSource.trim() : "";
  const clinicianRegimenGuidance = typeof currentCourseRiskData.clinicianGuidance === "string" ? currentCourseRiskData.clinicianGuidance.trim() : "";
  const latestCheckpoint = workspace.checkpoints[workspace.checkpoints.length - 1];
  const g8 = latestAssessmentByIds(workspace.checkpoints.map((item) => item.g8AssessmentId), workspace.scaleAssessments);
  const latestCargCheckpoint = [...workspace.checkpoints].reverse().find((item) => {
    const draft = readStructuredRecord(item.cargDraft);
    return Boolean(item.cargAssessmentId) || item.cargCompletionCount > 0 || Object.keys(draft).length > 0;
  });
  const cargAssessment = latestCargCheckpoint?.cargAssessmentId
    ? workspace.scaleAssessments.find((item) => item.id === latestCargCheckpoint.cargAssessmentId) ?? null
    : null;
  const carg = buildCargReportModel({
    assessment: cargAssessment
      ? { ...cargAssessment, scoreNumeric: cargAssessment.scoreNumeric === null ? null : Number(cargAssessment.scoreNumeric) }
      : null,
    draft: latestCargCheckpoint?.cargDraft,
  });
  const baseline = workspace.checkpoints.find((item) => item.type === "PRE_TREATMENT");
  const baselineData = readStructuredRecord(baseline?.structuredData);
  const whatMatters = typeof baselineData.whatMatters === "string" && baselineData.whatMatters.trim() ? baselineData.whatMatters : "Não registrado";
  const activeInterventions = workspace.interventions.filter((item) => item.status !== "COMPLETED");
  const completedInterventions = workspace.interventions.filter((item) => item.status === "COMPLETED");
  const recentEvents = workspace.toxicities;
  const changes = summarizeCheckpointChanges(latestCheckpoint?.structuredData);
  const reportDate = new Date();
  const latestRecoveryByDomain = latestRecoveryAssessmentsByDomain(workspace.recovery);
  const plannedFollowUps = workspace.checkpoints.filter((item) => item.type === "END_OF_TREATMENT" || item.type.startsWith("POST_"));
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
    schemaVersion: "oncogeriatria-report-v7",
    generatedAt: reportDate.toISOString(),
    patientId,
    episodeId: episode.id,
    diagnosis: { diagnosis: episode.diagnosis, primarySite: episode.primarySite, histology: episode.histology, stage: episode.stage, diseaseStatus: episode.diseaseStatus },
    treatment: currentCourse ? { regimenName: currentCourse.regimenName, modality: currentCourse.modality, intent: currentCourse.intent, therapyLine: currentCourse.therapyLine, status: currentCourse.status } : null,
    regimenSafety: { selectedRiskFlags, commonAdverseEffects: commonAdverseEffects || null, commonAdverseEffectsSource: commonAdverseEffectsSource || null, clinicianGuidance: clinicianRegimenGuidance || null },
    g8: g8 ? { assessmentId: g8.id, score: g8.scoreText, classification: g8.classification } : null,
    carg: carg ? { assessmentId: cargAssessment?.id ?? null, source: carg.source, sourceLabel: carg.sourceLabel, score: carg.scoreText, classification: carg.categoryLabel, observedGradeThreeToFiveToxicityPercent: carg.observedGradeThreeToFiveToxicityPercent, interpretation: carg.interpretation, populationNote: carg.populationNote, attentionFactors: carg.attentionFactors, pendingLabels: carg.pendingLabels, clinicianGuidance: carg.clinicianGuidance, courseId: currentCourse?.id ?? null, regimenName: currentCourse?.regimenName ?? null } : null,
    cargImplementationStatus: "AVAILABLE",
    trajectories,
    changes,
    activeInterventions: activeInterventions.map((item) => ({ domain: item.domain, vulnerability: item.description, recommendation: item.intervention, responsibleProfessional: item.responsibleProfessional, startedAt: item.startedAt?.toISOString() ?? null, dueAt: item.dueAt?.toISOString() ?? null, status: item.status, checkpointId: item.checkpointId, consultationId: item.consultationId })),
    completedInterventions: completedInterventions.map((item) => ({ domain: item.domain, vulnerability: item.description, recommendation: item.intervention, responsibleProfessional: item.responsibleProfessional, startedAt: item.startedAt?.toISOString() ?? null, result: item.result, status: item.status, checkpointId: item.checkpointId, consultationId: item.consultationId })),
    recentEvents: recentEvents.map((item) => ({ type: item.toxicityType, occurredAt: item.occurredAt.toISOString(), grade: item.grade, hospitalizationAssociated: item.hospitalizationAssociated, cycleDelayAssociated: item.cycleDelayAssociated, treatmentModificationRecorded: item.treatmentModificationRecorded, checkpointId: item.checkpointId, consultationId: item.consultationId, treatmentCourseId: item.treatmentCourseId })),
    domainGuidance,
    plannedFollowUps: plannedFollowUps.map((item) => ({ type: item.type, occurredAt: item.occurredAt.toISOString(), scheduledAt: item.scheduledAt?.toISOString() ?? null, status: item.status, consultationId: item.consultationId })),
    recovery: latestRecoveryByDomain.map((item) => ({ domain: item.domain, status: item.status, notes: item.notes, assessedAt: item.assessedAt.toISOString(), checkpointId: item.checkpointId, consultationId: item.consultationId })),
    whatMatters,
  };

  return <main className="shell">
    <div className="no-print"><OncogeriatricWorkspaceHeader patientId={patientId} patientName={patient.fullName} episodeLabel={episode.diagnosis} currentStep="relatorio" title="Relatório oncogeriátrico" description="Revise trajetória geriátrica, vulnerabilidades, recomendações registradas, eventos e recuperação antes de copiar, imprimir ou arquivar uma versão." /></div>
    <div className="no-print"><OncogeriatricNav patientId={patientId} episodeId={episode.id} /></div>
    <OncogeriatricReportActions patientId={patientId} episodeId={episode.id} consultationId={latestCheckpoint?.consultationId ?? null} g8AssessmentId={g8?.id ?? null} cargAssessmentId={cargAssessment?.id ?? null} content={snapshotContent} />

    <article id="oncogeriatric-report" className="onco-report">
      <header className="onco-report-header">
        <div>
          <p className="onco-report-eyebrow">Prontuário Aprimorado · Oncogeriatria</p>
          <h1>Relatório oncogeriátrico</h1>
          <p className="onco-report-purpose">Documento longitudinal para alinhar vulnerabilidades geriátricas, risco de toxicidade e pontos de atenção com a equipe oncológica.</p>
        </div>
        <dl className="onco-report-identity">
          <div><dt>Paciente</dt><dd>{patient.fullName}</dd></div>
          <div><dt>Data do relatório</dt><dd>{formatClinicalDate(reportDate)}</dd></div>
          <div><dt>Profissional</dt><dd>{professional.displayName} · {professional.roleLabel}</dd></div>
        </dl>
      </header>

      <section className="onco-report-intro">Revise os resultados e as orientações abaixo antes de compartilhar. O CARG apoia a estratificação de risco e a conversa entre geriatria e oncologia; não substitui decisão clínica individual.</section>

      <section className="onco-report-section onco-report-executive" aria-label="Resumo clínico">
        <div className="onco-report-section-heading"><span>Resumo</span><h2>O que merece atenção nesta avaliação</h2></div>
        <div className="onco-report-executive-grid">
          <article><p className="onco-report-card-label">Contexto oncológico</p><h3>{episode.diagnosis}</h3><p>{currentCourse ? `${currentCourse.regimenName} · ${oncogeriatricModalityLabel(currentCourse.modality)} · ${oncogeriatricCourseStatusLabel(currentCourse.status)}` : "Tratamento não registrado"}</p></article>
          <article data-tone={carg?.category === "HIGH" ? "attention" : "neutral"}><p className="onco-report-card-label">Risco de toxicidade</p><h3>{carg?.scoreText ?? "Não avaliado"}</h3><p>{carg?.categoryLabel ?? "CARG ainda sem resultado registrado"}</p></article>
          <article data-tone={domainGuidance.length ? "attention" : "neutral"}><p className="onco-report-card-label">Domínios prioritários</p><h3>{domainGuidance.length || "Nenhum"}</h3><p>{domainGuidance.length ? domainGuidance.map((item) => item.label).join(" · ") : "Sem alteração registrada"}</p></article>
        </div>
      </section>

      <section className="onco-report-section"><div className="onco-report-section-heading"><span>1</span><h2>Contexto oncológico</h2></div><p><strong>Diagnóstico:</strong> {episode.diagnosis}{episode.primarySite ? ` · sítio: ${episode.primarySite}` : ""}{episode.histology ? ` · histologia: ${episode.histology}` : ""}{episode.stage ? ` · estágio: ${episode.stage}` : ""}{episode.diseaseStatus ? ` · situação: ${episode.diseaseStatus}` : ""}</p><p><strong>Tratamento:</strong> {currentCourse ? `${currentCourse.regimenName} · ${oncogeriatricModalityLabel(currentCourse.modality)} · intenção ${oncogeriatricIntentLabel(currentCourse.intent)} · ${currentCourse.therapyLine ?? "linha não registrada"} · ${oncogeriatricCourseStatusLabel(currentCourse.status)}` : "Tratamento não registrado"}</p><p><strong>Última avaliação:</strong> {latestCheckpoint ? `${oncogeriatricCheckpointTypeLabel(latestCheckpoint.type)} · ${formatClinicalDate(latestCheckpoint.occurredAt)}${latestCheckpoint.cycleNumber ? ` · ciclo ${latestCheckpoint.cycleNumber}` : ""}` : "Não registrada"}</p></section>

      <section className="onco-report-section onco-report-two-columns"><article><div className="onco-report-section-heading"><span>2</span><h2>Triagem G8</h2></div><p>{g8 ? `${g8.scoreText ?? "sem escore"} · ${g8.classification ?? "sem classificação"}` : "Não avaliado"}</p><p className="onco-report-muted">Instrumento de rastreio geriátrico; não determina conduta oncológica isoladamente.</p></article><article className="onco-report-carg-card" data-source={carg?.source ?? "none"}><div className="onco-report-section-heading"><span>3</span><h2>CARG</h2></div>{carg ? <><p className="onco-report-carg-status">{carg.sourceLabel}</p><div className="onco-report-carg-result"><strong>{carg.scoreText ?? "Resultado pendente"}</strong><span>{carg.categoryLabel ?? "Sem classificação"}</span></div>{carg.observedGradeThreeToFiveToxicityPercent ? <p><strong>Frequência observada na coorte:</strong> {carg.observedGradeThreeToFiveToxicityPercent}% de toxicidade grau 3 a 5.</p> : null}{carg.interpretation ? <p className="onco-report-muted">{carg.interpretation}</p> : null}{carg.populationNote ? <p className="onco-report-muted"><strong>População:</strong> {carg.populationNote}</p> : null}{carg.pendingLabels.length ? <p><strong>Fatores pendentes:</strong> {carg.pendingLabels.join(" · ")}</p> : null}{carg.attentionFactors.length ? <div className="onco-report-factor-list"><strong>Fatores CARG pontuados — revisar com maior atenção</strong><ul>{carg.attentionFactors.map((item) => <li key={item.label}>{item.label} <strong>(+{item.points})</strong></li>)}</ul></div> : null}<p className="onco-report-clinician-note"><strong>Orientação ao oncologista:</strong> {carg.clinicianGuidance.replace(/^Orientação ao oncologista:\s*/i, "")}</p></> : <p>Não avaliado.</p>}<p className="onco-report-muted">O cálculo é local e versionado. As frequências de 30%, 52% e 83% descrevem grupos do estudo, não risco individual. O CARG não determina dose, esquema, intervalo, adiamento ou suspensão.</p></article></section>

      <section className="onco-report-section"><div className="onco-report-section-heading"><span>4</span><h2>Trajetória geriátrica — avaliação inicial → avaliação atual</h2></div><OncogeriatricTrajectoryTable history={capacityHistory} /><p className="onco-report-muted">Comparações usam somente versões compatíveis do mesmo instrumento. A significância clínica da mudança permanece sob julgamento médico.</p><CapacityDimensionHistoryChart history={capacityHistory} context="final-report" /></section>

      <section className="onco-report-section"><div className="onco-report-section-heading"><span>5</span><h2>Vulnerabilidades e recomendações geriátricas</h2></div><h3>Domínios avaliados que requerem maior atenção</h3>{domainGuidance.length ? <div className="onco-report-guidance-grid">{domainGuidance.map((item) => <article className="onco-report-guidance-card" key={item.code}><p className="onco-report-eyebrow">{item.stateLabel}</p><h3>{item.label}</h3><p><strong>Base registrada:</strong> {item.triggeredBy.join(" · ")}</p><ul>{item.actions.map((action) => <li key={action}>{action}</li>)}</ul>{item.attentionSigns.map((sign) => <p key={sign}><strong>Sinal de atenção:</strong> {sign}</p>)}<p className="onco-report-muted">Sugestão educativa sujeita à revisão clínica. Fontes: {item.evidenceReferences.map((source, index) => <span key={source.pmid}>{index ? "; " : ""}<a href={source.url}>PubMed {source.pmid}</a></span>)}.</p></article>)}</div> : <p>Nenhum domínio alterado, em atenção ou discordante foi identificado nas avaliações vinculadas.</p>}<h3>Condutas profissionais registradas</h3>{activeInterventions.length ? <ol>{activeInterventions.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)}:</strong> {item.description}{item.intervention ? <>&nbsp;— <strong>recomendação:</strong> {item.intervention}</> : ""}{item.responsibleProfessional ? <>&nbsp; · <strong>responsável:</strong> {item.responsibleProfessional}</> : ""}{item.dueAt ? <>&nbsp; · <strong>prazo:</strong> {formatClinicalDate(item.dueAt)}</> : ""}</li>)}</ol> : <p>Sem recomendação geriátrica ativa registrada neste acompanhamento.</p>}{completedInterventions.length ? <><h3>Intervenções concluídas previamente</h3><ul>{completedInterventions.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)}:</strong> {item.intervention ?? item.description}{item.result ? ` · resultado: ${item.result}` : ""}</li>)}</ul></> : null}</section>

      <section className="onco-report-section"><div className="onco-report-section-heading"><span>6</span><h2>Orientações específicas do esquema e dos eventos registrados</h2></div><p><strong>Esquema:</strong> {currentCourse?.regimenName ?? "Não registrado"}</p><p><strong>Riscos relacionados ao tratamento selecionados pelo médico:</strong> {selectedRiskFlags.length ? selectedRiskFlags.join(", ") : "Nenhum risco específico selecionado"}</p>{commonAdverseEffects ? <><p><strong>Efeitos adversos frequentes esperados, confirmados para este esquema:</strong> {commonAdverseEffects}</p>{commonAdverseEffectsSource ? <p><strong>Fonte clínica registrada:</strong> {commonAdverseEffectsSource}</p> : <p><strong>Fonte clínica:</strong> Não registrada.</p>}</> : <p><strong>Efeitos adversos frequentes:</strong> Não registrados para este esquema. O sistema não os infere pelo nome do antineoplásico.</p>}{clinicianRegimenGuidance ? <p><strong>Orientações confirmadas pela equipe oncológica:</strong> {clinicianRegimenGuidance}</p> : <p>Sem orientação específica do esquema confirmada e registrada. O sistema não infere conduta pelo nome do antineoplásico.</p>}<p className="onco-report-muted">Dose, intervalo, adiamento, suspensão ou substituição do tratamento não são gerados automaticamente.</p></section>
      <section className="onco-report-section"><div className="onco-report-section-heading"><span>7</span><h2>Mudanças e sinais de atenção desde a última avaliação</h2></div>{changes.length ? <ul>{changes.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>Sem mudança estruturada registrada.</p>}<p className="onco-report-muted">Os itens acima são fatos registrados para reavaliação clínica; não geram ajuste automático do tratamento antineoplásico.</p></section>
      <section className="onco-report-section"><div className="onco-report-section-heading"><span>8</span><h2>Eventos durante o tratamento</h2></div>{recentEvents.length ? <ul>{recentEvents.map((event) => <li key={event.id}>{formatClinicalDate(event.occurredAt)} · {event.toxicityType}{event.grade ? ` · grau ${event.grade}` : ""}{event.hospitalizationAssociated ? " · hospitalização associada" : ""}{event.cycleDelayAssociated ? " · atraso de ciclo registrado" : ""}{event.treatmentModificationRecorded ? ` · modificação documentada: ${event.treatmentModificationRecorded}` : ""}</li>)}</ul> : <p>Nenhum evento relevante registrado.</p>}</section>
      <section className="onco-report-section"><div className="onco-report-section-heading"><span>9</span><h2>Planejamento e recuperação</h2></div>{plannedFollowUps.length ? <><h3>Próximas avaliações</h3><ul>{plannedFollowUps.map((item) => <li key={item.id}><strong>{oncogeriatricCheckpointTypeLabel(item.type)}:</strong> prevista para {formatClinicalDate(item.scheduledAt)} · {item.consultationId ? "consulta vinculada" : "consulta ainda não vinculada"}</li>)}</ul></> : <p>Sem próxima avaliação planejada.</p>}<h3>Recuperação por domínio</h3>{latestRecoveryByDomain.length ? <ul>{latestRecoveryByDomain.map((item) => <li key={item.id}><strong>{oncogeriatricDomainLabel(item.domain)}:</strong> {oncogeriatricRecoveryStatusLabel(item.status).toLocaleLowerCase("pt-BR")} · {formatClinicalDate(item.assessedAt)}{item.notes ? ` · ${item.notes}` : ""}</li>)}</ul> : <p>Ainda sem avaliação de recuperação registrada.</p>}</section>
      <section className="onco-report-section"><div className="onco-report-section-heading"><span>10</span><h2>Objetivo prioritário informado pelo paciente</h2></div><p>{whatMatters}</p></section>
      <section className="onco-report-section"><div className="onco-report-section-heading"><span>11</span><h2>Integração com a equipe oncológica</h2></div><p>Este relatório organiza vulnerabilidades geriátricas, intervenções e mudanças longitudinais para apoiar a discussão entre geriatria e oncologia. A escolha de esquema, dose, intervalo, adiamento, suspensão ou modificação do tratamento antineoplásico permanece uma decisão clínica humana.</p></section>
      <footer className="onco-report-footer"><p>Documento de apoio à comunicação médica, longitudinal e específico para Oncogeriatria. Deve ser revisado clinicamente antes de compartilhamento.</p></footer>
    </article>
    <div className="no-print"><OncogeriatricStepActions patientId={patientId} episodeId={episode.id} currentStep="relatorio" /></div>
  </main>;
}
