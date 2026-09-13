"use client";

import { useMemo, useState } from "react";
import styles from "./previous-consultation-note.module.css";

export interface PreviousConsultationReference {
  consultationId: string;
  occurredAt: string;
}

type Problem = {
  id: string;
  type: "CLINICAL" | "GERIATRIC";
  status: "ACTIVE" | "STABLE" | "MONITORING" | "RESOLVED";
  title: string;
};

type PreviousNoteView = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  legacyAssessmentPresent?: boolean;
  fields: {
    subjective?: string;
    physicalExam?: string;
    vitalSigns?: string;
    anthropometry?: string;
    planByProblem?: Record<string, readonly string[]>;
  };
  problems: Problem[];
};

type LoadState = "idle" | "loading" | "ready" | "error";

const STATUS_LABEL: Record<PreviousNoteView["consultationStatus"], string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  FINALIZED: "Finalizada",
};

function textOrMissing(value: string | undefined): string {
  return value?.trim() || "sem dados registrados";
}

function formatConsultationDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "data não disponível";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function PreviousConsultationNote({
  previousConsultation,
}: {
  previousConsultation?: PreviousConsultationReference;
}) {
  const [view, setView] = useState<PreviousNoteView | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");

  const activeProblems = useMemo(
    () => (view?.problems ?? []).filter((problem) => problem.status !== "RESOLVED"),
    [view],
  );

  if (!previousConsultation) return null;

  async function loadPreviousNote(reference: PreviousConsultationReference) {
    if (loadState === "loading" || loadState === "ready") return;
    setLoadState("loading");
    setError("");
    try {
      const response = await fetch(`/api/consultations/${reference.consultationId}/note`, {
        method: "GET",
        cache: "no-store",
      });
      const body = await response.json().catch(() => null) as (PreviousNoteView & { message?: string }) | null;
      if (!response.ok || !body) {
        throw new Error(body?.message || "Não foi possível carregar a evolução anterior.");
      }
      setView(body);
      setLoadState("ready");
    } catch (caught) {
      setLoadState("error");
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar a evolução anterior.");
    }
  }

  return (
    <aside className={styles.card} aria-labelledby="previous-consultation-note-title">
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Contexto longitudinal · somente leitura</span>
          <h3 id="previous-consultation-note-title">Evolução anterior</h3>
          <p>
            Consulta de {formatConsultationDate(previousConsultation.occurredAt)}. Este conteúdo não preenche nem altera a evolução atual.
            Os exames permanecem no bloco longitudinal próprio abaixo.
          </p>
        </div>
        <a
          href={`/consultations/${previousConsultation.consultationId}#soap`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir consulta anterior completa ↗
        </a>
      </div>

      <details
        className={styles.details}
        onToggle={(event) => {
          if (event.currentTarget.open) void loadPreviousNote(previousConsultation);
        }}
      >
        <summary>Ver evolução anterior</summary>

        {loadState === "loading" ? <p className={styles.muted} role="status">Carregando evolução anterior…</p> : null}
        {loadState === "error" ? (
          <div className={styles.error} role="alert">
            <strong>Não foi possível mostrar o resumo estruturado.</strong>
            <span>{error}</span>
            <span>Abra a consulta anterior completa para revisar o registro original.</span>
          </div>
        ) : null}

        {view ? (
          <div className={styles.body}>
            <div className={styles.meta}>
              <span>Status do registro anterior</span>
              <strong>{STATUS_LABEL[view.consultationStatus]}</strong>
            </div>

            {view.legacyAssessmentPresent ? (
              <div className={styles.warning} role="status">
                Esta consulta possui conteúdo legado de Avaliação preservado no registro original. Revise a consulta anterior completa antes de usar este resumo como contexto clínico.
              </div>
            ) : null}

            <div className={styles.soapGrid}>
              <section>
                <h4>S — Subjetivo</h4>
                <p>{textOrMissing(view.fields.subjective)}</p>
              </section>

              <section>
                <h4>O — Objetivo</h4>
                <dl>
                  <div><dt>Exame físico</dt><dd>{textOrMissing(view.fields.physicalExam)}</dd></div>
                  <div><dt>Sinais vitais</dt><dd>{textOrMissing(view.fields.vitalSigns)}</dd></div>
                  <div><dt>Antropometria</dt><dd>{textOrMissing(view.fields.anthropometry)}</dd></div>
                </dl>
              </section>

              <section>
                <h4>A — Avaliação</h4>
                {activeProblems.length ? (
                  <ol>
                    {activeProblems.map((problem) => (
                      <li key={problem.id}>
                        <strong>{problem.title}</strong>
                        <span>{problem.type === "GERIATRIC" ? "Problema geriátrico" : "Problema clínico"} · {problem.status}</span>
                      </li>
                    ))}
                  </ol>
                ) : <p>sem problemas ativos registrados</p>}
              </section>

              <section>
                <h4>P — Plano</h4>
                {activeProblems.length ? (
                  <ol>
                    {activeProblems.map((problem) => {
                      const actions = view.fields.planByProblem?.[problem.id] ?? [];
                      return (
                        <li key={problem.id}>
                          <strong>{problem.title}</strong>
                          {actions.length ? <ul>{actions.map((action) => <li key={action}>{action}</li>)}</ul> : <span>sem dados registrados</span>}
                        </li>
                      );
                    })}
                  </ol>
                ) : <p>sem dados registrados</p>}
              </section>
            </div>
          </div>
        ) : null}
      </details>
    </aside>
  );
}
