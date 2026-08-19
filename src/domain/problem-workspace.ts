import type { ProblemStatus, ProblemType } from "./problems.ts";
export type { ProblemStatus, ProblemType } from "./problems.ts";

export type ProblemWorkspaceErrorCode =
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "RETROSPECTIVE_EDIT_BLOCKED"
  | "PROBLEM_NOT_FOUND"
  | "PROBLEM_CHANGED";

export class ProblemWorkspaceError extends Error {
  readonly code: ProblemWorkspaceErrorCode;

  constructor(code: ProblemWorkspaceErrorCode, message: string) {
    super(message);
    this.name = "ProblemWorkspaceError";
    this.code = code;
  }
}

export interface ProblemWorkspaceItem {
  id: string;
  type: ProblemType;
  status: ProblemStatus;
  title: string;
  description?: string;
  priority?: number;
}

export interface ProblemWorkspaceView {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
  problems: ProblemWorkspaceItem[];
}

export interface CreateProblemCommand {
  consultationId: string;
  type: ProblemType;
  title: string;
  description?: string;
  requestId?: string;
}

export interface ChangeProblemStatusCommand {
  consultationId: string;
  problemId: string;
  newStatus: ProblemStatus;
  requestId?: string;
}

export function assertProblemWorkspaceEditable(input: {
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
}): void {
  if (input.consultationStatus === "FINALIZED") {
    throw new ProblemWorkspaceError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
  }
  if (!input.isLatestConsultation) {
    throw new ProblemWorkspaceError(
      "RETROSPECTIVE_EDIT_BLOCKED",
      "Problemas não podem ser alterados retrospectivamente quando já existe consulta posterior.",
    );
  }
}
