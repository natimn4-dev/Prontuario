import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicAuthReadiness } from "../../src/domain/security/auth-readiness.ts";
import { isPublicRoute } from "../../src/domain/security/route-access.ts";

const completeEnv = {
  appUrl: "https://prontuario.example.test",
  betterAuthSecret: "a".repeat(32),
  googleClientId: "client.apps.googleusercontent.com",
  googleClientSecret: "secret",
  allowedEmails: "doctor@example.test",
  bootstrapAdminEmails: "doctor@example.test",
};

test("auth readiness reports only safe boolean checks when configuration is complete", () => {
  const result = buildPublicAuthReadiness(completeEnv);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.checks, {
    appUrlHttps: true,
    betterAuthSecretConfigured: true,
    googleClientIdConfigured: true,
    googleClientSecretConfigured: true,
    allowlistConfigured: true,
    bootstrapAdminConfigured: true,
  });
  assert.equal(JSON.stringify(result).includes("doctor@example.test"), false);
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("auth readiness fails closed without exposing missing secret values", () => {
  const result = buildPublicAuthReadiness({ ...completeEnv, googleClientSecret: "" });
  assert.equal(result.status, "incomplete");
  assert.equal(result.checks.googleClientSecretConfigured, false);
});

test("auth readiness rejects non-HTTPS APP_URL and malformed Google client id", () => {
  const result = buildPublicAuthReadiness({
    ...completeEnv,
    appUrl: "http://prontuario.example.test",
    googleClientId: "not-a-google-client-id",
  });
  assert.equal(result.status, "incomplete");
  assert.equal(result.checks.appUrlHttps, false);
  assert.equal(result.checks.googleClientIdConfigured, false);
});

test("only the exact auth readiness diagnostic route is public", () => {
  assert.equal(isPublicRoute("/api/health/auth"), true);
  assert.equal(isPublicRoute("/api/health/auth/private"), false);
});
