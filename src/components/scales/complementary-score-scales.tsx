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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function choiceValue(field: ComplementaryField, rawValue: string): AnswerValue | undefined {
  return field.choices?.find((choice) => String(choice.value) === rawValue)?.value;
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
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar as escalas complementares.");
      setView(body);
      if (!body.definitions.some((item) => item.code === selected) && body.definitions[0]) {
        setSelected(body.definitions[0].code);
      }
      setFeedback(null);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível carregar as escalas complementares.");
    }
  }

  useEffect(() => { void load(); }, [consultationId]);
  useEffect(() => { setAnswers({}); setResult(null); setFeedback(null); }, [selected]);

  const definition = view?.definitions.find((item) => item.code === selected);
  const readOnly = view?.consultationStatus === "FINALIZED";
  const latestByCode = useMemo(() => new Map((view?.latest ?? []).map((item) => [item.scaleCode, item])), [view]);
  const complete = Boolean(definition && definition.fields.every((field) => answers[field.id] !== undefined && answers[field.id] !== ""));

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
      if (!response.ok || !body?.result) throw new Error(body?.message || "Não foi possível salvar a escala complementar.");
      setResult(body.result);
      setFeedback("Avaliação complementar salva nesta consulta.");
      setAnswers({});
      await load();
      window.dispatchEvent(new CustomEvent("clinical-scales-changed", { detail: { consultationId } }));
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível salvar a escala complementar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="complementary-scales-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Avaliação Geriátrica Ampla</p>
          <h2 id="complementary-scales-title">Escalas complementares e registro rápido</h2>
          <p>
            Recupera instrumentos presentes nas primeiras versões sem duplicar os formulários Freitas/Py já migrados.
            Registre aqui o escore de uma escala já aplicada quando o formulário completo não for necessário no fluxo.
          </p>
        </div>
        <span className={styles.source}>Legado clínico versionado</span>
      </div>

      {readOnly ? <p className={styles.notice}>Consulta finalizada: escalas em modo somente leitura.</p> : null}
      {feedback ? <p className={feedback.includes("salva") ? styles.success : styles.error} role="status">{feedback}</p> : null}

      {view ? (
        <>
          <label className={styles.selector}>
            <span>Escolha a escala</span>
            <select value={selected} onChange={(event) => setSelected(event.target.value as ComplementaryScoreScaleCode)} disabled={saving}>
              {view.definitions.map((item) => (
                <option key={item.code} value={item.code}>{item.name}</option>
              ))}
            </select>
          </label>

          {definition ? (
            <div className={styles.workspace}>
              <header>
                <h3>{definition.name}</h3>
                <p>{definition.instruction}</p>
                <small>Dimensão: {definition.dimension} · versão: {definition.version}</small>
                <small>Rastreabilidade: {definition.sourceNote}</small>
              </header>

              <div className={styles.fields}>
                {definition.fields.map((field) => (
                  <label key={field.id} className={styles.field}>
                    <span>{field.label}</span>
                    {field.number ? (
                      <>
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
                        {field.number.unit ? <small>Unidade: {field.number.unit}</small> : null}
                        {field.number.help ? <small>{field.number.help}</small> : null}
                      </>
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
                  </label>
                ))}
              </div>

              {!readOnly ? (
                <div className={styles.actions}>
                  <span>{Object.keys(answers).length}/{definition.fields.length} campos preenchidos</span>
                  <button type="button" onClick={submit} disabled={!complete || saving}>
                    {saving ? "Salvando…" : "Interpretar e salvar"}
                  </button>
                </div>
              ) : null}

              {result ? (
                <div className={styles.result} role="status">
                  <strong>{result.scoreText} — {result.classification}</strong>
                  <span>{result.interpretation}</span>
                </div>
              ) : null}

              {latestByCode.get(definition.code) ? (
                <p className={styles.previous}>
                  Último registro conhecido: <strong>{latestByCode.get(definition.code)!.scoreText ?? latestByCode.get(definition.code)!.scoreNumeric ?? "sem escore"}</strong>
                  {" · "}{latestByCode.get(definition.code)!.classification ?? "sem classificação"}
                  {" · "}{formatDate(latestByCode.get(definition.code)!.appliedAt)}
                </p>
              ) : null}

              <p className={styles.clinicalNote}>
                Escore isolado não substitui avaliação clínica. As interpretações alimentam histórico e relatório longitudinal,
                mas qualquer conduta médica permanece sujeita à revisão profissional. O relatório do paciente/família deve conter apenas orientações práticas e seguras.
              </p>
            </div>
          ) : null}
        </>
      ) : <p>Carregando escalas complementares…</p>}
    </section>
  );
}
