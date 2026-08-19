"use client";

import { useEffect, useMemo, useState } from "react";
import { FREITAS_SCALE_MIGRATION_INVENTORY } from "@/domain/freitas-core-scales";
import styles from "./aga-core-scales.module.css";

type ScaleCode = "katz" | "lawton" | "gds15";
type Choice = { value: number; label: string };
type Definition = { code: ScaleCode; version: string; name: string; dimension: string; instruction: string; questions: { id: string; label: string; choices: Choice[] }[] };
type Latest = { id: string; consultationId: string; scaleCode: ScaleCode; scaleVersion: string; scoreNumeric: number | null; scoreText?: string | null; classification?: string | null; interpretation?: string | null; appliedAt: string };
type View = { consultationId: string; consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED"; definitions: Definition[]; latest: Latest[] };
type Result = { score: number; scoreText: string; classification: string; interpretation: string };

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

  return <section className={styles.card} aria-labelledby="aga-core-scales-title">
    <div className={styles.heading}>
      <div><p className="eyebrow">Avaliação Geriátrica Ampla</p><h2 id="aga-core-scales-title">Escalas clínicas</h2><p>Versões Freitas/Py liberadas para nova aplicação. Uma escala por vez, com cálculo somente no servidor.</p></div>
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
      <header><h3>{definition.name}</h3><p>{definition.instruction}</p><small>Versão: {definition.version}</small></header>
      <div className={styles.questions}>
        {definition.questions.map((question, index) => <fieldset key={question.id} className={styles.question} disabled={readOnly || saving}>
          <legend><span>{index + 1}</span>{question.label}</legend>
          <div className={styles.choices}>{question.choices.map((choice) => <label key={`${question.id}-${choice.value}`}><input type="radio" name={`${definition.code}-${question.id}`} checked={answers[question.id] === choice.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice.value }))} />{choice.label}</label>)}</div>
        </fieldset>)}
      </div>
      {!readOnly ? <div className={styles.actions}><span>{Object.keys(answers).length}/{definition.questions.length} itens respondidos</span><button type="button" onClick={submit} disabled={!complete || saving}>{saving ? "Salvando…" : "Calcular e salvar"}</button></div> : null}
      {result ? <div className={styles.result} role="status"><strong>{result.scoreText} — {result.classification}</strong><span>{result.interpretation}</span></div> : null}
      {latestByCode.get(definition.code) ? <p className={styles.previous}>Último registro conhecido: <strong>{latestByCode.get(definition.code)!.scoreText ?? latestByCode.get(definition.code)!.scoreNumeric ?? "sem escore"}</strong> · {latestByCode.get(definition.code)!.classification ?? "sem classificação"} · {formatDate(latestByCode.get(definition.code)!.appliedAt)}</p> : null}
      {definition.code === "gds15" ? <p className={styles.clinicalNote}>GDS-15 é rastreio. Resultado positivo não confirma diagnóstico; avalie clinicamente humor, risco e contexto.</p> : null}
    </div> : null}

    <details className={styles.migration}>
      <summary>Demais escalas do apêndice Freitas/Py — estado de migração</summary>
      <p>Estas escalas permanecem visíveis para planejamento, mas não são aplicadas automaticamente até que versão, formulário e regra de cálculo estejam clinicamente validados.</p>
      <ul>{FREITAS_SCALE_MIGRATION_INVENTORY.map((item) => <li key={item.name}><strong>{item.name}</strong><span>{item.status === "migration-required" ? "Migração versionada necessária" : "Revisão clínica necessária"}</span><small>{item.note}</small></li>)}</ul>
    </details>
  </section>;
}
