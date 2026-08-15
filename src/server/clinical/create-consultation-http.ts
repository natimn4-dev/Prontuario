import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../auth/access-errors.ts";
import {
  ConsultationCreationError,
  ConsultationCreationRequestError,
  parseConsultationCreationRequest,
  type CreateConsultationInput,
} from "./create-consultation-service.ts";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateConsultationOperation = (
  input: CreateConsultationInput,
) => Promise<{ id: string }>;

async function safeCommand(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ConsultationCreationRequestError("Requisição inválida.");
  }
  return parseConsultationCreationRequest(body);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

export function createConsultationPostHandler(
  createConsultation: CreateConsultationOperation,
) {
  return async function POST(request: Request): Promise<Response> {
    try {
      const command = await safeCommand(request);
      const requestIdHeader = request.headers.get("x-request-id");
      const consultation = await createConsultation({
        ...command,
        requestId: requestIdHeader && OPERATIONAL_REQUEST_ID.test(requestIdHeader)
          ? requestIdHeader
          : undefined,
      });
      return json({ consultationId: consultation.id }, 201);
    } catch (error) {
      if (error instanceof ConsultationCreationRequestError) {
        return json({ code: "INVALID_REQUEST", message: error.message }, 400);
      }
      if (error instanceof ConsultationCreationError) {
        return json(
          { code: error.code, message: error.message },
          error.code === "PATIENT_NOT_FOUND" ? 404 : 409,
        );
      }
      if (error instanceof AuthenticationRequiredError) {
        return json(
          { code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." },
          401,
        );
      }
      if (error instanceof AccessForbiddenError) {
        return json(
          { code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." },
          403,
        );
      }
      return json(
        { code: "CONSULTATION_CREATE_FAILED", message: "Não foi possível criar a consulta." },
        500,
      );
    }
  };
}
