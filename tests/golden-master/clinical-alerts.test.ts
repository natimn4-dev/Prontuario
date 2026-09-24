import assert from "node:assert/strict";
import test from "node:test";
import { clinicalAlertsFor } from "../../src/domain/clinical-alerts.ts";
import { legacyScales } from "../../src/domain/legacy-scales.ts";

test("GDS-15 mantém lembrete de pesquisa ativa de ideação suicida independentemente do escore", () => {
  const alerts = clinicalAlertsFor("gds15");
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.severity, "attention");
  assert.equal(alerts[0]?.alwaysEvaluate, true);
});

test("Cornell sempre destaca co16 e eleva para urgente quando ideação está presente", () => {
  const baseline = clinicalAlertsFor("cornell", { answers: { co16: 0 } });
  assert.equal(baseline.length, 1);
  assert.equal(baseline[0]?.code, "cornell-co16-review");
  assert.equal(baseline[0]?.audience, "professional");

  const positive = clinicalAlertsFor("cornell", { answers: { co16: 1 } });
  assert.equal(positive.length, 2);
  assert.ok(positive.some((alert) => alert.severity === "urgent"));
  assert.ok(positive.some((alert) => alert.familyMessage?.includes("procure atendimento médico imediatamente")));
});

test("CAM positivo gera alerta clínico urgente; CAM negativo não gera", () => {
  const positive = legacyScales.cam({ c1: 1, c2: 1, c3: 1, c4: 0 });
  const negative = legacyScales.cam({ c1: 1, c2: 0, c3: 1, c4: 1 });

  assert.equal(clinicalAlertsFor("cam", { result: positive })[0]?.severity, "urgent");
  assert.deepEqual(clinicalAlertsFor("cam", { result: negative }), []);
});
