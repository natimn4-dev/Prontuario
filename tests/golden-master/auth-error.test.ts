import assert from "node:assert/strict";
import test from "node:test";
import { authErrorPresentation } from "../../src/domain/auth-error.ts";

test("falha de sessão orienta revisão de usuário ativo sem expor identidade", () => {
  const result = authErrorPresentation("unable_to_create_session");
  assert.equal(result.diagnosticCode, "SESSION_CREATION_FAILED");
  assert.match(result.message, /usuário está ativo/);
  assert.doesNotMatch(result.message, /@/);
});

test("falha de associação distingue vínculo de conta Google", () => {
  for (const code of ["account_not_linked", "unable_to_link_account", "account_already_linked_to_different_user"]) {
    const result = authErrorPresentation(code);
    assert.equal(result.diagnosticCode, "GOOGLE_ACCOUNT_ASSOCIATION_FAILED");
    assert.equal(result.compatibleModeSuggested, false);
  }
});

test("falhas de state e callback recomendam reiniciar o fluxo", () => {
  for (const code of ["state_not_found", "state_invalid", "state_mismatch", "invalid_code", "no_code"]) {
    const result = authErrorPresentation(code);
    assert.equal(result.diagnosticCode, "OAUTH_CALLBACK_STATE_FAILED");
    assert.equal(result.compatibleModeSuggested, true);
  }
});

test("erro desconhecido falha de modo genérico sem inventar causa", () => {
  const result = authErrorPresentation("unexpected_failure");
  assert.equal(result.diagnosticCode, "AUTHENTICATION_FAILED");
  assert.doesNotMatch(result.message, /desativado|bloqueado|revogado/i);
});
