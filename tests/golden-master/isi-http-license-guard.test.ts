import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("complementary scale API explicitly gates direct ISI administration", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /scaleCode === ISI_CODE/);
  assert.match(route, /SCALE_LICENSE_REQUIRED/);
  assert.match(route, /ISI_FORM_CONTENT_NOT_CONFIGURED/);
  assert.match(route, /electronicScaleLicenseFlagsFromEnvironment\(process\.env\)/);
  assert.match(route, /electronicScaleRestriction\(ISI_CODE/);
});

test("ISI direct POST cannot bypass the missing licensed Brazilian form content", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  const gateIndex = route.indexOf("if (scaleCode === ISI_CODE)");
  const genericValidationIndex = route.indexOf("validateAgainstDefinition(scaleCode, answers)");
  assert.ok(gateIndex >= 0);
  assert.ok(genericValidationIndex > gateIndex);
  assert.doesNotMatch(route.slice(gateIndex, genericValidationIndex), /scoreIsi\(/);
  assert.doesNotMatch(route.slice(gateIndex, genericValidationIndex), /saveScaleAssessment\(/);
});
