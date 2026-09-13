import { notFound } from "next/navigation";
import { assertPatientAccessForUser } from "@/server/auth/patient-access";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import type { DementiaReportSnapshotContent } from "@/server/clinical/generate-dementia-report";
import { DementiaReportPrintButton } from "./print-button";
import styles from "./page.module.css";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(value);
}

export default async function DementiaReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAuthenticatedUser("patient.read");
  const { id } = await params;
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    select: {
      id: true,
      patientId: true,
      occurredAt: true,
      patient: { select: { fullName: true, birthDate: true, needsIdentityReview: true } },
    },
  });
  if (!consultation) notFound();
  await assertPatientAccessForUser(user, consultation.patientId);
  const snapshot = await prisma.documentSnapshot.findFirst({
    where: { patientId: consultation.patientId, consultationId: consultation.id, type: "DEMENTIA_REPORT" },
    orderBy: { version: "desc" },
    select: { version: true, content: true, createdAt: true, generatedBy: { select: { name: true } } },
  });
  if (!snapshot) notFound();
  const content = snapshot.content as unknown as DementiaReportSnapshotContent;

  return (
    <main className={styles.page}>
      <nav className={`${styles.actions} no-print`} aria-label="Ações do relatório">
        <a href={`/consultations/${id}#demencia`}>← Retornar à avaliação cognitiva</a>
        <DementiaReportPrintButton />
      </nav>
      <article className={styles.document}>
        <header>
          <p>Prontuário Aprimorado</p>
          <h1>Avaliação cognitiva e investigação etiológica</h1>
          <dl>
            <div><dt>Paciente</dt><dd>{consultation.patient.fullName}</dd></div>
            <div><dt>Data da consulta</dt><dd>{formatDate(consultation.occurredAt)}</dd></div>
            <div><dt>Versão do documento</dt><dd>{snapshot.version}</dd></div>
            <div><dt>Revisado por</dt><dd>{snapshot.generatedBy?.name ?? user.name}</dd></div>
          </dl>
          {consultation.patient.needsIdentityReview ? <p className={styles.warning}>Identidade pendente de confirmação. Não compartilhar até revisar o cadastro.</p> : null}
        </header>
        <section aria-label="Conteúdo do relatório">
          {content.reportText.split(/\n/).map((line, index) => line.trim()
            ? <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
            : <div key={`space-${index}`} className={styles.space} aria-hidden="true" />)}
        </section>
        <footer>
          <p>Documento gerado a partir do registro clínico versionado {content.assessmentVersion}. O conteúdo foi explicitamente revisado antes da geração.</p>
          <p>Gerado em {formatDate(snapshot.createdAt)} · Protocolo {content.protocolVersion}</p>
        </footer>
      </article>
    </main>
  );
}
