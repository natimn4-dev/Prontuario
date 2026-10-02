"use client";

import { useState } from "react";
import type { AgaReportConsultationStatus } from "@/domain/aga-report";
import type { GeneratedReportResponse } from "./aga-report-document-preview";
import type { ProfessionalIdentity } from "@/domain/professional-identity";
import { AgaReportDocumentPreview } from "./aga-report-document-preview";
import { VidaasSignaturePanel } from "./vidaas-signature-panel";
import type { ReportSigningSnapshot } from "./report-signing-snapshot";
import styles from "./report-workspace-tabs.module.css";

export function ReportWorkspaceTabs({
  consultationId,
  consultationStatus,
  professionalIdentity,
  initialReport,
  onGeneratedReportChange,
}: {
  consultationId: string;
  consultationStatus: AgaReportConsultationStatus;
  professionalIdentity: ProfessionalIdentity;
  initialReport: GeneratedReportResponse | null;
  onGeneratedReportChange: (report: GeneratedReportResponse | null) => void;
}) {
  const [signingSnapshot, setSigningSnapshot] = useState<ReportSigningSnapshot | null>(initialReport ? {
    id: initialReport.snapshot.id,
    version: initialReport.snapshot.version,
    consultationStatus: initialReport.report.consultationStatus,
    draftContext: initialReport.report.draftContext,
    hasAdvanceDirectives: Boolean(initialReport.report.advanceDirectives),
  } : null);
  const [preparationRequest, setPreparationRequest] = useState(0);
  const [preparing, setPreparing] = useState(false);

  return (
    <section className={styles.shell} aria-label="Relatório final da consulta">
      <AgaReportDocumentPreview
        consultationId={consultationId}
        consultationStatus={consultationStatus}
        initialReport={initialReport}
        preparationRequest={preparationRequest}
        onPreparingChange={setPreparing}
        onGeneratedReportChange={onGeneratedReportChange}
        professionalIdentity={professionalIdentity}
        onSigningSnapshotChange={setSigningSnapshot}
      />
      <VidaasSignaturePanel
        consultationId={consultationId}
        consultationStatus={consultationStatus}
        snapshot={signingSnapshot}
        preparing={preparing}
        onPreparePreview={() => setPreparationRequest((value) => value + 1)}
      />
    </section>
  );
}
