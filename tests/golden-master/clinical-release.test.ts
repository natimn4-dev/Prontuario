import assert from "node:assert/strict";
import test from "node:test";
import { CLINICAL_RELEASE_ID } from "../../src/domain/clinical-release.ts";

test("release clínica possui identificador estável e não vazio para o smoke de produção", () => {
  assert.equal(CLINICAL_RELEASE_ID, "2026-09-05-report-ux-deploy-integrity-v1");
  assert.ok(CLINICAL_RELEASE_ID.length > 10);
});