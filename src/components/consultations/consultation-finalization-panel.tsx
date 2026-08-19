"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./consultation-finalization-panel.module.css";

type ConsultationStatus = "DRAFT" | "IN_REVIEW" | "FINALIZED";

interface UrgentAlert {
  code: string;
  message: string;
}

interface WorkflowState {
  consultationId: string;
  status: ConsultationStatus;
  urgentAlerts: UrgentAlert[];
}

interface WorkflowErrorBody {
  code?: string;
  message?: string;
}

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  DRAFT: "Rascunho",
  IN_REVIEW: "Em revisão",
  FINALIZED: "Finalizada",
};

export function ConsultationFinalizationPanel({ consultationId }: { consultationId: string }) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [acknowledgedCodes, setAcknowledgedCodes] = useState<Set<string>>(() => new Set());
  const [clinicalReviewConfirmed, setClinicalReviewConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function applyWorkflowState(next: WorkflowState) {
    setWorkflow(next);
    setAcknowledgedCodes(new Set());
    setClinicalReviewConfirmed(false);
  }

  async function loadWorkflow() {
    const response = await fetch(`/api/consultations/${consultationId}/workflow`, {
      method: "GET",
      cache: "no-store",
    });
    const body = await response.json() as WorkflowState | WorkflowErrorBody;
    if (!response.ok) {
      throw new Error("message" in body && body.message ? body.message : "Não foi possível carregar o estado da consulta.");
    }
    applyWorkflowState(body as WorkflowState);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const response = await fetch(`/api/consultations/${consultationId}/workflow`, {
          method: "GET",
          cache: "no-store",
        });
        const body = await response.json() as WorkflowState | WorkflowErrorBody;
        if (!response.ok) {
          throw new Error("message" in body && body.message ? body.message : "Não foi possível carregar o estado da consulta.");
        }
        if (active) {
          setWorkflow(body as WorkflowState);
          setAcknowledgedCodes(new Set());
          setClinicalReviewConfirmed(false);
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar o estado da consulta.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [consultationId]);

  async function postWorkflow(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/consultations/${consultationId}/workflow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as WorkflowState | WorkflowErrorBody;
      if (!response.ok) {
        throw new Error("message" in result && result.message ? result.message : "Não foi possível atualizar o estado da consulta.");
      }
      applyWorkflowState(result as WorkflowState);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o estado da consulta.");
      try {
        await loadWorkflow();
      } catch {
        // Mantém a mensagem original; a próxima ação do usuário poderá tentar recarregar o estado.
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleAlert(code: string, checked: boolean) {
    setAcknowledgedCodes((current) => {
      const next = new Set(current);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  const allUrgentAlertsAcknowledged = workflow?.urgentAlerts.every((alert) => acknowledgedCodes.has(alert.code)) ?? false;
  const canFinalize = workflow?.status === "IN_REVIEW"
    && clinicalReviewConfirmed
    && allUrgentAlertsAcknowledged
    && !busy;

  return (
    <section className={`${styles.panel} no-print`} aria-labelledby="consultation-finalization-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">Governança clínica</p>
          <h2 id="consultation-finalization-title">Revisar e finalizar consulta</h2>
        </div>
        {workflow ? (
          <span className={styles.status} data-status={workflow.status}>
            {STATUS_LABEL[workflow.status]}
          </span>
        ) : null}
      </div>

      <p className={styles.intro}>
        Finalização, geração de snapshot e compartilhamento do relatório são ações distintas.
        A consulta só é encerrada depois da revisão clínica final.
      </p>

      {loading ? <p className={styles.muted} aria-live="polite">Carregando estado da consulta…</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}

      {!loading && workflow?.status === "DRAFT" ? (
        <div className={styles.actionBlock}>
          <p>
            O registro ainda está em rascunho. Inicie a revisão final quando o preenchimento clínico estiver pronto para conferência.
          </p>
          <button
            type="button"
            onClick={() => void postWorkflow({ action: "start-review" })}
            disabled={busy}
          >
            {busy ? "Iniciando revisão…" : "Iniciar revisão final"}
          </button>
        </div>
      ) : null}

      {!loading && workflow?.status === "IN_REVIEW" ? (
        <div className={styles.reviewArea}>
          {workflow.urgentAlerts.length > 0 ? (
            <fieldset className={styles.alertFieldset}>
              <legend>Alertas urgentes que exigem revisão explícita</legend>
              <p className={styles.muted}>
                Estes alertas foram derivados pelo servidor a partir das avaliações atuais desta consulta.
              </p>
              <div className={styles.alertList}>
                {workflow.urgentAlerts.map((alert) => (
                  <label className={styles.alertCheck} key={alert.code}>
                    <input
                      type="checkbox"
                      checked={acknowledgedCodes.has(alert.code)}
                      onChange={(event) => toggleAlert(alert.code, event.target.checked)}
                      disabled={busy}
                    />
                    <span>
                      <strong>Alerta urgente</strong>
                      <span>{alert.message}</span>
                      <small>Confirmo que revisei este alerta no contexto clínico desta consulta.</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className={styles.clearState}>
              Nenhum alerta urgente atual foi identificado pelo servidor para esta consulta.
            </p>
          )}

          <label className={styles.reviewCheck}>
            <input
              type="checkbox"
              checked={clinicalReviewConfirmed}
              onChange={(event) => setClinicalReviewConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>
              <strong>Revisão clínica final</strong>
              <small>Confirmo que revisei os dados registrados e estou finalizando esta consulta.</small>
            </span>
          </label>

          <div className={styles.finalAction}>
            <p>
              Após finalizar, esta consulta se torna imutável. Correções posteriores devem ser registradas em nova consulta ou adendo versionado.
            </p>
            <button
              type="button"
              onClick={() => void postWorkflow({
                action: "finalize",
                clinicalReviewConfirmed,
                acknowledgedUrgentAlertCodes: [...acknowledgedCodes],
              })}
              disabled={!canFinalize}
            >
              {busy ? "Finalizando…" : "Finalizar consulta"}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && workflow?.status === "FINALIZED" ? (
        <div className={styles.finalizedState}>
          <strong>Consulta finalizada</strong>
          <p>
            O registro está encerrado e protegido contra edição. Documentos continuam vinculados a esta consulta e permanecem versionados.
          </p>
        </div>
      ) : null}
    </section>
  );
}
