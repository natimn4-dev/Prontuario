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
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>Medicações em uso</p>
          <h2 id="medication-plan-title">Tabela de medicações</h2>
          <p className={styles.description}>Lista estruturada dos medicamentos em uso atual pelo paciente.</p>
        </div>
        <div className={styles.patientIdentity}>
          <span>Paciente</span>
          <strong>{model.patientName}</strong>
        </div>
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
                          {selected ? "✓" : ""}
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
