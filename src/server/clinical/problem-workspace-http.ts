import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../auth/access-errors.ts";
import {
  ProblemWorkspaceError,
  type ProblemStatus,
  type ProblemType,
  type ProblemWorkspaceView,
} from "../../domain/problem-workspace.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_TITLE = 500;
const MAX_DESCRIPTION = 10000;
const TYPES = new Set(["CLINICAL", "GERIATRIC"]);
const STATUSES = new Set(["ACTIVE", "STABLE", "MONITORING", "RESOLVED"]);

export class ProblemWorkspaceRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProblemWorkspaceRequestError";
  }
}

type CreateCommand = { action: "create"; type: ProblemType; title: string; description?: string };
type StatusCommand = { action: "status"; problemId: string; newStatus: ProblemStatus };
export type ProblemWorkspaceCommand = CreateCommand | StatusCommand;

type Operations = {
  getProblemWorkspace(consultationId: string): Promise<ProblemWorkspaceView>;
  createProblem(input: { consultationId: string; type: ProblemType; title: string; description?: string; requestId?: string }): Promise<ProblemWorkspaceView>;
  changeProblemStatus(input: { consultationId: string; problemId: string; newStatus: ProblemStatus; requestId?: string }): Promise<ProblemWorkspaceView>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProblemWorkspaceRequestError("Requisição inválida.");
  return value as Record<string, unknown>;
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): void {
  const allow = new Set(allowed);
  if (Object.keys(record).some((key) => !allow.has(key))) throw new ProblemWorkspaceRequestError("A requisição contém campos não permitidos.");
}

function safeId(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 191) throw new ProblemWorkspaceRequestError(`${label} inválido.`);
  return value.trim();
}

export function parseProblemWorkspaceCommand(body: unknown): ProblemWorkspaceCommand {
  const record = asRecord(body);
  if (record.action === "create") {
    assertOnlyKeys(record, ["action", "type", "title", "description"]);
    if (typeof record.type !== "string" || !TYPES.has(record.type)) throw new ProblemWorkspaceRequestError("Tipo de problema inválido.");
    if (typeof record.title !== "string" || !record.title.trim() || record.title.length > MAX_TITLE) throw new ProblemWorkspaceRequestError("Título do problema inválido.");
    if (record.description !== undefined && (typeof record.description !== "string" || record.description.length > MAX_DESCRIPTION)) throw new ProblemWorkspaceRequestError("Descrição do problema inválida.");
    return { action: "create", type: record.type as ProblemType, title: record.title.trim(), description: typeof record.description === "string" ? record.description.trim() || undefined : undefined };
  }
  if (record.action === "status") {
    assertOnlyKeys(record, ["action", "problemId", "newStatus"]);
    if (typeof record.newStatus !== "string" || !STATUSES.has(record.newStatus)) throw new ProblemWorkspaceRequestError("Status do problema inválido.");
    return { action: "status", problemId: safeId(record.problemId, "Identificador do problema"), newStatus: record.newStatus as ProblemStatus };
  }
  throw new ProblemWorkspaceRequestError("Ação de problemas inválida.");
}

function requestId(request: Request): string | undefined {
  const value = request.headers.get("x-request-id");
  return value && OPERATIONAL_REQUEST_ID.test(value) ? value : undefined;
}
function json(body: unknown, status: number): Response { return Response.json(body, { status }); }
function errorResponse(error: unknown): Response {
  if (error instanceof ProblemWorkspaceRequestError) return json({ code: "INVALID_REQUEST", message: error.message }, 400);
  if (error instanceof ProblemWorkspaceError) return json({ code: error.code, message: error.message }, error.code === "CONSULTATION_NOT_FOUND" ? 404 : 409);
  if (error instanceof AuthenticationRequiredError) return json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, 401);
  if (error instanceof AccessForbiddenError) return json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, 403);
  return json({ code: "PROBLEM_WORKSPACE_FAILED", message: "Não foi possível atualizar a lista de problemas." }, 500);
}

export function problemWorkspaceHttpHandlers(operations: Operations) {
  return {
    GET: async (_request: Request, consultationId: string): Promise<Response> => {
      try { return json(await operations.getProblemWorkspace(consultationId), 200); } catch (error) { return errorResponse(error); }
    },
    POST: async (request: Request, consultationId: string): Promise<Response> => {
      try {
        let raw: unknown;
        try { raw = await request.json(); } catch { throw new ProblemWorkspaceRequestError("Requisição inválida."); }
        const command = parseProblemWorkspaceCommand(raw);
        const operationalRequestId = requestId(request);
        const view = command.action === "create"
          ? await operations.createProblem({ consultationId, type: command.type, title: command.title, description: command.description, requestId: operationalRequestId })
          : await operations.changeProblemStatus({ consultationId, problemId: command.problemId, newStatus: command.newStatus, requestId: operationalRequestId });
        return json(view, 200);
      } catch (error) { return errorResponse(error); }
    },
  };
}
