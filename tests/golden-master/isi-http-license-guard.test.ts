import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("complementary scale API exposes ISI only as total-score entry", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /ISI_QUICK_DEFINITION/);
  assert.match(route, /scaleCode === ISI_CODE/);
  assert.match(route, /scoreIsi\(answers\)/);
  assert.doesNotMatch(route, /SCALE_LICENSE_REQUIRED/);
  assert.doesNotMatch(route, /ISI_FORM_CONTENT_NOT_CONFIGURED/);
  assert.doesNotMatch(route, /electronicScaleRestriction\(ISI_CODE/);
});

test("ISI API does not embed questionnaire item content", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  const domain = readFileSync("src/domain/isi.ts", "utf8");
  assert.match(domain, /fields: \[\{/);
  assert.match(domain, /id: "score"/);
  assert.doesNotMatch(domain, /ISI_ITEM_IDS|item1|item2|item3|item4|item5|item6|item7/);
  assert.doesNotMatch(route, /item1|item2|item3|item4|item5|item6|item7/);
});
