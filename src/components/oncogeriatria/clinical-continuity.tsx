import type { CapacityDimensionHistory, CapacityDimensionStatus } from "@/domain/capacity-dimension-history";
import { buildOncogeriatricDomainReviewPriorities } from "@/domain/oncogeriatria/domain-review";
import { buildOncogeriatricConsultationHref, type OncogeriatricReturnStage } from "@/domain/oncogeriatria/return-navigation";
import type { ReactNode } from "react";
import styles from "./clinical-continuity.module.css";

export interface OncogeriatricWorkingConsultation {
  id: string;
  occurredAt: Date | string;
  status: string;
}

function clinicalDate(value: Date | string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date)
    : "Data não informada";
}

export function OncogeriatricClinicalContinuity({
  patientId,
  consultation,
  episodeId,
  returnStage,
}: {
  patientId: string;
  consultation: OncogeriatricWorkingConsultation | null;
  episodeId: string;
  returnStage: OncogeriatricReturnStage;
}) {
  if (!consultation) {
    return (
      <section className={styles.workspace} aria-labelledby="oncogeriatric-continuity-title">
        <div>
          <p className="eyebrow">Registro clínico integrado</p>
          <h2 id="oncogeriatric-continuity-title">Crie uma consulta para registrar o cuidado desta etapa</h2>
          <p>Medicamentos, evolução SOAP, vacinas, condutas e escalas permanecem no prontuário geral para evitar duplicidade ou divergência de dados.</p>
        </div>
        <a className={styles.primaryLink} href={`/patients/${patientId}`}>Ir ao cadastro do paciente →</a>
      </section>
    );
  }

  const readOnly = consultation.status === "FINALIZED";
  const actions = [
    { hash: "medicamentos", label: "Medicamentos", detail: "Reconciliação, via, frequência e horários" },
    { hash: "soap", label: "Evolução, vacinas e condutas", detail: "SOAP, exames, prevenção e plano por problema" },
    { hash: "escalas", label: "Escalas clínicas", detail: "Instrumentos escolhidos pelo geriatra" },
    { hash: "relatorio", label: "Relatório geral", detail: "Documento integrado da consulta" },
  ] as const;

  return (
    <section className={styles.workspace} aria-labelledby="oncogeriatric-continuity-title">
      <div className={styles.workspaceHeading}>
        <div>
          <p className="eyebrow">Registro clínico integrado</p>
          <h2 id="oncogeriatric-continuity-title">Consulta de trabalho · {clinicalDate(consultation.occurredAt)}</h2>
          <p>Use os mesmos campos do prontuário geral. Esta área apenas organiza o contexto oncológico e não cria registros clínicos paralelos.</p>
        </div>
        <span className={styles.consultationState} data-read-only={readOnly}>
          {readOnly ? "Consulta finalizada · somente leitura" : "Consulta disponível para preenchimento"}
        </span>
      </div>
      <nav className={styles.actionGrid} aria-label="Campos clínicos da consulta de trabalho">
        {actions.map((action) => (
          <a key={action.hash} href={buildOncogeriatricConsultationHref({ consultationId: consultation.id, section: action.hash, episodeId, returnStage })}>
            <strong>{action.label}</strong>
            <span>{action.detail}</span>
            <small>{readOnly ? "Revisar registro →" : "Abrir e preencher →"}</small>
          </a>
        ))}
      </nav>
    </section>
  );
}

export function OncogeriatricDomainReview({
  history,
  workingConsultation,
  episodeId,
  returnStage,
}: {
  history: CapacityDimensionHistory;
  workingConsultation: OncogeriatricWorkingConsultation | null;
  episodeId: string;
  returnStage: OncogeriatricReturnStage;
}) {
  const priorities = buildOncogeriatricDomainReviewPriorities(history);

  return (
    <section className={styles.reviewSection} aria-labelledby="domain-review-reassessment">
      <div className={styles.reviewHeading}>
        <div>
          <p className="eyebrow">Prioridade clínica</p>
          <h2 id="domain-review-reassessment">Domínios que merecem reavaliação durante o tratamento</h2>
        </div>
        <p>As escalas exibidas são as preenchidas na avaliação anterior mais recente do domínio. A reaplicação continua sendo decisão do geriatra.</p>
      </div>

      {priorities.length ? (
        <div className={styles.priorityList}>
          {priorities.map((priority) => (
            <article key={priority.code} className={styles.priorityItem} data-status={priority.status}>
              <div className={styles.priorityCopy}>
                <span className={styles.statusLabel}>{priority.statusLabel}</span>
                <h3>{priority.label}</h3>
                <p>Última avaliação do domínio em {clinicalDate(priority.occurredAt)}</p>
                <ul>
                  {priority.instruments.map((instrument) => (
                    <li key={`${instrument.code}-${instrument.version}`}>
                      <strong>{instrument.name}</strong>
                      <span>{instrument.result}</span>
                      {instrument.selectedForDomainState ? <small>Instrumento prioritário para o estado do domínio</small> : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.priorityActions}>
                {workingConsultation ? (
                  <a className={styles.primaryLink} href={buildOncogeriatricConsultationHref({ consultationId: workingConsultation.id, section: "escalas", episodeId, returnStage })}>
                    {workingConsultation.status === "FINALIZED" ? "Revisar escalas da consulta" : "Abrir escalas na consulta de trabalho"} →
                  </a>
                ) : null}
                {workingConsultation?.id !== priority.consultationId ? (
                  <a href={buildOncogeriatricConsultationHref({ consultationId: priority.consultationId, section: "escalas", episodeId, returnStage })}>Revisar resultado anterior →</a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Nenhum domínio alterado, em atenção ou discordante foi identificado nas consultas vinculadas. O geriatra pode aplicar outras escalas conforme o contexto clínico.</p>
      )}
    </section>
  );
}

const TRAJECTORY_STATUS_LABEL: Record<CapacityDimensionStatus, string> = {
  "not-assessed": "Não avaliada nesta consulta",
  recorded: "Registrada sem estado comparável",
  indeterminate: "Resultados discordantes",
  preserved: "Sem redução detectada",
  attention: "Sinal de atenção",
  altered: "Redução identificada",
};

function cellSummary(
  cell: CapacityDimensionHistory["dimensions"][number]["cells"][number] | undefined,
  dateByConsultation: ReadonlyMap<string, string>,
): ReactNode {
  if (!cell) return <span className={styles.missing}>Sem registro para esta consulta</span>;
  const instruments = cell.assessments.map((assessment) => {
    const score = assessment.scoreText
      ?? (assessment.scoreNumeric === null || assessment.scoreNumeric === undefined ? "resultado registrado" : String(assessment.scoreNumeric));
    return `${assessment.scaleName}: ${score}${assessment.classification ? ` · ${assessment.classification}` : ""} · versão ${assessment.scaleVersion}`;
  });

  return (
    <div className={styles.trajectoryCell}>
      <strong>{clinicalDate(dateByConsultation.get(cell.consultationId) ?? "")}</strong>
      <span className={styles.trajectoryState} data-status={cell.status}>{TRAJECTORY_STATUS_LABEL[cell.status]}</span>
      <span>{cell.statusReason}</span>
      <span>{instruments.length ? instruments.join("; ") : "Nenhum instrumento reaplicado nesta consulta."}</span>
      <small>{cell.comparabilityKey ? `Série comparável: ${cell.comparabilityKey}` : "Sem série comparável para este ponto."}</small>
    </div>
  );
}

export function OncogeriatricTrajectoryTable({ history }: { history: CapacityDimensionHistory }) {
  if (!history.consultations.length) return <p className={styles.empty}>Sem consultas vinculadas a este acompanhamento.</p>;

  const dateByConsultation = new Map(history.consultations.map((item) => [item.id, item.occurredAt]));
  const tableWidth = Math.max(760, 180 + history.consultations.length * 220);

  return (
    <div className={styles.tableWrap} tabIndex={0} aria-label="Tabela cronológica completa da trajetória geriátrica">
      <table className={styles.trajectoryTable} style={{ width: `${tableWidth}px` }}>
        <caption>Histórico cronológico completo por domínio e consulta vinculada ao episódio oncológico</caption>
        <thead>
          <tr>
            <th scope="col">Domínio</th>
            {history.consultations.map((consultation) => (
              <th scope="col" key={consultation.id}>
                {clinicalDate(consultation.occurredAt)}
                {consultation.isTarget ? <small className={styles.currentConsultationLabel}>Mais recente</small> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {history.dimensions.map((dimension) => (
            <tr key={dimension.code}>
              <th scope="row">{dimension.label}</th>
              {history.consultations.map((consultation) => (
                <td key={`${dimension.code}-${consultation.id}`}>
                  {cellSummary(dimension.cells.find((cell) => cell.consultationId === consultation.id), dateByConsultation)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
