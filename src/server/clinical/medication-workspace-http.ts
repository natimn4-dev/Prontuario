import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../auth/access-errors.ts";
import { MEDICATION_MOMENTS, type MedicationMoment } from "../../domain/medication-plan.ts";
import {
  MedicationWorkspaceError,
  type MedicationWorkspaceView,
} from "../../domain/medication-workspace.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOMENTS = new Set<string>(MEDICATION_MOMENTS);
const MAX_TEXT = 5000;

export class MedicationWorkspaceRequestError extends Error {
  constructor(message: string) { super(message); this.name = "MedicationWorkspaceRequestError"; }
}

type RegimenFields = { doseInstruction?: string; route?: string; moments: MedicationMoment[]; continuous?: boolean; instructions?: string };
type CreateCommand = RegimenFields & { action: "create"; name: string; presentation?: string };
type RegimenCommand = RegimenFields & { action: "regimen"; medicationId: string };
export type MedicationWorkspaceCommand = CreateCommand | RegimenCommand;

type Operations = {
  getMedicationWorkspace(consultationId: string): Promise<MedicationWorkspaceView>;
  createMedicationWithRegimen(input: Omit<CreateCommand, "action"> & { consultationId: string; requestId?: string }): Promise<MedicationWorkspaceView>;
  addMedicationRegimen(input: Omit<RegimenCommand, "action"> & { consultationId: string; requestId?: string }): Promise<MedicationWorkspaceView>;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new MedicationWorkspaceRequestError("Requisição inválida.");
  return value as Record<string, unknown>;
}
function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]) {
  const set = new Set(allowed);
  if (Object.keys(record).some((key) => !set.has(key))) throw new MedicationWorkspaceRequestError("A requisição contém campos não permitidos.");
}
function requiredText(value: unknown, label: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new MedicationWorkspaceRequestError(`${label} inválido.`);
  return value.trim();
}
function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > MAX_TEXT) throw new MedicationWorkspaceRequestError(`${label} inválido.`);
  return value.trim() || undefined;
}
function regimenFields(record: Record<string, unknown>): RegimenFields {
  if (!Array.isArray(record.moments) || record.moments.length > MEDICATION_MOMENTS.length) throw new MedicationWorkspaceRequestError("Horários do medicamento inválidos.");
  const moments = record.moments.map((value) => {
    if (typeof value !== "string" || !MOMENTS.has(value)) throw new MedicationWorkspaceRequestError("Horário do medicamento inválido.");
    return value as MedicationMoment;
  });
  if (new Set(moments).size !== moments.length) throw new MedicationWorkspaceRequestError("Horários duplicados não são permitidos.");
  if (record.continuous !== undefined && typeof record.continuous !== "boolean") throw new MedicationWorkspaceRequestError("Indicador de uso contínuo inválido.");
  return { doseInstruction: optionalText(record.doseInstruction, "Dose em uso"), route: optionalText(record.route, "Via"), moments, continuous: record.continuous as boolean | undefined, instructions: optionalText(record.instructions, "Observações") };
}

export function parseMedicationWorkspaceCommand(body: unknown): MedicationWorkspaceCommand {
  const record = asRecord(body);
  const common = ["action", "doseInstruction", "route", "moments", "continuous", "instructions"];
  if (record.action === "create") {
    assertOnlyKeys(record, [...common, "name", "presentation"]);
    return { action: "create", name: requiredText(record.name, "Nome do medicamento"), presentation: optionalText(record.presentation, "Dose/apresentação"), ...regimenFields(record) };
  }
  if (record.action === "regimen") {
    assertOnlyKeys(record, [...common, "medicationId"]);
    return { action: "regimen", medicationId: requiredText(record.medicationId, "Identificador do medicamento", 191), ...regimenFields(record) };
  }
  throw new MedicationWorkspaceRequestError("Ação de medicação inválida.");
}

function requestId(request: Request): string | undefined { const value = request.headers.get("x-request-id"); return value && OPERATIONAL_REQUEST_ID.test(value) ? value : undefined; }
function json(body: unknown, status: number) { return Response.json(body, { status }); }
function errorResponse(error: unknown): Response {
  if (error instanceof MedicationWorkspaceRequestError) return json({ code: "INVALID_REQUEST", message: error.message }, 400);
  if (error instanceof MedicationWorkspaceError) return json({ code: error.code, message: error.message }, error.code === "CONSULTATION_NOT_FOUND" || error.code === "MEDICATION_NOT_FOUND" ? 404 : 409);
  if (error instanceof AuthenticationRequiredError) return json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, 401);
  if (error instanceof AccessForbiddenError) return json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, 403);
  return json({ code: "MEDICATION_WORKSPACE_FAILED", message: "Não foi possível atualizar a reconciliação medicamentosa." }, 500);
}

export function medicationWorkspaceHttpHandlers(operations: Operations) {
  return {
    GET: async (_request: Request, consultationId: string): Promise<Response> => { try { return json(await operations.getMedicationWorkspace(consultationId), 200); } catch (error) { return errorResponse(error); } },
    POST: async (request: Request, consultationId: string): Promise<Response> => {
      try {
        let raw: unknown; try { raw = await request.json(); } catch { throw new MedicationWorkspaceRequestError("Requisição inválida."); }
        const command = parseMedicationWorkspaceCommand(raw); const operationalRequestId = requestId(request);
        const view = command.action === "create"
          ? await operations.createMedicationWithRegimen({ consultationId, name: command.name, presentation: command.presentation, doseInstruction: command.doseInstruction, route: command.route, moments: command.moments, continuous: command.continuous, instructions: command.instructions, requestId: operationalRequestId })
          : await operations.addMedicationRegimen({ consultationId, medicationId: command.medicationId, doseInstruction: command.doseInstruction, route: command.route, moments: command.moments, continuous: command.continuous, instructions: command.instructions, requestId: operationalRequestId });
        return json(view, 200);
      } catch (error) { return errorResponse(error); }
    },
  };
}
