"use client";

import { useState } from "react";

type SaveState = "idle" | "saving" | "error";

async function post(patientId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/program55/patients/${patientId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(result?.message ?? "Não foi possível atualizar o status.");
}

export function CheckpointStatusActions({ patientId, checkpointId, status }: { patientId: string; checkpointId: string; status: string }) {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const targets = status === "NOT_STARTED" ? [["IN_PROGRESS", "Iniciar"]] : status === "IN_PROGRESS" ? [["COMPLETED", "Concluir"]] : status === "COMPLETED" ? [["REVIEWED", "Marcar revisado"], ["IN_PROGRESS", "Reabrir"]] : [["IN_PROGRESS", "Reabrir"]];
  async function change(next: string) {
    setState("saving"); setMessage("");
    try {
      await post(patientId, { action: "CHECKPOINT_STATUS", checkpointId, status: next });
      window.location.reload();
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "Erro ao atualizar status.");
    }
  }
  return <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{targets.map(([next, label]) => <button type="button" key={next} disabled={state === "saving"} onClick={() => void change(next)}>{label}</button>)}{state === "saving" ? <span className="muted">Salvando...</span> : null}{state === "error" ? <span role="alert" className="muted">{message}</span> : null}</div>;
}

export function GoalStatusActions({ patientId, goalId, status }: { patientId: string; goalId: string; status: string }) {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const options = status === "ACTIVE" ? [["ACHIEVED", "Alcançada"], ["PAUSED", "Pausar"], ["CANCELLED", "Cancelar"]] : [["ACTIVE", "Reativar"]];
  async function change(next: string) {
    setState("saving"); setMessage("");
    try {
      await post(patientId, { action: "GOAL_STATUS", goalId, status: next });
      window.location.reload();
    } catch (error) {
      setState("error"); setMessage(error instanceof Error ? error.message : "Erro ao atualizar meta.");
    }
  }
  return <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{options.map(([next, label]) => <button type="button" key={next} disabled={state === "saving"} onClick={() => void change(next)}>{label}</button>)}{state === "saving" ? <span className="muted">Salvando...</span> : null}{state === "error" ? <span role="alert" className="muted">{message}</span> : null}</div>;
}
