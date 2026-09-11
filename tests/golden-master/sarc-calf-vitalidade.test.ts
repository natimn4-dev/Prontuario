import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SARC_CALF_STRUCTURED_DEFINITION,
  SARC_CALF_STRUCTURED_VERSION,
  SARCF_STRUCTURED_VERSION,
  scoreSarcCalfStructured,
  scoreSarcfStructured,
} from "../../src/domain/sarcf-structured.ts";
import { buildClinicalScaleOptions, clinicalScaleDomain } from "../../src/domain/clinical-scale-workspace.ts";
import {
  INTRINSIC_CAPACITY_MODEL_VERSION,
  methodologyForScale,
} from "../../src/domain/intrinsic-capacity-methodology.ts";
import { buildIntrinsicCapacityGuidance } from "../../src/domain/intrinsic-capacity-guidance.ts";
import { scaleCatalogEntry } from "../../src/domain/scale-catalog.ts";
import { withStructuredScaleEntry } from "../../src/domain/structured-scale-entry.ts";

test("SARC-CalF combina cinco itens SARC-F com sexo e panturrilha sem alterar a versão histórica", () => {
  assert.equal(SARC_CALF_STRUCTURED_DEFINITION.fields.length, 7);
  assert.equal(SARC_CALF_STRUCTURED_DEFINITION.version, SARC_CALF_STRUCTURED_VERSION);
  assert.notEqual(SARC_CALF_STRUCTURED_VERSION, SARCF_STRUCTURED_VERSION);

  const historical = scoreSarcfStructured({ strength: 2, walking: 1, chair: 0, stairs: 1, falls: 1 });
  assert.equal(historical.result.score, 5);
  assert.equal(historical.version, SARCF_STRUCTURED_VERSION);
});

test("SARC-CalF aplica 10 pontos na panturrilha baixa e corte positivo em 11", () => {
  const maleBoundary = scoreSarcCalfStructured({
    strength: 1,
    walking: 0,
    chair: 0,
    stairs: 0,
    falls: 0,
    sex: "Masculino",
    calfCm: 34,
  });
  assert.equal(maleBoundary.result.score, 11);
  assert.equal(maleBoundary.result.clinicalColor, "vermelho");
  assert.match(maleBoundary.result.classification, /positivo/i);

  const femaleBoundary = scoreSarcCalfStructured({
    strength: 0,
    walking: 0,
    chair: 0,
    stairs: 0,
    falls: 1,
    sex: "Feminino",
    calfCm: 33,
  });
  assert.equal(femaleBoundary.result.score, 11);
  assert.match(femaleBoundary.result.classification, /positivo/i);
});

test("SARC-CalF não soma CalF acima do limite e preserva máximo 20", () => {
  const negative = scoreSarcCalfStructured({
    strength: 2,
    walking: 2,
    chair: 2,
    stairs: 2,
    falls: 2,
    sex: "Masculino",
    calfCm: 34.1,
  });
  assert.equal(negative.result.score, 10);
  assert.equal(negative.result.clinicalColor, "verde");
  assert.match(negative.result.classification, /negativo/i);

  const maximum = scoreSarcCalfStructured({
    strength: 2,
    walking: 2,
    chair: 2,
    stairs: 2,
    falls: 2,
    sex: "Feminino",
    calfCm: 30,
  });
  assert.equal(maximum.result.score, 20);
  assert.equal(maximum.result.scoreText, "20/20");
});

test("SARC-CalF mantém panturrilha como entrada numérica contínua", () => {
  const uiDefinition = withStructuredScaleEntry(SARC_CALF_STRUCTURED_DEFINITION);
  const calf = uiDefinition.fields.find((field) => field.id === "calfCm");
  assert.ok(calf?.number);
  assert.equal(calf?.choices, undefined);
  assert.equal(calf?.number?.step, 0.1);
});

test("SARC-CalF substitui SARC-F na seleção nova e permanece em Vitalidade", () => {
  assert.equal(clinicalScaleDomain("sarc_calf", "nutricao"), "Vitalidade e nutrição");

  const options = buildClinicalScaleOptions([
    { source: "complementary", code: "sarcf", name: "SARC-F", dimension: "mobilidade" },
    { source: "complementary", code: "sarc_calf", name: "SARC-CalF", dimension: "nutricao" },
  ]);
  assert.deepEqual(options.map((item) => item.code), ["sarc_calf"]);
  assert.equal(options[0]?.domain, "Vitalidade e nutrição");
});

test("SARC-CalF integra somente Vitalidade na metodologia nova", () => {
  assert.equal(INTRINSIC_CAPACITY_MODEL_VERSION, "intrinsic-capacity-model-v1.2.0");
  const methodology = methodologyForScale("sarc_calf");
  assert.equal(methodology.length, 1);
  assert.equal(methodology[0]?.domain, "vitalidade");
  assert.equal(methodology[0]?.basis, "screening");
  assert.equal(methodology[0]?.canClassifyDomain, true);
});

test("rastreio SARC-CalF positivo aciona orientações específicas de Vitalidade", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "sarc_calf", scaleName: "SARC-CalF", color: "vermelho", assessedInTargetConsultation: true },
  ]);
  assert.deepEqual(guidance.alteredDomains.map((domain) => domain.code), ["vitalidade"]);
  const vitality = guidance.alteredDomains[0];
  assert.deepEqual(vitality?.triggeredBy, ["SARC-CalF"]);
  assert.ok(vitality?.actions.some((action) => /SARC-CalF/i.test(action)));
  assert.ok(vitality?.evidenceReferences.some((reference) => reference.pmid === "27650212"));
});

test("catálogo registra versão e fonte própria do SARC-CalF", () => {
  const catalog = scaleCatalogEntry("sarc_calf");
  assert.equal(catalog.shortName, "SARC-CalF");
  assert.equal(catalog.version, SARC_CALF_STRUCTURED_VERSION);
  assert.equal(catalog.sourceStatus, "confirmed-primary");
  assert.match(catalog.source ?? "", /27650212/);
});

test("API complementar expõe SARC-CalF preservando escopo de acesso por paciente", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /SARC_CALF_STRUCTURED_DEFINITION/);
  assert.match(route, /scoreSarcCalfStructured/);
  assert.match(route, /typeof SARC_CALF_STRUCTURED_CODE/);
  assert.match(route, /requireConsultationAccess\(consultationId, "patient\.read"\)/);
});
