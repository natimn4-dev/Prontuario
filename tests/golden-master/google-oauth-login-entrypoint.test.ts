import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const loginSource = readFileSync("src/app/login/page.tsx", "utf8");
const routeSource = readFileSync("src/app/auth/google/route.ts", "utf8");

test("login Google usa link navegável sem depender de hidratação do React", () => {
  assert.match(loginSource, /href="\/auth\/google"/);
  assert.doesNotMatch(loginSource, /onClick=/);
  assert.doesNotMatch(loginSource, /authClient\.signIn\.social/);
});

test("login Google é sempre renderizado dinamicamente e não pode voltar ao cache compartilhado", () => {
  assert.match(loginSource, /export const dynamic = "force-dynamic"/);
  assert.match(loginSource, /export const revalidate = 0/);
});

test("rota de bootstrap OAuth preserva state cookies e entrega continuação segura para Google", () => {
  assert.match(routeSource, /auth\.api\.signInSocial/);
  assert.match(routeSource, /provider:\s*"google"/);
  assert.match(routeSource, /returnHeaders:\s*true/);
  assert.match(routeSource, /validateGoogleOAuthTarget\(result\.url\)/);
  assert.match(routeSource, /appendSetCookies\(authHeaders, headers\)/);
  assert.match(routeSource, /renderGoogleOAuthContinuationPage\(googleTarget\)/);
  assert.match(routeSource, /status:\s*200/);
  assert.doesNotMatch(routeSource, /NextResponse\.redirect\(result\.url, 303\)/);
});

test("falha no bootstrap retorna para login com erro visível", () => {
  assert.match(routeSource, /\/login\?error=oauth_start/);
  assert.match(loginSource, /Não foi possível iniciar a autenticação com o Google/);
});
