import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildClinicalScaleOptions } from "../../src/domain/clinical-scale-workspace.ts";

test("license-gated ISI placeholder stays in the Sono domain and cannot be activated", () => {
  const [isi] = buildClinicalScaleOptions([
    {
      source: "complementary",
      code: "isi",
      name: "ISI — Índice de Gravidade de Insônia",
      dimension: "sono",
      disabled: true,
      statusNote: "Aguarda licença eletrônica e versão brasileira autorizada.",
    },
  ]);

  assert.equal(isi?.domain, "Sono");
  assert.equal(isi?.disabled, true);
  assert.match(isi?.statusNote ?? "", /Aguarda licença eletrônica/);
});

test("unified workspace renders the ISI restriction as a disabled checkbox", () => {
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");

  assert.match(workspace, /restriction\.code === "isi"/);
  assert.match(workspace, /dimension: "sono"/);
  assert.match(workspace, /disabled: true/);
  assert.match(workspace, /Aguarda licença eletrônica e versão brasileira autorizada/);
  assert.match(workspace, /disabled=\{option\.disabled\}/);
  assert.match(workspace, /if \(option\.disabled\) return/);
  assert.match(workspace, /!option\.disabled && option\.appliedInCurrentConsultation/);
});