"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADVANCE_DIRECTIVE_DISPOSITIONS,
  ADVANCE_DIRECTIVE_DOCUMENT_STATUSES,
  ADVANCE_DIRECTIVE_PARTICIPATION_MODES,
  ADVANCE_DIRECTIVE_PRIORITIES,
  ADVANCE_DIRECTIVE_REVIEW_TRIGGERS,
  ADVANCE_DIRECTIVE_TOPIC_CODES,
  ADVANCE_DIRECTIVE_TOPIC_STATUSES,
  DISPOSITION_LABELS,
  DOCUMENT_STATUS_LABELS,
  PARTICIPATION_LABELS,
  PRIORITY_LABELS,
  REVIEW_TRIGGER_LABELS,
  TOPIC_LABELS,
  TOPIC_STATUS_LABELS,
  emptyAdvanceDirectiveDraft,
  shouldCollectAdvanceDirectiveDetails,
  type AdvanceDirectiveDraft,
  type AdvanceDirectiveRecordView,
  type AdvanceDirectiveWorkspaceView,
} from "@/domain/advance-directives";
import styles from "./advance-directives-workspace.module.css";

type RequestError = { code?: string; message?: string };

function draftFromRecord(record?: AdvanceDirectiveRecordView): AdvanceDirectiveDraft {
  if (!record) return emptyAdvanceDirectiveDraft();
  return {
    disposition: record.disposition,
    participationMode: record.participationMode,
    trustedPersonName: record.trustedPersonName,
    trustedRelation: record.trustedRelation,
    trustedContact: record.trustedContact,
    whatMatters: record.whatMatters,
    dignityAndComfort: record.dignityAndComfort,
    priorities: [...record.priorities],
    topics: Object.fromEntries(
      ADVANCE_DIRECTIVE_TOPIC_CODES.map((code) => [code, { ...record.topics[code] }]),
    ) as AdvanceDirectiveDraft["topics"],
    documentStatus: record.documentStatus,
    reviewTrigger: record.reviewTrigger,
  };
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as RequestError;
  return body.message || fallback;
}

export function AdvanceDirectivesWorkspace({ consultationId }: { consultationId: string }) {
  const [workspace, setWorkspace] = useState<AdvanceDirectiveWorkspaceView>();
  const [draft, setDraft] = useState<AdvanceDirectiveDraft>(() => emptyAdvanceDirectiveDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setError(undefined);
    const response = await fetch(`/api/consultations/${consultationId}/advance-directives`, { cache: "no-store" });
    if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível carregar o histórico."));
    const next = await response.json() as AdvanceDirectiveWorkspaceView;
    setWorkspace(next);
    setDraft(draftFromRecord(next.current));
  }, [consultationId]);

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar o histórico."))
      .finally(() => setLoading(false));
  }, [load]);

  function update<K extends keyof AdvanceDirectiveDraft>(key: K, value: AdvanceDirectiveDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setMessage(undefined);
  }

  async function save() {
    if (!workspace) return;
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/advance-directives`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": crypto.randomUUID() },
        body: JSON.stringify({ expectedLatestVersion: workspace.latestVersion, ...draft }),
      });
      if (!response.ok) {
        const detail = await responseMessage(response, "Não foi possível salvar este registro.");
        if (response.status === 409) await load();
        throw new Error(detail);
      }
      const next = await response.json() as AdvanceDirectiveWorkspaceView;
      setWorkspace(next);
      setDraft(draftFromRecord(next.current));
      setMessage(`Versão ${next.latestVersion} registrada sem alterar as versões anteriores.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar este registro.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loading} role="status">Carregando diretivas antecipadas…</div>;

  const collectDetails = shouldCollectAdvanceDirectiveDetails(draft.disposition);
  const finalized = workspace?.consultationStatus === "FINALIZED";

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Planejamento antecipado de cuidados</p>
          <h3>Diretivas antecipadas</h3>
          <p>Registre a conversa de forma voluntária, revisável e fiel ao que a pessoa deseja compartilhar.</p>
        </div>
        <span className={styles.version}>Versão atual {workspace?.latestVersion ?? 0}</span>
      </header>

      <aside className={styles.safetyNote}>
        <strong>Conversa, não ordem médica automática</strong>
        <span>Este registro apoia decisões compartilhadas. Não determina capacidade, não substitui avaliação clínica e não gera documento legal ou ordem terapêutica.</span>
      </aside>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}

      <fieldset className={styles.section} disabled={saving || finalized}>
        <legend>Disponibilidade para conversar hoje</legend>
        <div className={styles.dispositions}>
          {ADVANCE_DIRECTIVE_DISPOSITIONS.map((option) => (
            <label key={option} className={draft.disposition === option ? styles.selectedCard : styles.choiceCard}>
              <input
                type="radio"
                name="advance-directive-disposition"
                value={option}
                checked={draft.disposition === option}
                onChange={() => update("disposition", option)}
              />
              <span><strong>{DISPOSITION_LABELS[option]}</strong><small>{option === "WANTS_TO_TALK" ? "Prosseguir com valores e preferências" : "Registrar a escolha sem exigir justificativa"}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      {!collectDetails ? (
        <section className={styles.pauseNote}>
          <strong>Escolha respeitada</strong>
          <p>O prontuário guardará apenas esta disponibilidade, a situação do documento e quando retomar. Os campos clínicos abaixo não serão enviados.</p>
        </section>
      ) : (
        <>
          <section className={styles.section}>
            <h4>Participação e pessoa de confiança</h4>
            <label className={styles.field}>Como a conversa aconteceu
              <select value={draft.participationMode ?? ""} onChange={(event) => update("participationMode", event.target.value as AdvanceDirectiveDraft["participationMode"])} disabled={saving || finalized}>
                <option value="">Não informado</option>
                {ADVANCE_DIRECTIVE_PARTICIPATION_MODES.map((option) => <option key={option} value={option}>{PARTICIPATION_LABELS[option]}</option>)}
              </select>
              <small>Descreve participação nesta conversa; não é uma avaliação automática de capacidade.</small>
            </label>
            <div className={styles.threeColumns}>
              <label className={styles.field}>Pessoa de confiança<input value={draft.trustedPersonName ?? ""} onChange={(event) => update("trustedPersonName", event.target.value)} maxLength={191} disabled={saving || finalized} /></label>
              <label className={styles.field}>Vínculo<input value={draft.trustedRelation ?? ""} onChange={(event) => update("trustedRelation", event.target.value)} maxLength={191} disabled={saving || finalized} /></label>
              <label className={styles.field}>Contato<input value={draft.trustedContact ?? ""} onChange={(event) => update("trustedContact", event.target.value)} maxLength={191} disabled={saving || finalized} /></label>
            </div>
          </section>

          <section className={styles.section}>
            <h4>O que importa para esta pessoa</h4>
            <div className={styles.twoColumns}>
              <label className={styles.field}>Valores, atividades e relações importantes<textarea value={draft.whatMatters ?? ""} onChange={(event) => update("whatMatters", event.target.value)} maxLength={4000} rows={4} disabled={saving || finalized} /></label>
              <label className={styles.field}>O que significa conforto e dignidade<textarea value={draft.dignityAndComfort ?? ""} onChange={(event) => update("dignityAndComfort", event.target.value)} maxLength={4000} rows={4} disabled={saving || finalized} /></label>
            </div>
            <fieldset className={styles.priorityFieldset} disabled={saving || finalized}>
              <legend>Prioridades mencionadas</legend>
              <div className={styles.checkGrid}>
                {ADVANCE_DIRECTIVE_PRIORITIES.map((priority) => (
                  <label key={priority}>
                    <input
                      type="checkbox"
                      checked={draft.priorities.includes(priority)}
                      onChange={(event) => update("priorities", event.target.checked ? [...draft.priorities, priority] : draft.priorities.filter((item) => item !== priority))}
                    />
                    <span>{PRIORITY_LABELS[priority]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className={styles.section}>
            <h4>Temas de tratamento</h4>
            <p className={styles.sectionHint}>Registre somente o que foi realmente conversado; preferências podem depender do contexto clínico.</p>
            <div className={styles.topicList}>
              {ADVANCE_DIRECTIVE_TOPIC_CODES.map((code) => (
                <div className={styles.topicRow} key={code}>
                  <div><strong>{TOPIC_LABELS[code].title}</strong><small>{TOPIC_LABELS[code].hint}</small></div>
                  <label className={styles.field}>Situação
                    <select value={draft.topics[code].status} onChange={(event) => update("topics", { ...draft.topics, [code]: { ...draft.topics[code], status: event.target.value as AdvanceDirectiveDraft["topics"][typeof code]["status"] } })} disabled={saving || finalized}>
                      {ADVANCE_DIRECTIVE_TOPIC_STATUSES.map((status) => <option key={status} value={status}>{TOPIC_STATUS_LABELS[status]}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>Observação<input value={draft.topics[code].note ?? ""} onChange={(event) => update("topics", { ...draft.topics, [code]: { ...draft.topics[code], note: event.target.value } })} maxLength={1200} disabled={saving || finalized} /></label>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className={styles.section}>
        <h4>Documento e revisão</h4>
        <div className={styles.twoColumns}>
          <label className={styles.field}>Documento de diretivas
            <select value={draft.documentStatus} onChange={(event) => update("documentStatus", event.target.value as AdvanceDirectiveDraft["documentStatus"])} disabled={saving || finalized}>
              {ADVANCE_DIRECTIVE_DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{DOCUMENT_STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <label className={styles.field}>Quando revisar
            <select value={draft.reviewTrigger} onChange={(event) => update("reviewTrigger", event.target.value as AdvanceDirectiveDraft["reviewTrigger"])} disabled={saving || finalized}>
              {ADVANCE_DIRECTIVE_REVIEW_TRIGGERS.map((trigger) => <option key={trigger} value={trigger}>{REVIEW_TRIGGER_LABELS[trigger]}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className={styles.reviewBar}>
        <div><strong>Revisão humana obrigatória</strong><span>Confirme com a pessoa e registre uma nova versão sempre que houver mudança.</span></div>
        <button type="button" onClick={save} disabled={!workspace || saving || finalized}>{saving ? "Registrando…" : "Registrar nova versão"}</button>
      </div>

      <section className={styles.history} aria-labelledby="advance-directive-history-title">
        <div><p className={styles.eyebrow}>Linha do tempo</p><h4 id="advance-directive-history-title">Histórico preservado</h4></div>
        {!workspace?.history.length ? <p className={styles.empty}>Nenhuma conversa registrada até esta consulta.</p> : workspace.history.map((record) => (
          <details key={record.id} className={styles.historyItem}>
            <summary><span><strong>{DISPOSITION_LABELS[record.disposition]}</strong><small>{formatDate(record.createdAt)} · {record.recordedByName}</small></span><b>v{record.version}</b></summary>
            <div className={styles.historyBody}>
              {record.participationMode ? <p><strong>Participação:</strong> {PARTICIPATION_LABELS[record.participationMode]}</p> : null}
              {record.whatMatters ? <p><strong>O que importa:</strong> {record.whatMatters}</p> : null}
              {record.dignityAndComfort ? <p><strong>Conforto e dignidade:</strong> {record.dignityAndComfort}</p> : null}
              {record.priorities.length ? <p><strong>Prioridades:</strong> {record.priorities.map((item) => PRIORITY_LABELS[item]).join("; ")}</p> : null}
              <p><strong>Revisão:</strong> {REVIEW_TRIGGER_LABELS[record.reviewTrigger]}</p>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
