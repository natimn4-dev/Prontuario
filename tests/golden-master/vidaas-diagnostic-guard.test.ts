import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../../src/app/api/health/auth/route.ts", import.meta.url), "utf8");

test("diagnóstico temporário VIDaaS expõe somente classe técnica sem PHI", () => {
  assert.match(route, /where: \{ provider: "VIDAAS", status: "FAILED" \}/);
  assert.match(route, /select: \{ errorCode: true \}/);
  assert.match(route, /classifyVidaasFailure/);
  assert.match(route, /vidaasFailureClass/);
  assert.doesNotMatch(route, /lastFailureCode/);
  assert.doesNotMatch(route, /patientId: true|consultationId: true|sourceSnapshotId: true|signedPdfBase64: true|unsignedPdfBase64: true/);
});
