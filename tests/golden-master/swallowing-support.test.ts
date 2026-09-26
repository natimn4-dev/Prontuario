import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeStoredSwallowingSupportContext,
  normalizeSwallowingSupportContext,
  readSwallowingSupportContext,
  swallowingSupportGuidance,
  SWALLOWING_SUPPORT_EVIDENCE,
} from "../../src/domain/swallowing-support.ts";
import { buildAgaReportCareSections } from "../../src/domain/report-care-sections.ts";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { renderAccessibleAgaReportText } from "../../src/domain/accessible-aga-report-text.ts";

test("deglutição e forma de alimentação aceitam apenas quatro escolhas booleanas", () => {
  assert.deepEqual(normalizeSwallowingSupportContext({
    dysphagia: true,
    adaptedDiet: false,
    enteralTube: true,
    gastrostomy: false,
  }), {
    dysphagia: true,
    adaptedDiet: false,
    enteralTube: true,
    gastrostomy: false,
  });
  assert.throws(() => normalizeSwallowingSupportContext({ dysphagia: true }), /Marque opções válidas/i);
  assert.throws(() => normalizeSwallowingSupportContext({ dysphagia: "sim", adaptedDiet: false, enteralTube: false, gastrostomy: false }), /Marque opções válidas/i);
});

test("salvar o contexto preserva a avaliação alimentar existente e permite recuperar a consulta", () => {
  const existing = { dietaryAssessment: { schemaVersion: "dietary-assessment-v1", meals: [{ id: "lunch" }] } };
  const merged = mergeStoredSwallowingSupportContext(existing, {
    dysphagia: false,
    adaptedDiet: true,
    enteralTube: false,
    gastrostomy: false,
  }, "2026-09-25T17:00:00.000Z");

  assert.deepEqual(merged.dietaryAssessment, existing.dietaryAssessment);
  assert.equal(readSwallowingSupportContext(merged.swallowingSupportContext)?.adaptedDiet, true);
  assert.equal(readSwallowingSupportContext({ schemaVersion: "old", adaptedDiet: true }), undefined);
  assert.deepEqual(existing, { dietaryAssessment: { schemaVersion: "dietary-assessment-v1", meals: [{ id: "lunch" }] } });
});

test("orientações mudam somente conforme as opções registradas e não prescrevem textura ou volumes", () => {
  const adaptedDiet = swallowingSupportGuidance({
    dysphagia: false,
    adaptedDiet: true,
    enteralTube: false,
    gastrostomy: false,
  });
  assert.ok(adaptedDiet);
  assert.ok(adaptedDiet.practicalActions.some((item) => /consistência.*já orientada/i.test(item)));
  assert.ok(adaptedDiet.caregiverActions.some((item) => /observe.*aceita.*ingestão/i.test(item)));
  assert.doesNotMatch([...adaptedDiet.practicalActions, ...adaptedDiet.caregiverActions].join(" "), /ml|mL|ml\/h|espessante.*utilize/i);

  const tube = swallowingSupportGuidance({
    dysphagia: false,
    adaptedDiet: false,
    enteralTube: true,
    gastrostomy: false,
  });
  assert.ok(tube?.practicalActions.some((item) => /fórmula, volume, velocidade e horários/i.test(item)));
  assert.ok(tube?.caregiverActions.some((item) => /triturar comprimidos.*confirm/i.test(item)));
  assert.equal(swallowingSupportGuidance({ dysphagia: false, adaptedDiet: false, enteralTube: false, gastrostomy: false }), undefined);
});

test("relatório inclui orientações de deglutição e cuidado de GTT apenas quando assinalados", () => {
  const empty = buildAgaReportCareSections({
    gastrostomyPresent: false,
    swallowingSupport: { dysphagia: false, adaptedDiet: false, enteralTube: false, gastrostomy: false },
    savedPlan: null,
    problems: [],
  });
  assert.equal(empty.swallowingSupportCare, undefined);
  assert.equal(empty.gastrostomyCare, undefined);

  const gtt = buildAgaReportCareSections({
    gastrostomyPresent: false,
    swallowingSupport: { dysphagia: false, adaptedDiet: false, enteralTube: false, gastrostomy: true },
    savedPlan: null,
    problems: [],
  });
  assert.ok(gtt.swallowingSupportCare?.practicalActions.some((item) => /dieta enteral/i.test(item)));
  assert.ok(gtt.gastrostomyCare?.practicalActions.some((item) => /mãos/i.test(item)));

  const report = buildAgaReportModel({
    patientId: "synthetic-patient",
    consultationId: "synthetic-consultation",
    consultationStatus: "DRAFT",
    patientName: "Paciente de teste",
    longitudinalAssessments: [],
    longitudinalProblems: [],
  });
  const accessibleText = renderAccessibleAgaReportText({ ...report, ...gtt });
  assert.match(accessibleText, /DEGLUTIÇÃO E FORMA DE ALIMENTAÇÃO/);
  assert.match(accessibleText, /CUidados com GASTROSTOMIA/i);
  assert.match(accessibleText, /triturar comprimidos/i);
});

test("orientações registram fontes PubMed sobre disfagia geriátrica, dieta adaptada e segurança de fármacos", () => {
  assert.deepEqual(SWALLOWING_SUPPORT_EVIDENCE.map((reference) => reference.pmid), ["26966356", "33371326", "37707775"]);
});
