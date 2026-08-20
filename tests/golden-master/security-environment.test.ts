import test from "node:test";
import assert from "node:assert/strict";
import { validateProductionEnvironment } from "../../src/domain/security/environment.ts";

const safe = {
  nodeEnv: "production",
  appUrl: "https://prontuario.example.com",
  databaseUrl: "mysql://user:secret@db.internal:3306/prontuario",
  betterAuthSecret: "x".repeat(48),
  googleClientId: "client-id.apps.googleusercontent.com",
  googleClientSecret: "secure-oauth-secret",
  allowedEmails: "admin@example.com,medica@example.com",
  bootstrapAdminEmails: "admin@example.com",
};

test("configuração segura de produção é aceita", () => {
  assert.deepEqual(validateProductionEnvironment(safe), { ok: true, errors: [] });
});

test("produção rejeita HTTP, segredo curto e allowlist vazia", () => {
  const result = validateProductionEnvironment({ ...safe, appUrl: "http://example.com", betterAuthSecret: "curto", allowedEmails: "", bootstrapAdminEmails: "" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("HTTPS")));
  assert.ok(result.errors.some((e) => e.includes("32")));
  assert.ok(result.errors.some((e) => e.includes("allowlist") || e.includes("AUTH_ALLOWED_EMAILS")));
});

test("administrador bootstrap precisa pertencer à allowlist", () => {
  const result = validateProductionEnvironment({ ...safe, bootstrapAdminEmails: "outro@example.com" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("fora da allowlist")));
});

test("produção rejeita APP_URL que não representa uma origem canônica", () => {
  const cases = [
    "https://prontuario.example.com/login",
    "https://prontuario.example.com?source=hostinger",
    "https://prontuario.example.com#login",
    "https://user:pass@prontuario.example.com",
  ];

  for (const appUrl of cases) {
    const result = validateProductionEnvironment({ ...safe, appUrl });
    assert.equal(result.ok, false, appUrl);
    assert.ok(result.errors.some((e) => e.includes("APP_URL")), appUrl);
  }
});

test("produção rejeita APP_URL apontando para loopback", () => {
  for (const appUrl of ["https://localhost:3000", "https://127.0.0.1:3000", "https://[::1]:3000"]) {
    const result = validateProductionEnvironment({ ...safe, appUrl });
    assert.equal(result.ok, false, appUrl);
    assert.ok(result.errors.some((e) => e.includes("loopback")), appUrl);
  }
});

test("GOOGLE_CLIENT_ID precisa ter formato do OAuth Client ID do Google", () => {
  const result = validateProductionEnvironment({ ...safe, googleClientId: "identificador-invalido" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("OAuth Client ID do Google")));
});
