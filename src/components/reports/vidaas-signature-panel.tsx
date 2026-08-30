"use client";

import { useEffect, useState } from "react";
import styles from "./vidaas-signature-panel.module.css";

type SignatureStart = { authorizationUrl?: unknown; message?: unknown };
type DocumentKind = "aga" | "advance-directives";

function endpointFor(consultationId: string, kind: DocumentKind): string {
  return kind === "advance-directives"
    ? `/api/consultations/${consultationId}/reports/advance-directives/signatures/vidaas`
    : `/api/consultations/${consultationId}/reports/aga/signatures/vidaas`;
}

export function VidaasSignaturePanel({ consultationId }: { consultationId: string }) {
  const [agaReviewConfirmed, setAgaReviewConfirmed] = useState(false);
  const [directivesReviewConfirmed, setDirectivesReviewConfirmed] = useState(false);
  const [loadingKind, setLoadingKind] = useState<DocumentKind | null>(null);
  const [error, setError] = useState("");
  const [signedDocumentId, setSignedDocumentId] = useState("");
  const [signedDocumentKind, setSignedDocumentKind] = useState<DocumentKind | "">("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("signedDocument");
    const kind = params.get("signedDocumentKind");
    if (value) {
      setSignedDocumentId(value);
      setSignedDocumentKind(kind === "advance-directives" ? "advance-directives" : "aga");
    }
  }, []);

  async function finalizeAndSign(kind: DocumentKind) {
    const reviewConfirmed = kind === "aga" ? agaReviewConfirmed : directivesReviewConfirmed;
    if (!reviewConfirmed || loadingKind) return;
    setLoadingKind(kind);
    setError("");
    try {
      // O servidor seleciona a última prévia AGA gerada por este médico.
      // Relatório e diretivas são extraídos do mesmo snapshot imutável já revisado,
      // mas cada documento recebe PDF e assinatura VIDaaS próprios.
      const signatureResponse = await fetch(endpointFor(consultationId, kind), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({}),
      });
      const signatureResult = await signatureResponse.json() as SignatureStart;
      if (!signatureResponse.ok || typeof signatureResult.authorizationUrl !== "string") {
        throw new Error(typeof signatureResult.message === "string" ? signatureResult.message : "Não foi possível iniciar a autorização no VIDaaS.");
      }
      window.location.assign(signatureResult.authorizationUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a assinatura digital.");
      setLoadingKind(null);
    }
  }

  function signedResult(kind: DocumentKind) {
    if (!signedDocumentId || signedDocumentKind !== kind) return null;
    return (
      <div className={styles.success} role="status">
        <strong>Assinatura digital concluída.</strong>
        <a href={`/api/signed-documents/${encodeURIComponent(signedDocumentId)}/pdf`} target="_blank" rel="noreferrer">
          Abrir / imprimir PDF assinado
        </a>
      </div>
    );
  }

  return (
    <section className={`${styles.panel} no-print`} aria-labelledby="vidaas-signature-title">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>Assinatura digital dos documentos finais</span>
        <h3 id="vidaas-signature-title">VIDaaS · PDF PAdES</h3>
        <p>
          O relatório AGA e as diretivas antecipadas são documentos independentes para assinatura. Revise a aba correspondente e autorize cada documento separadamente no VIDaaS.
        </p>
      </div>

      <div className={styles.documentOptions}>
        <article className={styles.documentOption}>
          <div>
            <strong>Relatório de Avaliação Geriátrica</strong>
            <p>Assina o relatório AGA final exatamente a partir da última prévia gerada por você.</p>
          </div>
          {signedResult("aga") ?? (
            <div className={styles.actions}>
              <label className={styles.review}>
                <input
                  type="checkbox"
                  checked={agaReviewConfirmed}
                  onChange={(event) => setAgaReviewConfirmed(event.target.checked)}
                  disabled={Boolean(loadingKind)}
                />
                <span>
                  <strong>Confirmo a revisão clínica final do relatório</strong>
                  <small>Revise a aba “Avaliação Geriátrica” antes de assinar.</small>
                </span>
              </label>
              <button type="button" onClick={() => void finalizeAndSign("aga")} disabled={!agaReviewConfirmed || Boolean(loadingKind)}>
                {loadingKind === "aga" ? "Preparando assinatura…" : "Finalizar e assinar com VIDaaS"}
              </button>
            </div>
          )}
        </article>

        <article className={styles.documentOption}>
          <div>
            <strong>Diretivas antecipadas</strong>
            <p>Gera e assina um PDF próprio das preferências, valores e objetivos de cuidado exibidos na aba de diretivas.</p>
          </div>
          {signedResult("advance-directives") ?? (
            <div className={styles.actions}>
              <label className={styles.review}>
                <input
                  type="checkbox"
                  checked={directivesReviewConfirmed}
                  onChange={(event) => setDirectivesReviewConfirmed(event.target.checked)}
                  disabled={Boolean(loadingKind)}
                />
                <span>
                  <strong>Confirmo a revisão final das diretivas antecipadas</strong>
                  <small>Revise a aba “Diretivas antecipadas” antes de assinar.</small>
                </span>
              </label>
              <button type="button" onClick={() => void finalizeAndSign("advance-directives")} disabled={!directivesReviewConfirmed || Boolean(loadingKind)}>
                {loadingKind === "advance-directives" ? "Preparando assinatura…" : "Finalizar e assinar com VIDaaS"}
              </button>
            </div>
          )}
        </article>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <small className={styles.privacy}>
        Cada documento recebe assinatura, hash e PDF próprios. A senha, biometria e chave privada permanecem no ambiente VIDaaS; o Prontuário não solicita nem armazena esses dados.
      </small>
    </section>
  );
}
