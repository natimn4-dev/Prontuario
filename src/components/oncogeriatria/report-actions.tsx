"use client";

import { useEffect, useRef, useState } from "react";

export function OncogeriatricReportActions({ patientId, episodeId, consultationId, g8AssessmentId, cargAssessmentId, content }: { patientId: string; episodeId: string; consultationId?: string | null; g8AssessmentId?: string | null; cargAssessmentId?: string | null; content: Record<string, unknown> }) {
  const [reviewed, setReviewed] = useState(false);
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const operationIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.oncoClinicalReview = shareConfirmed ? "true" : "false";
    return () => { delete document.documentElement.dataset.oncoClinicalReview; };
  }, [shareConfirmed]);

  async function copy() {
    if (!shareConfirmed) return;
    const report = document.getElementById("oncogeriatric-report");
    if (!report) return;
    try { await navigator.clipboard.writeText(report.innerText); setMessage("Relatório copiado a partir da versão com revisão clínica persistida."); }
    catch { setMessage("Não foi possível copiar automaticamente."); }
  }

  async function confirmAndArchive() {
    if (!reviewed) return;
    if (!operationIdRef.current) operationIdRef.current = crypto.randomUUID();
    setPending(true); setMessage(null);
    try {
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REPORT_SNAPSHOT", operationId: operationIdRef.current, episodeId, consultationId, g8AssessmentId, cargAssessmentId, clinicalReviewConfirmed: true, content }),
      });
      const result = await response.json() as { version?: number; message?: string; saveStatus?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível arquivar uma versão do relatório.");
      setShareConfirmed(true); operationIdRef.current = null;
      setMessage(result.saveStatus === "already_saved" ? `A versão ${result.version ?? "?"} já havia sido confirmada e arquivada.` : `Versão ${result.version ?? "?"} arquivada com revisão clínica persistida. Impressão e cópia foram liberadas.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível arquivar uma versão do relatório."); }
    finally { setPending(false); }
  }

  return <>
    <style>{`@media print { html:not([data-onco-clinical-review="true"]) #oncogeriatric-report { display: none !important; } html:not([data-onco-clinical-review="true"]) body::before { content: "Impressão bloqueada: confirme e arquive a revisão clínica deste relatório."; display: block; padding: 24px; font: 16px/1.4 sans-serif; } }`}</style>
    <div className="no-print clinical-review-actions">
      <label className="inline-check"><input type="checkbox" checked={reviewed} disabled={pending || shareConfirmed} onChange={(event) => setReviewed(event.target.checked)} /> Confirmo que revisei clinicamente este relatório e desejo arquivar esta versão antes de compartilhar.</label>
      <div className="report-actions">
        <button type="button" disabled={!reviewed || pending || shareConfirmed} onClick={confirmAndArchive}>{pending ? "Confirmando…" : shareConfirmed ? "Revisão confirmada" : "Confirmar revisão e arquivar"}</button>
        <button type="button" disabled={!shareConfirmed} onClick={() => shareConfirmed && window.print()}>Imprimir</button>
        <button type="button" disabled={!shareConfirmed} onClick={copy}>Copiar</button>
      </div>
      {!shareConfirmed ? <span role="status">Impressão e cópia permanecem bloqueadas até a confirmação persistida no servidor.</span> : null}
      {message ? <span role="status">{message}</span> : null}
    </div>
  </>;
}
