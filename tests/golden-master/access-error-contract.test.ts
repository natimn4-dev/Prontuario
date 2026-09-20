import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AccessForbiddenError,
  AuthenticationRequiredError,
  isAccessForbiddenError,
  isAuthenticationRequiredError,
} from "../../src/server/auth/access-errors.ts";

test("erros de acesso mantêm reconhecimento mesmo quando reconstruídos por outro bundle", () => {
  assert.equal(isAccessForbiddenError(new AccessForbiddenError()), true);
  assert.equal(isAuthenticationRequiredError(new AuthenticationRequiredError()), true);

  const foreignForbidden = new Error("Acesso não autorizado.");
  foreignForbidden.name = "AccessForbiddenError";
  assert.equal(isAccessForbiddenError(foreignForbidden), true);

  const foreignAuthentication = new Error("Autenticação obrigatória.");
  foreignAuthentication.name = "AuthenticationRequiredError";
  assert.equal(isAuthenticationRequiredError(foreignAuthentication), true);
});

test("type guards de acesso não aceitam erros genéricos", () => {
  assert.equal(isAccessForbiddenError(new Error("outro erro")), false);
  assert.equal(isAuthenticationRequiredError(new Error("outro erro")), false);
});


test("rota alimentar preserva 401/403 também para erros vindos do serviço clínico", () => {
  const route = readFileSync("src/app/api/consultations/[id]/dietary-assessment/route.ts", "utf8");
  assert.match(route, /isAuthenticationRequiredError\(error\)/);
  assert.match(route, /AUTHENTICATION_REQUIRED/);
  assert.match(route, /isAccessForbiddenError\(error\)/);
  assert.match(route, /ACCESS_FORBIDDEN/);
});
