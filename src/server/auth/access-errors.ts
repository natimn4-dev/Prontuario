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
