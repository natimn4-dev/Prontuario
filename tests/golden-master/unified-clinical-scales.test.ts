import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CLINICAL_SCALE_DOMAIN_ORDER,
  buildClinicalScaleOptions,
  clinicalScaleDomain,
  groupClinicalScaleOptions,
} from "../../src/domain/clinical-scale-workspace.ts";

test("unified clinical scale workspace preserves the approved domain order", () => {
  assert.deepEqual(CLINICAL_SCALE_DOMAIN_ORDER, [
    "Cognição",
    "Funcionalidade",
    "Capacidade psicológica e humor",
    "Sono",
    "Locomoção e desempenho físico",
    "Fragilidade",
    "Vitalidade e nutrição",
    "Medicamentos e risco de quedas",
    "Família",
    "Rede e suporte social",
    "Sobrecarga do cuidador",
    "Sintomas",
    "Oncogeriatria",
    "Prognóstico e cuidados paliativos",
  ]);
});

test("workspace hides detailed MEEM/MoCA duplicates and preserves simplified entries", () => {
  const options = buildClinicalScaleOptions([
    { source: "core", code: "meem_freitas", name: "MEEM detalhado", dimension: "cognicao" },
    { source: "core", code: "moca_br_freitas", name: "MoCA detalhado", dimension: "cognicao" },
    { source: "complementary", code: "meem", name: "MEEM simples", dimension: "cognicao" },
    { source: "complementary", code: "moca", name: "MoCA simples", dimension: "cognicao" },
  ]);
  assert.deepEqual(options.map((item) => item.code).sort(), ["meem", "moca"]);
});

test("workspace deduplicates codes and maps sleep, family, social, caregiver, vitality and prognosis correctly", () => {
  const options = buildClinicalScaleOptions([
    { source: "complementary", code: "isi", name: "ISI", dimension: "sono" },
    { source: "core", code: "family_apgar_br_elderly", name: "APGAR familiar", dimension: "familia" },
    { source: "core", code: "mos_sss_br_19", name: "MOS-SSS", dimension: "suporte_social" },
    { source: "core", code: "zarit_br_22", name: "Zarit", dimension: "sobrecarga_cuidador" },
    { source: "complementary", code: "mna_sf", name: "MNA-SF", dimension: "nutricao" },
    { source: "complementary", code: "kps", name: "KPS", dimension: "prognostico" },
    { source: "oncogeriatric", code: "ecog", name: "ECOG", dimension: "oncogeriatria" },
    { source: "complementary", code: "ecog", name: "ECOG duplicado", dimension: "oncogeriatria" },
  ]);
  const byCode = new Map(options.map((item) => [item.code, item.domain]));
  assert.equal(byCode.get("isi"), "Sono");
  assert.equal(byCode.get("family_apgar_br_elderly"), "Família");
  assert.equal(byCode.get("mos_sss_br_19"), "Rede e suporte social");
  assert.equal(byCode.get("zarit_br_22"), "Sobrecarga do cuidador");
  assert.equal(byCode.get("mna_sf"), "Vitalidade e nutrição");
  assert.equal(byCode.get("kps"), "Prognóstico e cuidados paliativos");
  assert.equal(options.filter((item) => item.code === "ecog").length, 1);
  assert.ok(groupClinicalScaleOptions(options).every((group) => group.options.length > 0));
});

test("workspace fails closed for an unmapped clinical domain instead of silently using functionality", () => {
  assert.throws(
    () => clinicalScaleDomain("future_scale", "new_dimension"),
    /Domínio clínico não mapeado para a escala future_scale: new_dimension/,
  );
  assert.throws(
    () => clinicalScaleDomain("future_scale"),
    /Domínio clínico não mapeado para a escala future_scale: sem dimensão/,
  );
});

test("all approved dimension labels resolve explicitly", () => {
  const expected = new Map([
    ["cognicao", "Cognição"],
    ["funcionalidade", "Funcionalidade"],
    ["humor", "Capacidade psicológica e humor"],
    ["sono", "Sono"],
    ["mobilidade", "Locomoção e desempenho físico"],
    ["fragilidade", "Fragilidade"],
    ["nutricao", "Vitalidade e nutrição"],
    ["medicamentos", "Medicamentos e risco de quedas"],
    ["familia", "Família"],
    ["suporte_social", "Rede e suporte social"],
    ["sobrecarga_cuidador", "Sobrecarga do cuidador"],
    ["sintomas", "Sintomas"],
    ["oncogeriatria", "Oncogeriatria"],
    ["prognostico", "Prognóstico e cuidados paliativos"],
  ]);

  for (const [dimension, domain] of expected) {
    assert.equal(clinicalScaleDomain(`test-${dimension}`, dimension), domain);
  }
});

test("consultation page renders one scale workspace instead of three independent panels", () => {
  const page = readFileSync("src/app/consultations/[id]/page.tsx", "utf8");
  assert.match(page, /ClinicalScalesWorkspace/);
  assert.doesNotMatch(page, /<AgaCoreScales/);
  assert.doesNotMatch(page, /<ComplementaryScoreScales/);
  assert.doesNotMatch(page, /<OncogeriatricScales/);
});

test("unified workspace exposes checkbox selection and current-consultation status", () => {
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
  const statusRoute = readFileSync("src/app/api/consultations/[id]/scales/status/route.ts", "utf8");
  assert.match(workspace, /type="checkbox"/);
  assert.match(workspace, /Em preenchimento/);
  assert.match(workspace, /Aplicada nesta consulta/);
  assert.match(workspace, /clinical-scales-changed/);
  assert.match(statusRoute, /requireAuthenticatedUser\("patient\.read"\)/);
  assert.match(statusRoute, /consultationId: consultation\.id/);
  assert.match(statusRoute, /patientId: consultation\.patientId/);
});

test("simplified MEEM and MoCA replace legacy definitions in the complementary API", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /COGNITIVE_QUICK_DEFINITIONS/);
  assert.match(route, /scoreCognitiveQuickEntry/);
  assert.match(route, /filter\(\(item\) => !QUICK_CODES\.has/);
});
