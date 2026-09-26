import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isPublicRoute } from "../../src/domain/security/route-access.ts";

test("rota de inspeção alimentar é pública somente para o preview sintético", () => {
  const source = readFileSync("src/app/visual-dietary/page.tsx", "utf8");

  assert.equal(isPublicRoute("/visual-dietary"), true);
  assert.match(source, /preview-consultation/);
  assert.match(source, /preview-only/);
  assert.match(source, /window\.fetch/);
  assert.doesNotMatch(source, /DATABASE_URL|BETTER_AUTH_SECRET/);
});

test("prévia alimentar preserva o item incluído no PUT do fluxo", () => {
  const source = readFileSync("src/app/visual-dietary/page.tsx", "utf8");

  assert.match(source, /previewPayloadFromInput/);
  assert.match(source, /JSON\.parse\(init\.body\)/);
  assert.match(source, /payload = previewPayloadFromInput\(payload, body\.assessment\)/);
  assert.match(source, /swallowingSupport\?: SwallowingSupportContext/);
  assert.match(source, /swallowingSupport: body\.swallowingSupport/);
  assert.match(source, /swallowingSupport: \{ \.\.\.EMPTY_SWALLOWING_SUPPORT \}/);
});
