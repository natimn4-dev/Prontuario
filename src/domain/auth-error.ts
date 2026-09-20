export type AuthErrorPresentation = {
  diagnosticCode: string;
  title: string;
  message: string;
  compatibleModeSuggested: boolean;
};

const OAUTH_STATE_ERRORS = new Set([
  "invalid_callback_request",
  "invalid_code",
  "state_not_found",
  "state_invalid",
  "state_mismatch",
  "no_code",
  "no_callback_url",
]);

const ACCOUNT_ASSOCIATION_ERRORS = new Set([
  "unable_to_link_account",
  "account_not_linked",
  "account_already_linked_to_different_user",
]);

const GOOGLE_IDENTITY_ERRORS = new Set([
  "email_not_found",
  "email_doesn't_match",
  "unable_to_get_user_info",
  "oauth_provider_not_found",
]);

function normalizeAuthError(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function authErrorPresentation(
  rawError: string | null | undefined,
): AuthErrorPresentation {
  const error = normalizeAuthError(rawError);

  if (error === "access_denied") {
    return {
      diagnosticCode: "GOOGLE_ACCESS_CANCELLED",
      title: "A entrada com Google não foi concluída",
      message: "A autorização foi cancelada no Google. Você pode tentar novamente quando desejar.",
      compatibleModeSuggested: false,
    };
  }

  if (error === "oauth_start") {
    return {
      diagnosticCode: "OAUTH_START_FAILED",
      title: "Não foi possível abrir o Google",
      message: "O prontuário não conseguiu iniciar a autenticação. Tente novamente; se estiver dentro de outro aplicativo, use o modo compatível.",
      compatibleModeSuggested: true,
    };
  }

  if (OAUTH_STATE_ERRORS.has(error)) {
    return {
      diagnosticCode: "OAUTH_CALLBACK_STATE_FAILED",
      title: "A autenticação perdeu a continuidade",
      message: "O retorno do Google não pôde ser validado com segurança. Isso pode acontecer quando o login muda de janela, navegador ou contexto. Inicie o acesso novamente.",
      compatibleModeSuggested: true,
    };
  }

  if (ACCOUNT_ASSOCIATION_ERRORS.has(error)) {
    return {
      diagnosticCode: "GOOGLE_ACCOUNT_ASSOCIATION_FAILED",
      title: "A conta Google não pôde ser associada",
      message: "O Google autenticou a conta, mas o prontuário não conseguiu concluir a associação com o acesso existente. Informe o código abaixo à administração.",
      compatibleModeSuggested: false,
    };
  }

  if (error === "unable_to_create_user") {
    return {
      diagnosticCode: "USER_ACCESS_SETUP_FAILED",
      title: "O acesso não pôde ser ativado",
      message: "A identidade Google foi recebida, mas o prontuário não conseguiu concluir a habilitação do usuário. A administração deve revisar o cadastro de acesso.",
      compatibleModeSuggested: false,
    };
  }

  if (error === "unable_to_create_session") {
    return {
      diagnosticCode: "SESSION_CREATION_FAILED",
      title: "Não foi possível iniciar a sessão",
      message: "A conta Google foi autenticada, mas o prontuário não conseguiu abrir a sessão. A administração deve verificar se o usuário está ativo e se o vínculo de acesso está consistente.",
      compatibleModeSuggested: false,
    };
  }

  if (GOOGLE_IDENTITY_ERRORS.has(error)) {
    return {
      diagnosticCode: "GOOGLE_IDENTITY_FAILED",
      title: "Não foi possível confirmar a identidade Google",
      message: "O Google não forneceu uma identidade utilizável para concluir o acesso. Tente novamente com a conta autorizada.",
      compatibleModeSuggested: false,
    };
  }

  return {
    diagnosticCode: "AUTHENTICATION_FAILED",
    title: "Não foi possível concluir o acesso",
    message: "O login não foi concluído. Tente novamente. Se o problema persistir, informe o código abaixo à administração.",
    compatibleModeSuggested: true,
  };
}
