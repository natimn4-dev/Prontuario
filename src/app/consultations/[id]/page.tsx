import { notFound } from "next/navigation";
import { ConsultationWorkspace } from "@/components/consultations/consultation-workspace";
import { buildConsultationContextViewModel } from "@/domain/consultation-context";
import {
  buildOncogeriatricReturnPath,
  oncogeriatricReturnLabel,
  parseOncogeriatricReturnStage,
} from "@/domain/oncogeriatria/return-navigation";
import { buildProfessionalIdentity } from "@/domain/professional-identity";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import styles from "./page.module.css";

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConsultationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oncogeriatriaReturn?: string | string[]; episode?: string | string[] }>;
}) {
  const { user } = await requireAuthenticatedUser("patient.read");
  const professionalIdentity = buildProfessionalIdentity({
    name: user.name,
    email: user.email,
    brandOwnerEmail: process.env.PROFESSIONAL_BRAND_OWNER_EMAIL,
  });
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
  const query = await searchParams;
  const returnStage = parseOncogeriatricReturnStage(firstQueryValue(query.oncogeriatriaReturn));
  const episodeId = firstQueryValue(query.episode);
  const returnEpisode = returnStage && episodeId
    ? await prisma.oncogeriatricEpisode.findFirst({
      where: { id: episodeId, patientId: context.patientId },
      select: { id: true },
    })
    : null;
  const returnContext = returnStage && returnEpisode
    ? {
      href: buildOncogeriatricReturnPath({
        patientId: context.patientId,
        episodeId: returnEpisode.id,
        stage: returnStage,
      }),
      label: oncogeriatricReturnLabel(returnStage),
    }
    : undefined;

  return (
    <main className={`shell consultation-shell ${styles.consultationShell}`}>
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
                A consulta foi organizada em etapas. Apenas a área em uso é carregada inicialmente; ao trocar de etapa, os rascunhos já abertos permanecem preservados.
              </p>
            </div>
          </header>
        </section>

        <ConsultationWorkspace
          consultationId={id}
          patientName={context.patientName}
          professionalIdentity={professionalIdentity}
          returnContext={returnContext}
        />
      </div>
    </main>
  );
}
