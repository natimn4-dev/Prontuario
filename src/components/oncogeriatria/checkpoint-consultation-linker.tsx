"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
}: {
  patientId: string;
  episodeId: string;
  checkpointId: string;
  expectedRevision: number;
  consultations: ConsultationLinkOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "CHECKPOINT_LINK_CONSULTATION",
          episodeId,
          checkpointId,
          consultationId,
          expectedRevision,
        }),
      });
      const result = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(result?.message ?? "Não foi possível vincular a consulta.");
      setMessage("Consulta vinculada. O CARG e o G8 já podem ser registrados definitivamente.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível vincular a consulta.");
    } finally {
      setPending(false);
    }
  }

  if (!consultations.length) {
    return (
      <div className="clinical-caution">
        <strong>O CARG já pode ser preenchido e salvo como rascunho.</strong>
        <p>Para registrar o resultado final no prontuário, crie primeiro uma consulta clínica para este atendimento.</p>
        <a href={`/patients/${patientId}`}>Ir ao prontuário do paciente para abrir uma consulta →</a>
      </div>
    );
  }

  return (
    <form className="patient-form" onSubmit={submit}>
      <label>
        Consulta correspondente a esta avaliação
        <select name="consultationId" defaultValue="" disabled={pending} required>
          <option value="">Selecione uma consulta</option>
          {consultations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="muted">O vínculo mantém CARG, G8 e demais escalas no mesmo histórico clínico, sem duplicar resultados.</p>
      <button type="submit" disabled={pending}>{pending ? "Vinculando…" : "Vincular consulta e liberar registro final"}</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
