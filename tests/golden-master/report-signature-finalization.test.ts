import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertFinalReportSignatureEligibility,
  isFinalReportSnapshot,
} from "../../src/domain/report-signature-eligibility.ts";

const vidaasService = readFileSync(new URL("../../src/server/signatures/digital-signature-service.ts", import.meta.url), "utf8");
const birdService = readFileSync(new URL("../../src/server/signatures/bird-signature-service.ts", import.meta.url), "utf8");
const panel = readFileSync(new URL("../../src/components/reports/vidaas-signature-panel.tsx", import.meta.url), "utf8");
const preview = readFileSync(new URL("../../src/components/reports/aga-report-document-preview.tsx", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../src/components/reports/report-workspace-tabs.tsx", import.meta.url), "utf8");

const routePaths = [
  "../../src/app/api/consultations/[id]/reports/aga/signatures/vidaas/route.ts",
  "../../src/app/api/consultations/[id]/reports/aga/signatures/bird/route.ts",
  "../../src/app/api/consultations/[id]/reports/advance-directives/signatures/vidaas/route.ts",
  "../../src/app/api/consultations/[id]/reports/advance-directives/signatures/bird/route.ts",
] as const;
const routes = routePaths.map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

test("snapshot final exige consulta FINALIZED no banco e no próprio relatório", () => {
  assert.throws(
    () => assertFinalReportSignatureEligibility({
      consultationStatus: "IN_REVIEW",
      report: { consultationStatus: "IN_REVIEW", draftContext: true },
    }),
    /CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE/,
  );

  assert.throws(
    () => assertFinalReportSignatureEligibility({
      consultationStatus: "FINALIZED",
      report: { consultationStatus: "IN_REVIEW", draftContext: true },
    }),
    /FINALIZED_REPORT_SNAPSHOT_REQUIRED/,
  );

  assert.doesNotThrow(() => assertFinalReportSignatureEligibility({
    consultationStatus: "FINALIZED",
    report: { consultationStatus: "FINALIZED", draftContext: false },
  }));
  assert.equal(isFinalReportSnapshot({ consultationStatus: "FINALIZED", draftContext: false }), true);
});

test("VIDaaS e Bird revalidam a consulta e bloqueiam snapshot anterior à finalização", () => {
  for (const source of [vidaasService, birdService]) {
    assert.match(source, /prisma\.consultation\.findUnique/);
    assert.match(source, /assertFinalReportSignatureEligibility/);
    assert.match(source, /consultationStatus: consultation\.status/);
  }
});

test("rotas de assinatura não escolhem silenciosamente a última prévia", () => {
  for (const source of routes) {
    assert.match(source, /body\.snapshotId/);
    assert.match(source, /SNAPSHOT_REQUIRED/);
    assert.doesNotMatch(source, /latestSnapshot/);
    assert.doesNotMatch(source, /documentSnapshot\.findFirst/);
  }
});

test("interface assina exatamente o snapshot final exibido e exige nova prévia após finalizar", () => {
  assert.match(preview, /onSigningSnapshotChange/);
  assert.match(preview, /consultationStatus: result\.report\.consultationStatus/);
  assert.match(preview, /draftContext: result\.report\.draftContext/);
  assert.match(workspace, /snapshot=\{signingSnapshot\}/);

  assert.match(panel, /JSON\.stringify\(\{ snapshotId: snapshot\.id \}\)/);
  assert.match(panel, /Esta prévia foi gerada antes da finalização/);
  assert.match(panel, /Assinar \$\{documentLabel\} com VIDaaS/);
  assert.match(panel, /Assinar \$\{documentLabel\} com Bird ID/);
  assert.doesNotMatch(panel, /Finalizar e assinar com/);
});
