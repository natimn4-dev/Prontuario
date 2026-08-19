import type { MedicationLifecycleStatus } from "../../domain/medication-status-history.ts";
import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../auth/access-errors.ts";
import { MedicationStatusWriteError } from "./medication-status-write-service.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDENTIFIER_LENGTH = 191;
const ALLOWED_STATUSES = new Set<MedicationLifecycleStatus>([
  "ACTIVE",
  "SUSPENDED",
  "FINISHED",
]);

export class MedicationStatusRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MedicationStatusRequestError";
  }
}

export interface MedicationStatusCommand {
  medicationId: string;
  newStatus: MedicationLifecycleStatus;
}

type MedicationStatusOperation = (input: {
  consultationId: string;
  medicationId: string;
  newStatus: MedicationLifecycleStatus;
  requestId?: string;
}) => Promise<unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MedicationStatusRequestError("Requisição inválida.");
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(body: Record<string, unknown>): void {
  const allowed = new Set(["medicationId", "newStatus"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    throw new MedicationStatusRequestError(
      "A requisição contém campos não permitidos para alteração de status do medicamento.",
    );
  }
}

export function parseMedicationStatusCommand(body: unknown): MedicationStatusCommand {
  const record = asRecord(body);
  assertOnlyKeys(record);

  if (typeof record.medicationId !== "string") {
    throw new MedicationStatusRequestError("Medicamento inválido.");
  }
  const medicationId = record.medicationId.trim();
  if (!medicationId || medicationId.length > MAX_IDENTIFIER_LENGTH || /[\r\n\0]/.test(medicationId)) {
    throw new MedicationStatusRequestError("Medicamento inválido.");
  }

  if (typeof record.newStatus !== "string" || !ALLOWED_STATUSES.has(record.newStatus as MedicationLifecycleStatus)) {
    throw new MedicationStatusRequestError("Status de medicamento inválido.");
  }

  return {
    medicationId,
    newStatus: record.newStatus as MedicationLifecycleStatus,
  };
}

async function safeCommand(request: Request): Promise<MedicationStatusCommand> {
  try {
    return parseMedicationStatusCommand(await request.json());
  } catch (error) {
    if (error instanceof MedicationStatusRequestError) throw error;
    throw new MedicationStatusRequestError("Requisição inválida.");
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
  if (error instanceof MedicationStatusRequestError) {
    return json({ code: "INVALID_REQUEST", message: error.message }, 400);
  }
  if (error instanceof MedicationStatusWriteError) {
    const status = error.code === "CONSULTATION_NOT_FOUND" || error.code === "MEDICATION_NOT_FOUND"
      ? 404
      : 409;
    return json({ code: error.code, message: error.message }, status);
  }
  if (error instanceof AuthenticationRequiredError) {
    return json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, 401);
  }
  if (error instanceof AccessForbiddenError) {
    return json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, 403);
  }
  return json({
    code: "MEDICATION_STATUS_UPDATE_FAILED",
    message: "Não foi possível atualizar o status do medicamento.",
  }, 500);
}

export function medicationStatusHttpHandlers(recordStatusChange: MedicationStatusOperation) {
  return {
    POST: async (request: Request, consultationId: string): Promise<Response> => {
      try {
        const command = await safeCommand(request);
        const result = await recordStatusChange({
          consultationId,
          medicationId: command.medicationId,
          newStatus: command.newStatus,
          requestId: requestId(request),
        });
        return json(result, 200);
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
