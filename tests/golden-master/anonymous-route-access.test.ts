import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server.js";
import { parseEmailSet } from "../../src/domain/security/auth-policy.ts";
import {
  isPublicRoute,
  isWorkspaceSessionAuthorized,
  routeAccessFor,
  type WorkspaceSessionUser,
} from "../../src/domain/security/route-access.ts";
import { createRequestGuard } from "../../src/server/auth/request-guard.ts";

test("login, autenticação e health permanecem públicos sem consultar sessão", async () => {
  let validationCalls = 0;
  const guard = createRequestGuard(async () => {
    validationCalls += 1;
    return false;
  });

  for (const pathname of ["/login", "/api/auth/session", "/api/auth/callback/google", "/api/health"]) {
    assert.equal(isPublicRoute(pathname), true);
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }
  assert.equal(validationCalls, 0);
});

test("visitante anônimo é redirecionado antes de acessar páginas clínicas", async () => {
  const guard = createRequestGuard(async () => false);

  for (const pathname of ["/", "/patients/new", "/patients/patient-synthetic", "/consultations/consultation-synthetic", "/demo", "/outra-area-clinica"]) {
    assert.equal(routeAccessFor({ pathname, authenticated: false }), "redirect-login");
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://prontuario.test/login");
  }
});

test("API clínica anônima falha com 401 e não redireciona", async () => {
  const guard = createRequestGuard(async () => false);

  for (const pathname of ["/api/patients", "/api/consultations/consultation-synthetic/reports/aga", "/api/private"]) {
    assert.equal(routeAccessFor({ pathname, authenticated: false }), "unauthorized-api");
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("location"), null);
    assert.deepEqual(await response.json(), {
      code: "AUTHENTICATION_REQUIRED",
      message: "Autenticação obrigatória.",
    });
  }
});

test("sessão validada libera áreas protegidas sem ampliar rotas públicas", async () => {
  const allowedEmails = parseEmailSet("authorized@example.test");
  const user: WorkspaceSessionUser = {
    id: "user-authorized",
    email: "authorized@example.test",
    active: true,
  };
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, allowedEmails));
  assert.equal(isPublicRoute("/api/authentic-data"), false);

  for (const pathname of ["/", "/patients/patient-synthetic", "/consultations/consultation-synthetic", "/api/patients"]) {
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }
});

test("usuário removido da allowlist é bloqueado mesmo com sessão", async () => {
  const allowedEmails = parseEmailSet("other-authorized@example.test");
  const user: WorkspaceSessionUser = {
    id: "user-removed",
    email: "removed@example.test",
    active: true,
  };
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, allowedEmails));

  assert.equal(isWorkspaceSessionAuthorized(user, allowedEmails), false);
  const response = await guard(new NextRequest("https://prontuario.test/patients/new"));
  assert.equal(response.headers.get("location"), "https://prontuario.test/login");
});

test("usuário inativo é bloqueado mesmo permanecendo na allowlist", async () => {
  const allowedEmails = parseEmailSet("inactive@example.test");
  const user: WorkspaceSessionUser = {
    id: "user-inactive",
    email: "inactive@example.test",
    active: false,
  };
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, allowedEmails));

  assert.equal(isWorkspaceSessionAuthorized(user, allowedEmails), false);
  const response = await guard(new NextRequest("https://prontuario.test/consultations/abc"));
  assert.equal(response.headers.get("location"), "https://prontuario.test/login");
});

test("redirect para login não cria loop e callback OAuth continua público", async () => {
  const guard = createRequestGuard(async () => false);
  const protectedResponse = await guard(new NextRequest("https://prontuario.test/"));
  assert.equal(protectedResponse.headers.get("location"), "https://prontuario.test/login");

  const loginResponse = await guard(new NextRequest("https://prontuario.test/login"));
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.headers.get("location"), null);

  const oauthResponse = await guard(new NextRequest("https://prontuario.test/api/auth/callback/google"));
  assert.equal(oauthResponse.status, 200);
  assert.equal(oauthResponse.headers.get("location"), null);
});

test("assets estáticos e internals do Next não são bloqueados", async () => {
  let validationCalls = 0;
  const guard = createRequestGuard(async () => {
    validationCalls += 1;
    return false;
  });

  for (const pathname of ["/_next/static/chunks/app.js", "/_next/image", "/favicon.ico", "/robots.txt", "/sitemap.xml"]) {
    assert.equal(isPublicRoute(pathname), true);
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
  }
  assert.equal(validationCalls, 0);
});

test("erro ao validar sessão falha fechado sem expor a rota", async () => {
  const guard = createRequestGuard(async () => {
    throw new Error("auth unavailable");
  });

  const pageResponse = await guard(new NextRequest("https://prontuario.test/patients/patient-synthetic"));
  assert.equal(pageResponse.headers.get("location"), "https://prontuario.test/login");

  const apiResponse = await guard(new NextRequest("https://prontuario.test/api/patients"));
  assert.equal(apiResponse.status, 401);
});
