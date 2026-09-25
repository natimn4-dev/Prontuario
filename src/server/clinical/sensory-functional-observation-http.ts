import {
  SENSORY_OBSERVATION_STATUS,
  type SensoryFunctionalObservationValues,
} from "../../domain/sensory-functional-observation.ts";
import { AccessForbiddenError, AuthenticationRequiredError } from "../auth/access-errors.ts";
import { SensoryObservationError } from "./sensory-functional-observation-errors.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_VALUES = Object.values(SENSORY_OBSERVATION_STATUS);

export class SensoryObservationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SensoryObservationRequestError";
  }
}

type Operations = {
  getSensoryObservationWorkspace(consultationId: string): Promise<unknown>;
  saveSensoryObservation(input: {
    consultationId: string;
    expectedRevision: number;
    values: SensoryFunctionalObservationValues;
    requestId?: string;
  }): Promise<unknown>;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SensoryObservationRequestError("Requisição inválida.");
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new SensoryObservationRequestError("Requisição contém campos não permitidos.");
  }
}

export function parseSensoryObservationSave(body: unknown): {
  expectedRevision: number;
  values: SensoryFunctionalObservationValues;
} {
  const input = record(body);
  assertOnlyKeys(input, ["expectedRevision", "assessmentStatus", "multisensoryDysfunction", "usesCorrectiveLenses"]);
  if (!Number.isInteger(input.expectedRevision) || Number(input.expectedRevision) < 0) {
    throw new SensoryObservationRequestError("Versão esperada inválida.");
  }
  if (typeof input.assessmentStatus !== "string" || !STATUS_VALUES.includes(input.assessmentStatus as typeof STATUS_VALUES[number])) {
    throw new SensoryObservationRequestError("Situação da avaliação sensorial inválida.");
  }
  if (typeof input.multisensoryDysfunction !== "boolean" || typeof input.usesCorrectiveLenses !== "boolean") {
    throw new SensoryObservationRequestError("Marque os achados sensoriais como sim ou não.");
  }

  const assessed = input.assessmentStatus === SENSORY_OBSERVATION_STATUS.ASSESSED;
  return {
    expectedRevision: Number(input.expectedRevision),
    values: {
      assessmentStatus: input.assessmentStatus as SensoryFunctionalObservationValues["assessmentStatus"],
      multisensoryDysfunction: assessed && input.multisensoryDysfunction,
      usesCorrectiveLenses: assessed && input.usesCorrectiveLenses,
    },
  };
}

function requestId(request: Request): string | undefined {
  const value = request.headers.get("x-request-id");
  return value && OPERATIONAL_REQUEST_ID.test(value) ? value : undefined;
}

function errorResponse(error: unknown): Response {
  if (error instanceof SensoryObservationRequestError) {
    return Response.json({ code: "INVALID_REQUEST", message: error.message }, { status: 400 });
  }
  if (error instanceof SensoryObservationError) {
    const status = error.code === "CONSULTATION_NOT_FOUND" ? 404 : 409;
    return Response.json({ code: error.code, message: error.message }, { status });
  }
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, { status: 401 });
  }
  if (error instanceof AccessForbiddenError) {
    return Response.json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, { status: 403 });
  }
  return Response.json({ code: "SENSORY_OBSERVATION_FAILED", message: "Não foi possível salvar a observação sensorial." }, { status: 500 });
}

export function sensoryObservationHttpHandlers(operations: Operations) {
  return {
    GET: async (consultationId: string): Promise<Response> => {
      try {
        return Response.json(await operations.getSensoryObservationWorkspace(consultationId), { status: 200 });
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
          throw new SensoryObservationRequestError("Requisição inválida.");
        }
        const parsed = parseSensoryObservationSave(body);
        return Response.json(await operations.saveSensoryObservation({
          consultationId,
          ...parsed,
          requestId: requestId(request),
        }), { status: 200 });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
