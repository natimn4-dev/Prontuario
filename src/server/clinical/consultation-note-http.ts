import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../auth/access-errors.ts";
import {
  ConsultationNoteError,
  type ConsultationNoteView,
} from "../../domain/consultation-note-view.ts";
import type { SoapDraftFields } from "../../domain/consultation-note-contract.ts";
import {
  normalizeVaccinationReview,
  type VaccinationReview,
} from "../../domain/vaccination-prevention.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FIELD_LENGTH = 30000;
const MAX_PLAN_PROBLEMS = 100;
const MAX_ACTIONS_PER_PROBLEM = 20;
const MAX_ACTION_LENGTH = 5000;
const MAX_PENDING_VACCINES = 30;
const MAX_VACCINE_NAME_LENGTH = 200;

export class ConsultationNoteRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsultationNoteRequestError";
  }
}

type Operations = {
  getConsultationNote(consultationId: string): Promise<ConsultationNoteView>;
  saveConsultationNote(input: {
    consultationId: string;
    expectedUpdatedAt: string;
    fields: SoapDraftFields;
    requestId?: string;
  }): Promise<ConsultationNoteView>;
};

function asRecord(value: unknown, label = "Requisição"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConsultationNoteRequestError(`${label} inválida.`);
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const allowedSet = new Set(allowed);
  if (Object.keys(record).some((key) => !allowedSet.has(key))) {
    throw new ConsultationNoteRequestError(`${label} contém campos não permitidos.`);
  }
}

function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > MAX_FIELD_LENGTH) {
    throw new ConsultationNoteRequestError(`${label} inválido.`);
  }
  return value;
}

function parsePlan(value: unknown): Record<string, readonly string[]> | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "Plano por problema");
  const entries = Object.entries(record);
  if (entries.length > MAX_PLAN_PROBLEMS) {
    throw new ConsultationNoteRequestError("Plano contém problemas demais para uma única atualização.");
  }

  const parsed: Record<string, readonly string[]> = {};
  for (const [problemId, rawActions] of entries) {
    if (!problemId.trim() || problemId.length > 191 || !Array.isArray(rawActions)) {
      throw new ConsultationNoteRequestError("Plano por problema inválido.");
    }
    if (rawActions.length > MAX_ACTIONS_PER_PROBLEM) {
      throw new ConsultationNoteRequestError("Plano contém ações demais para um único problema.");
    }
    const actions = rawActions.map((action) => {
      if (typeof action !== "string" || action.length > MAX_ACTION_LENGTH) {
        throw new ConsultationNoteRequestError("Ação do plano inválida.");
      }
      return action;
    });
    parsed[problemId] = actions;
  }
  return parsed;
}

function parseVaccinationReview(value: unknown): VaccinationReview | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "Revisão vacinal");
  assertOnlyKeys(record, ["status", "pendingVaccines"], "Revisão vacinal");
  if (typeof record.status !== "string" || !["UNKNOWN", "UP_TO_DATE", "PENDING"].includes(record.status)) {
    throw new ConsultationNoteRequestError("Status da revisão vacinal inválido.");
  }
  if (record.pendingVaccines !== undefined && !Array.isArray(record.pendingVaccines)) {
    throw new ConsultationNoteRequestError("Vacinas pendentes devem ser uma lista de textos.");
  }
  const pendingVaccines = record.pendingVaccines ?? [];
  if (pendingVaccines.length > MAX_PENDING_VACCINES) {
    throw new ConsultationNoteRequestError("Há vacinas pendentes demais para uma única atualização.");
  }
  const names = pendingVaccines.map((name) => {
    if (typeof name !== "string" || name.length > MAX_VACCINE_NAME_LENGTH) {
      throw new ConsultationNoteRequestError("Nome de vacina pendente inválido.");
    }
    return name;
  });

  try {
    return normalizeVaccinationReview({
      status: record.status as VaccinationReview["status"],
      ...(names.length > 0 ? { pendingVaccines: names } : {}),
    });
  } catch (error) {
    throw new ConsultationNoteRequestError(
      error instanceof Error ? error.message : "Revisão vacinal inválida.",
    );
  }
}

export function parseConsultationNoteUpdate(body: unknown): {
  expectedUpdatedAt: string;
  fields: SoapDraftFields;
} {
  const record = asRecord(body);
  assertOnlyKeys(record, [
    "expectedUpdatedAt",
    "subjective",
    "physicalExam",
    "vitalSigns",
    "anthropometry",
    "vaccinationReview",
    "planByProblem",
  ], "Requisição");

  if (typeof record.expectedUpdatedAt !== "string" || !Number.isFinite(new Date(record.expectedUpdatedAt).getTime())) {
    throw new ConsultationNoteRequestError("Versão da consulta inválida.");
  }

  return {
    expectedUpdatedAt: record.expectedUpdatedAt,
    fields: {
      subjective: optionalText(record.subjective, "Subjetivo"),
      physicalExam: optionalText(record.physicalExam, "Exame físico"),
      vitalSigns: optionalText(record.vitalSigns, "Sinais vitais"),
      anthropometry: optionalText(record.anthropometry, "Antropometria"),
      vaccinationReview: parseVaccinationReview(record.vaccinationReview),
      planByProblem: parsePlan(record.planByProblem),
    },
  };
}

function requestId(request: Request): string | undefined {
  const value = request.headers.get("x-request-id");
  return value && OPERATIONAL_REQUEST_ID.test(value) ? value : undefined;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ConsultationNoteRequestError) {
    return json({ code: "INVALID_REQUEST", message: error.message }, 400);
  }
  if (error instanceof ConsultationNoteError) {
    const status = error.code === "CONSULTATION_NOT_FOUND" ? 404 : 409;
    return json({ code: error.code, message: error.message }, status);
  }
  if (error instanceof AuthenticationRequiredError) {
    return json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, 401);
  }
  if (error instanceof AccessForbiddenError) {
    return json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, 403);
  }
  return json({ code: "CONSULTATION_NOTE_FAILED", message: "Não foi possível atualizar o SOAP." }, 500);
}

export function consultationNoteHttpHandlers(operations: Operations) {
  return {
    GET: async (_request: Request, consultationId: string): Promise<Response> => {
      try {
        return json(await operations.getConsultationNote(consultationId), 200);
      } catch (error) {
        return errorResponse(error);
      }
    },
    PUT: async (request: Request, consultationId: string): Promise<Response> => {
      try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          throw new ConsultationNoteRequestError("Requisição inválida.");
        }
        const parsed = parseConsultationNoteUpdate(body);
        return json(await operations.saveConsultationNote({
          consultationId,
          expectedUpdatedAt: parsed.expectedUpdatedAt,
          fields: parsed.fields,
          requestId: requestId(request),
        }), 200);
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
