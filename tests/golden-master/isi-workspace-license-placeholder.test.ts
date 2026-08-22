import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildClinicalScaleOptions } from "../../src/domain/clinical-scale-workspace.ts";
import { ISI_QUICK_DEFINITION } from "../../src/domain/isi.ts";

test("ISI score-only stays in the Sono domain and remains selectable", () => {
  const [isi] = buildClinicalScaleOptions([{
    source: "complementary",
    code: ISI_QUICK_DEFINITION.code,
    name: ISI_QUICK_DEFINITION.name,
    dimension: ISI_QUICK_DEFINITION.dimension,
  }]);

  assert.equal(isi?.domain, "Sono");
  assert.notEqual(isi?.disabled, true);
});

test("unified workspace receives ISI from complementary definitions instead of a licensed-form placeholder", () => {
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");

  assert.match(route, /ISI_QUICK_DEFINITION/);
  assert.match(route, /definitions: DEFINITIONS/);
  assert.doesNotMatch(route, /SCALE_LICENSE_REQUIRED/);
  assert.match(workspace, /complementaryView\?\.definitions/);
});
