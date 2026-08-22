import type {
  CapacityDimensionHistory,
  CapacityDimensionStatus,
} from "@/domain/capacity-dimension-history";
import styles from "./capacity-dimension-history-chart.module.css";

const STATUS_LABEL: Record<CapacityDimensionStatus, string> = {
  "not-assessed": "Não avaliada",
  recorded: "Registrada",
  preserved: "Preservada",
  attention: "Atenção",
  altered: "Alterada",
};

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

export function CapacityDimensionHistoryChart({
  history,
  context,
}: {
  history: CapacityDimensionHistory;
  context: "patient-home" | "final-report";
}) {
  if (!history.hasAssessmentData || history.consultations.length === 0) {
    return (
      <p className={styles.empty}>
        Ainda não há avaliações suficientes de capacidade intrínseca ou funcional para compor o gráfico longitudinal.
      </p>
    );
  }

  const description = context === "final-report"
    ? "Inclui a consulta deste relatório e as consultas anteriores disponíveis no horizonte longitudinal."
    : "Inclui todas as consultas com avaliações já preenchidas; a consulta mais recente aparece assim que houver dados registrados.";

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.caption}>
        <strong>Evolução da capacidade intrínseca e funcional</strong>
        <span>{description}</span>
      </figcaption>

      <div className={styles.scroll} tabIndex={0} aria-label="Gráfico longitudinal rolável por consulta">
        <table className={styles.table} aria-label="Evolução longitudinal por dimensão da capacidade intrínseca e funcional">
          <thead>
            <tr>
              <th scope="col">Dimensão</th>
              {history.consultations.map((consultation) => (
                <th scope="col" key={consultation.id}>
                  <span className={styles.dateHeader}>
                    <span>{displayDate(consultation.occurredAt)}</span>
                    {consultation.isTarget ? <small>{context === "final-report" ? "Consulta atual" : "Mais recente"}</small> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.dimensions.map((dimension) => (
              <tr key={dimension.code}>
                <th scope="row">
                  {dimension.label}
                  <div className={styles.instrumentList}>
                    <span>{dimension.framework === "functional-capacity" ? "Capacidade funcional" : "Capacidade intrínseca"}</span>
                  </div>
                </th>
                {dimension.cells.map((cell) => (
                  <td className={styles.cell} key={`${dimension.code}-${cell.consultationId}`}>
                    <span className={styles.status} data-status={cell.status}>{STATUS_LABEL[cell.status]}</span>
                    {cell.assessments.length > 0 ? (
                      <span className={styles.instrumentList}>
                        {cell.assessments.map((assessment) => <span key={assessment.scaleCode}>{assessment.scaleName}</span>)}
                      </span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.legend} aria-label="Legenda do gráfico">
        {(["preserved", "attention", "altered", "recorded", "not-assessed"] as const).map((status) => (
          <span key={status}><i className={styles.dot} data-status={status} aria-hidden="true" />{STATUS_LABEL[status]}</span>
        ))}
      </div>
      <p className={styles.frameworkNote}>
        O gráfico não soma nem faz média entre escalas diferentes. Quando mais de um instrumento foi aplicado na mesma dimensão e consulta, é exibido o maior nível de atenção já registrado, mantendo os instrumentos identificados.
      </p>
    </figure>
  );
}
