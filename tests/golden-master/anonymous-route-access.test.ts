import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { NextRequest } from "next/server.js";
import {
  isPublicRoute,
  isWorkspaceSessionAuthorized,
  routeAccessFor,
  type WorkspaceSessionUser,
} from "../../src/domain/security/route-access.ts";
import { createRequestGuard } from "../../src/server/auth/request-guard.ts";

test("páginas protegidas sem leitura dinâmica não podem ser prerenderizadas para cache compartilhado", () => {
  for (const path of ["src/app/patients/new/page.tsx", "src/app/demo/page.tsx"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /export const dynamic = "force-dynamic"/);
  }
});

test("login, autenticação e health permanecem públicos, sem sessão e sem cache compartilhado", async () => {
  let validationCalls = 0;
  const guard = createRequestGuard(async () => {
    validationCalls += 1;
    return false;
  });

  for (const pathname of ["/login", "/auth/google", "/auth/error", "/api/auth/session", "/api/auth/callback/google", "/api/health"]) {
    assert.equal(isPublicRoute(pathname), true);
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("pragma") ?? "", /no-cache/);
    assert.match(response.headers.get("vary") ?? "", /Cookie/);
  }
  assert.equal(validationCalls, 0);
});

test("bootstrap Google OAuth é público sem ampliar todo o namespace /auth", async () => {
  const guard = createRequestGuard(async () => false);

  const googleBootstrap = await guard(new NextRequest("https://prontuario.test/auth/google"));
  assert.equal(googleBootstrap.status, 200);
  assert.equal(googleBootstrap.headers.get("location"), null);
  assert.equal(isPublicRoute("/auth/google/extra"), false);
  assert.equal(isPublicRoute("/auth/other-provider"), false);

  const unrelatedAuthRoute = await guard(new NextRequest("https://prontuario.test/auth/other-provider"));
  assert.equal(unrelatedAuthRoute.status, 307);
  assert.equal(unrelatedAuthRoute.headers.get("location"), "https://prontuario.test/login");
});

test("visitante anônimo é redirecionado antes de acessar páginas clínicas", async () => {
  const guard = createRequestGuard(async () => false);

  for (const pathname of ["/", "/patients/new", "/patients/patient-synthetic", "/consultations/consultation-synthetic", "/demo", "/outra-area-clinica"]) {
    assert.equal(routeAccessFor({ pathname, authenticated: false }), "redirect-login");
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://prontuario.test/login");
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("vary") ?? "", /Cookie/);
  }
});

test("API clínica anônima falha com 401 e não redireciona", async () => {
  const guard = createRequestGuard(async () => false);

  for (const pathname of ["/api/patients", "/api/consultations/consultation-synthetic/reports/aga", "/api/private"]) {
    assert.equal(routeAccessFor({ pathname, authenticated: false }), "unauthorized-api");
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("location"), null);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.deepEqual(await response.json(), {
      code: "AUTHENTICATION_REQUIRED",
      message: "Autenticação obrigatória.",
    });
  }
});

test("sessão de identidade aprovada libera áreas protegidas sem ampliar rotas públicas", async () => {
  const user: WorkspaceSessionUser = {
    id: "user-authorized",
    email: "authorized@example.test",
    active: true,
    accessManaged: false,
  };
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, true));
  assert.equal(isPublicRoute("/api/authentic-data"), false);

  for (const pathname of ["/", "/patients/patient-synthetic", "/consultations/consultation-synthetic", "/api/patients"]) {
    const response = await guard(new NextRequest(`https://prontuario.test${pathname}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("location"), null);
    assert.match(response.headers.get("cache-control") ?? "", /private/);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  }
});

test("usuário com acesso gerenciado ativo não depende de autorização legada do email", async () => {
  const user: WorkspaceSessionUser = {
    id: "user-managed",
    email: "managed@example.test",
    active: true,
    accessManaged: true,
  };

  assert.equal(isWorkspaceSessionAuthorized(user, false), true);
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, false));
  const response = await guard(new NextRequest("https://prontuario.test/patients/new"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});

test("usuário sem acesso gerenciado nem identidade aprovada é bloqueado mesmo com sessão", async () => {
  const user: WorkspaceSessionUser = {
    id: "user-removed",
    email: "removed@example.test",
    active: true,
    accessManaged: false,
  };
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, false));

  assert.equal(isWorkspaceSessionAuthorized(user, false), false);
  const response = await guard(new NextRequest("https://prontuario.test/patients/new"));
  assert.equal(response.headers.get("location"), "https://prontuario.test/login");
});

test("usuário inativo é bloqueado mesmo com identidade aprovada", async () => {
  const user: WorkspaceSessionUser = {
    id: "user-inactive",
    email: "inactive@example.test",
    active: false,
    accessManaged: false,
  };
  const guard = createRequestGuard(async () => isWorkspaceSessionAuthorized(user, true));

  assert.equal(isWorkspaceSessionAuthorized(user, true), false);
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
