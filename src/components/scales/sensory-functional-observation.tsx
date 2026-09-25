"use client";

import { useEffect, useState } from "react";
import {
  SENSORY_OBSERVATION_STATUS,
  type SensoryObservationStatus,
} from "@/domain/sensory-functional-observation";
import styles from "./sensory-functional-observation.module.css";

type Workspace = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  canWrite: boolean;
  saved: boolean;
  revision: number;
  assessmentStatus: SensoryObservationStatus;
  multisensoryDysfunction: boolean;
  usesCorrectiveLenses: boolean;
};

type Feedback = { kind: "error" | "success"; text: string };

function emptyWorkspace(consultationId: string): Workspace {
  return {
    consultationId,
    consultationStatus: "DRAFT",
    canWrite: false,
    saved: false,
    revision: 0,
    assessmentStatus: SENSORY_OBSERVATION_STATUS.NOT_ASSESSED,
    multisensoryDysfunction: false,
    usesCorrectiveLenses: false,
  };
}

export function SensoryFunctionalObservation({
  consultationId,
  onDirtyChange,
}: {
  consultationId: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [workspace, setWorkspace] = useState<Workspace>(() => emptyWorkspace(consultationId));
  const [assessmentStatus, setAssessmentStatus] = useState<SensoryObservationStatus>(SENSORY_OBSERVATION_STATUS.NOT_ASSESSED);
  const [multisensoryDysfunction, setMultisensoryDysfunction] = useState(false);
  const [usesCorrectiveLenses, setUsesCorrectiveLenses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function load() {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/sensory-function`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as (Workspace & { message?: string }) | null;
      if (!response.ok || !payload) throw new Error(payload?.message ?? "Não foi possível carregar a observação sensorial.");
      setWorkspace(payload);
      setAssessmentStatus(payload.assessmentStatus);
      setMultisensoryDysfunction(payload.multisensoryDysfunction);
      setUsesCorrectiveLenses(payload.usesCorrectiveLenses);
      setDirty(false);
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível carregar a observação sensorial." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => onDirtyChange?.(false);
  }, [consultationId]);

  const readOnly = workspace.consultationStatus === "FINALIZED" || !workspace.canWrite;

  function markChanged() {
    setDirty(true);
    setFeedback(null);
  }

  function changeStatus(status: SensoryObservationStatus) {
    setAssessmentStatus(status);
    if (status === SENSORY_OBSERVATION_STATUS.NOT_ASSESSED) {
      setMultisensoryDysfunction(false);
      setUsesCorrectiveLenses(false);
    }
    markChanged();
  }

  async function save() {
    if (saving || readOnly || !dirty) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/sensory-function`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedRevision: workspace.revision,
          assessmentStatus,
          multisensoryDysfunction,
          usesCorrectiveLenses,
        }),
      });
      const payload = await response.json().catch(() => null) as (Workspace & { message?: string }) | null;
      if (!response.ok || !payload) throw new Error(payload?.message ?? "Não foi possível salvar a observação sensorial.");
      setWorkspace(payload);
      setAssessmentStatus(payload.assessmentStatus);
      setMultisensoryDysfunction(payload.multisensoryDysfunction);
      setUsesCorrectiveLenses(payload.usesCorrectiveLenses);
      setDirty(false);
      setFeedback({ kind: "success", text: "Observação sensorial salva nesta consulta." });
      window.dispatchEvent(new CustomEvent("clinical-scales-changed", { detail: { consultationId } }));
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar a observação sensorial." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="sensory-observation-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Capacidade intrínseca e funcionalidade</p>
          <h3 id="sensory-observation-title">Observação sensorial</h3>
          <p>Registre se visão e audição apresentam alteração em conjunto e se a pessoa usa lentes corretoras. Este registro qualitativo não calcula escore nem substitui as avaliações separadas de visão e audição.</p>
        </div>
        {workspace.saved ? <span className={styles.saved}>Registro salvo · versão {workspace.revision}</span> : null}
      </div>

      {loading ? <p className={styles.muted}>Carregando observação sensorial…</p> : null}
      {workspace.consultationStatus === "FINALIZED" ? <p className={styles.locked}>Consulta finalizada: observação em modo somente leitura.</p> : null}
      {!workspace.canWrite && workspace.consultationStatus !== "FINALIZED" ? <p className={styles.locked}>Seu perfil pode consultar este registro, mas não pode alterá-lo.</p> : null}
      {feedback ? <p className={feedback.kind === "success" ? styles.success : styles.error} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}

      {!loading ? <>
        <fieldset className={styles.statusChoices} disabled={readOnly || saving}>
          <legend>Situação nesta consulta</legend>
          <label><input type="radio" name={`sensory-status-${consultationId}`} checked={assessmentStatus === SENSORY_OBSERVATION_STATUS.NOT_ASSESSED} onChange={() => changeStatus(SENSORY_OBSERVATION_STATUS.NOT_ASSESSED)} /> Não avaliada</label>
          <label><input type="radio" name={`sensory-status-${consultationId}`} checked={assessmentStatus === SENSORY_OBSERVATION_STATUS.ASSESSED} onChange={() => changeStatus(SENSORY_OBSERVATION_STATUS.ASSESSED)} /> Avaliada</label>
        </fieldset>

        <div className={styles.checkboxList}>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={multisensoryDysfunction} disabled={readOnly || saving || assessmentStatus !== SENSORY_OBSERVATION_STATUS.ASSESSED} onChange={(event) => { setMultisensoryDysfunction(event.target.checked); markChanged(); }} />
            <span>Disfunção multissensorial envolvendo visão e audição</span>
          </label>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={usesCorrectiveLenses} disabled={readOnly || saving || assessmentStatus !== SENSORY_OBSERVATION_STATUS.ASSESSED} onChange={(event) => { setUsesCorrectiveLenses(event.target.checked); markChanged(); }} />
            <span>Usa lentes corretoras</span>
          </label>
        </div>

        <p className={styles.helper}>Os campos desmarcados significam que a condição não foi indicada após marcar “Avaliada”. Selecione “Não avaliada” quando esses dados não tiverem sido verificados nesta consulta.</p>
        {!readOnly ? <div className={styles.actions}>
          <button type="button" onClick={save} disabled={!dirty || saving || loading}>{saving ? "Salvando…" : "Salvar observação sensorial"}</button>
        </div> : null}
      </> : null}
    </section>
  );
}
