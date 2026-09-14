import assert from "node:assert/strict";
import test from "node:test";
import { buildClinicalScaleOptions } from "../../src/domain/clinical-scale-workspace.ts";

const quickMeem = { source: "complementary" as const, code: "meem", name: "MEEM — pontuação e escolaridade", dimension: "cognicao" };
const quickMoca = { source: "complementary" as const, code: "moca", name: "MoCA — pontuação e escolaridade", dimension: "cognicao" };
const detailedMeem = { source: "core" as const, code: "meem_freitas", name: "MEEM — Miniexame do Estado Mental", dimension: "cognicao" };
const detailedMoca = { source: "core" as const, code: "moca_br_freitas", name: "MoCA — versão brasileira", dimension: "cognicao" };

test("MEEM detalhado presente suprime somente o fallback rápido de MEEM", () => {
  const options = buildClinicalScaleOptions([quickMeem, quickMoca, detailedMeem]);
  assert.ok(options.some((item) => item.code === "meem_freitas"));
  assert.ok(!options.some((item) => item.code === "meem"));
  assert.ok(options.some((item) => item.code === "moca"));
});

test("MoCA detalhado presente suprime somente o fallback rápido de MoCA", () => {
  const options = buildClinicalScaleOptions([quickMeem, quickMoca, detailedMoca]);
  assert.ok(options.some((item) => item.code === "moca_br_freitas"));
  assert.ok(!options.some((item) => item.code === "moca"));
  assert.ok(options.some((item) => item.code === "meem"));
});

test("sem definição detalhada licenciada o registro score-only permanece disponível", () => {
  const options = buildClinicalScaleOptions([quickMeem, quickMoca]);
  assert.ok(options.some((item) => item.code === "meem"));
  assert.ok(options.some((item) => item.code === "moca"));
});

test("definição detalhada desabilitada não remove fallback rápido", () => {
  const options = buildClinicalScaleOptions([quickMeem, { ...detailedMeem, disabled: true }]);
  assert.ok(options.some((item) => item.code === "meem"));
});

test("fluência verbal cognitiva permanece exposta no workspace unificado", () => {
  const options = buildClinicalScaleOptions([{
    source: "core",
    code: "verbal_fluency_animals",
    name: "Fluência verbal semântica — animais",
    dimension: "cognicao",
  }]);
  assert.equal(options[0]?.domain, "Cognição");
  assert.equal(options[0]?.code, "verbal_fluency_animals");
});
