import assert from "node:assert/strict";
import test from "node:test";
import { consultationNoteJsonToSoapDraft, soapDraftToConsultationNoteJson, mergeSoapDraftUpdate } from "../../src/domain/consultation-note-contract.ts";
import { consultationNoteVersion } from "../../src/server/clinical/consultation-note-version.ts";

test("SOAP normalizado mantém a mesma versão após gravação, releitura e segundo salvamento", () => {
  const input = { subjective: "  História sintética  ", physicalExam: "", vitalSigns: "", anthropometry: "", planByProblem: { p1: [] }, preventiveExamOrders: [] };
  const persisted = soapDraftToConsultationNoteJson(input);
  const responseFields = consultationNoteJsonToSoapDraft(persisted);
  const readFields = consultationNoteJsonToSoapDraft(JSON.parse(JSON.stringify(persisted)));
  const version = consultationNoteVersion({ fields: responseFields, examsText: "" });
  assert.equal(version, consultationNoteVersion({ fields: readFields, examsText: "" }));
  const second = consultationNoteJsonToSoapDraft(soapDraftToConsultationNoteJson(mergeSoapDraftUpdate(readFields, { subjective: "Segunda evolução" })));
  assert.equal(second.subjective, "Segunda evolução");
  assert.notEqual(version, consultationNoteVersion({ fields: second, examsText: "" }));
});

test("atualização SOAP preserva campos omitidos e conduta histórica fora da lista ativa", () => {
  const current = { subjective: "Inicial", physicalExam: "Exame", vitalSigns: "PA sintética", planByProblem: { active: ["Ação ativa"], resolved: ["Conduta histórica"] } };
  const next = consultationNoteJsonToSoapDraft(soapDraftToConsultationNoteJson(mergeSoapDraftUpdate(current, { subjective: "Atualizada", physicalExam: undefined, planByProblem: { active: ["Ação revista"] } })));
  assert.equal(next.physicalExam, "Exame");
  assert.equal(next.vitalSigns, "PA sintética");
  assert.deepEqual(next.planByProblem, { active: ["Ação revista"], resolved: ["Conduta histórica"] });
});

test("limpeza explícita remove somente o campo e a conduta selecionados", () => {
  const next = consultationNoteJsonToSoapDraft(soapDraftToConsultationNoteJson(mergeSoapDraftUpdate({ subjective: "História", physicalExam: "Exame", planByProblem: { p1: ["Ação"], p2: ["Histórico"] } }, { physicalExam: "", planByProblem: { p1: [] } })));
  assert.equal(next.subjective, "História");
  assert.equal(next.physicalExam, undefined);
  assert.deepEqual(next.planByProblem, { p2: ["Histórico"] });
});

test("SOAP sem dados não inventa informação clínica", () => {
  const empty = consultationNoteJsonToSoapDraft(soapDraftToConsultationNoteJson(mergeSoapDraftUpdate({}, {})));
  assert.ok(Object.values(empty).every(value => value === undefined));
});
