"use client";

import { useEffect, useMemo, useState } from "react";
import { canSubmitProblemStatusChange, type ProblemStatus } from "@/domain/problem-status-review";
import styles from "./problem-workspace.module.css";

type ProblemType = "CLINICAL" | "GERIATRIC";

type Problem = {
  id: string;
  type: ProblemType;
  status: ProblemStatus;
  title: string;
  description?: string;
  canDelete: boolean;
};

type WorkspaceView = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
  problems: Problem[];
};

const STATUS_LABELS: Record<ProblemStatus, string> = {
  ACTIVE: "Ativo",
  STABLE: "Estável",
  MONITORING: "Em acompanhamento",
  RESOLVED: "Resolvido",
};

const GERIATRIC_PRESETS = [
  "Incapacidade cognitiva",
  "Instabilidade postural",
  "Imobilidade",
  "Incontinência esfincteriana",
  "Iatrogenia",
  "Insuficiência familiar",
  "Incapacidade comunicativa",
] as const;

function ProblemCard({
  problem,
  editable,
  onChangeStatus,
  onDelete,
}: {
  problem: Problem;
  editable: boolean;
  onChangeStatus: (problemId: string, newStatus: ProblemStatus) => Promise<void>;
  onDelete: (problemId: string) => Promise<void>;
}) {
  const [nextStatus, setNextStatus] = useState<ProblemStatus>(problem.status);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNextStatus(problem.status);
    setReviewConfirmed(false);
  }, [problem.status]);

  const canSubmit = canSubmitProblemStatusChange({
    editable,
    saving,
    currentStatus: problem.status,
    nextStatus,
    reviewConfirmed,
  });

  async function updateStatus() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onChangeStatus(problem.id, nextStatus);
      setReviewConfirmed(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o problema.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCurrentProblem() {
    if (!editable || !problem.canDelete || deleting) return;
    const confirmed = window.confirm("Excluir este problema incluído nesta consulta? O registro de auditoria será preservado.");
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(problem.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir o problema desta consulta.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className={styles.problem} data-resolved={problem.status === "RESOLVED"}>
      <div className={styles.problemHeading}>
        <strong>{problem.title}</strong>
        <span>{STATUS_LABELS[problem.status]}</span>
      </div>
      {problem.description ? <p>{problem.description}</p> : null}
      {editable ? (
        <div className={styles.statusControls}>
          <label>
            Status
            <select
              value={nextStatus}
              onChange={(event) => {
                setNextStatus(event.target.value as ProblemStatus);
                setReviewConfirmed(false);
              }}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {nextStatus !== problem.status ? (
            <label className={styles.reviewConfirmation}>
              <input
                type="checkbox"
                checked={reviewConfirmed}
                onChange={(event) => setReviewConfirmed(event.target.checked)}
              />
              <span>Confirmo que revisei clinicamente esta alteração de status.</span>
            </label>
          ) : null}
          <button type="button" onClick={updateStatus} disabled={!canSubmit}>
            {saving ? "Salvando…" : "Atualizar status"}
          </button>
          {problem.canDelete ? (
            <button type="button" className={styles.deleteButton} onClick={deleteCurrentProblem} disabled={saving || deleting}>
              {deleting ? "Excluindo…" : "Excluir inclusão"}
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </article>
  );
}

export function ProblemWorkspace({ consultationId }: { consultationId: string }) {
  const [view, setView] = useState<WorkspaceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<ProblemType>("CLINICAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/problems`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (WorkspaceView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar os problemas.");
      setView(body);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível carregar os problemas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [consultationId]);

  const editable = Boolean(view && view.consultationStatus !== "FINALIZED" && view.isLatestConsultation);
  const clinical = useMemo(() => (view?.problems ?? []).filter((problem) => problem.type === "CLINICAL"), [view]);
  const geriatric = useMemo(() => (view?.problems ?? []).filter((problem) => problem.type === "GERIATRIC"), [view]);

  function applyView(next: WorkspaceView) {
    setView(next);
    setFeedback(null);
    window.dispatchEvent(new CustomEvent("clinical-problems-changed", { detail: { consultationId } }));
  }

  async function requestUpdate(body: unknown): Promise<WorkspaceView> {
    const response = await fetch(`/api/consultations/${consultationId}/problems`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed = await response.json().catch(() => null) as (WorkspaceView & { message?: string }) | null;
    if (!response.ok || !parsed) throw new Error(parsed?.message || "Não foi possível atualizar a lista de problemas.");
    return parsed;
  }

  async function changeStatus(problemId: string, newStatus: ProblemStatus) {
    const next = await requestUpdate({ action: "status", problemId, newStatus });
    applyView(next);
  }

  async function deleteProblem(problemId: string) {
    const next = await requestUpdate({ action: "delete", problemId });
    applyView(next);
  }

  async function create() {
    if (!editable || !title.trim() || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const next = await requestUpdate({
        action: "create",
        type,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      applyView(next);
      setTitle("");
      setDescription("");
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível criar o problema.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className={styles.card}><p>Carregando lista de problemas…</p></section>;
  if (!view) return <section className={styles.card}><p role="alert">{feedback ?? "Lista de problemas indisponível."}</p></section>;

  return (
    <section className={styles.card} aria-labelledby="problem-workspace-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Linha de cuidado</p>
          <h2 id="problem-workspace-title">Lista longitudinal de problemas</h2>
          <p>Problemas resolvidos permanecem no histórico. Sugestões de escalas só entram aqui após confirmação médica.</p>
        </div>
      </div>

      {!view.isLatestConsultation ? (
        <p className={styles.notice} role="status">Consulta histórica: lista exibida no estado daquele momento; alterações retrospectivas estão bloqueadas.</p>
      ) : null}
      {view.consultationStatus === "FINALIZED" ? (
        <p className={styles.notice} role="status">Consulta finalizada: lista em modo somente leitura.</p>
      ) : null}
      {feedback ? <p className={styles.error} role="alert">{feedback}</p> : null}

      {editable ? (
        <div className={styles.creator}>
          <div className={styles.creatorFields}>
            <label>
              Tipo
              <select value={type} onChange={(event) => setType(event.target.value as ProblemType)}>
                <option value="CLINICAL">Problema clínico</option>
                <option value="GERIATRIC">Problema geriátrico</option>
              </select>
            </label>
            <label className={styles.titleField}>
              Problema
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Hipertensão arterial" maxLength={500} />
            </label>
            <label className={styles.descriptionField}>
              Contexto opcional
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Observação breve, sem duplicar a HDA" />
            </label>
            <button type="button" onClick={create} disabled={!title.trim() || saving}>{saving ? "Adicionando…" : "Adicionar problema"}</button>
          </div>

          <div className={styles.presets} aria-label="Atalhos para problemas geriátricos">
            <span>I’s geriátricos — atalhos de preenchimento:</span>
            {GERIATRIC_PRESETS.map((preset) => (
              <button key={preset} type="button" onClick={() => { setType("GERIATRIC"); setTitle(preset); }}>
                {preset}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.columns}>
        <section>
          <h3>Problemas clínicos</h3>
          {clinical.length === 0 ? <p className={styles.empty}>Sem problemas clínicos registrados.</p> : clinical.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} editable={editable} onChangeStatus={changeStatus} onDelete={deleteProblem} />
          ))}
        </section>
        <section>
          <h3>Problemas geriátricos</h3>
          {geriatric.length === 0 ? <p className={styles.empty}>Sem problemas geriátricos registrados.</p> : geriatric.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} editable={editable} onChangeStatus={changeStatus} onDelete={deleteProblem} />
          ))}
        </section>
      </div>
    </section>
  );
}
