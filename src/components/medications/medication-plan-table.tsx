import {
  MEDICATION_MOMENTS,
  MEDICATION_MOMENT_LABELS,
  validateMedicationPlan,
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
  const medications = validateMedicationPlan(items);

  return (
    <section className={styles.card} aria-labelledby="medication-plan-title">
      <div className={`section-heading ${styles.heading}`}>
        <div>
          <p className="eyebrow">Plano de medicamentos</p>
          <h2 id="medication-plan-title">Horários de {patientName}</h2>
        </div>
        <p className="muted">Use somente conforme a orientação médica registrada.</p>
      </div>

      {medications.length === 0 ? (
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
              {medications.map((item) => (
                <tr key={item.id}>
                  <th scope="row">
                    <strong>{item.medicationText}</strong>
                    {item.continuous ? <span className={styles.continuous}>Uso contínuo</span> : null}
                  </th>
                  <td>{displayOptional(item.doseInstruction)}</td>
                  <td>{displayOptional(item.route)}</td>
                  {MEDICATION_MOMENTS.map((moment) => {
                    const selected = item.moments.includes(moment);
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
                  <td>{displayOptional(item.instructions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
