"use client";

import { useEffect, useMemo, useState } from "react";
import { MEDICATION_MOMENT_LABELS, type MedicationMoment } from "@/domain/medication-plan";
import { buildProfessionalPlanDraft } from "@/domain/professional-plan-draft";
import {
  isExplicitActiveMedication,
  summarizeSoapMedicationProvenance,
} from "@/domain/soap-medication-provenance";
import {
  deriveVaccinationReview,
  GERIATRIC_VACCINE_CHECKLIST,
  type VaccinationReviewStatus,
} from "@/domain/vaccination-prevention";
import {
  renderClinicalExamsText,
  renderCompletedScalesText,
  renderSoapExamsScalesReport,
  type CompletedScaleResult,
} from "@/domain/clinical-copy-report";
import type { ClinicalExamHistoryItem } from "@/domain/consultation-exams";
import { scaleCatalogEntry } from "@/domain/scale-catalog";
import {
  PREVENTIVE_EXAM_ORDER_OPTIONS,
  preventiveExamOrderLabel,
  type PreventiveExamOrder,
} from "@/domain/preventive-exam-orders";
import suggestionStyles from "./professional-plan-suggestion.module.css";
import styles from "./soap-editor.module.css";

type Problem = {
  id: string;
  type: "CLINICAL" | "GERIATRIC";
  status: "ACTIVE" | "STABLE" | "MONITORING" | "RESOLVED";
  title: string;
};

type PlanSuggestion = {
  problemId: string;
  problemTitle: string;
  proposalKey: string;
  actions: string[];
  evidence: Array<{ scaleCode: string; scaleVersion: string; scoreText: string; classification?: string }>;
  sources: Array<{ pmid: string; label: string }>;
  requiresPhysicianReview: true;
};

type NoteView = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  updatedAt: string;
  noteVersion: string;
  legacyAssessmentPresent?: boolean;
  fields: {
    subjective?: string;
    physicalExam?: string;
    vitalSigns?: string;
    anthropometry?: string;
    vaccinationReview?: { status: VaccinationReviewStatus; pendingVaccines?: readonly string[] };
    planByProblem?: Record<string, readonly string[]>;
    preventiveExamOrders?: readonly PreventiveExamOrder[];
  };
  exams: { current: string; history: ClinicalExamHistoryItem[] };
  problems: Problem[];
  planSuggestions: PlanSuggestion[];
};

type MedicationItem = {
  medicationId: string;
  medicationText: string;
  doseInstruction?: string;
  route?: string;
  moments: MedicationMoment[];
  continuous: boolean;
  instructions?: string;
  status: "ACTIVE" | "SUSPENDED" | "FINISHED" | "UNKNOWN";
  statusSource: "explicit-history" | "current-record-only" | "unknown";
};

type MedicationView = { items: MedicationItem[] };
type ScaleStatusItem = {
  scaleCode: string;
  scoreNumeric: number | null;
  scoreText?: string | null;
  classification?: string | null;
  interpretation?: string | null;
  appliedAt: string;
};
type ScaleStatusView = { latest: ScaleStatusItem[] };
type AuxiliaryLoadState = "idle" | "loading" | "ready" | "error";

type Draft = {
  subjective: string;
  physicalExam: string;
  vitalSigns: string;
  anthropometry: string;
  examsText: string;
  vaccinationReviewed: boolean;
  pendingVaccines: string[];
  legacyPendingVaccines: string[];
  planTextByProblem: Record<string, string>;
  preventiveExamOrders: PreventiveExamOrder[];
};

const KNOWN_VACCINE_NAMES = new Set(GERIATRIC_VACCINE_CHECKLIST.map((item) => item.name));

function draftFromView(view: NoteView): Draft {
  const review = view.fields.vaccinationReview;
  const pending = [...(review?.pendingVaccines ?? [])];
  return {
    subjective: view.fields.subjective ?? "",
    physicalExam: view.fields.physicalExam ?? "",
    vitalSigns: view.fields.vitalSigns ?? "",
    anthropometry: view.fields.anthropometry ?? "",
    examsText: view.exams.current,
    vaccinationReviewed: review?.status !== undefined && review.status !== "UNKNOWN",
    pendingVaccines: pending.filter((name) => KNOWN_VACCINE_NAMES.has(name)),
    legacyPendingVaccines: pending.filter((name) => !KNOWN_VACCINE_NAMES.has(name)),
    planTextByProblem: buildProfessionalPlanDraft({
      savedPlanByProblem: view.fields.planByProblem,
      suggestions: view.planSuggestions,
      seedSuggestions: view.consultationStatus !== "FINALIZED",
    }),
    preventiveExamOrders: [...(view.fields.preventiveExamOrders ?? [])],
  };
}

function actionsFromText(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function valueOrMissing(value: string): string {
  return value.trim() || "sem dados registrados";
}

function medicationLine(item: MedicationItem): string {
  const parts = [
    item.medicationText,
    item.doseInstruction,
    item.route,
    item.moments.length ? item.moments.map((moment) => MEDICATION_MOMENT_LABELS[moment]).join(" / ") : undefined,
    item.instructions,
  ].filter(Boolean);
  return `- ${parts.join(" — ")}`;
}

function renderSoap(draft: Draft, problems: Problem[], medications: MedicationItem[]): string {
  const active = problems.filter((problem) => problem.status !== "RESOLVED");
  const activeMedications = medications.filter(isExplicitActiveMedication);
  const lines = [
    "S — SUBJETIVO",
    valueOrMissing(draft.subjective),
    "",
    "O — OBJETIVO",
    `Exame físico: ${valueOrMissing(draft.physicalExam)}`,
    `Sinais vitais: ${valueOrMissing(draft.vitalSigns)}`,
    `Antropometria: ${valueOrMissing(draft.anthropometry)}`,
    "Medicações em uso:",
  ];
  if (activeMedications.length === 0) lines.push("- sem dados registrados");
  else activeMedications.forEach((item) => lines.push(medicationLine(item)));

  lines.push("", "A — AVALIAÇÃO");
  if (active.length === 0) lines.push("sem problemas ativos registrados");
  else active.forEach((problem, index) => lines.push(`${index + 1}. ${problem.title}`));

  lines.push("", "P — PLANO");
  if (draft.preventiveExamOrders.length > 0) {
    lines.push("Solicitações de exames e rastreios:");
    draft.preventiveExamOrders.forEach((order) => lines.push(`- ${preventiveExamOrderLabel(order)}`));
  }
  if (active.length === 0 && draft.preventiveExamOrders.length === 0) lines.push("sem dados registrados");
  else active.forEach((problem, index) => {
    lines.push(`${index + 1}. ${problem.title}`);
    const actions = actionsFromText(draft.planTextByProblem[problem.id] ?? "");
    if (actions.length === 0) lines.push("- sem dados registrados");
    else actions.forEach((action) => lines.push(`- ${action}`));
  });
  return lines.join("\n");
}

function asCompletedScaleResults(results: readonly ScaleStatusItem[]): CompletedScaleResult[] {
  return results.map((result) => ({
    scaleCode: result.scaleCode,
    scaleName: scaleCatalogEntry(result.scaleCode).shortName,
    scoreNumeric: result.scoreNumeric,
    scoreText: result.scoreText ?? undefined,
    classification: result.classification ?? undefined,
    interpretation: result.interpretation ?? undefined,
    appliedAt: result.appliedAt,
  }));
}

export function SoapEditor({ consultationId, onDirtyChange }: { consultationId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [view, setView] = useState<NoteView | null>(null);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [medicationLoadState, setMedicationLoadState] = useState<AuxiliaryLoadState>("idle");
  const [scaleResults, setScaleResults] = useState<ScaleStatusItem[]>([]);
  const [scaleLoadState, setScaleLoadState] = useState<AuxiliaryLoadState>("idle");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function load() {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/note`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (NoteView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar a evolução.");
      setView(body);
      setDraft(draftFromView(body));
      setDirty(false);
      setDismissedSuggestions(new Set());
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar a evolução." });
    } finally {
      setLoading(false);
    }
  }

  async function ensureMedications(): Promise<MedicationItem[] | null> {
    if (medicationLoadState === "ready") return medications;
    setMedicationLoadState("loading");
    try {
      const response = await fetch(`/api/consultations/${consultationId}/medications`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (MedicationView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar as medicações.");
      setMedications(body.items);
      setMedicationLoadState("ready");
      return body.items;
    } catch (error) {
      setMedications([]);
      setMedicationLoadState("error");
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar as medicações." });
      return null;
    }
  }

  async function ensureScaleResults(): Promise<ScaleStatusItem[] | null> {
    if (scaleLoadState === "ready") return scaleResults;
    setScaleLoadState("loading");
    try {
      const response = await fetch(`/api/consultations/${consultationId}/scales/status`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (ScaleStatusView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar os resultados das escalas.");
      setScaleResults(body.latest);
      setScaleLoadState("ready");
      return body.latest;
    } catch (error) {
      setScaleResults([]);
      setScaleLoadState("error");
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar os resultados das escalas." });
      return null;
    }
  }

  useEffect(() => { void load(); }, [consultationId]);

  useEffect(() => {
    function onProblemsChanged(event: Event) {
      const detail = (event as CustomEvent<{ consultationId?: string }>).detail;
      if (detail?.consultationId !== consultationId) return;
      if (dirty) {
        setFeedback({ kind: "error", text: "A lista de problemas mudou enquanto há alterações não salvas. Salve ou recarregue antes de continuar." });
        return;
      }
      void load();
    }

    function onMedicationsChanged(event: Event) {
      const detail = (event as CustomEvent<{ consultationId?: string }>).detail;
      if (detail?.consultationId !== consultationId) return;
      setMedications([]);
      setMedicationLoadState("idle");
    }

    function onScalesChanged(event: Event) {
      const detail = (event as CustomEvent<{ consultationId?: string }>).detail;
      if (detail?.consultationId !== consultationId) return;
      setScaleResults([]);
      setScaleLoadState("idle");
      if (dirty) {
        setFeedback({ kind: "error", text: "Uma escala foi atualizada enquanto a evolução possui alterações não salvas. Salve ou recarregue antes de atualizar as sugestões do plano." });
        return;
      }
      void load();
    }

    window.addEventListener("clinical-problems-changed", onProblemsChanged);
    window.addEventListener("clinical-medications-changed", onMedicationsChanged);
    window.addEventListener("clinical-scales-changed", onScalesChanged);
    return () => {
      window.removeEventListener("clinical-problems-changed", onProblemsChanged);
      window.removeEventListener("clinical-medications-changed", onMedicationsChanged);
      window.removeEventListener("clinical-scales-changed", onScalesChanged);
    };
  }, [consultationId, dirty]);

  const activeProblems = useMemo(
    () => (view?.problems ?? []).filter((problem) => problem.status !== "RESOLVED"),
    [view],
  );
  const medicationProvenance = useMemo(
    () => summarizeSoapMedicationProvenance(medications),
    [medications],
  );
  const canCopyExams = Boolean(draft?.examsText.trim() || view?.exams.history.length);

  function setField<K extends "subjective" | "physicalExam" | "vitalSigns" | "anthropometry" | "examsText">(
    key: K,
    value: Draft[K],
  ) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setDirty(true);
    setFeedback(null);
  }

  function setVaccinationReviewed(checked: boolean) {
    setDraft((current) => current ? {
      ...current,
      vaccinationReviewed: checked,
      ...(checked ? {} : { pendingVaccines: [], legacyPendingVaccines: [] }),
    } : current);
    setDirty(true);
    setFeedback(null);
  }

  function setVaccinePending(name: string, checked: boolean) {
    setDraft((current) => {
      if (!current) return current;
      const pending = new Set(current.pendingVaccines);
      if (checked) pending.add(name);
      else pending.delete(name);
      return { ...current, vaccinationReviewed: true, pendingVaccines: [...pending] };
    });
    setDirty(true);
    setFeedback(null);
  }

  function setProblemPlan(problemId: string, value: string) {
    setDraft((current) => current ? {
      ...current,
      planTextByProblem: { ...current.planTextByProblem, [problemId]: value },
    } : current);
    setDirty(true);
    setFeedback(null);
  }

  function setPreventiveExamOrder(order: PreventiveExamOrder, checked: boolean) {
    setDraft((current) => {
      if (!current) return current;
      const selected = new Set(current.preventiveExamOrders);
      if (checked) selected.add(order);
      else selected.delete(order);
      return {
        ...current,
        preventiveExamOrders: PREVENTIVE_EXAM_ORDER_OPTIONS
          .map((option) => option.id)
          .filter((id) => selected.has(id)),
      };
    });
    setDirty(true);
    setFeedback(null);
  }

  async function save() {
    if (!view || !draft || saving || view.consultationStatus === "FINALIZED") return;
    setSaving(true);
    setFeedback(null);
    try {
      const planByProblem = Object.fromEntries(
        activeProblems.map((problem) => [problem.id, actionsFromText(draft.planTextByProblem[problem.id] ?? "")]),
      );
      const vaccinationReview = deriveVaccinationReview({
        reviewed: draft.vaccinationReviewed,
        pendingVaccines: [...draft.pendingVaccines, ...draft.legacyPendingVaccines],
      });
      const response = await fetch(`/api/consultations/${consultationId}/note`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedUpdatedAt: view.updatedAt,
          expectedNoteVersion: view.noteVersion,
          subjective: draft.subjective,
          physicalExam: draft.physicalExam,
          vitalSigns: draft.vitalSigns,
          anthropometry: draft.anthropometry,
          examsText: draft.examsText,
          vaccinationReview,
          planByProblem,
          preventiveExamOrders: draft.preventiveExamOrders,
        }),
      });
      const body = await response.json().catch(() => null) as (NoteView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível salvar a evolução e o plano.");
      setView(body);
      setDraft(draftFromView(body));
      setDirty(false);
      setDismissedSuggestions(new Set());
      setFeedback({ kind: "success", text: "Evolução, exames, vacinas, solicitações e plano/condutas salvos nesta consulta." });
      window.dispatchEvent(new CustomEvent("clinical-note-changed", { detail: { consultationId } }));
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar a evolução e o plano." });
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, success: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("clipboard-api-unavailable");
      }
      setFeedback({ kind: "success", text: success });
      return;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("copy-command-failed");
        setFeedback({ kind: "success", text: success });
      } catch {
        setFeedback({ kind: "error", text: "Não foi possível copiar automaticamente neste navegador. Selecione o texto ou abra o prontuário no Safari/Chrome e tente novamente." });
      }
    }
  }

  async function medicationsForCopy(): Promise<MedicationItem[] | null> {
    const items = await ensureMedications();
    if (!items) return null;
    const provenance = summarizeSoapMedicationProvenance(items);
    if (!provenance.canCopySoap) {
      setFeedback({ kind: "error", text: `A cópia do SOAP permanece bloqueada: ${provenance.pendingReviewCount} medicamento(s) ainda exigem reconciliação explícita. Revise os status em Medicamentos.` });
      return null;
    }
    return items;
  }

  async function copyCombinedReport() {
    if (!draft || !view) return;
    const items = await medicationsForCopy();
    if (!items) return;
    const results = await ensureScaleResults();
    if (!results) return;
    await copyText(
      renderSoapExamsScalesReport({
        soap: renderSoap(draft, view.problems, items),
        problems: view.problems,
        currentExams: draft.examsText,
        examHistory: view.exams.history,
        scaleResults: asCompletedScaleResults(results),
      }),
      "SOAP, exames e resultados das escalas copiados para a área de transferência.",
    );
  }

  async function copySoap() {
    if (!draft || !view) return;
    const items = await medicationsForCopy();
    if (!items) return;
    await copyText(renderSoap(draft, view.problems, items), "SOAP copiado para a área de transferência.");
  }

  async function copyExams() {
    if (!draft || !view || !canCopyExams) return;
    await copyText(
      renderClinicalExamsText({ current: draft.examsText, history: view.exams.history }),
      "Exames copiados para a área de transferência.",
    );
  }

  async function copyScales() {
    const results = await ensureScaleResults();
    if (!results) return;
    const text = renderCompletedScalesText(asCompletedScaleResults(results));
    if (!text) {
      setFeedback({ kind: "success", text: "Nenhuma escala preenchida nesta consulta para copiar." });
      return;
    }
    await copyText(text, "Resultados das escalas preenchidas copiados para a área de transferência.");
  }

  if (loading) return <section className={styles.card}><p>Carregando evolução e plano…</p></section>;
  if (!view || !draft) return <section className={styles.card}><p role="alert">{feedback?.text ?? "Evolução indisponível."}</p></section>;

  const finalized = view.consultationStatus === "FINALIZED";
  const routineVaccines = GERIATRIC_VACCINE_CHECKLIST.filter((item) => item.group === "ROTINA");
  const specialVaccines = GERIATRIC_VACCINE_CHECKLIST.filter((item) => item.group === "SITUACOES_ESPECIAIS");
  const derivedVaccinationStatus = deriveVaccinationReview({
    reviewed: draft.vaccinationReviewed,
    pendingVaccines: [...draft.pendingVaccines, ...draft.legacyPendingVaccines],
  }).status;
  const vaccinationStatusLabel = derivedVaccinationStatus === "PENDING"
    ? `${draft.pendingVaccines.length + draft.legacyPendingVaccines.length} pendência(s) documentada(s)`
    : derivedVaccinationStatus === "UP_TO_DATE"
      ? "Carteira revisada — sem pendências registradas"
      : "Carteira ainda não revisada";

  return (
    <section className={styles.card} aria-labelledby="soap-editor-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Prontuário</p>
          <h2 id="soap-editor-title">Evolução SOAP + plano</h2>
          <p className={styles.muted}>A evolução e as condutas ficam no mesmo fluxo. O plano é vinculado aos problemas confirmados e permanece editável antes da finalização.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => void save()} disabled={!dirty || saving || finalized}>
            {saving ? "Salvando…" : "Salvar evolução e plano"}
          </button>
        </div>
      </div>

      {finalized ? <p className={styles.locked} role="status">Consulta finalizada: evolução e plano estão em modo somente leitura.</p> : null}
      {dirty ? <p className={styles.unsaved} role="status">Há alterações ainda não salvas. A cópia usa o conteúdo atual da tela; salvar grava a versão nesta consulta.</p> : null}
      {view.legacyAssessmentPresent ? <p className={styles.unsaved} role="status">Há conteúdo legado no campo Avaliação. Ele permanece preservado no banco e não é sobrescrito por este editor; revise o histórico antes de finalizar.</p> : null}
      {medicationLoadState === "loading" ? <p className={styles.unsaved} role="status">Verificando medicações para a cópia do SOAP…</p> : null}
      {scaleLoadState === "loading" ? <p className={styles.unsaved} role="status">Carregando resultados das escalas para a cópia…</p> : null}
      {medicationLoadState === "error" ? <p className={styles.error} role="alert">A cópia do SOAP está temporariamente indisponível porque a lista de medicações não pôde ser carregada.</p> : null}
      {medicationLoadState === "ready" && medicationProvenance.pendingReviewCount > 0 ? <p className={styles.error} role="alert">A cópia do SOAP permanece bloqueada: {medicationProvenance.pendingReviewCount} medicamento(s) ainda exigem reconciliação explícita. Exames e escalas podem ser copiados separadamente.</p> : null}
      {scaleLoadState === "error" ? <p className={styles.error} role="alert">Os resultados das escalas não puderam ser carregados para a cópia. SOAP e exames continuam disponíveis separadamente.</p> : null}
      {feedback ? <p className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}

      <aside className={styles.copyPanel} aria-labelledby="clinical-copy-title">
        <div>
          <strong id="clinical-copy-title">Cópia para o prontuário</strong>
          <span>Para deixar a tela mais leve, medicações e escalas são verificadas somente quando você usa um botão de cópia. O relatório combinado inclui apenas as escalas preenchidas nesta consulta.</span>
        </div>
        <div className={styles.copyActions}>
          <button type="button" onClick={() => void copyCombinedReport()} disabled={medicationLoadState === "loading" || scaleLoadState === "loading"}>Copiar SOAP + exames + escalas</button>
          <button type="button" onClick={() => void copySoap()} disabled={medicationLoadState === "loading"}>Copiar SOAP</button>
          <button type="button" onClick={() => void copyExams()} disabled={!canCopyExams}>Copiar exames</button>
          <button type="button" onClick={() => void copyScales()} disabled={scaleLoadState === "loading"}>Copiar escalas preenchidas</button>
        </div>
      </aside>

      <div className={styles.soapGrid}>
        <section className={styles.soapSection}>
          <h3>S — Subjetivo</h3>
          <label>
            Motivo da consulta, HDA e informações da paciente/acompanhante
            <textarea value={draft.subjective} disabled={finalized} onChange={(event) => setField("subjective", event.target.value)} rows={7} />
          </label>
        </section>

        <section className={styles.soapSection}>
          <h3>O — Objetivo</h3>
          <label>Exame físico<textarea value={draft.physicalExam} disabled={finalized} onChange={(event) => setField("physicalExam", event.target.value)} rows={4} /></label>
          <label>Sinais vitais<textarea value={draft.vitalSigns} disabled={finalized} onChange={(event) => setField("vitalSigns", event.target.value)} rows={3} /></label>
          <label>Antropometria<textarea value={draft.anthropometry} disabled={finalized} onChange={(event) => setField("anthropometry", event.target.value)} rows={3} /></label>

          <fieldset className={styles.vaccinePanel}>
            <legend>Vacinas e prevenção</legend>
            <div className={styles.vaccineStatus} data-status={derivedVaccinationStatus}>
              <div>
                <strong>{vaccinationStatusLabel}</strong>
                <span>O checklist registra somente a situação observada após conferência; não gera prescrição, produto, dose ou esquema.</span>
              </div>
              <label className={styles.checkRow}>
                <input type="checkbox" checked={draft.vaccinationReviewed} disabled={finalized} onChange={(event) => setVaccinationReviewed(event.target.checked)} />
                <span>Carteira/status vacinal revisado nesta consulta</span>
              </label>
            </div>
            <p className={styles.muted}>Após revisar a carteira, marque somente as vacinas cuja pendência foi documentada. Sem revisão, o status permanece desconhecido; revisão sem itens marcados significa nenhuma pendência registrada nesta consulta.</p>
            <section className={styles.vaccineGroup} aria-labelledby="routine-vaccines-title">
              <div><strong id="routine-vaccines-title">Calendário de rotina do idoso</strong><span>Itens mais frequentes para conferência na consulta.</span></div>
              <div className={styles.vaccineGrid}>{routineVaccines.map((item) => <label key={item.id} className={styles.checkRow}><input type="checkbox" checked={draft.pendingVaccines.includes(item.name)} disabled={finalized} onChange={(event) => setVaccinePending(item.name, event.target.checked)} /><span><b>{item.name}</b><small>{item.note}</small></span></label>)}</div>
            </section>
            <section className={styles.vaccineGroup} aria-labelledby="special-vaccines-title">
              <div><strong id="special-vaccines-title">Situações especiais</strong><span>Conferir apenas quando houver contexto clínico ou epidemiológico pertinente.</span></div>
              <div className={styles.vaccineGrid}>{specialVaccines.map((item) => <label key={item.id} className={styles.checkRow}><input type="checkbox" checked={draft.pendingVaccines.includes(item.name)} disabled={finalized} onChange={(event) => setVaccinePending(item.name, event.target.checked)} /><span><b>{item.name}</b><small>{item.note}</small></span></label>)}</div>
            </section>
          </fieldset>
          <p className={styles.muted}>Medicações em uso entram automaticamente apenas na cópia do SOAP quando o status deriva de histórico explicitamente reconciliado; não são duplicadas neste JSON.</p>
        </section>

        <section className={`${styles.soapSection} ${styles.examSection}`} aria-labelledby="clinical-exams-title">
          <div className={styles.examHeading}>
            <h3 id="clinical-exams-title">Exames laboratoriais e de imagem</h3>
            <p className={styles.muted}>O registro atual permanece separado; os exames anteriores aparecem somente como contexto longitudinal.</p>
          </div>
          <div className={styles.examLayout}>
            <label>
              Exames desta consulta
              <textarea value={draft.examsText} disabled={finalized} onChange={(event) => setField("examsText", event.target.value)} rows={8} placeholder="Registre a data, o tipo de exame e os resultados relevantes." />
            </label>
            <div>
              {view.exams.history.length > 0 ? (
                <div className={styles.examHistory} aria-label="Exames de consultas anteriores">
                  <strong>Exames de consultas anteriores</strong>
                  {view.exams.history.map((item) => <article key={item.id}><time dateTime={item.consultationOccurredAt}>{new Date(item.consultationOccurredAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</time><p>{item.content}</p></article>)}
                </div>
              ) : <p className={styles.emptyHistory}>Nenhum exame registrado em consultas anteriores.</p>}
            </div>
          </div>
        </section>

        <section className={styles.soapSection}>
          <h3>A — Avaliação</h3>
          {activeProblems.length === 0 ? <p className={styles.muted}>Sem problemas ativos registrados.</p> : (
            <ol className={styles.problemList}>
              {activeProblems.map((problem) => <li key={problem.id}><strong>{problem.title}</strong><span>{problem.type === "GERIATRIC" ? "Problema geriátrico" : "Problema clínico"} · {problem.status}</span></li>)}
            </ol>
          )}
        </section>

        <section className={styles.soapSection} aria-labelledby="plan-title">
          <h3 id="plan-title">P — Plano e condutas</h3>
          <div className={styles.planSummaryIntro}>
            <strong>Plano e condutas em um só lugar</strong>
            <span>As orientações sugeridas já aparecem no rascunho quando ainda não há plano salvo. Revise e edite antes de salvar; abrir a consulta não grava nenhuma conduta.</span>
          </div>
          <fieldset className={styles.preventivePanel}>
            <legend>Exames e rastreios solicitados</legend>
            <p className={styles.muted}>Marque somente as solicitações registradas nesta consulta. O sistema não define indicação clínica nem gera pedido automaticamente.</p>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.preventiveExamOrders.includes("LABORATORY_TESTS")}
                disabled={finalized}
                onChange={(event) => setPreventiveExamOrder("LABORATORY_TESTS", event.target.checked)}
              />
              <span>{preventiveExamOrderLabel("LABORATORY_TESTS")}</span>
            </label>
            <div className={styles.preventiveGroup}>
              <strong>Rastreio</strong>
              <div className={styles.vaccineGrid}>
                {PREVENTIVE_EXAM_ORDER_OPTIONS.filter((option) => option.id !== "LABORATORY_TESTS").map((option) => (
                  <label key={option.id} className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={draft.preventiveExamOrders.includes(option.id)}
                      disabled={finalized}
                      onChange={(event) => setPreventiveExamOrder(option.id, event.target.checked)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
          {activeProblems.length === 0 ? <p className={styles.muted}>Cadastre ou confirme problemas para vincular condutas.</p> : activeProblems.map((problem, index) => {
            const suggestion = view.planSuggestions.find((item) => item.problemId === problem.id);
            const visibleSuggestion = suggestion && !dismissedSuggestions.has(problem.id) ? suggestion : null;
            const fieldId = `plan-${problem.id}`;
            return (
              <div key={problem.id} className={styles.planField}>
                <label htmlFor={fieldId}><strong>{index + 1}. {problem.title}</strong><span>Uma conduta por linha. Revise clinicamente antes de salvar.</span></label>
                {visibleSuggestion ? (
                  <aside className={suggestionStyles.card} aria-label={`Sugestão de plano para ${problem.title}`}>
                    <div className={suggestionStyles.header}><strong>Sugestão baseada na avaliação desta consulta</strong><span className={suggestionStyles.badge}>Rascunho · revisão médica</span></div>
                    <p className={suggestionStyles.evidence}>Origem: {visibleSuggestion.evidence.map((item) => `${item.scaleCode} ${item.scoreText}${item.classification ? ` — ${item.classification}` : ""}`).join("; ")}.</p>
                    <ul className={suggestionStyles.actionsList}>{visibleSuggestion.actions.map((action) => <li key={action}>{action}</li>)}</ul>
                    <p className={suggestionStyles.sources}>Fontes: {visibleSuggestion.sources.map((source) => `${source.label} (PMID ${source.pmid})`).join("; ")}.</p>
                    <div className={suggestionStyles.controls}>
                      <button type="button" onClick={() => setDismissedSuggestions((current) => new Set([...current, problem.id]))}>Ocultar sugestão</button>
                    </div>
                  </aside>
                ) : null}
                <textarea id={fieldId} aria-label={`Plano para ${problem.title}`} value={draft.planTextByProblem[problem.id] ?? ""} disabled={finalized} onChange={(event) => setProblemPlan(problem.id, event.target.value)} rows={5} placeholder="Uma conduta por linha." />
              </div>
            );
          })}
        </section>
      </div>
    </section>
  );
}
