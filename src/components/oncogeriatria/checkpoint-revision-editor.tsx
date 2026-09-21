"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const STATUS_OPTIONS = [
  ["NOT_STARTED", "Não iniciada"],
  ["IN_PROGRESS", "Em andamento"],
  ["COMPLETED", "Concluída"],
  ["REVIEWED", "Revisada"],
] as const;

interface ConflictDetails {
  expectedRevision?: number;
  currentRevision?: number | null;
}

function initialNotes(value: Record<string, unknown>): string {
  return typeof value.notes === "string" ? value.notes : "";
}

export function CheckpointRevisionEditor({
  patientId,
  episodeId,
  checkpointId,
  initialRevision,
  initialStatus,
  initialStructuredData,
}: {
  patientId: string;
  episodeId: string;
  checkpointId: string;
  initialRevision: number;
  initialStatus: string;
  initialStructuredData: Record<string, unknown>;
}) {
  const router = useRouter();
  const [revision, setRevision] = useState(initialRevision);
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(() => initialNotes(initialStructuredData));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictDetails | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    setConflict(null);
    try {
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECKPOINT_UPDATE",
          episodeId,
          checkpointId,
          expectedRevision: revision,
          status,
          structuredData: { ...initialStructuredData, notes: notes.trim() || null },
        }),
      });
      const result = await response.json() as {
        code?: string;
        message?: string;
        details?: ConflictDetails;
        revision?: number;
        status?: string;
      };
      if (!response.ok) {
        if (response.status === 409 && result.code === "CHECKPOINT_REVISION_CONFLICT") {
          setConflict(result.details ?? {});
          setMessage(result.message ?? "Existe uma versão mais recente deste checkpoint.");
          return;
        }
        throw new Error(result.message ?? "Não foi possível atualizar este checkpoint.");
      }
      if (typeof result.revision === "number") setRevision(result.revision);
      if (typeof result.status === "string") setStatus(result.status);
      setMessage("Alteração confirmada. A revisão do checkpoint foi atualizada com auditoria.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar este checkpoint.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details>
      <summary>Editar observação ou situação desta avaliação</summary>
      <form className="stack" onSubmit={submit}>
        <label>
          Situação
          <select value={status} disabled={pending} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Observação
          <textarea value={notes} disabled={pending} rows={3} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <p className="muted">Revisão carregada: {revision}. O sistema não combina automaticamente alterações feitas em outra aba.</p>
        <button type="submit" disabled={pending}>{pending ? "Salvando…" : "Salvar alteração"}</button>
        {message ? <p role={conflict ? "alert" : "status"}>{message}</p> : null}
        {conflict ? (
          <div role="alert">
            <p>Há uma versão mais recente{typeof conflict.currentRevision === "number" ? ` (revisão ${conflict.currentRevision})` : ""}. Seu texto foi preservado nesta tela.</p>
            <button type="button" onClick={() => router.refresh()}>Recarregar versão mais recente antes de substituir</button>
          </div>
        ) : null}
      </form>
    </details>
  );
}
