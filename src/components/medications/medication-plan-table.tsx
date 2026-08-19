import {
  MEDICATION_MOMENTS,
  MEDICATION_MOMENT_LABELS,
  buildMedicationPlanViewModel,
  type MedicationPlanItem,
} from "@/domain/medication-plan";
import styles from "./medication-plan-table.module.css";

function displayOptional(value: string | undefined): string {
  return value?.trim() || "—";
}

export function MedicationPlanTable({
  patientName,
  items,
}: {
  patientName: string;
  items: readonly MedicationPlanItem[];
}) {
  const model = buildMedicationPlanViewModel(patientName, items);

  return (
    <section className={styles.card} aria-labelledby="medication-plan-title">
      <div className={`section-heading ${styles.heading}`}>
        <div>
          <p className="eyebrow">Plano de medicamentos</p>
          <h2 id="medication-plan-title">Horários de {model.patientName}</h2>
        </div>
        <p className="muted">Use somente conforme a orientação médica registrada.</p>
      </div>

      {model.rows.length === 0 ? (
        <p className="muted">Nenhum medicamento registrado neste plano.</p>
      ) : (
        <div className={styles.wrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Medicamento</th>
                <th scope="col">Dose</th>
                <th scope="col">Via</th>
                {MEDICATION_MOMENTS.map((moment) => (
                  <th scope="col" key={moment}>{MEDICATION_MOMENT_LABELS[moment]}</th>
                ))}
                <th scope="col">Observações</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <strong>{row.medicationText}</strong>
                    {row.continuous ? <span className={styles.continuous}>Uso contínuo</span> : null}
                  </th>
                  <td>{displayOptional(row.doseInstruction)}</td>
                  <td>{displayOptional(row.route)}</td>
                  {MEDICATION_MOMENTS.map((moment) => {
                    const selected = row.moments[moment];
                    return (
                      <td className={styles.moment} key={moment}>
                        <span
                          className={`${styles.check} ${selected ? styles.selected : ""}`}
                          aria-label={selected ? `${MEDICATION_MOMENT_LABELS[moment]} selecionado` : `${MEDICATION_MOMENT_LABELS[moment]} não selecionado`}
                        >
                          {selected ? "✓" : "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td>{displayOptional(row.instructions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
