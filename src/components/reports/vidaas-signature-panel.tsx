"use client";

import { useEffect, useState } from "react";
import { isFinalReportSnapshot } from "@/domain/report-signature-eligibility";
import type { ReportSigningSnapshot } from "./report-signing-snapshot";
import styles from "./vidaas-signature-panel.module.css";

type SignatureStart = { authorizationUrl?: unknown; message?: unknown };
type DocumentKind = "aga" | "advance-directives";
type SignatureProvider = "vidaas" | "bird";
type LoadingKey = `${DocumentKind}:${SignatureProvider}`;

function endpointFor(consultationId: string, kind: DocumentKind, provider: SignatureProvider): string {
  if (provider === "vidaas") {
    return kind === "advance-directives"
      ? `/api/consultations/${consultationId}/reports/advance-directives/signatures/vidaas`
      : `/api/consultations/${consultationId}/reports/aga/signatures/vidaas`;
  }
  return kind === "advance-directives"
    ? `/api/consultations/${consultationId}/reports/advance-directives/signatures/bird`
    : `/api/consultations/${consultationId}/reports/aga/signatures/bird`;
}

function providerLabel(provider: SignatureProvider): string {
  return provider === "bird" ? "Bird ID" : "VIDaaS";
}

export function VidaasSignaturePanel({
  consultationId,
  snapshot,
}: {
  consultationId: string;
  snapshot: ReportSigningSnapshot | null;
}) {
  const [agaReviewConfirmed, setAgaReviewConfirmed] = useState(false);
  const [directivesReviewConfirmed, setDirectivesReviewConfirmed] = useState(false);
  const [loadingKey, setLoadingKey] = useState<LoadingKey | null>(null);
  const [error, setError] = useState("");
  const [signedDocumentId, setSignedDocumentId] = useState("");
  const [signedDocumentKind, setSignedDocumentKind] = useState<DocumentKind | "">("");

  const finalizedSnapshotReady = Boolean(snapshot && isFinalReportSnapshot(snapshot));

  function snapshotReadyFor(kind: DocumentKind): boolean {
    if (!snapshot || !finalizedSnapshotReady) return false;
    return kind === "aga" || snapshot.hasAdvanceDirectives;
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("signedDocument");
    const kind = params.get("signedDocumentKind");
    if (value) {
      setSignedDocumentId(value);
      setSignedDocumentKind(kind === "advance-directives" ? "advance-directives" : "aga");
    }
  }, []);

  useEffect(() => {
    setAgaReviewConfirmed(false);
    setDirectivesReviewConfirmed(false);
    setError("");
  }, [snapshot?.id]);

  async function finalizeAndSign(kind: DocumentKind, provider: SignatureProvider) {
    const reviewConfirmed = kind === "aga" ? agaReviewConfirmed : directivesReviewConfirmed;
    if (!reviewConfirmed || loadingKey || !snapshotReadyFor(kind) || !snapshot) return;
    const nextLoadingKey: LoadingKey = `${kind}:${provider}`;
    setLoadingKey(nextLoadingKey);
    setError("");
    try {
      // A assinatura usa explicitamente o mesmo snapshot final exibido e revisado.
      // O servidor revalida o status FINALIZED e rejeita snapshots gerados antes da finalização.
      const signatureResponse = await fetch(endpointFor(consultationId, kind, provider), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ snapshotId: snapshot.id }),
      });
      const signatureResult = await signatureResponse.json() as SignatureStart;
      if (!signatureResponse.ok || typeof signatureResult.authorizationUrl !== "string") {
        throw new Error(
          typeof signatureResult.message === "string"
            ? signatureResult.message
            : `Não foi possível iniciar a autorização no ${providerLabel(provider)}.`,
        );
      }
      window.location.assign(signatureResult.authorizationUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar a assinatura digital.");
      setLoadingKey(null);
    }
  }

  function providerButtons(kind: DocumentKind, reviewConfirmed: boolean) {
    const ready = snapshotReadyFor(kind);
    const documentLabel = kind === "aga" ? "relatório final" : "diretivas";
    return (
      <>
        <button
          type="button"
          onClick={() => void finalizeAndSign(kind, "vidaas")}
          disabled={!reviewConfirmed || !ready || Boolean(loadingKey)}
        >
          {loadingKey === `${kind}:vidaas` ? "Preparando assinatura…" : `Assinar ${documentLabel} com VIDaaS`}
        </button>
        <button
          type="button"
          onClick={() => void finalizeAndSign(kind, "bird")}
          disabled={!reviewConfirmed || !ready || Boolean(loadingKey)}
        >
          {loadingKey === `${kind}:bird` ? "Preparando assinatura…" : `Assinar ${documentLabel} com Bird ID`}
        </button>
      </>
    );
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
        <h3 id="vidaas-signature-title">VIDaaS ou Bird ID · PDF PAdES</h3>
        <p>
          O relatório AGA e as diretivas antecipadas são documentos independentes. Revise cada documento e escolha explicitamente o provedor de assinatura. O VIDaaS permanece disponível e o Bird ID é uma opção adicional.
        </p>
      </div>

      {!snapshot ? (
        <p className={styles.gateNotice} role="status">
          Finalize a consulta e gere uma nova prévia. A assinatura ficará vinculada exatamente à versão final que você revisar.
        </p>
      ) : !finalizedSnapshotReady ? (
        <p className={styles.gateNotice} role="status">
          Esta prévia foi gerada antes da finalização. Finalize a consulta e gere uma nova prévia para habilitar a assinatura.
        </p>
      ) : (
        <p className={styles.readyNotice} role="status">
          Prévia final v{snapshot.version} pronta para revisão e assinatura.
        </p>
      )}

      <div className={styles.documentOptions}>
        <article className={styles.documentOption}>
          <div>
            <strong>Relatório de Avaliação Geriátrica</strong>
            <p>Assina exatamente a prévia final exibida acima, depois da finalização da consulta.</p>
          </div>
          {signedResult("aga") ?? (
            <div className={styles.actions}>
              <label className={styles.review}>
                <input
                  type="checkbox"
                  checked={agaReviewConfirmed}
                  onChange={(event) => setAgaReviewConfirmed(event.target.checked)}
                  disabled={Boolean(loadingKey) || !snapshotReadyFor("aga")}
                />
                <span>
                  <strong>Confirmo a revisão clínica final do relatório</strong>
                  <small>Revise a aba “Avaliação Geriátrica” antes de assinar.</small>
                </span>
              </label>
              {providerButtons("aga", agaReviewConfirmed)}
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
                  disabled={Boolean(loadingKey) || !snapshotReadyFor("advance-directives")}
                />
                <span>
                  <strong>Confirmo a revisão final das diretivas antecipadas</strong>
                  <small>Revise a aba “Diretivas antecipadas” antes de assinar.</small>
                </span>
              </label>
              {providerButtons("advance-directives", directivesReviewConfirmed)}
            </div>
          )}
        </article>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <small className={styles.privacy}>
        Cada documento recebe assinatura, hash e PDF próprios. Senha, biometria e chave privada permanecem no provedor escolhido; o Prontuário não solicita nem armazena esses dados. Se o Bird ID ainda não estiver provisionado, a tentativa falha fechada e o VIDaaS continua disponível.
      </small>
    </section>
  );
}
