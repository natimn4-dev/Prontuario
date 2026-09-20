"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AGE_BANDS,
  BIOMARKER_RESULTS,
  CLOCK_RESULTS,
  COGNITIVE_COURSES,
  COGNITIVE_PROFILES,
  COMPLAINT_SOURCES,
  COURSE_LABELS,
  DATSCAN_RESULTS,
  FUNCTIONAL_ATTRIBUTIONS,
  FUNCTIONAL_IMPACTS,
  FUNCTIONAL_IMPACT_LABELS,
  IMAGING_LEVELS,
  IMAGING_MODALITIES,
  LAB_CODES,
  LAB_LABELS,
  LAB_STATUSES,
  LAB_STATUS_LABELS,
  PROFILE_LABELS,
  TRI_STATE_LABELS,
  TRI_STATE_VALUES,
  buildDementiaReportDraft,
  emptyDementiaAssessmentDraft,
  interpretDementiaAssessment,
  type DementiaAssessmentDraft,
  type DementiaAssessmentRecordView,
  type DementiaAssessmentWorkspaceView,
  type DementiaEtiology,
  type TriState,
} from "@/domain/dementia-assessment";
import styles from "./dementia-assessment-workspace.module.css";

const STEPS = [
  { id: "seguranca", label: "Segurança", hint: "Condições agudas" },
  { id: "historia", label: "História e função", hint: "Síndrome clínica" },
  { id: "rastreio", label: "Rastreio", hint: "Escalas e exame" },
  { id: "exames", label: "Exames iniciais", hint: "Laboratório e imagem" },
  { id: "biomarcadores", label: "Biomarcadores", hint: "Somente se indicados" },
  { id: "integracao", label: "Integração", hint: "Hipóteses probabilísticas" },
  { id: "relatorio", label: "Relatório", hint: "Edição e revisão" },
] as const;

type StepId = (typeof STEPS)[number]["id"];
type RequestError = { code?: string; message?: string };

const COMPLAINT_LABELS = {
  PATIENT: "Paciente",
  INFORMANT: "Familiar ou informante",
  CLINICIAN: "Observação clínica",
} as const;

const AGE_LABELS = {
  UNDER_65: "Menos de 65 anos",
  "65_TO_79": "65 a 79 anos",
  "80_TO_84": "80 a 84 anos",
  "85_OR_MORE": "85 anos ou mais",
  NOT_RECORDED: "Não registrado",
} as const;

const FUNCTIONAL_ATTRIBUTION_LABELS = {
  NOT_ASSESSED: "Não avaliado",
  COGNITIVE: "Predominantemente cognitiva",
  MIXED: "Multifatorial ou mista",
  NON_COGNITIVE: "Predominantemente não cognitiva",
} as const;

const CLOCK_LABELS = {
  NOT_APPLIED: "Não aplicado nesta consulta",
  WITHOUT_RELEVANT_CHANGE: "Sem alteração relevante registrada",
  ALTERED: "Alterado",
  UNINTERPRETABLE: "Não interpretável",
} as const;

const IMAGING_MODALITY_LABELS = {
  NOT_PERFORMED: "Não realizada ou não disponível",
  MRI: "Ressonância magnética",
  CT: "Tomografia computadorizada",
} as const;

const IMAGING_LEVEL_LABELS = {
  NOT_ASSESSED: "Não avaliado",
  ABSENT: "Ausente",
  MILD: "Leve",
  MODERATE: "Moderado",
  MARKED: "Acentuado",
} as const;

const BIOMARKER_LABELS = {
  NOT_PERFORMED: "Não realizado",
  INDETERMINATE: "Indeterminado",
  NEGATIVE: "Negativo",
  POSITIVE: "Positivo",
} as const;

const DATSCAN_LABELS = {
  NOT_PERFORMED: "Não realizado",
  INDETERMINATE: "Indeterminado",
  NORMAL: "Captação preservada",
  REDUCED: "Captação dopaminérgica reduzida",
} as const;

const SUPPORT_LABELS = { LOW: "Apoio baixo", MODERATE: "Apoio moderado", HIGH: "Apoio alto" } as const;
const ETIOLOGY_TONE: Record<DementiaEtiology, string> = {
  ALZHEIMER: "alzheimer",
  LEWY_BODY: "lewy",
  VASCULAR: "vascular",
  LATE: "late",
};

function draftFromRecord(record?: DementiaAssessmentRecordView): DementiaAssessmentDraft {
  if (!record) return emptyDementiaAssessmentDraft();
  return {
    safety: { ...record.safety },
    clinical: { ...record.clinical, complaintSources: [...record.clinical.complaintSources] },
    keyFeatures: { ...record.keyFeatures },
    labs: { ...record.labs },
    imaging: { ...record.imaging },
    biomarkers: { ...record.biomarkers },
    neuropsychologySummary: record.neuropsychologySummary,
    clinicianSyndrome: record.clinicianSyndrome,
    clinicianPrimaryHypothesis: record.clinicianPrimaryHypothesis,
    clinicianDifferentials: record.clinicianDifferentials,
    reportText: record.reportText,
    clinicianReviewed: record.clinicianReviewed,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as RequestError;
  return body.message || fallback;
}

function TriStateSelect({ label, value, onChange, disabled, hint }: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
  disabled: boolean;
  hint?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as TriState)} disabled={disabled}>
        {TRI_STATE_VALUES.map((option) => <option value={option} key={option}>{TRI_STATE_LABELS[option]}</option>)}
      </select>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function DementiaAssessmentWorkspace({ consultationId, onDirtyChange }: { consultationId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [workspace, setWorkspace] = useState<DementiaAssessmentWorkspaceView>();
  const [draft, setDraft] = useState<DementiaAssessmentDraft>(() => emptyDementiaAssessmentDraft());
  const [activeStep, setActiveStep] = useState<StepId>("seguranca");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const load = useCallback(async () => {
    setError(undefined);
    const response = await fetch(`/api/consultations/${consultationId}/dementia-assessment`, { cache: "no-store" });
    if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível carregar a avaliação cognitiva."));
    const next = await response.json() as DementiaAssessmentWorkspaceView;
    const nextDraft = draftFromRecord(next.current);
    if (!nextDraft.reportText) nextDraft.reportText = buildDementiaReportDraft(nextDraft, undefined, next.currentCognitiveScales);
    setWorkspace(next);
    setDraft(nextDraft);
    setDirty(false);
  }, [consultationId]);

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar a avaliação cognitiva."))
      .finally(() => setLoading(false));
  }, [load]);

  const interpretation = useMemo(() => interpretDementiaAssessment(draft), [draft]);
  const finalized = workspace?.consultationStatus === "FINALIZED";
  const disabled = saving || Boolean(finalized);
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);

  function change(next: DementiaAssessmentDraft) {
    setDraft(next);
    setDirty(true);
    setMessage(undefined);
  }

  function patch<K extends keyof DementiaAssessmentDraft>(key: K, value: DementiaAssessmentDraft[K]) {
    change({ ...draft, [key]: value, clinicianReviewed: key === "clinicianReviewed" ? value as boolean : false });
  }

  function selectStep(step: StepId) {
    setActiveStep(step);
    document.getElementById("dementia-workspace-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save() {
    if (!workspace) return;
    setSaving(true); setError(undefined); setMessage(undefined);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/dementia-assessment`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": crypto.randomUUID() },
        body: JSON.stringify({ expectedLatestVersion: workspace.latestVersion, ...draft }),
      });
      if (!response.ok) {
        const detail = await responseMessage(response, "Não foi possível salvar a avaliação.");
        if (response.status === 409) await load();
        throw new Error(detail);
      }
      const next = await response.json() as DementiaAssessmentWorkspaceView;
      setWorkspace(next); setDraft(draftFromRecord(next.current)); setDirty(false);
      setMessage(`Versão clínica ${next.latestVersion} registrada. O histórico anterior foi preservado.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a avaliação.");
    } finally { setSaving(false); }
  }

  async function generateReportSnapshot() {
    if (!workspace || dirty) return;
    setGenerating(true); setError(undefined); setMessage(undefined);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/reports/dementia`, {
        method: "POST",
        headers: { "x-request-id": crypto.randomUUID() },
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível gerar o relatório."));
      const result = await response.json() as { version: number; reportHref: string };
      setWorkspace((current) => current ? { ...current, latestReportSnapshotVersion: result.version } : current);
      setMessage(`Relatório versionado ${result.version} gerado após revisão clínica.`);
      window.open(result.reportHref, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o relatório.");
    } finally { setGenerating(false); }
  }

  function nextStep(delta: number) {
    const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, activeIndex + delta))];
    if (next) selectStep(next.id);
  }

  if (loading) return <div className={styles.loading} role="status">Carregando fluxo cognitivo…</div>;

  return (
    <div className={styles.workspace} id="dementia-workspace-top">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Cognição e diagnóstico diferencial</p>
          <h3>Investigação de declínio cognitivo</h3>
          <p>Preenchimento progressivo com integração clínica, etiologias mistas e decisão médica final.</p>
        </div>
        <span className={styles.version}>Versão clínica {workspace?.latestVersion ?? 0}</span>
      </header>

      <aside className={styles.safetyNote}>
        <strong>Apoio à decisão, não diagnóstico automático</strong>
        <span>O sistema organiza achados favoráveis, limitações e lacunas. A hipótese e o plano permanecem sob responsabilidade médica.</span>
      </aside>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}

      <nav className={styles.stepNav} aria-label="Etapas da investigação cognitiva">
        {STEPS.map((step, index) => (
          <button key={step.id} type="button" onClick={() => selectStep(step.id)} className={activeStep === step.id ? styles.activeStep : undefined} aria-current={activeStep === step.id ? "step" : undefined}>
            <span>{index + 1}</span><strong>{step.label}</strong><small>{step.hint}</small>
          </button>
        ))}
      </nav>

      <div className={styles.progress} aria-label={`Etapa ${activeIndex + 1} de ${STEPS.length}`}><span style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }} /></div>

      {activeStep === "seguranca" ? (
        <section className={styles.section} aria-labelledby="dementia-safety-title">
          <div className={styles.sectionHeading}><div><p>Etapa 1</p><h4 id="dementia-safety-title">Segurança antes do rastreio</h4></div><span>Resposta “sim” pode mudar a prioridade do atendimento.</span></div>
          <div className={styles.twoColumns}>
            <TriStateSelect label="Instalação aguda da alteração cognitiva" value={draft.safety.acuteOnset} onChange={(value) => patch("safety", { ...draft.safety, acuteOnset: value })} disabled={disabled} />
            <TriStateSelect label="Flutuação aguda do estado mental" value={draft.safety.acuteFluctuation} onChange={(value) => patch("safety", { ...draft.safety, acuteFluctuation: value })} disabled={disabled} />
            <TriStateSelect label="Déficit neurológico focal novo" value={draft.safety.newFocalDeficit} onChange={(value) => patch("safety", { ...draft.safety, newFocalDeficit: value })} disabled={disabled} />
            <TriStateSelect label="Declínio em semanas ou poucos meses" value={draft.safety.rapidlyProgressive} onChange={(value) => patch("safety", { ...draft.safety, rapidlyProgressive: value })} disabled={disabled} />
          </div>
          <div className={`${styles.pathway} ${styles[interpretation.pathway.toLowerCase()]}`} role={interpretation.pathway.startsWith("URGENT") ? "alert" : "status"}>
            <strong>{interpretation.pathwayLabel}</strong>
            {interpretation.alerts.slice(0, 1).map((alert) => <p key={alert}>{alert}</p>)}
          </div>
        </section>
      ) : null}

      {activeStep === "historia" ? (
        <section className={styles.section} aria-labelledby="dementia-history-title">
          <div className={styles.sectionHeading}><div><p>Etapa 2</p><h4 id="dementia-history-title">História, perfil e impacto funcional</h4></div><span>Use paciente e informante sempre que possível.</span></div>
          <fieldset className={styles.subsection} disabled={disabled}>
            <legend>Origem da queixa</legend>
            <div className={styles.checkGrid}>
              {COMPLAINT_SOURCES.map((source) => <label key={source}><input type="checkbox" checked={draft.clinical.complaintSources.includes(source)} onChange={(event) => patch("clinical", { ...draft.clinical, complaintSources: event.target.checked ? [...draft.clinical.complaintSources, source] : draft.clinical.complaintSources.filter((item) => item !== source) })} /><span>{COMPLAINT_LABELS[source]}</span></label>)}
            </div>
          </fieldset>
          <div className={styles.twoColumns}>
            <label className={styles.field}>Resumo da queixa<textarea rows={4} maxLength={4000} value={draft.clinical.complaintSummary ?? ""} onChange={(event) => patch("clinical", { ...draft.clinical, complaintSummary: event.target.value })} disabled={disabled} /></label>
            <label className={styles.field}>Início e progressão<textarea rows={4} maxLength={4000} value={draft.clinical.onsetAndProgression ?? ""} onChange={(event) => patch("clinical", { ...draft.clinical, onsetAndProgression: event.target.value })} disabled={disabled} /></label>
            <label className={styles.field}>Curso<select value={draft.clinical.course} onChange={(event) => patch("clinical", { ...draft.clinical, course: event.target.value as DementiaAssessmentDraft["clinical"]["course"] })} disabled={disabled}>{COGNITIVE_COURSES.map((item) => <option key={item} value={item}>{COURSE_LABELS[item]}</option>)}</select></label>
            <label className={styles.field}>Perfil cognitivo predominante<select value={draft.clinical.profile} onChange={(event) => patch("clinical", { ...draft.clinical, profile: event.target.value as DementiaAssessmentDraft["clinical"]["profile"] })} disabled={disabled}>{COGNITIVE_PROFILES.map((item) => <option key={item} value={item}>{PROFILE_LABELS[item]}</option>)}</select></label>
            <label className={styles.field}>Faixa etária<select value={draft.clinical.ageBand} onChange={(event) => patch("clinical", { ...draft.clinical, ageBand: event.target.value as DementiaAssessmentDraft["clinical"]["ageBand"] })} disabled={disabled}>{AGE_BANDS.map((item) => <option key={item} value={item}>{AGE_LABELS[item]}</option>)}</select></label>
            <label className={styles.field}>Impacto funcional<select value={draft.clinical.functionalImpact} onChange={(event) => patch("clinical", { ...draft.clinical, functionalImpact: event.target.value as DementiaAssessmentDraft["clinical"]["functionalImpact"] })} disabled={disabled}>{FUNCTIONAL_IMPACTS.map((item) => <option key={item} value={item}>{FUNCTIONAL_IMPACT_LABELS[item]}</option>)}</select></label>
            <label className={styles.field}>Atribuição da perda funcional<select value={draft.clinical.functionalAttribution} onChange={(event) => patch("clinical", { ...draft.clinical, functionalAttribution: event.target.value as DementiaAssessmentDraft["clinical"]["functionalAttribution"] })} disabled={disabled}>{FUNCTIONAL_ATTRIBUTIONS.map((item) => <option key={item} value={item}>{FUNCTIONAL_ATTRIBUTION_LABELS[item]}</option>)}</select><small>Diferencie cognição de limitações motoras, sensoriais, ambientais ou sociais.</small></label>
          </div>
        </section>
      ) : null}

      {activeStep === "rastreio" ? (
        <section className={styles.section} aria-labelledby="dementia-screen-title">
          <div className={styles.sectionHeading}><div><p>Etapa 3</p><h4 id="dementia-screen-title">Rastreio e características-chave</h4></div><span>Os testes apoiam a síndrome; não definem etiologia isoladamente.</span></div>
          <div className={styles.scaleBand}>
            <div><strong>MEEM e MoCA vinculados à consulta</strong><p>Os resultados são reutilizados da área de escalas para evitar dois registros divergentes.</p></div>
            <a href="#escalas">Abrir escalas clínicas</a>
          </div>
          {workspace?.currentCognitiveScales.length ? <ul className={styles.scaleResults}>{workspace.currentCognitiveScales.map((scale) => <li key={scale.scaleCode}><strong>{scale.name}</strong><span>{scale.scoreText ?? scale.score ?? "Resultado registrado"}</span><small>{scale.classification ?? "Sem classificação registrada"}</small></li>)}</ul> : <p className={styles.empty}>MEEM e MoCA não foram registrados nesta consulta.</p>}
          <div className={styles.twoColumns}>
            <label className={styles.field}>Teste do Relógio<select value={draft.clinical.clockResult} onChange={(event) => patch("clinical", { ...draft.clinical, clockResult: event.target.value as DementiaAssessmentDraft["clinical"]["clockResult"] })} disabled={disabled}>{CLOCK_RESULTS.map((item) => <option key={item} value={item}>{CLOCK_LABELS[item]}</option>)}</select></label>
            <TriStateSelect label="Flutuações cognitivas persistentes" value={draft.keyFeatures.cognitiveFluctuations} onChange={(value) => patch("keyFeatures", { ...draft.keyFeatures, cognitiveFluctuations: value })} disabled={disabled} hint="Diferencie flutuação crônica característica de DCL de mudança aguda sugestiva de delirium." />
            <TriStateSelect label="Alucinações visuais recorrentes" value={draft.keyFeatures.visualHallucinations} onChange={(value) => patch("keyFeatures", { ...draft.keyFeatures, visualHallucinations: value })} disabled={disabled} />
            <TriStateSelect label="Parkinsonismo espontâneo" value={draft.keyFeatures.spontaneousParkinsonism} onChange={(value) => patch("keyFeatures", { ...draft.keyFeatures, spontaneousParkinsonism: value })} disabled={disabled} />
            <TriStateSelect label="Transtorno comportamental do sono REM" value={draft.keyFeatures.remSleepBehavior} onChange={(value) => patch("keyFeatures", { ...draft.keyFeatures, remSleepBehavior: value })} disabled={disabled} />
            <TriStateSelect label="AVC prévio" value={draft.keyFeatures.previousStroke} onChange={(value) => patch("keyFeatures", { ...draft.keyFeatures, previousStroke: value })} disabled={disabled} />
            <TriStateSelect label="Fatores de risco vascular relevantes" value={draft.keyFeatures.vascularRisk} onChange={(value) => patch("keyFeatures", { ...draft.keyFeatures, vascularRisk: value })} disabled={disabled} />
            <TriStateSelect label="Medicação potencialmente contribuidora" value={draft.clinical.medicationConcern} onChange={(value) => patch("clinical", { ...draft.clinical, medicationConcern: value })} disabled={disabled} />
            <TriStateSelect label="Álcool ou outra substância como possível contribuinte" value={draft.clinical.alcoholOrSubstanceConcern} onChange={(value) => patch("clinical", { ...draft.clinical, alcoholOrSubstanceConcern: value })} disabled={disabled} />
            <TriStateSelect label="Humor, sono, audição ou visão podem modificar o desempenho" value={draft.clinical.moodSleepSensoryConcern} onChange={(value) => patch("clinical", { ...draft.clinical, moodSleepSensoryConcern: value })} disabled={disabled} />
          </div>
          <label className={styles.field}>Resumo da avaliação neuropsicológica, quando realizada<textarea rows={5} maxLength={6000} value={draft.neuropsychologySummary ?? ""} onChange={(event) => patch("neuropsychologySummary", event.target.value)} disabled={disabled} /></label>
        </section>
      ) : null}

      {activeStep === "exames" ? (
        <section className={styles.section} aria-labelledby="dementia-exams-title">
          <div className={styles.sectionHeading}><div><p>Etapa 4</p><h4 id="dementia-exams-title">Exames iniciais e neuroimagem estrutural</h4></div><span>Exames condicionais devem ter indicação clínica.</span></div>
          <div className={styles.labGrid}>
            {LAB_CODES.map((code) => <label className={styles.field} key={code}><span>{LAB_LABELS[code]}</span><select value={draft.labs[code]} onChange={(event) => patch("labs", { ...draft.labs, [code]: event.target.value as DementiaAssessmentDraft["labs"][typeof code] })} disabled={disabled}>{LAB_STATUSES.map((item) => <option key={item} value={item}>{LAB_STATUS_LABELS[item]}</option>)}</select></label>)}
          </div>
          <div className={styles.subsectionTitle}><h5>Neuroimagem</h5><p>RM é preferível quando disponível; TC é alternativa. Registre a coerência clínico-radiológica.</p></div>
          <div className={styles.twoColumns}>
            <label className={styles.field}>Modalidade<select value={draft.imaging.modality} onChange={(event) => patch("imaging", { ...draft.imaging, modality: event.target.value as DementiaAssessmentDraft["imaging"]["modality"] })} disabled={disabled}>{IMAGING_MODALITIES.map((item) => <option key={item} value={item}>{IMAGING_MODALITY_LABELS[item]}</option>)}</select></label>
            {([
              ["medialTemporalAtrophy", "Atrofia temporal medial"],
              ["temporoparietalAtrophy", "Atrofia têmporo-parietal"],
              ["hippocampalDisproportion", "Atrofia hipocampal desproporcional"],
              ["vascularBurden", "Carga de doença vascular"],
            ] as const).map(([key, label]) => <label className={styles.field} key={key}><span>{label}</span><select value={draft.imaging[key]} onChange={(event) => patch("imaging", { ...draft.imaging, [key]: event.target.value as DementiaAssessmentDraft["imaging"][typeof key] })} disabled={disabled}>{IMAGING_LEVELS.map((item) => <option key={item} value={item}>{IMAGING_LEVEL_LABELS[item]}</option>)}</select></label>)}
            <TriStateSelect label="Infarto estratégico ou múltiplos infartos" value={draft.imaging.strategicInfarcts} onChange={(value) => patch("imaging", { ...draft.imaging, strategicInfarcts: value })} disabled={disabled} />
            <TriStateSelect label="Microssangramentos" value={draft.imaging.microbleeds} onChange={(value) => patch("imaging", { ...draft.imaging, microbleeds: value })} disabled={disabled} />
          </div>
          <label className={styles.field}>Outros achados ou interpretação do laudo<textarea rows={4} maxLength={4000} value={draft.imaging.otherFinding ?? ""} onChange={(event) => patch("imaging", { ...draft.imaging, otherFinding: event.target.value })} disabled={disabled} /></label>
        </section>
      ) : null}

      {activeStep === "biomarcadores" ? (
        <section className={styles.section} aria-labelledby="dementia-biomarkers-title">
          <div className={styles.sectionHeading}><div><p>Etapa 5</p><h4 id="dementia-biomarkers-title">Biomarcadores e imagem funcional</h4></div><span>Use quando o resultado puder mudar diagnóstico, prognóstico ou tratamento.</span></div>
          <p className={styles.contextNote}>Apresentação atípica, início pré-senil, dúvida etiológica relevante ou avaliação para terapia-alvo são contextos usuais. Confirme validação analítica e disponibilidade regulatória local.</p>
          <div className={styles.twoColumns}>
            {([[
              "amyloid", "Amiloide por PET, LCR ou teste plasmático validado"
            ], ["tau", "Tau por LCR, PET ou teste validado"], ["csfAdProfile", "Perfil liquórico compatível com Alzheimer"]] as const).map(([key, label]) => <label className={styles.field} key={key}><span>{label}</span><select value={draft.biomarkers[key]} onChange={(event) => patch("biomarkers", { ...draft.biomarkers, [key]: event.target.value as DementiaAssessmentDraft["biomarkers"][typeof key] })} disabled={disabled}>{BIOMARKER_RESULTS.map((item) => <option key={item} value={item}>{BIOMARKER_LABELS[item]}</option>)}</select></label>)}
            <label className={styles.field}>DAT-SPECT<select value={draft.biomarkers.datScan} onChange={(event) => patch("biomarkers", { ...draft.biomarkers, datScan: event.target.value as DementiaAssessmentDraft["biomarkers"]["datScan"] })} disabled={disabled}>{DATSCAN_RESULTS.map((item) => <option key={item} value={item}>{DATSCAN_LABELS[item]}</option>)}</select></label>
            <label className={styles.field}>Resumo do FDG-PET<textarea rows={4} maxLength={4000} value={draft.biomarkers.fdgPetSummary ?? ""} onChange={(event) => patch("biomarkers", { ...draft.biomarkers, fdgPetSummary: event.target.value })} disabled={disabled} /></label>
            <label className={styles.field}>Outro biomarcador ou ressalva<textarea rows={4} maxLength={4000} value={draft.biomarkers.otherBiomarker ?? ""} onChange={(event) => patch("biomarkers", { ...draft.biomarkers, otherBiomarker: event.target.value })} disabled={disabled} /></label>
          </div>
        </section>
      ) : null}

      {activeStep === "integracao" ? (
        <section className={styles.section} aria-labelledby="dementia-integration-title">
          <div className={styles.sectionHeading}><div><p>Etapa 6</p><h4 id="dementia-integration-title">Integração diagnóstica</h4></div><span>Compare evidências favoráveis, limitações e lacunas.</span></div>
          {interpretation.missing.length ? <div className={styles.pending}><strong>Dados ainda pendentes</strong><ul>{interpretation.missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
          <div className={styles.hypothesisList}>
            {interpretation.hypotheses.map((item) => <article key={item.etiology} data-tone={ETIOLOGY_TONE[item.etiology]}><header><h5>{item.label}</h5><span data-support={item.support}>{SUPPORT_LABELS[item.support]}</span></header><div><section><strong>Elementos favoráveis</strong>{item.supporting.length ? <ul>{item.supporting.map((text) => <li key={text}>{text}</li>)}</ul> : <p>Sem elementos suficientes registrados.</p>}</section><section><strong>Limitações e dados contrários</strong>{item.limiting.length ? <ul>{item.limiting.map((text) => <li key={text}>{text}</li>)}</ul> : <p>Nenhuma limitação específica registrada.</p>}</section></div></article>)}
          </div>
          <div className={styles.twoColumns}>
            <label className={styles.field}>Síndrome clínico-funcional definida pelo médico<textarea rows={4} maxLength={4000} value={draft.clinicianSyndrome ?? ""} onChange={(event) => patch("clinicianSyndrome", event.target.value)} disabled={disabled} placeholder="Ex.: comprometimento cognitivo leve amnéstico; transtorno neurocognitivo maior…" /></label>
            <label className={styles.field}>Hipótese etiológica principal definida pelo médico<textarea rows={4} maxLength={4000} value={draft.clinicianPrimaryHypothesis ?? ""} onChange={(event) => patch("clinicianPrimaryHypothesis", event.target.value)} disabled={disabled} /></label>
          </div>
          <label className={styles.field}>Diferenciais e possíveis copatologias<textarea rows={5} maxLength={6000} value={draft.clinicianDifferentials ?? ""} onChange={(event) => patch("clinicianDifferentials", event.target.value)} disabled={disabled} /></label>
          <details className={styles.sources}>
            <summary>Fontes clínicas e limites desta versão</summary>
            <p>Critérios organizados a partir das diretrizes DETeCD-ADRD, critérios biológicos de Alzheimer de 2024, consenso de corpos de Lewy, VASCOG e critérios clínicos de LATE de 2025.</p>
            <ul>
              <li><a href="https://pubmed.ncbi.nlm.nih.gov/38934362/" target="_blank" rel="noreferrer">Critérios revisados de Alzheimer</a></li>
              <li><a href="https://pubmed.ncbi.nlm.nih.gov/28592453/" target="_blank" rel="noreferrer">Consenso de demência com corpos de Lewy</a></li>
              <li><a href="https://pubmed.ncbi.nlm.nih.gov/24632990/" target="_blank" rel="noreferrer">Critérios VASCOG</a></li>
              <li><a href="https://pubmed.ncbi.nlm.nih.gov/39807681/" target="_blank" rel="noreferrer">Critérios clínicos de LATE</a></li>
            </ul>
            <p>Os níveis de apoio organizam os dados preenchidos; não correspondem a probabilidade validada nem substituem julgamento médico.</p>
          </details>
        </section>
      ) : null}

      {activeStep === "relatorio" ? (
        <section className={styles.section} aria-labelledby="dementia-report-title">
          <div className={styles.sectionHeading}><div><p>Etapa 7</p><h4 id="dementia-report-title">Relatório clínico editável</h4></div><span>O texto sugerido deve ser revisado antes de virar documento.</span></div>
          <div className={styles.reportTools}>
            <button type="button" onClick={() => patch("reportText", buildDementiaReportDraft(draft, interpretation, workspace?.currentCognitiveScales ?? []))} disabled={disabled}>Atualizar texto a partir dos dados</button>
            <span>Esta ação substitui o texto atual pelo novo rascunho estruturado.</span>
          </div>
          <label className={styles.field}>Texto do relatório<textarea className={styles.reportEditor} rows={24} maxLength={16000} value={draft.reportText ?? ""} onChange={(event) => patch("reportText", event.target.value)} disabled={disabled} /></label>
          <label className={styles.reviewCheck}><input type="checkbox" checked={draft.clinicianReviewed} onChange={(event) => patch("clinicianReviewed", event.target.checked)} disabled={disabled} /><span><strong>Confirmo que revisei o conteúdo clínico desta versão</strong><small>O documento não será gerado enquanto houver alterações não salvas ou sem esta confirmação.</small></span></label>
          <div className={styles.reportActions}>
            <button type="button" onClick={save} disabled={!workspace || saving || finalized}>{saving ? "Salvando versão…" : "Salvar versão clínica"}</button>
            <button className={styles.primary} type="button" onClick={generateReportSnapshot} disabled={!workspace?.current || dirty || !draft.clinicianReviewed || generating || finalized}>{generating ? "Gerando…" : "Gerar relatório versionado"}</button>
            {workspace?.latestReportSnapshotVersion ? <a href={`/consultations/${consultationId}/dementia-report`} target="_blank" rel="noreferrer">Abrir relatório v{workspace.latestReportSnapshotVersion}</a> : null}
          </div>
        </section>
      ) : null}

      <footer className={styles.workflowFooter}>
        <button type="button" onClick={() => nextStep(-1)} disabled={activeIndex === 0}>← Etapa anterior</button>
        <div><span>Etapa {activeIndex + 1} de {STEPS.length}</span>{dirty ? <strong>Alterações ainda não salvas</strong> : <small>Registro sincronizado</small>}</div>
        {activeIndex < STEPS.length - 1 ? <button className={styles.primary} type="button" onClick={() => nextStep(1)}>Próxima etapa →</button> : <button type="button" onClick={save} disabled={!workspace || saving || finalized}>{saving ? "Salvando…" : "Salvar versão"}</button>}
      </footer>

      <details className={styles.history}>
        <summary>
          <span>Histórico longitudinal preservado</span>
          <strong>{workspace?.history.length ?? 0} registro(s)</strong>
        </summary>
        <div>
          {!workspace?.history.length ? <p className={styles.empty}>Nenhuma avaliação cognitiva registrada até esta consulta.</p> : workspace.history.map((record) => (
            <article key={record.id}>
              <strong>{record.consultationId === consultationId ? `Consulta atual · v${record.version}` : `Consulta anterior · v${record.version}`}</strong>
              <span>{formatDate(record.createdAt)} · {record.recordedByName}</span>
              <p>{record.interpretation.pathwayLabel}</p>
            </article>
          ))}
        </div>
      </details>

    </div>
  );
}
