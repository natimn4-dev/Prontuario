import assert from "node:assert/strict";
import test from "node:test";
import { EMPTY_URINARY_CATHETER, normalizeUrinaryCatheterContext, mergeStoredUrinaryCatheterContext, readUrinaryCatheterContext, urinaryCatheterGuidance } from "../../src/domain/urinary-catheter-support.ts";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { buildAgaReportCareSections } from "../../src/domain/report-care-sections.ts";
import { sanitizeFamilyReportModel } from "../../src/domain/family-care-safety.ts";
import { renderAccessibleAgaReportText } from "../../src/domain/accessible-aga-report-text.ts";

test("sonda vesical: ausência, legado e entradas inválidas não inferem uso", () => {
  assert.equal(readUrinaryCatheterContext(undefined), undefined);
  assert.equal(readUrinaryCatheterContext({ schemaVersion: "old", indwelling: true, intermittent: false }), undefined);
  for (const value of [null, [], {}, { indwelling: "sim", intermittent: false }, { indwelling: true }]) assert.throws(() => normalizeUrinaryCatheterContext(value));
  assert.equal(urinaryCatheterGuidance(), undefined);
  assert.equal(urinaryCatheterGuidance(EMPTY_URINARY_CATHETER), undefined);
});

test("sonda vesical: armazenamento separado preserva nutrição, terapias e outros dados", () => {
  const base = { dietaryAssessment: { meals: ["synthetic"] }, swallowingSupportContext: { speechTherapy: true }, other: "preserved" };
  const stored = mergeStoredUrinaryCatheterContext(base, { indwelling: true, intermittent: false }, "2026-10-09T10:00:00Z");
  assert.deepEqual(stored.dietaryAssessment, base.dietaryAssessment);
  assert.deepEqual(stored.swallowingSupportContext, base.swallowingSupportContext);
  assert.equal(stored.other, "preserved");
  assert.equal("urinaryCatheterContext" in base, false);
  assert.deepEqual(readUrinaryCatheterContext(stored.urinaryCatheterContext), { indwelling: true, intermittent: false });
  const cleared = mergeStoredUrinaryCatheterContext(stored, EMPTY_URINARY_CATHETER, "2026-10-09T11:00:00Z");
  assert.equal(urinaryCatheterGuidance(readUrinaryCatheterContext(cleared.urinaryCatheterContext)), undefined);
  assert.equal(readUrinaryCatheterContext(stored.urinaryCatheterContext)?.indwelling, true);
});

for (const context of [{ indwelling: true, intermittent: false }, { indwelling: false, intermittent: true }, { indwelling: true, intermittent: true }]) {
  test(`sonda vesical: relatório e filtro familiar preservam cuidados específicos ${JSON.stringify(context)}`, () => {
    const base = buildAgaReportModel({ patientId: "synthetic-urinary-p", consultationId: "synthetic-urinary-c", consultationStatus: "IN_REVIEW", patientName: "Paciente Sintético", longitudinalProblems: [], longitudinalAssessments: [] });
    const care = buildAgaReportCareSections({ gastrostomyPresent: false, urinaryCatheter: context, savedPlan: null, problems: [] });
    assert.equal(care.swallowingSupportCare, undefined);
    const safe = sanitizeFamilyReportModel({ ...base, ...care });
    assert.deepEqual(safe.urinaryCatheterCare, urinaryCatheterGuidance(context));
    assert.deepEqual(safe.medicationPlan, base.medicationPlan);
    const text = renderAccessibleAgaReportText(safe);
    assert.match(text, /CUIDADOS COM SONDA VESICAL/);
    assert.match(text, /não confirmam infecção/);
    assert.match(text, /Mudança súbita de consciência/);
    assert.match(text, /restrições médicas/);
    assert.match(text, /constipação/);
    assert.match(text, /impacto emocional/);
    if (context.indwelling) { assert.match(text, /bolsa abaixo da bexiga/); assert.match(text, /pela metade/); assert.match(text, /sistema fechado/); assert.match(text, /não há intervalo único/); }
    else assert.doesNotMatch(text, /Sonda de demora \(com bolsa coletora\)/);
    if (context.intermittent) { assert.match(text, /técnica limpa domiciliar/); assert.match(text, /Não force a passagem/); assert.match(text, /Descarte a sonda de uso único/); }
    else assert.doesNotMatch(text, /Sonda de alívio \(intermitente\)/);
    assert.doesNotMatch(text, /a cada 4 semanas|4 a 6 vezes|lenço embebido em álcool/);
  });
}

test("sonda vesical: relatório sem marcação não inclui cuidados nem infere uso pela incontinência", () => {
  const report = buildAgaReportModel({ patientId: "synthetic-urinary-p", consultationId: "synthetic-urinary-c", consultationStatus: "IN_REVIEW", patientName: "Paciente Sintético", longitudinalProblems: [], longitudinalAssessments: [] });
  for (const urinaryCatheter of [undefined, EMPTY_URINARY_CATHETER]) {
    const care = buildAgaReportCareSections({ gastrostomyPresent: false, urinaryCatheter, savedPlan: null, problems: [{ id: "synthetic", title: "Incontinência urinária" }] });
    assert.equal(care.urinaryCatheterCare, undefined);
    assert.doesNotMatch(renderAccessibleAgaReportText({ ...report, ...care }), /CUIDADOS COM SONDA VESICAL/);
  }
});
