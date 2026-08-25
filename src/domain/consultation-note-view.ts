import type { SoapDraftFields } from "./consultation-note-contract.ts";
import type { ClinicalProblem } from "./problems.ts";
import type { ProfessionalPlanSuggestion } from "./professional-plan-suggestions.ts";
import type { ConsultationExamView } from "./consultation-exams.ts";

export type ConsultationNoteErrorCode =
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "INCOMPATIBLE_PERSISTED_NOTE"
  | "UNSUPPORTED_ASSESSMENT_JSON"
  | "UNKNOWN_PROBLEM"
  | "CONSULTATION_CHANGED";

export class ConsultationNoteError extends Error {
  readonly code: ConsultationNoteErrorCode;

  constructor(code: ConsultationNoteErrorCode, message: string) {
    super(message);
    this.name = "ConsultationNoteError";
    this.code = code;
  }
}

export interface ConsultationNoteView {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  updatedAt: string;
  fields: SoapDraftFields;
  exams: ConsultationExamView;
  problems: Array<Pick<ClinicalProblem, "id" | "type" | "status" | "title">>;
  planSuggestions: ProfessionalPlanSuggestion[];
}
