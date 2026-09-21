"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { buildOncogeriatricCargHref } from "@/domain/oncogeriatria/return-navigation";

type Option = { id: string; label: string };

const CHECKPOINT_TYPES = [
  ["PRE_TREATMENT", "Antes do tratamento"],
  ["CYCLE", "Durante um ciclo"],
  ["PERIODIC_REASSESSMENT", "Reavaliação periódica"],
  ["EVENT_DRIVEN", "Após mudança clínica ou evento"],
  ["END_OF_TREATMENT", "Final do tratamento"],
  ["POST_3_MONTHS", "Seguimento em 3 meses"],
  ["POST_6_MONTHS", "Seguimento em 6 meses"],
  ["POST_12_MONTHS", "Seguimento em 12 meses"],
] as const;

export function CargCheckpointStartForm({
  patientId,
  episodeId,
  consultations,
  courses,
  initialConsultationId,
}: {
  patientId: string;
  episodeId: string;
  consultations: Option[];
  courses: Option[];
  initialConsultationId?: string | null;
}) {
  const router = useRouter();
  const operationIdRef = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!operationIdRef.current) operationIdRef.current = `carg:${crypto.randomUUID()}`;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECKPOINT_CREATE",
          operationId: operationIdRef.current,
          episodeId,
          type: String(form.get("type") ?? "PRE_TREATMENT"),
          consultationId: String(form.get("consultationId") ?? "").trim() || null,
          treatmentCourseId: String(form.get("treatmentCourseId") ?? "").trim() || null,
          cycleNumber: String(form.get("cycleNumber") ?? "").trim() || null,
          occurredAt: String(form.get("occurredAt") ?? ""),
        }),
      });
      const result = await response.json() as { id?: string; message?: string };
      if (!response.ok || !result.id) throw new Error(result.message ?? "Não foi possível iniciar o momento clínico.");
      operationIdRef.current = null;
      router.replace(buildOncogeriatricCargHref({ patientId, episodeId, checkpointId: result.id }));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar o momento clínico.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="patient-form" onSubmit={submit}>
      <p className="muted">Defina somente o contexto desta consulta. Depois de salvar, o CARG será aberto imediatamente como a primeira escala deste momento.</p>
      <label>Momento clínico<select name="type" defaultValue="PRE_TREATMENT">{CHECKPOINT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Data da avaliação<input name="occurredAt" type="date" required /></label>
      <label>Consulta clínica correspondente<select name="consultationId" defaultValue={initialConsultationId ?? ""}><option value="">Sem vínculo por enquanto</option>{consultations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Tratamento relacionado<select name="treatmentCourseId" defaultValue=""><option value="">Sem tratamento vinculado</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Ciclo, quando aplicável<input name="cycleNumber" type="number" min="0" /></label>
      <button type="submit" disabled={pending}>{pending ? "Abrindo CARG…" : "Iniciar momento e abrir CARG"}</button>
      {message ? <p role="alert" className="muted">{message}</p> : null}
    </form>
  );
}
