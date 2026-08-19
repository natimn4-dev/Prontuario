import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConsultationNoteShapeInventory,
  classifyObjectiveNoteShape,
  classifyPlanNoteShape,
  classifySubjectiveNoteShape,
} from "../../src/domain/consultation-note-inventory.ts";

test("inventário SOAP classifica vazio, contrato v1 e incompatível sem expor conteúdo", () => {
  assert.equal(classifySubjectiveNoteShape(null), "empty");
  assert.equal(classifySubjectiveNoteShape({ schemaVersion: "1.0", kind: "subjective", text: "texto" }), "contract-v1");
  assert.equal(classifySubjectiveNoteShape({ text: "legado" }), "incompatible");

  assert.equal(classifyObjectiveNoteShape({ schemaVersion: "1.0", kind: "objective", physicalExam: "x" }), "contract-v1");
  assert.equal(classifyObjectiveNoteShape({ schemaVersion: "2.0", kind: "objective" }), "incompatible");

  assert.equal(classifyPlanNoteShape({ schemaVersion: "1.0", kind: "plan", byProblem: { p1: ["ação"] } }), "contract-v1");
  assert.equal(classifyPlanNoteShape({ schemaVersion: "1.0", kind: "plan", byProblem: { p1: "ação" } }), "incompatible");
});

test("inventário SOAP só libera read path quando não há formato legado ou assessment não suportado", () => {
  const safe = buildConsultationNoteShapeInventory([
    {
      subjective: null,
      objective: null,
      assessment: null,
      plan: null,
    },
    {
      subjective: { schemaVersion: "1.0", kind: "subjective", text: "registrado" },
      objective: { schemaVersion: "1.0", kind: "objective", vitalSigns: "registrado" },
      assessment: null,
      plan: { schemaVersion: "1.0", kind: "plan", byProblem: { p1: ["conduta"] } },
    },
  ]);

  assert.deepEqual(safe, {
    totalConsultations: 2,
    subjective: { empty: 1, contractV1: 1, incompatible: 0 },
    objective: { empty: 1, contractV1: 1, incompatible: 0 },
    plan: { empty: 1, contractV1: 1, incompatible: 0 },
    assessment: { empty: 2, presentUnsupported: 0 },
    safeToEnableV1ReadPath: true,
  });

  const unsafe = buildConsultationNoteShapeInventory([
    {
      subjective: { texto: "legado" },
      objective: null,
      assessment: { texto: "avaliação previamente gravada" },
      plan: null,
    },
  ]);

  assert.equal(unsafe.subjective.incompatible, 1);
  assert.equal(unsafe.assessment.presentUnsupported, 1);
  assert.equal(unsafe.safeToEnableV1ReadPath, false);
});
