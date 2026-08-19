"use client";

import { useState } from "react";
import type { MedicationLifecycleStatus } from "@/domain/medication-status-history";
import {
  MEDICATION_STATUS_LABELS,
  type MedicationStatusControlItem,
} from "@/domain/medication-status-presentation";
import styles from "./medication-status-panel.module.css";

type Feedback = { type: "success" | "error"; message: string } | null;

function MedicationStatusItem(props: {
  consultationId: string;
  medication: MedicationStatusControlItem;
  disabled: boolean;
}) {
  const [currentStatus, setCurrentStatus] = useState(props.medication.currentStatus);
  const [selectedStatus, setSelectedStatus] = useState<MedicationLifecycleStatus | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const availableStatuses = (Object.keys(MEDICATION_STATUS_LABELS) as MedicationLifecycleStatus[])
    .filter((status) => status !== currentStatus);

  async function submitStatusChange() {
    if (!selectedStatus || !confirmed || saving || props.disabled) return;

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${props.consultationId}/medications/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          medicationId: props.medication.id,
          newStatus: selectedStatus,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message || "Não foi possível registrar a alteração de status.");
      }

      setCurrentStatus(selectedStatus);
      setSelectedStatus("");
      setConfirmed(false);
      setFeedback({ type: "success", message: "Alteração de status registrada." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Não foi possível registrar a alteração de status.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={styles.item}>
      <div className={styles.itemHeader}>
        <strong>{props.medication.displayName}</strong>
        <span className={styles.status}>Status atual: {MEDICATION_STATUS_LABELS[currentStatus]}</span>
      </div>

      <div className={styles.controls}>
        <label>
          Novo status
          <select
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(event.target.value as MedicationLifecycleStatus | "");
              setConfirmed(false);
              setFeedback(null);
            }}
            disabled={props.disabled || saving}
          >
            <option value="">Selecione uma alteração</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>{MEDICATION_STATUS_LABELS[status]}</option>
            ))}
          </select>
        </label>

        <label className={styles.confirmation}>
          <input
            type="checkbox"
            checked={confirmed}
            disabled={!selectedStatus || props.disabled || saving}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>Confirmo que revisei este medicamento e desejo registrar esta mudança clínica prospectiva.</span>
        </label>

        <button
          type="button"
          onClick={submitStatusChange}
          disabled={!selectedStatus || !confirmed || props.disabled || saving}
        >
          {saving ? "Registrando…" : "Registrar alteração"}
        </button>

        {feedback ? (
          <p className={styles.feedback} role={feedback.type === "error" ? "alert" : "status"}>
            {feedback.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function MedicationStatusPanel(props: {
  consultationId: string;
  consultationFinalized: boolean;
  medications: MedicationStatusControlItem[];
}) {
  return (
    <section className={styles.panel} aria-labelledby="medication-status-heading">
      <div className={styles.header}>
        <h2 id="medication-status-heading">Status dos medicamentos</h2>
        <p className={styles.muted}>
          Registre apenas mudanças revisadas nesta consulta. O sistema não altera status automaticamente.
        </p>
      </div>

      {props.medications.length === 0 ? (
        <p className={styles.muted}>Sem medicamentos registrados para este paciente.</p>
      ) : (
        <div className={styles.list}>
          {props.medications.map((medication) => (
            <MedicationStatusItem
              key={medication.id}
              consultationId={props.consultationId}
              medication={medication}
              disabled={props.consultationFinalized}
            />
          ))}
        </div>
      )}

      {props.consultationFinalized ? (
        <p className={styles.muted} role="status">
          Consulta finalizada: alterações de status estão bloqueadas.
        </p>
      ) : null}
    </section>
  );
}
