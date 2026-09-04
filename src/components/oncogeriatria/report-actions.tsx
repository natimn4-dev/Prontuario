"use client";

import { useState } from "react";

export function OncogeriatricReportActions({ patientId, episodeId, content }: { patientId: string; episodeId: string; content: Record<string, unknown> }) {
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function copy() {
    if (!reviewed) return;
    const report = document.getElementById("oncogeriatric-report");
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.innerText);
      setMessage("Relatório copiado após confirmação de revisão clínica.");
    } catch {
      setMessage("Não foi possível copiar automaticamente.");
    }
  }

  async function archiveVersion() {
    if (!reviewed) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REPORT_SNAPSHOT", episodeId, content: { ...content, clinicalReviewConfirmed: true } }),
      });
      const result = await response.json() as { version?: number; message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível arquivar uma versão do relatório.");
      setMessage(`Versão ${result.version ?? "?"} arquivada após revisão clínica.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível arquivar uma versão do relatório.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="no-print clinical-review-actions">
      <label className="inline-check"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /> Confirmo que revisei clinicamente este relatório antes de compartilhar.</label>
      <div className="report-actions">
        <button type="button" disabled={!reviewed} onClick={() => reviewed && window.print()}>Imprimir</button>
        <button type="button" disabled={!reviewed} onClick={copy}>Copiar</button>
        <button type="button" disabled={!reviewed || pending} onClick={archiveVersion}>{pending ? "Arquivando…" : "Arquivar versão"}</button>
      </div>
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}
