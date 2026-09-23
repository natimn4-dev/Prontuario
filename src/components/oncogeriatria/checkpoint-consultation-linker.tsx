"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buildOncogeriatricCargHref } from "@/domain/oncogeriatria/return-navigation";

export interface ConsultationLinkOption {
  id: string;
  label: string;
}

export function CheckpointConsultationLinker({
  patientId,
  episodeId,
  checkpointId,
  expectedRevision,
  consultations,
  baselineConsultationId,
}: {
  patientId: string;
  episodeId: string;
  checkpointId: string;
  expectedRevision: number;
  consultations: ConsultationLinkOption[];
  baselineConsultationId?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const requestId = useState(() => crypto.randomUUID())[0];

  async function link(consultationId: string) {
    const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "CHECKPOINT_LINK_CONSULTATION", episodeId, checkpointId, consultationId, expectedRevision }),
    });
    const result = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) throw new Error(result?.message ?? "Não foi possível vincular a consulta.");
    router.replace(`${buildOncogeriatricCargHref({ patientId, episodeId, checkpointId, consultationId })}#escalas`);
    router.refresh();
  }

  async function createAndLink() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": requestId },
        body: JSON.stringify({ patientId, expectedBaselineConsultationId: baselineConsultationId ?? null }),
      });
      const result = await response.json() as { consultationId?: string; message?: string };
      if (!response.ok || !result.consultationId) throw new Error(result.message ?? "Não foi possível criar a consulta.");
      setCreating(true);
      await link(result.consultationId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar ou vincular a consulta.");
    } finally {
      setPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const consultationId = String(form.get("consultationId") ?? "").trim();
    if (!consultationId) {
      setMessage("Selecione a consulta que corresponde a esta avaliação.");
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      await link(consultationId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível vincular a consulta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="patient-form">
    {consultations.length ? <form onSubmit={submit}>
      <label>
        Consulta correspondente a esta avaliação
        <select name="consultationId" defaultValue="" disabled={pending} required>
          <option value="">Selecione uma consulta</option>
          {consultations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="muted">O vínculo mantém CARG, G8 e demais escalas no mesmo histórico clínico, sem duplicar resultados.</p>
      <button type="submit" disabled={pending}>{pending ? "Vinculando…" : "Vincular consulta e liberar registro final"}</button>
    </form> : <p className="muted">Nenhuma consulta ativa disponível para vincular.</p>}
    <button type="button" disabled={pending || creating} onClick={() => void createAndLink()}>{pending ? "Criando e vinculando…" : "Criar nova consulta e vincular para abrir demais escalas"}</button>
    {message ? <p role="alert">{message}{creating ? " A consulta foi criada; recarregue para vinculá-la se necessário." : ""}</p> : null}
    </div>
  );
}
