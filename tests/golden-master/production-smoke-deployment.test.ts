import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/production-clinical-smoke.yml", "utf8");
const smoke = readFileSync("scripts/smoke-clinical-production.ts", "utf8");
const health = readFileSync("src/app/api/health/route.ts", "utf8");
const hostingerDocs = readFileSync("docs/deployment/HOSTINGER.md", "utf8");

test("production smoke validates the exact SHA whose main CI completed", () => {
  assert.match(workflow, /github\.event\.workflow_run\.head_sha/);
  assert.match(workflow, /TARGET_SHA:/);
  assert.match(workflow, /ref: \$\{\{ env\.TARGET_SHA \}\}/);
});

test("production smoke waits for managed-host redeploy without an overly short race window", () => {
  assert.match(workflow, /timeout-minutes: 20/);
  assert.match(workflow, /seq 1 30/);
  assert.match(workflow, /sleep 30/);
});

test("production smoke rejeita interface de login antiga mesmo quando a release responde saudável", () => {
  assert.match(smoke, /href="\/auth\/google"/);
  assert.match(smoke, /Se o prontuário estiver aberto dentro de outro aplicativo/);
});

test("production smoke fails bounded network calls instead of hanging indefinitely", () => {
  assert.match(smoke, /REQUEST_TIMEOUT_MS = 15_000/);
  const timeoutCalls = smoke.match(/AbortSignal\.timeout\(REQUEST_TIMEOUT_MS\)/g) ?? [];
  assert.ok(timeoutCalls.length >= 2, "GET e bootstrap OAuth devem ter timeout explícito");
});

test("health release identifier cannot be served from an intermediary cache", () => {
  assert.match(health, /Cache-Control/);
  assert.match(health, /no-store/);
  assert.match(health, /releaseId: CLINICAL_RELEASE_ID/);
  assert.match(smoke, /healthCacheControl/);
  assert.match(smoke, /includes\("no-store"\)/);
});

test("Hostinger runbook tracks the current clinical release and exact-SHA smoke", () => {
  assert.match(hostingerDocs, /2026-08-26-prontuario-refactor-v1/);
  assert.match(smoke, /não bloqueou cache compartilhado/);
  assert.match(hostingerDocs, /SHA exato/);
  assert.match(hostingerDocs, /aproximadamente 15 minutos/);
});
