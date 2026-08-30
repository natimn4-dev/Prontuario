"use client";

import type { ProfessionalIdentity } from "@/domain/professional-identity";
import { AgaReportDocumentPreview } from "./aga-report-document-preview";
import { VidaasSignaturePanel } from "./vidaas-signature-panel";
import styles from "./report-workspace-tabs.module.css";

export function ReportWorkspaceTabs({
  consultationId,
  professionalIdentity,
}: {
  consultationId: string;
  professionalIdentity: ProfessionalIdentity;
}) {
  return (
    <section className={styles.shell} aria-label="Relatório final da consulta">
      <AgaReportDocumentPreview consultationId={consultationId} professionalIdentity={professionalIdentity} />
      <VidaasSignaturePanel consultationId={consultationId} />
    </section>
  );
}
