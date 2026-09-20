import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const loginSource = readFileSync("src/app/login/page.tsx", "utf8");
const routeSource = readFileSync("src/app/auth/google/route.ts", "utf8");
const errorPageSource = readFileSync("src/app/auth/error/page.tsx", "utf8");

test("login Google usa link navegável sem depender de hidratação do React", () => {
  assert.match(loginSource, /href="\/auth\/google"/);
  assert.doesNotMatch(loginSource, /onClick=/);
  assert.doesNotMatch(loginSource, /authClient\.signIn\.social/);
});

test("login Google é sempre renderizado dinamicamente e não pode voltar ao cache compartilhado", () => {
  assert.match(loginSource, /export const dynamic = "force-dynamic"/);
  assert.match(loginSource, /export const revalidate = 0/);
});

test("rota de bootstrap OAuth preserva state cookies e redireciona diretamente ao Google", () => {
  assert.match(routeSource, /auth\.api\.signInSocial/);
  assert.match(routeSource, /provider:\s*"google"/);
  assert.match(routeSource, /errorCallbackURL:\s*"\/auth\/error"/);
  assert.match(routeSource, /returnHeaders:\s*true/);
  assert.match(routeSource, /validateGoogleOAuthTarget\(result\.url\)/);
  assert.match(routeSource, /NextResponse\.redirect\(googleTarget, 303\)/);
  assert.match(routeSource, /appendSetCookies\(authHeaders, response\.headers\)/);
  assert.match(routeSource, /cache-control/);
  assert.match(routeSource, /no-store/);
});

test("modo compatível permanece disponível sem ser o caminho padrão", () => {
  assert.match(loginSource, /href="\/auth\/google\?manual=1"/);
  assert.match(loginSource, /data-google-auth-compatible-entrypoint="true"/);
  assert.match(routeSource, /manualMode/);
  assert.match(routeSource, /renderGoogleOAuthContinuationPage\(googleTarget\)/);
});

test("falhas de bootstrap seguem para diagnóstico seguro e acionável", () => {
  assert.match(routeSource, /\/auth\/error\?error=oauth_start/);
  assert.match(errorPageSource, /Código para suporte/);
  assert.match(errorPageSource, /Tentar novamente com Google/);
});
