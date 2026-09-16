import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  currentVidaasFailureClass,
  VIDAAS_FAILURE_VISIBILITY_MS,
} from "../../src/domain/vidaas-diagnostic.ts";

const route = readFileSync(new URL("../../src/app/api/health/auth/route.ts", import.meta.url), "utf8");
const workflow = readFileSync(new URL("../../.github/workflows/vidaas-diagnostic-probe.yml", import.meta.url), "utf8");

test("diagnóstico VIDaaS considera a tentativa mais recente sem expor PHI", () => {
  assert.match(route, /where: \{ provider: "VIDAAS" \}/);
  assert.match(route, /select: \{ status: true, errorCode: true, updatedAt: true \}/);
  assert.match(route, /currentVidaasFailureClass\(latestAttempt\)/);
  assert.match(route, /vidaasFailureClass/);
  assert.doesNotMatch(route, /lastFailureCode/);
  assert.doesNotMatch(route, /patientId: true|consultationId: true|sourceSnapshotId: true|signedPdfBase64: true|unsignedPdfBase64: true/);
});

test("falha histórica VIDaaS não permanece como diagnóstico atual", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");
  assert.equal(currentVidaasFailureClass({
    status: "FAILED",
    errorCode: "VIDAAS_SIGNED_DOCUMENT_INVALID",
    updatedAt: new Date(now.getTime() - VIDAAS_FAILURE_VISIBILITY_MS - 1),
  }, now), null);
});

test("sucesso ou tentativa pendente mais recente supera falha anterior", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");
  assert.equal(currentVidaasFailureClass({ status: "SIGNED", errorCode: null, updatedAt: now }, now), null);
  assert.equal(currentVidaasFailureClass({ status: "PENDING", errorCode: null, updatedAt: now }, now), null);
});

test("falha recente continua visível e classificada sem conteúdo sensível", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");
  assert.equal(currentVidaasFailureClass({
    status: "FAILED",
    errorCode: "VIDAAS_SIGNED_DOCUMENT_INVALID",
    updatedAt: new Date(now.getTime() - 60_000),
  }, now), "SIGNED_DOCUMENT_INVALID");
});

test("probe só aprova quando não existe falha atual e falha fechado após as tentativas", () => {
  assert.match(workflow, /if \[\[ "\$FAILURE_CLASS" == "NONE" \]\]/);
  assert.match(workflow, /exit 1/);
  assert.doesNotMatch(workflow, /"\$FAILURE_CLASS" != "SIGNED_DOCUMENT_RESPONSE"/);
});
