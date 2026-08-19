import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../auth/access-errors.ts";
import {
  ConsultationWorkflowError,
  type ConsultationWorkflowView,
} from "./consultation-finalization-service.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ACKNOWLEDGED_ALERTS = 100;

export class ConsultationWorkflowRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsultationWorkflowRequestError";
  }
}

type StartReviewCommand = { action: "start-review" };
type FinalizeCommand = {
  action: "finalize";
  clinicalReviewConfirmed: boolean;
  acknowledgedUrgentAlertCodes: string[];
};
export type ConsultationWorkflowCommand = StartReviewCommand | FinalizeCommand;

type WorkflowOperations = {
  getWorkflowState(consultationId: string): Promise<ConsultationWorkflowView>;
  startReview(input: { consultationId: string; requestId?: string }): Promise<ConsultationWorkflowView>;
  finalize(input: {
    consultationId: string;
    clinicalReviewConfirmed: boolean;
    acknowledgedUrgentAlertCodes: readonly string[];
    requestId?: string;
  }): Promise<ConsultationWorkflowView>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConsultationWorkflowRequestError("Requisição inválida.");
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(
  body: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(body).filter((key) => !allowedSet.has(key));
  if (unexpected.length > 0) {
    throw new ConsultationWorkflowRequestError(
      "A requisição contém campos não permitidos para o workflow da consulta.",
    );
  }
}

export function parseConsultationWorkflowCommand(body: unknown): ConsultationWorkflowCommand {
  const record = asRecord(body);
  if (record.action === "start-review") {
    assertOnlyKeys(record, ["action"]);
    return { action: "start-review" };
  }

  if (record.action === "finalize") {
    assertOnlyKeys(record, ["action", "clinicalReviewConfirmed", "acknowledgedUrgentAlertCodes"]);
    if (typeof record.clinicalReviewConfirmed !== "boolean") {
      throw new ConsultationWorkflowRequestError("Informe a confirmação da revisão clínica final.");
    }
    if (!Array.isArray(record.acknowledgedUrgentAlertCodes)) {
      throw new ConsultationWorkflowRequestError("Informe os alertas urgentes revisados.");
    }
    if (record.acknowledgedUrgentAlertCodes.length > MAX_ACKNOWLEDGED_ALERTS) {
      throw new ConsultationWorkflowRequestError("Quantidade inválida de alertas revisados.");
    }

    const codes = record.acknowledgedUrgentAlertCodes.map((value) => {
      if (typeof value !== "string" || !value.trim()) {
        throw new ConsultationWorkflowRequestError("Código de alerta urgente inválido.");
      }
      return value.trim();
    });

    return {
      action: "finalize",
      clinicalReviewConfirmed: record.clinicalReviewConfirmed,
      acknowledgedUrgentAlertCodes: [...new Set(codes)],
    };
  }

  throw new ConsultationWorkflowRequestError("Ação de workflow inválida.");
}

async function safeCommand(request: Request): Promise<ConsultationWorkflowCommand> {
  try {
    return parseConsultationWorkflowCommand(await request.json());
  } catch (error) {
    if (error instanceof ConsultationWorkflowRequestError) throw error;
    throw new ConsultationWorkflowRequestError("Requisição inválida.");
  }
}

function requestId(request: Request): string | undefined {
  const value = request.headers.get("x-request-id");
  return value && OPERATIONAL_REQUEST_ID.test(value) ? value : undefined;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ConsultationWorkflowRequestError) {
    return json({ code: "INVALID_REQUEST", message: error.message }, 400);
  }
  if (error instanceof ConsultationWorkflowError) {
    return json(
      { code: error.code, message: error.message },
      error.code === "CONSULTATION_NOT_FOUND" ? 404 : 409,
    );
  }
  if (error instanceof AuthenticationRequiredError) {
    return json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, 401);
  }
  if (error instanceof AccessForbiddenError) {
    return json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, 403);
  }
  return json(
    { code: "CONSULTATION_WORKFLOW_FAILED", message: "Não foi possível atualizar o estado da consulta." },
    500,
  );
}

export function consultationWorkflowHttpHandlers(operations: WorkflowOperations) {
  return {
    GET: async (_request: Request, consultationId: string): Promise<Response> => {
      try {
        return json(await operations.getWorkflowState(consultationId), 200);
      } catch (error) {
        return errorResponse(error);
      }
    },
    POST: async (request: Request, consultationId: string): Promise<Response> => {
      try {
        const command = await safeCommand(request);
        const operationalRequestId = requestId(request);
        const state = command.action === "start-review"
          ? await operations.startReview({ consultationId, requestId: operationalRequestId })
          : await operations.finalize({
              consultationId,
              clinicalReviewConfirmed: command.clinicalReviewConfirmed,
              acknowledgedUrgentAlertCodes: command.acknowledgedUrgentAlertCodes,
              requestId: operationalRequestId,
            });
        return json(state, 200);
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
