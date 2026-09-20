export interface ReportSignatureEligibilityInput {
  consultationStatus: string;
  report: {
    consultationStatus?: unknown;
    draftContext?: unknown;
  };
}

export type ReportSignatureEligibilityCode =
  | "CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE"
  | "FINALIZED_REPORT_SNAPSHOT_REQUIRED";

export function isFinalReportSnapshot(report: ReportSignatureEligibilityInput["report"]): boolean {
  return report.consultationStatus === "FINALIZED" && report.draftContext === false;
}

export function assertFinalReportSignatureEligibility(
  input: ReportSignatureEligibilityInput,
): void {
  if (input.consultationStatus !== "FINALIZED") {
    throw new Error("CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE");
  }
  if (!isFinalReportSnapshot(input.report)) {
    throw new Error("FINALIZED_REPORT_SNAPSHOT_REQUIRED");
  }
}
