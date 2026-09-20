import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loginSource = readFileSync(new URL("../../src/app/login/page.tsx", import.meta.url), "utf8");

test("login mantém entrada Google navegável pelo endpoint público canônico", () => {
  assert.match(loginSource, /href="\/auth\/google"/);
  assert.match(loginSource, /data-google-auth-entrypoint="true"/);
  assert.match(loginSource, />\s*Continuar com Google\s*</);
});

test("login mantém modo compatível como fallback explícito, não como etapa obrigatória", () => {
  assert.match(loginSource, /href="\/auth\/google\?manual=1"/);
  assert.match(loginSource, /data-google-auth-compatible-entrypoint="true"/);
  assert.match(loginSource, />\s*Usar modo compatível\s*</);
});
