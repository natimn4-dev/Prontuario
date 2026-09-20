import type { AgaReportConsultationStatus } from "@/domain/aga-report";

export interface ReportSigningSnapshot {
  id: string;
  version: number;
  consultationStatus: AgaReportConsultationStatus;
  draftContext: boolean;
  hasAdvanceDirectives: boolean;
}
