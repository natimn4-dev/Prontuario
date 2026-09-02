import assert from "node:assert/strict";
import test from "node:test";
import { isProgram55Enabled } from "../../src/domain/program55/feature.ts";

test("Programa 55+ permanece desabilitado quando a flag está ausente ou falsa", () => {
  assert.equal(isProgram55Enabled(undefined), false);
  assert.equal(isProgram55Enabled(""), false);
  assert.equal(isProgram55Enabled("false"), false);
  assert.equal(isProgram55Enabled("FALSE"), false);
  assert.equal(isProgram55Enabled("0"), false);
});

test("Programa 55+ só é habilitado por true explícito", () => {
  assert.equal(isProgram55Enabled("true"), true);
  assert.equal(isProgram55Enabled(" TRUE "), true);
});
