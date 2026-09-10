import { AccessForbiddenError, AuthenticationRequiredError } from "./access-errors";
import { requireConsultationAccess } from "./patient-access";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function withConsultationPatientAccess(
  consultationId: string,
  operation: () => Promise<Response>,
): Promise<Response> {
  try {
    await requireConsultationAccess(consultationId, "patient.read");
    return await operation();
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, 401);
    }
    if (error instanceof AccessForbiddenError) {
      return json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, 403);
    }
    throw error;
  }
}
