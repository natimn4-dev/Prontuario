import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSULTATION_NOTE_SCHEMA_VERSION,
  consultationNoteJsonToSoapDraft,
  parseObjectiveNote,
  parsePlanNote,
  parseSubjectiveNote,
} from "../../src/domain/consultation-note-contract.ts";

test("contrato SOAP v1 projeta apenas campos já suportados pelo renderer", () => {
  const draft = consultationNoteJsonToSoapDraft({
    subjective: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "subjective",
      text: "Queixa registrada pelo médico.",
    },
    objective: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "objective",
      physicalExam: "Exame físico registrado.",
      vitalSigns: "Sinais vitais registrados.",
      anthropometry: "Antropometria registrada.",
    },
    plan: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "plan",
      byProblem: {
        problema_1: ["Conduta registrada para o problema 1."],
      },
    },
  });

  assert.deepEqual(draft, {
    subjective: "Queixa registrada pelo médico.",
    physicalExam: "Exame físico registrado.",
    vitalSigns: "Sinais vitais registrados.",
    anthropometry: "Antropometria registrada.",
    planByProblem: {
      problema_1: ["Conduta registrada para o problema 1."],
    },
  });
});

test("contrato SOAP v1 preserva ausência de dados sem inventar valores", () => {
  assert.deepEqual(
    consultationNoteJsonToSoapDraft({ subjective: null, objective: null, plan: null }),
    {
      subjective: undefined,
      physicalExam: undefined,
      vitalSigns: undefined,
      anthropometry: undefined,
      planByProblem: undefined,
    },
  );
});

test("contrato SOAP rejeita versão, kind e campos desconhecidos", () => {
  assert.throws(
    () => parseSubjectiveNote({ schemaVersion: "2.0", kind: "subjective", text: "x" }),
    /versão de schema não suportada/,
  );
  assert.throws(
    () => parseObjectiveNote({ schemaVersion: "1.0", kind: "subjective" }),
    /tipo de seção incompatível/,
  );
  assert.throws(
    () => parseSubjectiveNote({ schemaVersion: "1.0", kind: "subjective", text: "x", extra: true }),
    /campo\(s\) não reconhecido\(s\)/,
  );
});

test("contrato SOAP rejeita plano por problema ambíguo ou malformado", () => {
  assert.throws(
    () => parsePlanNote({
      schemaVersion: "1.0",
      kind: "plan",
      byProblem: { problema_1: "conduta solta" },
    }),
    /deve ser uma lista de textos/,
  );
  assert.throws(
    () => parsePlanNote({
      schemaVersion: "1.0",
      kind: "plan",
      byProblem: { "": ["Conduta"] },
    }),
    /problemId vazio/,
  );
  assert.throws(
    () => parsePlanNote({
      schemaVersion: "1.0",
      kind: "plan",
      byProblem: { problema_1: [""] },
    }),
    /texto não vazio/,
  );
});
