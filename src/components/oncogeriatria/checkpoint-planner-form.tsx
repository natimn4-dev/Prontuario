"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const types = [
  ["PERIODIC_REASSESSMENT", "Reavaliação ampliada"],
  ["EVENT_DRIVEN", "Reavaliação por mudança clínica"],
  ["END_OF_TREATMENT", "Avaliação ao final do tratamento"],
  ["POST_3_MONTHS", "Seguimento em 3 meses"],
  ["POST_6_MONTHS", "Seguimento em 6 meses"],
  ["POST_12_MONTHS", "Seguimento em 12 meses"],
] as const;

export interface CheckpointConsultationOption {
  id: string;
  label: string;
}

export function CheckpointPlannerForm({
  patientId,
  episodeId,
  consultations = [],
}: {
  patientId: string;
  episodeId: string;
  consultations?: CheckpointConsultationOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setMessage(null);
    try {
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECKPOINT_CREATE",
          episodeId,
          type: String(data.get("type") ?? ""),
          consultationId: String(data.get("consultationId") ?? "").trim() || null,
          occurredAt: String(data.get("occurredAt") ?? ""),
          scheduledAt: String(data.get("scheduledAt") ?? "") || null,
          structuredData: { trigger: String(data.get("trigger") ?? "").trim() || null },
        }),
      });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível registrar a reavaliação.");
      setMessage("Reavaliação registrada. Nenhuma consulta foi criada automaticamente; quando uma consulta existente é selecionada, sua avaliação por domínio integra a trajetória oncogeriátrica.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível registrar a reavaliação."); }
    finally { setPending(false); }
  }
  return (
    <form className="patient-form" onSubmit={submit}>
      <label>Tipo de reavaliação<select name="type">{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Data de referência<input type="date" name="occurredAt" required /></label>
      <label>Consulta existente para escalas e avaliação por domínio<select name="consultationId" defaultValue=""><option value="">Sem vínculo por enquanto</option>{consultations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <p className="muted">O vínculo reaproveita os resultados já registrados no prontuário geral. Nenhuma escala é copiada, recalculada ou preenchida automaticamente.</p>
      <label>Próxima avaliação prevista (opcional)<input type="date" name="scheduledAt" /></label>
      <label>Motivo/observação<input name="trigger" placeholder="Ex.: pós-hospitalização, nova perda funcional" /></label>
      <button type="submit" disabled={pending}>{pending ? "Salvando…" : "Registrar reavaliação"}</button>
      {message ? <p role="status" className="muted">{message}</p> : null}
    </form>
  );
}
