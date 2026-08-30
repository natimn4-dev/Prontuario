import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../../src/app/api/health/auth/route.ts", import.meta.url), "utf8");

test("diagnóstico temporário VIDaaS exige token e não seleciona dados clínicos", () => {
  assert.match(route, /VIDAAS_DIAGNOSTIC_TOKEN_SHA256/);
  assert.match(route, /sha256/);
  assert.match(route, /where: \{ provider: "VIDAAS", status: "FAILED" \}/);
  assert.match(route, /select: \{ errorCode: true \}/);
  assert.doesNotMatch(route, /patientId: true|consultationId: true|sourceSnapshotId: true|signedPdfBase64: true|unsignedPdfBase64: true/);
});
