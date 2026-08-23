import { notFound } from "next/navigation";
import { ConsultationFinalizationPanel } from "@/components/consultations/consultation-finalization-panel";
import { ConsultationSectionNav } from "@/components/consultations/consultation-section-nav";
import { SoapEditor } from "@/components/consultations/soap-editor";
import { MedicationWorkspace } from "@/components/medications/medication-workspace";
import { ProblemWorkspace } from "@/components/problems/problem-workspace";
import { AgaReportDocumentPreview } from "@/components/reports/aga-report-document-preview";
import { ClinicalScalesWorkspace } from "@/components/scales/clinical-scales-workspace";
import { buildConsultationContextViewModel } from "@/domain/consultation-context";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import styles from "./page.module.css";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthenticatedUser("patient.read");
  const { id } = await params;
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      occurredAt: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          birthDate: true,
          needsIdentityReview: true,
        },
      },
    },
  });
  if (!consultation) notFound();

  const context = buildConsultationContextViewModel({
    consultationId: consultation.id,
    type: consultation.type,
    status: consultation.status,
    occurredAt: consultation.occurredAt,
    patient: consultation.patient,
  });

  return (
    <main className={`shell consultation-shell ${styles.consultationShell}`}>
      <div className={`consultation-layout ${styles.consultationLayout}`}>
        <aside className={`consultation-sidebar ${styles.sidebarColumn}`}>
          <ConsultationSectionNav
            patientName={context.patientName}
            patientBirthDateLabel={context.patientBirthDateLabel}
            consultationDateLabel={context.consultationDateLabel}
            consultationStatusLabel={context.consultationStatusLabel}
          />
        </aside>

        <div className={`consultation-content ${styles.contentColumn}`}>
          <div className={`consultation-workspace-topbar ${styles.workspaceTopbar}`} aria-label="Contexto do workspace">
            <span>Paciente <b aria-hidden="true">›</b> Consulta <b aria-hidden="true">›</b> {context.consultationTypeLabel}</span>
            <span className={styles.savedState}>Dados vinculados à consulta atual</span>
          </div>

          <section id="resumo-consulta" className={`consultation-section ${styles.sectionAnchor}`} aria-labelledby="consultation-title">
            <header className={`hero compact-hero clinical-hero ${styles.clinicalHero}`}>
              <p className="eyebrow">Consulta geriátrica longitudinal</p>
              <div className={styles.identityHeading}>
                <div>
                  <h1 id="consultation-title">{context.patientName}</h1>
                  <p className={styles.subtitle}>Centro de cuidado e evolução</p>
                </div>
                <span className={styles.statusBadge} data-status={consultation.status}>
                  {context.consultationStatusLabel}
                </span>
              </div>

              <dl className={styles.contextGrid} aria-label="Identificação da consulta atual">
                <div>
                  <dt>Data de nascimento</dt>
                  <dd>{context.patientBirthDateLabel}</dd>
                </div>
                <div>
                  <dt>Tipo de consulta</dt>
                  <dd>{context.consultationTypeLabel}</dd>
                </div>
                <div>
                  <dt>Data da consulta</dt>
                  <dd>{context.consultationDateLabel}</dd>
                </div>
              </dl>

              {context.needsIdentityReview ? (
                <div className={styles.identityWarning} role="alert">
                  <strong>Identidade/homônimo pendente de revisão</strong>
                  <span>Confirme a identidade no cadastro do paciente antes de emitir ou compartilhar documentos.</span>
                </div>
              ) : null}

              <div className={styles.heroFooter}>
                <a className={styles.patientLink} href={`/patients/${context.patientId}`}>
                  Voltar ao cadastro do paciente
                </a>
                <p className={styles.intro}>
                  Use a navegação lateral para preencher a consulta por etapas e manter o contexto clínico sempre visível.
                </p>
              </div>
            </header>
          </section>

          <section id="problemas" className={`consultation-section ${styles.sectionAnchor}`} aria-label="Problemas clínicos e geriátricos">
            <ProblemWorkspace consultationId={id} />
          </section>

          <section id="medicamentos" className={`consultation-section ${styles.sectionAnchor}`} aria-label="Medicamentos">
            <MedicationWorkspace consultationId={id} patientName={context.patientName} />
          </section>

          <section id="soap" className={`consultation-section ${styles.sectionAnchor}`} aria-label="SOAP e AGA">
            <SoapEditor consultationId={id} />
          </section>

          <section id="escalas" className={`consultation-section ${styles.sectionAnchor}`} aria-label="Escalas clínicas">
            <ClinicalScalesWorkspace consultationId={id} />
          </section>

          <section id="relatorio" className={`consultation-section consultation-report-section ${styles.sectionAnchor}`} aria-label="Relatório final">
            <AgaReportDocumentPreview consultationId={id} />
          </section>

          <section id="finalizacao" className={`consultation-section ${styles.sectionAnchor}`} aria-label="Revisão e finalização">
            <ConsultationFinalizationPanel consultationId={id} />
          </section>
        </div>
      </div>
    </main>
  );
}
