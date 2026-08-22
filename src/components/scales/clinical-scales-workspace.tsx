"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildClinicalScaleOptions,
  groupClinicalScaleOptions,
  type ClinicalScaleOption,
} from "@/domain/clinical-scale-workspace";
import { ECOG_OPTIONS } from "@/domain/oncogeriatric-scales";
import styles from "./clinical-scales-workspace.module.css";

type Choice = { value: number | string; label: string };
type NumericRule = { min: number; max: number; step: number; unit?: string; help?: string };
type CoreQuestion = { id: string; label: string; choices?: readonly Choice[]; number?: NumericRule };
type CoreDefinition = {
  code: string;
  version: string;
  name: string;
  dimension: string;
  instruction: string;
  sourceNote: string;
  questions: readonly CoreQuestion[];
};
type ApplicationGuide = readonly { title: string; items: readonly string[] }[];
type ComplementaryField = { id: string; label: string; choices?: readonly Choice[]; number?: NumericRule };
type ComplementaryDefinition = {
  code: string;
  version: string;
  name: string;
  dimension: string;
  instruction: string;
  applicationGuide?: ApplicationGuide;
  sourceNote: string;
  fields: readonly ComplementaryField[];
};
type CoreView = {
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  definitions: CoreDefinition[];
  licensingRestrictions?: Array<{ code: string; name: string }>;
};
type ComplementaryView = {
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  definitions: ComplementaryDefinition[];
};
type CurrentAssessment = {
  id: string;
  scaleCode: string;
  scaleVersion: string;
  scoreNumeric: number | null;
  scoreText: string | null;
  classification: string | null;
  interpretation: string | null;
  clinicalColor: string | null;
  appliedAt: string;
};
type StatusView = {
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  latest: CurrentAssessment[];
};
type PreviousAssessment = {
  assessmentId: string;
  scaleVersion: string;
  score: number | null;
  appliedAt: string;
  consultationId: string;
} | null;
type OncogeriatricPrefills = { meem: PreviousAssessment; mnaSf: PreviousAssessment; ecog: PreviousAssessment };
type ResultPayload = {
  score?: number | null;
  scoreText?: string;
  classification?: string;
  interpretation?: string;
  classe?: string;
  texto?: string;
  combinedScore?: number;
  combinedCategory?: string;
};

type Answers = Record<string, string>;

const EMPTY_PREFILLS: OncogeriatricPrefills = { meem: null, mnaSf: null, ecog: null };

function asDisplayValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function parseFieldValue(value: string, field: CoreQuestion | ComplementaryField): number | string {
  if (field.choices) {
    const matched = field.choices.find((choice) => String(choice.value) === value);
    if (!matched) throw new Error(`Selecione uma opção válida para ${field.label}.`);
    return matched.value;
  }
  if (field.number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`Informe um valor válido para ${field.label}.`);
    return numeric;
  }
  return value;
}

function resultClassification(result: ResultPayload): string {
  return result.classification ?? result.classe ?? result.combinedCategory ?? "Resultado registrado";
}

function resultInterpretation(result: ResultPayload): string {
  return result.interpretation ?? result.texto ?? "Resultado calculado no servidor e sujeito à revisão clínica.";
}

function fieldInput(
  field: CoreQuestion | ComplementaryField,
  value: string,
  disabled: boolean,
  onChange: (value: string) => void,
) {
  if (field.choices) {
    return (
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Selecione</option>
        {field.choices.map((choice) => <option key={String(choice.value)} value={String(choice.value)}>{choice.label}</option>)}
      </select>
    );
  }
  if (field.number) {
    return (
      <div className={styles.numberRow}>
        <input
          type="number"
          min={field.number.min}
          max={field.number.max}
          step={field.number.step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        {field.number.unit ? <span>{field.number.unit}</span> : null}
      </div>
    );
  }
  return <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />;
}

export function ClinicalScalesWorkspace({ consultationId }: { consultationId: string }) {
  const [coreView, setCoreView] = useState<CoreView | null>(null);
  const [complementaryView, setComplementaryView] = useState<ComplementaryView | null>(null);
  const [statusView, setStatusView] = useState<StatusView | null>(null);
  const [oncogeriatricPrefills, setOncogeriatricPrefills] = useState<OncogeriatricPrefills>(EMPTY_PREFILLS);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [oncogeriatricReadWarning, setOncogeriatricReadWarning] = useState<string | null>(null);

  async function fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { cache: "no-store" });
    const body = await response.json().catch(() => null) as (T & { message?: string }) | null;
    if (!response.ok || !body) throw new Error(body?.message ?? "Não foi possível carregar os dados clínicos.");
    return body;
  }

  async function refreshStatus() {
    const status = await fetchJson<StatusView>(`/api/consultations/${consultationId}/scales/status`);
    setStatusView(status);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFeedback(null);
    Promise.all([
      fetchJson<CoreView>(`/api/consultations/${consultationId}/scales/freitas-core`),
      fetchJson<ComplementaryView>(`/api/consultations/${consultationId}/scales/complementary`),
      fetchJson<StatusView>(`/api/consultations/${consultationId}/scales/status`),
    ])
      .then(([core, complementary, status]) => {
        if (!active) return;
        setCoreView(core);
        setComplementaryView(complementary);
        setStatusView(status);
      })
      .catch((error) => active && setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar as escalas." }))
      .finally(() => active && setLoading(false));

    fetchJson<OncogeriatricPrefills>(`/api/consultations/${consultationId}/scales/oncogeriatrics`)
      .then((prefills) => {
        if (!active) return;
        setOncogeriatricPrefills(prefills);
        setOncogeriatricReadWarning(null);
      })
      .catch(() => active && setOncogeriatricReadWarning("Os dados de pré-preenchimento oncogeriátrico não puderam ser carregados. Os campos permanecem disponíveis para preenchimento manual, conforme sua permissão."));

    return () => { active = false; };
  }, [consultationId]);

  const appliedCodes = useMemo(() => new Set(statusView?.latest.map((item) => item.scaleCode) ?? []), [statusView]);
  const options = useMemo(() => buildClinicalScaleOptions([
    ...(coreView?.definitions ?? []).map((definition) => ({ source: "core" as const, code: definition.code, name: definition.name, dimension: definition.dimension, appliedInCurrentConsultation: appliedCodes.has(definition.code) })),
    ...(complementaryView?.definitions ?? []).map((definition) => ({ source: "complementary" as const, code: definition.code, name: definition.name, dimension: definition.dimension, appliedInCurrentConsultation: appliedCodes.has(definition.code) })),
    ...(coreView?.licensingRestrictions ?? [])
      .filter((restriction) => restriction.code === "isi")
      .map((restriction) => ({
        source: "complementary" as const,
        code: restriction.code,
        name: restriction.name,
        dimension: "sono",
        appliedInCurrentConsultation: appliedCodes.has(restriction.code),
        disabled: true,
        statusNote: "Aguarda licença eletrônica e versão brasileira autorizada.",
      })),
    { source: "oncogeriatric" as const, code: "ecog", name: "ECOG — Estado de Desempenho", dimension: "oncogeriatria", appliedInCurrentConsultation: appliedCodes.has("ecog") },
    { source: "oncogeriatric" as const, code: "crash_mna_sf", name: "CRASH adaptada — MNA-SF", dimension: "oncogeriatria", appliedInCurrentConsultation: appliedCodes.has("crash_mna_sf") },
  ]), [coreView, complementaryView, appliedCodes]);
  const groups = useMemo(() => groupClinicalScaleOptions(options), [options]);
  const selectedOptions = useMemo(() => options.filter((option) => selectedKeys.has(option.key)), [options, selectedKeys]);
  const selectedGroups = useMemo(() => groupClinicalScaleOptions(selectedOptions), [selectedOptions]);
  const activeOption = useMemo(() => options.find((option) => option.key === activeKey) ?? null, [options, activeKey]);
  const currentAssessment = activeOption ? statusView?.latest.find((item) => item.scaleCode === activeOption.code) ?? null : null;
  const finalized = statusView?.consultationStatus === "FINALIZED";

  useEffect(() => {
    if (options.length === 0 || selectedKeys.size > 0) return;
    const applied = options.filter((option) => !option.disabled && option.appliedInCurrentConsultation);
    if (applied.length === 0) return;
    setSelectedKeys(new Set(applied.map((option) => option.key)));
    setActiveKey(applied[0]!.key);
  }, [options, selectedKeys.size]);

  useEffect(() => {
    setResult(null);
    setFeedback(null);
    if (!activeOption) {
      setAnswers({});
      return;
    }
    if (activeOption.code === "ecog") {
      setAnswers({ ecog: asDisplayValue(oncogeriatricPrefills.ecog?.score) });
      return;
    }
    if (activeOption.code === "crash_mna_sf") {
      setAnswers({
        chemotherapyRisk: "",
        diastolicBloodPressure: "",
        iadlScore: "",
        ldh: "",
        ecog: asDisplayValue(oncogeriatricPrefills.ecog?.score),
        mmseScore: asDisplayValue(oncogeriatricPrefills.meem?.score),
        mnaSfScore: asDisplayValue(oncogeriatricPrefills.mnaSf?.score),
      });
      return;
    }
    setAnswers({});
  }, [activeOption?.key, oncogeriatricPrefills]);

  function toggleScale(option: ClinicalScaleOption, checked: boolean) {
    if (option.disabled) return;
    const next = new Set(selectedKeys);
    if (checked) {
      next.add(option.key);
      setActiveKey(option.key);
    } else {
      next.delete(option.key);
      if (activeKey === option.key) {
        const replacement = options.find((candidate) => next.has(candidate.key));
        setActiveKey(replacement?.key ?? null);
      }
    }
    setSelectedKeys(next);
  }

  function setAnswer(id: string, value: string) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setFeedback(null);
  }

  function preparedAnswers(fields: readonly (CoreQuestion | ComplementaryField)[]): Record<string, number | string> {
    const output: Record<string, number | string> = {};
    for (const field of fields) {
      const raw = answers[field.id] ?? "";
      if (raw === "") throw new Error(`Preencha ${field.label} antes de salvar.`);
      output[field.id] = parseFieldValue(raw, field);
    }
    return output;
  }

  async function saveActive() {
    if (!activeOption || activeOption.disabled || saving || finalized) return;
    setSaving(true);
    setFeedback(null);
    try {
      let url = "";
      let body: Record<string, unknown>;
      if (activeOption.source === "core") {
        const definition = coreView?.definitions.find((item) => item.code === activeOption.code);
        if (!definition) throw new Error("Definição da escala indisponível.");
        url = `/api/consultations/${consultationId}/scales/freitas-core`;
        body = { scaleCode: definition.code, answers: preparedAnswers(definition.questions) };
      } else if (activeOption.source === "complementary") {
        const definition = complementaryView?.definitions.find((item) => item.code === activeOption.code);
        if (!definition) throw new Error("Definição da escala indisponível.");
        url = `/api/consultations/${consultationId}/scales/complementary`;
        body = { scaleCode: definition.code, answers: preparedAnswers(definition.fields) };
      } else if (activeOption.code === "ecog") {
        if (!answers.ecog) throw new Error("Selecione o ECOG antes de salvar.");
        url = `/api/consultations/${consultationId}/scales/oncogeriatrics`;
        body = { scaleCode: "ecog", ecog: Number(answers.ecog) };
      } else {
        for (const key of ["chemotherapyRisk", "diastolicBloodPressure", "iadlScore", "ldh", "ecog", "mmseScore", "mnaSfScore"]) {
          if ((answers[key] ?? "") === "") throw new Error("Preencha e confirme todos os campos da CRASH antes de salvar.");
        }
        url = `/api/consultations/${consultationId}/scales/oncogeriatrics`;
        body = {
          scaleCode: "crash_mna_sf",
          chemotherapyRisk: Number(answers.chemotherapyRisk),
          diastolicBloodPressure: Number(answers.diastolicBloodPressure),
          iadlScore: Number(answers.iadlScore),
          ldh: Number(answers.ldh),
          ecog: Number(answers.ecog),
          mmseScore: Number(answers.mmseScore),
          mnaSfScore: Number(answers.mnaSfScore),
        };
      }

      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null) as { result?: ResultPayload; message?: string } | null;
      if (!response.ok || !payload) throw new Error(payload?.message ?? "Não foi possível salvar a avaliação.");
      setResult(payload.result ?? null);
      await refreshStatus();
      setFeedback({ kind: "success", text: "Avaliação salva nesta consulta. O resultado permanece sujeito à revisão médica." });
      window.dispatchEvent(new CustomEvent("clinical-scales-changed", { detail: { consultationId } }));
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar a avaliação." });
    } finally {
      setSaving(false);
    }
  }

  function renderCore(definition: CoreDefinition) {
    return <>
      <p className={styles.instruction}>{definition.instruction}</p>
      <div className={styles.fields}>{definition.questions.map((question) => (
        <label className={styles.field} key={question.id}>{question.label}
          {fieldInput(question, answers[question.id] ?? "", finalized || saving, (value) => setAnswer(question.id, value))}
          {question.number?.help ? <small>{question.number.help}</small> : null}
        </label>
      ))}</div>
      <details className={styles.source}><summary>Fonte e versão clínica</summary><p>{definition.sourceNote}</p><p>Versão: {definition.version}</p></details>
    </>;
  }

  function renderComplementary(definition: ComplementaryDefinition) {
    return <>
      <p className={styles.instruction}>{definition.instruction}</p>
      {definition.applicationGuide?.length ? <details className={styles.guide} open>
        <summary>Como aplicar e interpretar</summary>
        <div className={styles.guideGrid}>{definition.applicationGuide.map((section) => <section key={section.title}><h4>{section.title}</h4><ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div>
      </details> : null}
      <div className={styles.fields}>{definition.fields.map((field) => (
        <label className={styles.field} key={field.id}>{field.label}
          {fieldInput(field, answers[field.id] ?? "", finalized || saving, (value) => setAnswer(field.id, value))}
          {field.number?.help ? <small>{field.number.help}</small> : null}
        </label>
      ))}</div>
      <details className={styles.source}><summary>Fonte e versão clínica</summary><p>{definition.sourceNote}</p><p>Versão: {definition.version}</p></details>
    </>;
  }

  function renderOncogeriatric(option: ClinicalScaleOption) {
    if (option.code === "ecog") {
      return <>
        <p className={styles.instruction}>Selecione o estado de desempenho observado e confirme antes de salvar.</p>
        <div className={styles.optionList}>{ECOG_OPTIONS.map((choice) => <label key={choice.value} className={styles.choiceCard}><input type="radio" name="unified-ecog" value={choice.value} checked={answers.ecog === String(choice.value)} disabled={finalized || saving} onChange={(event) => setAnswer("ecog", event.target.value)} /><strong>{choice.value}</strong><span>{choice.label}</span></label>)}</div>
        <p className={styles.sourceText}>Fonte: Oken et al., 1982; ECOG-ACRIN Performance Status Scale.</p>
      </>;
    }
    return <>
      <div className={styles.caution}><strong>CRASH adaptada — regra local versionada.</strong><span>A substituição pelo MNA-SF exige revisão médica e não deve ser usada isoladamente para decidir tratamento.</span></div>
      {oncogeriatricReadWarning ? <p className={styles.warning}>{oncogeriatricReadWarning}</p> : null}
      <div className={styles.fields}>
        <label className={styles.field}>Risco do esquema (Chemotox)<select value={answers.chemotherapyRisk ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("chemotherapyRisk", event.target.value)}><option value="">Selecione</option><option value="0">0</option><option value="1">1</option><option value="2">2</option></select></label>
        <label className={styles.field}>Pressão diastólica (mmHg)<input type="number" min="1" max="250" value={answers.diastolicBloodPressure ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("diastolicBloodPressure", event.target.value)} /></label>
        <label className={styles.field}>AIVD específica da CRASH (10–29)<input type="number" min="10" max="29" value={answers.iadlScore ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("iadlScore", event.target.value)} /><small>Não substituir pela Lawton 7–21; os instrumentos não são intercambiáveis.</small></label>
        <label className={styles.field}>LDH (U/L)<input type="number" min="0" value={answers.ldh ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("ldh", event.target.value)} /></label>
        <label className={styles.field}>ECOG (0–4)<select value={answers.ecog ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("ecog", event.target.value)}><option value="">Selecione</option>{ECOG_OPTIONS.slice(0, 5).map((choice) => <option value={choice.value} key={choice.value}>{choice.value} — {choice.label}</option>)}</select></label>
        <label className={styles.field}>MEEM (0–30)<input type="number" min="0" max="30" value={answers.mmseScore ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("mmseScore", event.target.value)} /></label>
        <label className={styles.field}>MNA-SF (0–14)<input type="number" min="0" max="14" value={answers.mnaSfScore ?? ""} disabled={finalized || saving} onChange={(event) => setAnswer("mnaSfScore", event.target.value)} /></label>
      </div>
      <p className={styles.sourceText}>Base: Extermann et al., Cancer 2012. A adaptação com MNA-SF permanece identificada como regra local sujeita à revisão médica.</p>
    </>;
  }

  if (loading) return <section className={styles.card}><p>Carregando escalas clínicas…</p></section>;
  if (!coreView || !complementaryView || !statusView) return <section className={styles.card}><p role="alert">{feedback?.text ?? "Escalas clínicas indisponíveis."}</p></section>;

  const activeCore = activeOption?.source === "core" ? coreView.definitions.find((item) => item.code === activeOption.code) : null;
  const activeComplementary = activeOption?.source === "complementary" ? complementaryView.definitions.find((item) => item.code === activeOption.code) : null;

  return <section className={styles.card} aria-labelledby="clinical-scales-title">
    <div className={styles.heading}><div><p className="eyebrow">Avaliação geriátrica</p><h2 id="clinical-scales-title">Escalas clínicas</h2><p>Selecione por domínio as escalas que deseja aplicar. É possível marcar várias e alternar entre elas sem sair da consulta.</p></div><span className={styles.count}>{appliedCodes.size} aplicada(s) nesta consulta</span></div>
    {coreView.licensingRestrictions?.length ? <p className={styles.licenseNotice}>Alguns instrumentos eletrônicos permanecem indisponíveis até confirmação da licença aplicável; registros rápidos permitidos continuam disponíveis quando previstos.</p> : null}
    {finalized ? <p className={styles.locked}>Consulta finalizada: resultados e histórico permanecem visíveis, sem nova aplicação.</p> : null}

    <div className={styles.domainGrid}>
      {groups.map((group) => <fieldset className={styles.domainBox} key={group.domain}><legend>{group.domain}</legend>{group.options.map((option) => <label className={styles.checkRow} key={option.key}><input type="checkbox" checked={selectedKeys.has(option.key)} disabled={option.disabled} onChange={(event) => toggleScale(option, event.target.checked)} /><span>{option.name}{option.statusNote ? ` — ${option.statusNote}` : ""}</span>{option.appliedInCurrentConsultation ? <strong>Aplicada</strong> : null}</label>)}</fieldset>)}
    </div>

    {selectedGroups.length ? <div className={styles.selectedBar} aria-label="Escalas selecionadas agrupadas por domínio">
      <span className={styles.selectedHeading}>Em preenchimento nesta consulta:</span>
      <div className={styles.selectedDomainList}>
        {selectedGroups.map((group) => <section className={styles.selectedDomain} key={group.domain} aria-label={group.domain}>
          <strong>{group.domain}</strong>
          <div className={styles.selectedChips}>
            {group.options.map((option) => <button type="button" key={option.key} className={activeKey === option.key ? styles.activeTab : ""} aria-pressed={activeKey === option.key} onClick={() => setActiveKey(option.key)}>{option.name}{option.appliedInCurrentConsultation ? " ✓" : ""}</button>)}
          </div>
        </section>)}
      </div>
    </div> : <p className={styles.empty}>Marque uma ou mais escalas acima para abrir o preenchimento aqui.</p>}

    {activeOption ? <article className={styles.workspace}>
      <header className={styles.workspaceHeader}><div><span>{activeOption.domain}</span><h3>{activeOption.name}</h3></div>{currentAssessment ? <div className={styles.appliedBadge}><strong>Aplicada nesta consulta</strong><span>{currentAssessment.scoreText ?? currentAssessment.scoreNumeric ?? "resultado registrado"}</span></div> : null}</header>
      {activeCore ? renderCore(activeCore) : activeComplementary ? renderComplementary(activeComplementary) : renderOncogeriatric(activeOption)}
      {currentAssessment ? <div className={styles.previous}><strong>Último registro desta consulta</strong><span>{currentAssessment.classification ?? "Sem classificação automática"}</span>{currentAssessment.interpretation ? <p>{currentAssessment.interpretation}</p> : null}</div> : null}
      {result ? <div className={styles.result} role="status"><span>Resultado calculado no servidor</span><strong>{result.scoreText ?? (result.combinedScore !== undefined ? String(result.combinedScore) : "Resultado registrado")}</strong><b>{resultClassification(result)}</b><p>{resultInterpretation(result)}</p></div> : null}
      {feedback ? <p className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      <div className={styles.actions}><span>Nenhum resultado cria diagnóstico ou conduta automaticamente.</span><button type="button" disabled={saving || finalized} onClick={saveActive}>{saving ? "Salvando…" : "Salvar avaliação"}</button></div>
    </article> : null}
  </section>;
}
