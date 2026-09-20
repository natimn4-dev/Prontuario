export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Autenticação obrigatória.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AccessForbiddenError extends Error {
  constructor() {
    super("Acesso não autorizado.");
    this.name = "AccessForbiddenError";
  }
}


export function isAuthenticationRequiredError(error: unknown): error is AuthenticationRequiredError {
  return error instanceof AuthenticationRequiredError
    || (error instanceof Error && error.name === "AuthenticationRequiredError");
}

export function isAccessForbiddenError(error: unknown): error is AccessForbiddenError {
  return error instanceof AccessForbiddenError
    || (error instanceof Error && error.name === "AccessForbiddenError");
}
