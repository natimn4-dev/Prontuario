import {
  ADVANCE_DIRECTIVE_DISPOSITIONS,
  ADVANCE_DIRECTIVE_DOCUMENT_STATUSES,
  ADVANCE_DIRECTIVE_PARTICIPATION_MODES,
  ADVANCE_DIRECTIVE_PRIORITIES,
  ADVANCE_DIRECTIVE_REVIEW_TRIGGERS,
  ADVANCE_DIRECTIVE_TOPIC_CODES,
  ADVANCE_DIRECTIVE_TOPIC_STATUSES,
  emptyAdvanceDirectiveTopics,
  shouldCollectAdvanceDirectiveDetails,
  type AdvanceDirectiveDocumentStatus,
  type AdvanceDirectiveDraft,
  type AdvanceDirectiveDisposition,
  type AdvanceDirectiveParticipationMode,
  type AdvanceDirectivePriority,
  type AdvanceDirectiveReviewTrigger,
  type AdvanceDirectiveTopics,
  type AdvanceDirectiveTopicStatus,
  type AdvanceDirectiveWorkspaceView,
} from "../../domain/advance-directives.ts";
import { AccessForbiddenError, AuthenticationRequiredError } from "../auth/access-errors.ts";
import { AdvanceDirectiveError } from "./advance-directives-errors.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_NARRATIVE_LENGTH = 4000;
const MAX_PERSON_FIELD_LENGTH = 191;
const MAX_TOPIC_NOTE_LENGTH = 1200;

export class AdvanceDirectiveRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdvanceDirectiveRequestError";
  }
}

type Operations = {
  getAdvanceDirectiveWorkspace(consultationId: string): Promise<AdvanceDirectiveWorkspaceView>;
  saveAdvanceDirectiveRecord(input: {
    consultationId: string;
    expectedLatestVersion: number;
    draft: AdvanceDirectiveDraft;
    requestId?: string;
  }): Promise<AdvanceDirectiveWorkspaceView>;
};

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdvanceDirectiveRequestError(`${label} inválido.`);
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const allowedSet = new Set(allowed);
  if (Object.keys(record).some((key) => !allowedSet.has(key))) {
    throw new AdvanceDirectiveRequestError(`${label} contém campos não permitidos.`);
  }
}

function requiredEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AdvanceDirectiveRequestError(`${label} inválido.`);
  }
  return value as T;
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requiredEnum(value, allowed, label);
}

function optionalText(value: unknown, label: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new AdvanceDirectiveRequestError(`${label} inválido.`);
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function parsePriorities(value: unknown): AdvanceDirectivePriority[] {
  if (!Array.isArray(value) || value.length > ADVANCE_DIRECTIVE_PRIORITIES.length) {
    throw new AdvanceDirectiveRequestError("Prioridades inválidas.");
  }
  const parsed = value.map((item) => requiredEnum(item, ADVANCE_DIRECTIVE_PRIORITIES, "Prioridade"));
  if (new Set(parsed).size !== parsed.length) {
    throw new AdvanceDirectiveRequestError("Prioridades duplicadas.");
  }
  return parsed;
}

function parseTopics(value: unknown): AdvanceDirectiveTopics {
  const record = asRecord(value, "Temas discutidos");
  assertOnlyKeys(record, ADVANCE_DIRECTIVE_TOPIC_CODES, "Temas discutidos");
  const parsed = emptyAdvanceDirectiveTopics();

  for (const code of ADVANCE_DIRECTIVE_TOPIC_CODES) {
    const topic = asRecord(record[code], `Tema ${code}`);
    assertOnlyKeys(topic, ["status", "note"], `Tema ${code}`);
    const note = optionalText(topic.note, "Observação do tema", MAX_TOPIC_NOTE_LENGTH);
    parsed[code] = {
      status: requiredEnum(topic.status, ADVANCE_DIRECTIVE_TOPIC_STATUSES, "Situação do tema") as AdvanceDirectiveTopicStatus,
      ...(note ? { note } : {}),
    };
  }
  return parsed;
}

export function parseAdvanceDirectiveSave(body: unknown): {
  expectedLatestVersion: number;
  draft: AdvanceDirectiveDraft;
} {
  const record = asRecord(body, "Requisição");
  assertOnlyKeys(record, [
    "expectedLatestVersion",
    "disposition",
    "participationMode",
    "trustedPersonName",
    "trustedRelation",
    "trustedContact",
    "whatMatters",
    "dignityAndComfort",
    "priorities",
    "topics",
    "documentStatus",
    "reviewTrigger",
  ], "Requisição");

  if (!Number.isInteger(record.expectedLatestVersion) || Number(record.expectedLatestVersion) < 0) {
    throw new AdvanceDirectiveRequestError("Versão esperada inválida.");
  }

  const disposition = requiredEnum(
    record.disposition,
    ADVANCE_DIRECTIVE_DISPOSITIONS,
    "Disponibilidade para a conversa",
  ) as AdvanceDirectiveDisposition;
  const documentStatus = requiredEnum(
    record.documentStatus,
    ADVANCE_DIRECTIVE_DOCUMENT_STATUSES,
    "Situação do documento",
  ) as AdvanceDirectiveDocumentStatus;
  const reviewTrigger = requiredEnum(
    record.reviewTrigger,
    ADVANCE_DIRECTIVE_REVIEW_TRIGGERS,
    "Motivo para revisão",
  ) as AdvanceDirectiveReviewTrigger;

  if (!shouldCollectAdvanceDirectiveDetails(disposition)) {
    return {
      expectedLatestVersion: Number(record.expectedLatestVersion),
      draft: {
        disposition,
        priorities: [],
        topics: emptyAdvanceDirectiveTopics(),
        documentStatus,
        reviewTrigger,
      },
    };
  }

  return {
    expectedLatestVersion: Number(record.expectedLatestVersion),
    draft: {
      disposition,
      participationMode: optionalEnum(
        record.participationMode,
        ADVANCE_DIRECTIVE_PARTICIPATION_MODES,
        "Participação na conversa",
      ) as AdvanceDirectiveParticipationMode | undefined,
      trustedPersonName: optionalText(record.trustedPersonName, "Nome da pessoa de confiança", MAX_PERSON_FIELD_LENGTH),
      trustedRelation: optionalText(record.trustedRelation, "Vínculo da pessoa de confiança", MAX_PERSON_FIELD_LENGTH),
      trustedContact: optionalText(record.trustedContact, "Contato da pessoa de confiança", MAX_PERSON_FIELD_LENGTH),
      whatMatters: optionalText(record.whatMatters, "Valores e prioridades", MAX_NARRATIVE_LENGTH),
      dignityAndComfort: optionalText(record.dignityAndComfort, "Conforto, dignidade e sentido", MAX_NARRATIVE_LENGTH),
      priorities: parsePriorities(record.priorities),
      topics: parseTopics(record.topics),
      documentStatus,
      reviewTrigger,
    },
  };
}

function requestId(request: Request): string | undefined {
  const value = request.headers.get("x-request-id");
  return value && OPERATIONAL_REQUEST_ID.test(value) ? value : undefined;
}

function errorResponse(error: unknown): Response {
  if (error instanceof AdvanceDirectiveRequestError) {
    return Response.json({ code: "INVALID_REQUEST", message: error.message }, { status: 400 });
  }
  if (error instanceof AdvanceDirectiveError) {
    const status = error.code === "CONSULTATION_NOT_FOUND" ? 404 : 409;
    return Response.json({ code: error.code, message: error.message }, { status });
  }
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, { status: 401 });
  }
  if (error instanceof AccessForbiddenError) {
    return Response.json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, { status: 403 });
  }
  return Response.json({ code: "ADVANCE_DIRECTIVE_FAILED", message: "Não foi possível atualizar as diretivas antecipadas." }, { status: 500 });
}

export function advanceDirectiveHttpHandlers(operations: Operations) {
  return {
    GET: async (_request: Request, consultationId: string): Promise<Response> => {
      try {
        return Response.json(await operations.getAdvanceDirectiveWorkspace(consultationId), { status: 200 });
      } catch (error) {
        return errorResponse(error);
      }
    },
    POST: async (request: Request, consultationId: string): Promise<Response> => {
      try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          throw new AdvanceDirectiveRequestError("Requisição inválida.");
        }
        const parsed = parseAdvanceDirectiveSave(body);
        return Response.json(await operations.saveAdvanceDirectiveRecord({
          consultationId,
          expectedLatestVersion: parsed.expectedLatestVersion,
          draft: parsed.draft,
          requestId: requestId(request),
        }), { status: 201 });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
