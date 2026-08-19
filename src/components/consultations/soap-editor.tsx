"use client";

import { useEffect, useMemo, useState } from "react";
import { MEDICATION_MOMENT_LABELS, type MedicationMoment } from "@/domain/medication-plan";
import styles from "./soap-editor.module.css";

type Problem = { id: string; type: "CLINICAL" | "GERIATRIC"; status: "ACTIVE" | "STABLE" | "MONITORING" | "RESOLVED"; title: string };
type NoteView = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  updatedAt: string;
  fields: { subjective?: string; physicalExam?: string; vitalSigns?: string; anthropometry?: string; planByProblem?: Record<string, readonly string[]> };
  problems: Problem[];
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
};
type MedicationView = { items: MedicationItem[] };
type Draft = { subjective: string; physicalExam: string; vitalSigns: string; anthropometry: string; planTextByProblem: Record<string, string> };

function draftFromView(view: NoteView): Draft {
  return { subjective: view.fields.subjective ?? "", physicalExam: view.fields.physicalExam ?? "", vitalSigns: view.fields.vitalSigns ?? "", anthropometry: view.fields.anthropometry ?? "", planTextByProblem: Object.fromEntries(Object.entries(view.fields.planByProblem ?? {}).map(([id, actions]) => [id, actions.join("\n")])) };
}
function actionsFromText(value: string): string[] { return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
function valueOrMissing(value: string): string { return value.trim() || "sem dados registrados"; }
function medicationLine(item: MedicationItem): string {
  const parts = [item.medicationText, item.doseInstruction, item.route, item.moments.length ? item.moments.map((moment) => MEDICATION_MOMENT_LABELS[moment]).join(" / ") : undefined, item.instructions].filter(Boolean);
  return `- ${parts.join(" — ")}`;
}
function renderSoap(draft: Draft, problems: Problem[], medications: MedicationItem[]): string {
  const active = problems.filter((problem) => problem.status !== "RESOLVED");
  const activeMedications = medications.filter((item) => item.status === "ACTIVE");
  const lines = ["S — SUBJETIVO", valueOrMissing(draft.subjective), "", "O — OBJETIVO", `Exame físico: ${valueOrMissing(draft.physicalExam)}`, `Sinais vitais: ${valueOrMissing(draft.vitalSigns)}`, `Antropometria: ${valueOrMissing(draft.anthropometry)}`, "Medicações em uso:"];
  if (activeMedications.length === 0) lines.push("- sem dados registrados"); else activeMedications.forEach((item) => lines.push(medicationLine(item)));
  lines.push("", "A — AVALIAÇÃO");
  if (active.length === 0) lines.push("sem problemas ativos registrados"); else active.forEach((problem, index) => lines.push(`${index + 1}. ${problem.title}`));
  lines.push("", "P — PLANO");
  if (active.length === 0) lines.push("sem dados registrados"); else active.forEach((problem, index) => { lines.push(`${index + 1}. ${problem.title}`); const actions = actionsFromText(draft.planTextByProblem[problem.id] ?? ""); if (actions.length === 0) lines.push("- sem dados registrados"); else actions.forEach((action) => lines.push(`- ${action}`)); });
  return lines.join("\n");
}

export function SoapEditor({ consultationId }: { consultationId: string }) {
  const [view, setView] = useState<NoteView | null>(null);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function load() {
    setLoading(true); setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/note`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (NoteView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar o SOAP.");
      setView(body); setDraft(draftFromView(body)); setDirty(false);
    } catch (error) { setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar o SOAP." }); }
    finally { setLoading(false); }
  }
  async function loadMedications() {
    try {
      const response = await fetch(`/api/consultations/${consultationId}/medications`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (MedicationView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar as medicações.");
      setMedications(body.items);
    } catch (error) { setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar as medicações." }); }
  }

  useEffect(() => { void load(); void loadMedications(); }, [consultationId]);
  useEffect(() => {
    function onProblemsChanged(event: Event) {
      const detail = (event as CustomEvent<{ consultationId?: string }>).detail;
      if (detail?.consultationId !== consultationId) return;
      if (dirty) { setFeedback({ kind: "error", text: "A lista de problemas mudou enquanto há alterações não salvas no SOAP. Salve ou recarregue antes de continuar o plano." }); return; }
      void load();
    }
    function onMedicationsChanged(event: Event) {
      const detail = (event as CustomEvent<{ consultationId?: string }>).detail;
      if (detail?.consultationId === consultationId) void loadMedications();
    }
    window.addEventListener("clinical-problems-changed", onProblemsChanged);
    window.addEventListener("clinical-medications-changed", onMedicationsChanged);
    return () => { window.removeEventListener("clinical-problems-changed", onProblemsChanged); window.removeEventListener("clinical-medications-changed", onMedicationsChanged); };
  }, [consultationId, dirty]);

  const activeProblems = useMemo(() => (view?.problems ?? []).filter((problem) => problem.status !== "RESOLVED"), [view]);
  const activeMedicationCount = useMemo(() => medications.filter((item) => item.status === "ACTIVE").length, [medications]);
  function setField<K extends Exclude<keyof Draft, "planTextByProblem">>(key: K, value: Draft[K]) { setDraft((current) => current ? { ...current, [key]: value } : current); setDirty(true); setFeedback(null); }
  function setProblemPlan(problemId: string, value: string) { setDraft((current) => current ? { ...current, planTextByProblem: { ...current.planTextByProblem, [problemId]: value } } : current); setDirty(true); setFeedback(null); }

  async function save() {
    if (!view || !draft || saving || view.consultationStatus === "FINALIZED") return;
    setSaving(true); setFeedback(null);
    try {
      const planByProblem = Object.fromEntries(activeProblems.map((problem) => [problem.id, actionsFromText(draft.planTextByProblem[problem.id] ?? "")]));
      const response = await fetch(`/api/consultations/${consultationId}/note`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: view.updatedAt, subjective: draft.subjective, physicalExam: draft.physicalExam, vitalSigns: draft.vitalSigns, anthropometry: draft.anthropometry, planByProblem }) });
      const body = await response.json().catch(() => null) as (NoteView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível salvar o SOAP.");
      setView(body); setDraft(draftFromView(body)); setDirty(false); setFeedback({ kind: "success", text: "SOAP salvo nesta consulta." });
    } catch (error) { setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar o SOAP." }); }
    finally { setSaving(false); }
  }
  async function copySoap() {
    if (!draft || !view || dirty) return;
    try { await navigator.clipboard.writeText(renderSoap(draft, view.problems, medications)); setFeedback({ kind: "success", text: "SOAP copiado para a área de transferência." }); }
    catch { setFeedback({ kind: "error", text: "Não foi possível copiar o SOAP neste navegador." }); }
  }

  if (loading) return <section className={styles.card}><p>Carregando SOAP…</p></section>;
  if (!view || !draft) return <section className={styles.card}><p role="alert">{feedback?.text ?? "SOAP indisponível."}</p></section>;
  const finalized = view.consultationStatus === "FINALIZED";

  return <section className={styles.card} aria-labelledby="soap-editor-title">
    <div className={styles.heading}><div><p className="eyebrow">Prontuário</p><h2 id="soap-editor-title">Evolução SOAP</h2><p className={styles.muted}>Avaliação usa problemas confirmados; Objetivo incorpora {activeMedicationCount} medicamento(s) em uso da reconciliação desta consulta.</p></div><div className={styles.actions}><button type="button" onClick={save} disabled={!dirty || saving || finalized}>{saving ? "Salvando…" : "Salvar SOAP"}</button><button type="button" className={styles.secondary} onClick={copySoap} disabled={dirty}>Copiar para prontuário</button></div></div>
    {finalized ? <p className={styles.locked} role="status">Consulta finalizada: o SOAP está em modo somente leitura.</p> : null}{dirty ? <p className={styles.unsaved} role="status">Há alterações ainda não salvas.</p> : null}{feedback ? <p className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
    <div className={styles.soapGrid}>
      <section className={styles.soapSection}><h3>S — Subjetivo</h3><label>Motivo da consulta, HDA e informações da paciente/acompanhante<textarea value={draft.subjective} disabled={finalized} onChange={(event) => setField("subjective", event.target.value)} rows={7} /></label></section>
      <section className={styles.soapSection}><h3>O — Objetivo</h3><label>Exame físico<textarea value={draft.physicalExam} disabled={finalized} onChange={(event) => setField("physicalExam", event.target.value)} rows={4} /></label><label>Sinais vitais<textarea value={draft.vitalSigns} disabled={finalized} onChange={(event) => setField("vitalSigns", event.target.value)} rows={3} /></label><label>Antropometria<textarea value={draft.anthropometry} disabled={finalized} onChange={(event) => setField("anthropometry", event.target.value)} rows={3} /></label><p className={styles.muted}>Medicações em uso são derivadas da reconciliação temporal e entram automaticamente apenas na cópia do SOAP; não são duplicadas neste JSON.</p></section>
      <section className={styles.soapSection}><h3>A — Avaliação</h3>{activeProblems.length === 0 ? <p className={styles.muted}>Sem problemas ativos registrados.</p> : <ol className={styles.problemList}>{activeProblems.map((problem) => <li key={problem.id}><strong>{problem.title}</strong><span>{problem.type === "GERIATRIC" ? "Problema geriátrico" : "Problema clínico"} · {problem.status}</span></li>)}</ol>}</section>
      <section className={styles.soapSection}><h3>P — Plano por problema</h3>{activeProblems.length === 0 ? <p className={styles.muted}>Cadastre/confirme problemas para vincular condutas.</p> : activeProblems.map((problem) => <label key={problem.id} className={styles.planField}>{problem.title}<span>Uma ação por linha. Nada é aplicado automaticamente.</span><textarea value={draft.planTextByProblem[problem.id] ?? ""} disabled={finalized} onChange={(event) => setProblemPlan(problem.id, event.target.value)} rows={3} /></label>)}</section>
    </div>
  </section>;
}
