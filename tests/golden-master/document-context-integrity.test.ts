import assert from "node:assert/strict";
import test from "node:test";
import { assertDocumentContextIntegrity } from "../../src/domain/document-context-integrity.ts";

const base = {
  patientId: "patient-1",
  consultationId: "consultation-2",
  consultationIds: ["consultation-1", "consultation-2"],
  scaleAssessments: [
    { patientId: "patient-1", consultationId: "consultation-1" },
    { patientId: "patient-1", consultationId: "consultation-2" },
  ],
  problems: [
    {
      id: "problem-1",
      patientId: "patient-1",
      originConsultationId: "consultation-1",
      events: [
        {
          problemId: "problem-1",
          patientId: "patient-1",
          consultationId: "consultation-2",
        },
      ],
    },
  ],
} as const;

test("aceita documento quando todos os dados pertencem ao mesmo paciente e horizonte", () => {
  assert.doesNotThrow(() => assertDocumentContextIntegrity(base));
});

test("falha fechado quando escala pertence a outro paciente", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      scaleAssessments: [{ patientId: "patient-2", consultationId: "consultation-2" }],
    }),
    /escala pertence a paciente diferente/,
  );
});

test("falha fechado quando escala pertence a consulta fora do horizonte", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      scaleAssessments: [{ patientId: "patient-1", consultationId: "consultation-3" }],
    }),
    /escala pertence a consulta fora do horizonte/,
  );
});

test("falha fechado quando problema pertence a outro paciente", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      problems: [{ ...base.problems[0], patientId: "patient-2" }],
    }),
    /problema pertence a paciente diferente/,
  );
});

test("falha fechado quando problema aponta para consulta fora do horizonte", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      problems: [{ ...base.problems[0], originConsultationId: "consultation-3" }],
    }),
    /problema nasceu fora do horizonte da consulta/,
  );
});

test("falha fechado quando evento de problema aponta para outro problema", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      problems: [{
        ...base.problems[0],
        events: [{ problemId: "problem-2", patientId: "patient-1", consultationId: "consultation-2" }],
      }],
    }),
    /evento pertence a problema diferente/,
  );
});

test("falha fechado quando evento de problema cruza paciente", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      problems: [{
        ...base.problems[0],
        events: [{ problemId: "problem-1", patientId: "patient-2", consultationId: "consultation-2" }],
      }],
    }),
    /evento de problema pertence a paciente diferente/,
  );
});

test("falha fechado quando evento pertence a consulta fora do horizonte", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({
      ...base,
      problems: [{
        ...base.problems[0],
        events: [{ problemId: "problem-1", patientId: "patient-1", consultationId: "consultation-3" }],
      }],
    }),
    /evento de problema pertence a consulta fora do horizonte/,
  );
});

test("falha fechado quando consulta-alvo não pertence ao horizonte", () => {
  assert.throws(
    () => assertDocumentContextIntegrity({ ...base, consultationIds: ["consultation-1"] }),
    /consulta-alvo fora do horizonte longitudinal/,
  );
});
