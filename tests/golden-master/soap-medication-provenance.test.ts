import assert from "node:assert/strict";
import test from "node:test";
import {
  isExplicitActiveMedication,
  summarizeSoapMedicationProvenance,
} from "../../src/domain/soap-medication-provenance.ts";

test("SOAP libera cópia quando todos os status vêm de histórico explícito", () => {
  const summary = summarizeSoapMedicationProvenance([
    { status: "ACTIVE", statusSource: "explicit-history" },
    { status: "SUSPENDED", statusSource: "explicit-history" },
    { status: "FINISHED", statusSource: "explicit-history" },
  ]);

  assert.deepEqual(summary, {
    explicitActiveCount: 1,
    pendingReviewCount: 0,
    canCopySoap: true,
  });
});

test("SOAP falha fechado quando status depende apenas do cadastro atual", () => {
  const summary = summarizeSoapMedicationProvenance([
    { status: "ACTIVE", statusSource: "current-record-only" },
  ]);

  assert.deepEqual(summary, {
    explicitActiveCount: 0,
    pendingReviewCount: 1,
    canCopySoap: false,
  });
});

test("SOAP falha fechado quando status histórico é desconhecido", () => {
  const summary = summarizeSoapMedicationProvenance([
    { status: "UNKNOWN", statusSource: "unknown" },
  ]);

  assert.equal(summary.pendingReviewCount, 1);
  assert.equal(summary.canCopySoap, false);
});

test("somente ACTIVE com histórico explícito entra em medicações em uso", () => {
  assert.equal(isExplicitActiveMedication({ status: "ACTIVE", statusSource: "explicit-history" }), true);
  assert.equal(isExplicitActiveMedication({ status: "ACTIVE", statusSource: "current-record-only" }), false);
  assert.equal(isExplicitActiveMedication({ status: "SUSPENDED", statusSource: "explicit-history" }), false);
});
