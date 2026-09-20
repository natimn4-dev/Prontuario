"use client";

import { useState } from "react";
import type { ProfessionalIdentity } from "@/domain/professional-identity";
import { AgaReportDocumentPreview } from "./aga-report-document-preview";
import { VidaasSignaturePanel } from "./vidaas-signature-panel";
import type { ReportSigningSnapshot } from "./report-signing-snapshot";
import styles from "./report-workspace-tabs.module.css";

export function ReportWorkspaceTabs({
  consultationId,
  professionalIdentity,
}: {
  consultationId: string;
  professionalIdentity: ProfessionalIdentity;
}) {
  const [signingSnapshot, setSigningSnapshot] = useState<ReportSigningSnapshot | null>(null);

  return (
    <section className={styles.shell} aria-label="Relatório final da consulta">
      <AgaReportDocumentPreview
        consultationId={consultationId}
        professionalIdentity={professionalIdentity}
        onSigningSnapshotChange={setSigningSnapshot}
      />
      <VidaasSignaturePanel consultationId={consultationId} snapshot={signingSnapshot} />
    </section>
  );
}
