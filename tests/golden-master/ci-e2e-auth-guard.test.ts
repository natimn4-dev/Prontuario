import assert from "node:assert/strict";
import test from "node:test";
import {
  hasCiE2ERequestCredentials,
  isCiE2EAuthEnvironment,
  isSyntheticCiEmail,
} from "../../src/domain/security/ci-e2e-auth-policy.ts";

const base = {
  CI: "true",
  NODE_ENV: "development",
  APP_URL: "http://127.0.0.1:3100",
  DATABASE_URL: "mysql://ci_user:ci_password@127.0.0.1:3306/prontuario_ci",
  TEST_DATABASE_URL: "mysql://ci_user:ci_password@127.0.0.1:3306/prontuario_ci",
  E2E_AUTH_ENABLED: "1",
  E2E_AUTH_SECRET: "ci-e2e-secret-with-at-least-thirty-two-characters",
};

test("habilita autenticação sintética somente no ambiente efêmero de CI", () => {
  assert.equal(isCiE2EAuthEnvironment(base), true);
  assert.equal(isSyntheticCiEmail("ci-e2e-dietary@example.com"), true);
});

test("bloqueia explicitamente produção, domínio real e banco não efêmero", () => {
  assert.equal(isCiE2EAuthEnvironment({ ...base, NODE_ENV: "production" }), false);
  assert.equal(isCiE2EAuthEnvironment({ ...base, APP_URL: "https://prontuario.nataliamendesgeriatra.com" }), false);
  assert.equal(isCiE2EAuthEnvironment({ ...base, DATABASE_URL: "mysql://user:pass@db:3306/prontuario", TEST_DATABASE_URL: "mysql://user:pass@db:3306/prontuario" }), false);
  assert.equal(isCiE2EAuthEnvironment({ ...base, DATABASE_URL: "mysql://user:pass@db:3306/prontuario_ci", TEST_DATABASE_URL: "mysql://user:pass@db:3306/outro_ci" }), false);
  assert.equal(isCiE2EAuthEnvironment({ ...base, CI: "false" }), false);
  assert.equal(isCiE2EAuthEnvironment({ ...base, E2E_AUTH_ENABLED: "0" }), false);
});

test("recusa identidades que não sejam sintéticas", () => {
  assert.equal(isSyntheticCiEmail("medica-ci@example.com"), false);
  assert.equal(isSyntheticCiEmail("ci-e2e-user@gmail.com"), false);
  assert.equal(isSyntheticCiEmail("ci-e2e-user@example.com"), true);
});


test("perímetro aceita somente cabeçalhos sintéticos com segredo correto no CI", () => {
  const good = new Headers({
    "x-prontuario-e2e-user": "ci-e2e-dietary@example.com",
    "x-prontuario-e2e-secret": base.E2E_AUTH_SECRET,
  });
  assert.equal(hasCiE2ERequestCredentials(good, base), true);

  const wrongSecret = new Headers({
    "x-prontuario-e2e-user": "ci-e2e-dietary@example.com",
    "x-prontuario-e2e-secret": "segredo-incorreto",
  });
  assert.equal(hasCiE2ERequestCredentials(wrongSecret, base), false);

  assert.equal(
    hasCiE2ERequestCredentials(good, { ...base, NODE_ENV: "production" }),
    false,
  );
});
