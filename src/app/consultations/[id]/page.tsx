import { notFound } from "next/navigation";
import { ConsultationFinalizationPanel } from "@/components/consultations/consultation-finalization-panel";
import { ConsultationSectionNav } from "@/components/consultations/consultation-section-nav";
import { SoapEditor } from "@/components/consultations/soap-editor";
import { MedicationWorkspace } from "@/components/medications/medication-workspace";
import { ProblemWorkspace } from "@/components/problems/problem-workspace";
import { AgaReportPreview } from "@/components/reports/aga-report-preview";
import { ClinicalScalesWorkspace } from "@/components/scales/clinical-scales-workspace";
import { buildConsultationContextViewModel } from "@/domain/consultation-context";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import styles from "./page.module.css";

const BRAND_LOGO_PATH = "/brand/natalia-mendes-logo.svg";

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
    <main className={`shell ${styles.consultationShell}`}>
      <header className={styles.clinicalTopbar} aria-label="Contexto da consulta">
        <a className={styles.brandLink} href="/" aria-label="Voltar para página inicial">
          <img src={BRAND_LOGO_PATH} alt="Natalia Mendes — Médica Geriatra" />
        </a>
        <nav className={styles.flowBreadcrumbs} aria-label="Fluxo clínico">
          <a href={`/patients/${context.patientId}`}>Paciente</a>
          <span aria-hidden="true">›</span>
          <a href="#resumo-consulta">Consulta</a>
          <span aria-hidden="true">›</span>
          <a href="#escalas">Avaliação</a>
          <span aria-hidden="true">›</span>
          <a href="#relatorio">Documentos</a>
        </nav>
        <div className={styles.topbarActions}>
          <span className={styles.topbarStatus} data-status={consultation.status}>
            {context.consultationStatusLabel}
          </span>
          <a className={styles.finalizeShortcut} href="#finalizacao">Finalizar consulta</a>
        </div>
      </header>

      <div className={styles.consultationLayout}>
        <aside className={styles.sidebarColumn}>
          <ConsultationSectionNav />
        </aside>

        <div className={styles.contentColumn}>
          <section id="resumo-consulta" className={styles.sectionAnchor} aria-labelledby="consultation-title">
            <header className={`hero compact-hero clinical-hero ${styles.patientHero}`}>
              <div className={styles.heroKickerRow}>
                <p className="eyebrow">Consulta geriátrica longitudinal</p>
                <a className={styles.patientLink} href={`/patients/${context.patientId}`}>
                  Ver cadastro e histórico
                </a>
              </div>

              <div className={styles.identityHeading}>
                <div className={styles.patientIdentityBlock}>
                  <span className={styles.patientAvatar} aria-hidden="true">○</span>
                  <div>
                    <h1 id="consultation-title">{context.patientName}</h1>
                    <p className={styles.subtitle}>Avaliação Geriátrica Ampla · acompanhamento longitudinal</p>
                  </div>
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
            </header>
          </section>

          <section id="problemas" className={styles.sectionAnchor} aria-label="Problemas clínicos e geriátricos">
            <ProblemWorkspace consultationId={id} />
          </section>

          <section id="medicamentos" className={styles.sectionAnchor} aria-label="Medicamentos">
            <MedicationWorkspace consultationId={id} patientName={context.patientName} />
          </section>

          <section id="soap" className={styles.sectionAnchor} aria-label="SOAP e AGA">
            <SoapEditor consultationId={id} />
          </section>

          <section id="escalas" className={styles.sectionAnchor} aria-label="Escalas clínicas">
            <ClinicalScalesWorkspace consultationId={id} />
          </section>

          <section id="relatorio" className={styles.sectionAnchor} aria-label="Relatório final">
            <AgaReportPreview consultationId={id} />
          </section>

          <section id="finalizacao" className={styles.sectionAnchor} aria-label="Revisão e finalização">
            <ConsultationFinalizationPanel consultationId={id} />
          </section>
        </div>
      </div>
    </main>
  );
}
