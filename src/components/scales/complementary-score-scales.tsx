"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ComplementaryField,
  ComplementaryScoreScaleCode,
  ComplementaryScoreScaleDefinition,
} from "@/domain/complementary-score-scales";
import styles from "./complementary-score-scales.module.css";

type Latest = {
  id: string;
  consultationId: string;
  scaleCode: string;
  scaleVersion: string;
  scoreNumeric: number | null;
  scoreText?: string | null;
  classification?: string | null;
  interpretation?: string | null;
  appliedAt: string;
};

type View = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  definitions: ComplementaryScoreScaleDefinition[];
  latest: Latest[];
};

type Result = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
};

type AnswerValue = number | string;

const DIMENSION_LABELS: Record<string, string> = {
  cognicao: "Cognição",
  funcionalidade: "Funcionalidade",
  humor: "Humor",
  fragilidade: "Fragilidade",
  mobilidade: "Mobilidade",
  medicamentos: "Medicamentos",
  nutricao: "Nutrição",
  oncogeriatria: "Oncogeriatria",
  prognostico: "Prognóstico",
  sintomas: "Sintomas",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function choiceValue(field: ComplementaryField, rawValue: string): AnswerValue | undefined {
  return field.choices?.find((choice) => String(choice.value) === rawValue)?.value;
}

function dimensionLabel(dimension: string) {
  return DIMENSION_LABELS[dimension] ?? dimension;
}

function compactScaleName(name: string) {
  return name.replace(" — registro rápido de pontuação", "").replace(" — registro de pontuação", "");
}

export function ComplementaryScoreScales({ consultationId }: { consultationId: string }) {
  const [view, setView] = useState<View | null>(null);
  const [selected, setSelected] = useState<ComplementaryScoreScaleCode>("moca");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function load() {
    try {
      const response = await fetch(`/api/consultations/${consultationId}/scales/complementary`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (View & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar as avaliações complementares.");
      setView(body);
      if (!body.definitions.some((item) => item.code === selected) && body.definitions[0]) {
        setSelected(body.definitions[0].code);
      }
      setFeedback(null);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível carregar as avaliações complementares.");
    }
  }

  useEffect(() => { void load(); }, [consultationId]);
  useEffect(() => { setAnswers({}); setResult(null); setFeedback(null); }, [selected]);

  const definition = view?.definitions.find((item) => item.code === selected);
  const readOnly = view?.consultationStatus === "FINALIZED";
  const latestByCode = useMemo(() => new Map((view?.latest ?? []).map((item) => [item.scaleCode, item])), [view]);
  const groupedDefinitions = useMemo(() => {
    const groups = new Map<string, ComplementaryScoreScaleDefinition[]>();
    for (const item of view?.definitions ?? []) {
      const current = groups.get(item.dimension) ?? [];
      current.push(item);
      groups.set(item.dimension, current);
    }
    return [...groups.entries()].sort(([left], [right]) => dimensionLabel(left).localeCompare(dimensionLabel(right), "pt-BR"));
  }, [view?.definitions]);
  const complete = Boolean(definition && definition.fields.every((field) => answers[field.id] !== undefined && answers[field.id] !== ""));
  const latest = definition ? latestByCode.get(definition.code) : undefined;

  async function submit() {
    if (!definition || !complete || saving || readOnly) return;
    setSaving(true);
    setFeedback(null);
    setResult(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/scales/complementary`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scaleCode: definition.code, answers }),
      });
      const body = await response.json().catch(() => null) as { result?: Result; message?: string } | null;
      if (!response.ok || !body?.result) throw new Error(body?.message || "Não foi possível salvar o resultado.");
      setResult(body.result);
      setFeedback("Resultado salvo nesta consulta.");
      setAnswers({});
      await load();
      window.dispatchEvent(new CustomEvent("clinical-scales-changed", { detail: { consultationId } }));
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível salvar o resultado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="complementary-scales-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Avaliação Geriátrica Ampla</p>
          <h2 id="complementary-scales-title">Avaliações complementares</h2>
          <p>Registre de forma rápida o resultado de instrumentos já aplicados. A interpretação entra no histórico longitudinal do paciente.</p>
        </div>
      </div>

      {readOnly ? <p className={styles.notice}>Consulta finalizada: resultados disponíveis apenas para leitura.</p> : null}
      {feedback ? <p className={feedback.includes("salvo") ? styles.success : styles.error} role="status">{feedback}</p> : null}

      {view ? (
        <>
          <label className={styles.selector}>
            <span>Instrumento</span>
            <select value={selected} onChange={(event) => setSelected(event.target.value as ComplementaryScoreScaleCode)} disabled={saving}>
              {groupedDefinitions.map(([dimension, items]) => (
                <optgroup key={dimension} label={dimensionLabel(dimension)}>
                  {items.map((item) => <option key={item.code} value={item.code}>{compactScaleName(item.name)}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          {definition ? (
            <div className={styles.workspace}>
              <header className={styles.workspaceHeader}>
                <div>
                  <span className={styles.dimension}>{dimensionLabel(definition.dimension)}</span>
                  <h3>{compactScaleName(definition.name)}</h3>
                </div>
                {latest ? <span className={styles.lastBadge}>Último: {latest.scoreText ?? latest.scoreNumeric ?? "—"}</span> : null}
              </header>

              <p className={styles.instruction}>{definition.instruction}</p>

              <div className={styles.fields}>
                {definition.fields.map((field) => (
                  <label key={field.id} className={styles.field}>
                    <span>{field.label}</span>
                    {field.number ? (
                      <div className={styles.numberRow}>
                        <input
                          type="number"
                          min={field.number.min}
                          max={field.number.max}
                          step={field.number.step}
                          value={typeof answers[field.id] === "number" ? answers[field.id] : ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setAnswers((current) => {
                              const next = { ...current };
                              if (!value) delete next[field.id];
                              else next[field.id] = Number(value);
                              return next;
                            });
                          }}
                          disabled={readOnly || saving}
                        />
                        {field.number.unit ? <span className={styles.unit}>{field.number.unit}</span> : null}
                      </div>
                    ) : null}
                    {field.choices ? (
                      <select
                        value={answers[field.id] === undefined ? "" : String(answers[field.id])}
                        onChange={(event) => {
                          const value = choiceValue(field, event.target.value);
                          setAnswers((current) => {
                            const next = { ...current };
                            if (value === undefined) delete next[field.id];
                            else next[field.id] = value;
                            return next;
                          });
                        }}
                        disabled={readOnly || saving}
                      >
                        <option value="">Selecione</option>
                        {field.choices.map((choice) => (
                          <option key={`${field.id}-${choice.value}`} value={String(choice.value)}>{choice.label}</option>
                        ))}
                      </select>
                    ) : null}
                    {field.number?.help ? <small>{field.number.help}</small> : null}
                  </label>
                ))}
              </div>

              {!readOnly ? (
                <div className={styles.actions}>
                  <span>{complete ? "Pronto para salvar" : "Preencha os campos acima"}</span>
                  <button type="button" onClick={submit} disabled={!complete || saving}>
                    {saving ? "Salvando…" : "Salvar resultado"}
                  </button>
                </div>
              ) : null}

              {result ? (
                <div className={styles.result} role="status">
                  <span className={styles.resultLabel}>Interpretação</span>
                  <strong>{result.scoreText} · {result.classification}</strong>
                  <span>{result.interpretation}</span>
                </div>
              ) : null}

              {latest ? (
                <div className={styles.previous}>
                  <span>Último registro</span>
                  <strong>{latest.scoreText ?? latest.scoreNumeric ?? "sem escore"}</strong>
                  <span>{latest.classification ?? "resultado registrado"}</span>
                  <time dateTime={latest.appliedAt}>{formatDate(latest.appliedAt)}</time>
                </div>
              ) : null}

              <details className={styles.details}>
                <summary>Sobre a interpretação</summary>
                <p>{definition.sourceNote}</p>
                <p>O escore isolado não estabelece diagnóstico. Condutas médicas permanecem sujeitas à revisão profissional; o relatório destinado ao paciente e à família recebe apenas orientações práticas e seguras.</p>
              </details>
            </div>
          ) : null}
        </>
      ) : <p>Carregando avaliações…</p>}
    </section>
  );
}
