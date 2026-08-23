import { notFound } from "next/navigation";
import { MedicationPrintButton } from "@/components/medications/medication-print-button";
import { MEDICATION_MOMENTS, MEDICATION_MOMENT_LABELS } from "@/domain/medication-plan";
import { getMedicationPlanDocument } from "@/server/clinical/medication-plan-document";
import styles from "./page.module.css";

const BRAND_LOGO_PATH = "/brand/natalia-mendes-logo.svg";

function formatDate(value: string | null): string {
  if (!value) return "Não registrada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

export default async function MedicationPlanPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getMedicationPlanDocument(id);
  if (!document) notFound();

  const blocked = document.status !== "READY" || document.needsIdentityReview;

  return (
    <main className={styles.pageShell}>
      <nav className={`${styles.toolbar} no-print`} aria-label="Ações do plano de medicamentos">
        <a href={`/consultations/${document.consultationId}#medicamentos`}>Voltar para a consulta</a>
        <MedicationPrintButton disabled={blocked} />
      </nav>

      <article className={styles.document} aria-labelledby="medication-plan-title">
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <img src={BRAND_LOGO_PATH} alt="Natalia Mendes — Médica Geriatra" />
            <div>
              <strong>Dra. Natalia Mendes</strong>
              <span>Médica Geriatra</span>
            </div>
          </div>
          <div className={styles.titleBlock}>
            <p>Documento independente</p>
            <h1 id="medication-plan-title">Plano de medicamentos</h1>
          </div>
        </header>

        <dl className={styles.identityGrid}>
          <div><dt>Paciente</dt><dd>{document.patientName}</dd></div>
          <div><dt>Data de nascimento</dt><dd>{formatDate(document.patientBirthDate)}</dd></div>
          <div><dt>Data de referência</dt><dd>{formatDate(document.consultationDate)}</dd></div>
        </dl>

        {document.needsIdentityReview ? (
          <div className={styles.blocker} role="alert">
            <strong>Impressão bloqueada: identidade/homônimo pendente de revisão.</strong>
            <p>Confirme a identidade no cadastro do paciente antes de compartilhar este documento.</p>
          </div>
        ) : null}

        {document.status !== "READY" || !document.plan ? (
          <div className={styles.blocker} role="alert">
            <strong>Plano ainda não liberado.</strong>
            <p>{document.message}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.medicationTable} aria-label="Plano de medicamentos vinculado à consulta atual">
              <thead>
                <tr>
                  <th scope="col">Medicamento e dose</th>
                  {MEDICATION_MOMENTS.map((moment) => <th scope="col" key={moment}>{MEDICATION_MOMENT_LABELS[moment]}</th>)}
                  <th scope="col">Observações</th>
                </tr>
              </thead>
              <tbody>
                {document.plan.rows.length > 0 ? document.plan.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      <strong>{row.medicationText}</strong>
                      {row.doseInstruction ? <span>{row.doseInstruction}</span> : null}
                      {row.route ? <small>Via: {row.route}</small> : null}
                    </th>
                    {MEDICATION_MOMENTS.map((moment) => (
                      <td key={`${row.id}-${moment}`} aria-label={`${MEDICATION_MOMENT_LABELS[moment]}: ${row.moments[moment] ? "sim" : "não"}`}>
                        {row.moments[moment] ? "✓" : ""}
                      </td>
                    ))}
                    <td>{row.instructions ?? "—"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={MEDICATION_MOMENTS.length + 2}>Nenhum medicamento ativo reconciliado nesta consulta.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <section className={styles.safetyNote} aria-label="Aviso de segurança">
          Esta tabela organiza o cuidado e não substitui a receita médica. Não inicie, suspenda, substitua ou altere medicamentos por conta própria.
        </section>

        <footer className={styles.footer}>
          <div className={styles.signature}>
            <span aria-hidden="true" />
            <strong>Dra. Natalia Mendes</strong>
            <p>CRM-BA 27416 · RQE 24673</p>
            <small>Assinatura e carimbo</small>
          </div>
        </footer>
      </article>
    </main>
  );
}
