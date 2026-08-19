"use client";

import { useEffect, useMemo, useState } from "react";
import { FREITAS_SCALE_MIGRATION_INVENTORY } from "@/domain/freitas-core-scales";
import styles from "./aga-core-scales.module.css";

type ScaleCode = string;
type Choice = { value: number; label: string };
type Question = { id: string; label: string; choices?: Choice[]; number?: { min: number; max: number; step: number; unit?: string; help?: string } };
type Definition = { code: ScaleCode; version: string; name: string; dimension: string; instruction: string; sourceNote?: string; questions: Question[] };
type Latest = { id: string; consultationId: string; scaleCode: ScaleCode; scaleVersion: string; scoreNumeric: number | null; scoreText?: string | null; classification?: string | null; interpretation?: string | null; appliedAt: string };
type View = { consultationId: string; consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED"; definitions: Definition[]; latest: Latest[] };
type Result = { score: number; scoreText: string; classification: string; interpretation: string };

const VALIDATED_NAMES = new Set([
  "MNA completa", "Pfeffer — 10 itens", "SPPB", "POMA",
  "Mini-Cog", "MEEM", "Desenho do relógio", "MoCA — versão experimental brasileira", "IQCODE-Br",
]);
const SCREENING_CODES = new Set(["gds15", "pfeffer10", "minicog_freitas", "clock_shulman", "moca_br_freitas", "iqcode_br_26"]);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function AgaCoreScales({ consultationId }: { consultationId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<ScaleCode>("katz");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function load() {
    try {
      const response = await fetch(`/api/consultations/${consultationId}/scales/freitas-core`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (View & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar as escalas da AGA.");
      setView(body);
      setFeedback(null);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível carregar as escalas da AGA.");
    }
  }

  useEffect(() => { void load(); }, [consultationId]);
  useEffect(() => { setAnswers({}); setResult(null); setFeedback(null); }, [selected]);

  const definition = view?.definitions.find((item) => item.code === selected);
  const complete = Boolean(definition && definition.questions.every((question) => answers[question.id] !== undefined));
  const readOnly = view?.consultationStatus === "FINALIZED";
  const latestByCode = useMemo(() => new Map((view?.latest ?? []).map((item) => [item.scaleCode, item])), [view]);

  async function submit() {
    if (!definition || !complete || saving || readOnly) return;
    setSaving(true); setFeedback(null); setResult(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/scales/freitas-core`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scaleCode: definition.code, answers }),
      });
      const body = await response.json().catch(() => null) as { result?: Result; message?: string } | null;
      if (!response.ok || !body?.result) throw new Error(body?.message || "Não foi possível salvar a escala.");
      setResult(body.result);
      setFeedback("Avaliação salva nesta consulta.");
      setAnswers({});
      await load();
      window.dispatchEvent(new CustomEvent("clinical-scales-changed", { detail: { consultationId } }));
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível salvar a escala.");
    } finally { setSaving(false); }
  }

  function setNumeric(questionId: string, value: string) {
    setAnswers((current) => {
      if (value === "") {
        const next = { ...current };
        delete next[questionId];
        return next;
      }
      return { ...current, [questionId]: Number(value) };
    });
  }

  return <section className={styles.card} aria-labelledby="aga-core-scales-title">
    <div className={styles.heading}>
      <div><p className="eyebrow">Avaliação Geriátrica Ampla</p><h2 id="aga-core-scales-title">Escalas clínicas</h2><p>Versões governadas por fonte, com cálculo no servidor e histórico preservado por versão.</p></div>
      <span className={styles.source}>Fonte principal: Freitas/Py</span>
    </div>

    {readOnly ? <p className={styles.notice}>Consulta finalizada: escalas em modo somente leitura.</p> : null}
    {feedback ? <p className={feedback.includes("salva") ? styles.success : styles.error} role="status">{feedback}</p> : null}

    <div className={styles.tabs} role="tablist" aria-label="Escalas liberadas">
      {(view?.definitions ?? []).map((item) => {
        const latest = latestByCode.get(item.code);
        return <button key={item.code} type="button" role="tab" aria-selected={selected === item.code} className={selected === item.code ? styles.activeTab : styles.tab} onClick={() => setSelected(item.code)}>
          <strong>{item.name}</strong><span>{latest ? `${latest.scoreText ?? latest.scoreNumeric ?? "—"} · ${latest.classification ?? "resultado registrado"}` : "Ainda não aplicada"}</span>
        </button>;
      })}
    </div>

    {!view ? <p>Carregando escalas…</p> : definition ? <div className={styles.workspace}>
      <header><h3>{definition.name}</h3><p>{definition.instruction}</p><small>Versão: {definition.version}</small>{definition.sourceNote ? <small>Rastreabilidade: {definition.sourceNote}</small> : null}</header>
      <div className={styles.questions}>
        {definition.questions.map((question, index) => <fieldset key={question.id} className={styles.question} disabled={readOnly || saving}>
          <legend><span>{index + 1}</span>{question.label}</legend>
          {question.choices ? <div className={styles.choices}>{question.choices.map((choice) => <label key={`${question.id}-${choice.value}-${choice.label}`}><input type="radio" name={`${definition.code}-${question.id}`} checked={answers[question.id] === choice.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.value }))} />{choice.label}</label>)}</div> : null}
          {question.number ? <label className={styles.numericInput}><span>Valor {question.number.unit ? `(${question.number.unit})` : ""}</span><input type="number" min={question.number.min} max={question.number.max} step={question.number.step} value={answers[question.id] ?? ""} onChange={(event) => setNumeric(question.id, event.target.value)} />{question.number.help ? <small>{question.number.help}</small> : null}</label> : null}
        </fieldset>)}
      </div>
      {!readOnly ? <div className={styles.actions}><span>{Object.keys(answers).length}/{definition.questions.length} itens respondidos</span><button type="button" onClick={submit} disabled={!complete || saving}>{saving ? "Salvando…" : "Calcular e salvar"}</button></div> : null}
      {result ? <div className={styles.result} role="status"><strong>{result.scoreText} — {result.classification}</strong><span>{result.interpretation}</span></div> : null}
      {latestByCode.get(definition.code) ? <p className={styles.previous}>Último registro conhecido: <strong>{latestByCode.get(definition.code)!.scoreText ?? latestByCode.get(definition.code)!.scoreNumeric ?? "sem escore"}</strong> · {latestByCode.get(definition.code)!.classification ?? "sem classificação"} · {formatDate(latestByCode.get(definition.code)!.appliedAt)}</p> : null}
      {SCREENING_CODES.has(definition.code) ? <p className={styles.clinicalNote}>Resultado de rastreio não estabelece diagnóstico por si só; integre o escore à avaliação clínica, funcional, sensorial e educacional.</p> : null}
    </div> : null}

    <details className={styles.migration}>
      <summary>Escalas do apêndice ainda em validação de versão</summary>
      <p>Somente instrumentos que ainda não possuem regra versionada validada permanecem nesta lista.</p>
      <ul>{FREITAS_SCALE_MIGRATION_INVENTORY.filter((item) => !VALIDATED_NAMES.has(item.name)).map((item) => <li key={item.name}><strong>{item.name}</strong><span>{item.status === "migration-required" ? "Migração versionada necessária" : "Revisão clínica necessária"}</span><small>{item.note}</small></li>)}</ul>
    </details>
  </section>;
}
