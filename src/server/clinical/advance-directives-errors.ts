export type AdvanceDirectiveErrorCode =
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "ADVANCE_DIRECTIVE_CHANGED";

export class AdvanceDirectiveError extends Error {
  readonly code: AdvanceDirectiveErrorCode;

  constructor(code: AdvanceDirectiveErrorCode, message: string) {
    super(message);
    this.name = "AdvanceDirectiveError";
    this.code = code;
  }
}
