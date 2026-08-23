export type PatientSearchApiErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACCESS_FORBIDDEN"
  | "INVALID_PATIENT_SEARCH"
  | "PATIENT_SEARCH_FAILED";

export interface PatientSearchApiErrorPayload {
  code?: PatientSearchApiErrorCode | string;
  message?: string;
}

export interface PatientSearchFailureFeedback {
  kind: "validation" | "authentication" | "permission" | "server";
  message: string;
}

/**
 * Mantém erro operacional separado de "nenhum resultado". O texto vindo do
 * servidor só é reutilizado para erro 400 de validação; falhas de autenticação,
 * autorização e servidor recebem mensagens estáveis e não expõem detalhes
 * internos.
 */
export function patientSearchFailureFeedback(
  status: number,
  payload?: PatientSearchApiErrorPayload | null,
): PatientSearchFailureFeedback {
  if (status === 401 || payload?.code === "AUTHENTICATION_REQUIRED") {
    return {
      kind: "authentication",
      message: "Sua sessão expirou. Entre novamente para localizar pacientes.",
    };
  }
  if (status === 403 || payload?.code === "ACCESS_FORBIDDEN") {
    return {
      kind: "permission",
      message: "Seu usuário não tem permissão para localizar pacientes.",
    };
  }
  if (status === 400 || payload?.code === "INVALID_PATIENT_SEARCH") {
    return {
      kind: "validation",
      message: payload?.message ?? "Busca inválida. Revise o nome informado.",
    };
  }
  return {
    kind: "server",
    message: "A busca falhou por um erro interno. Tente novamente; nenhum resultado foi descartado como inexistente.",
  };
}
