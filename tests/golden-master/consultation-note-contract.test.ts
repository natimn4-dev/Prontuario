import assert from "node:assert/strict";
import test from "node:test";
import {
  CONSULTATION_NOTE_SCHEMA_VERSION,
  consultationNoteJsonToSoapDraft,
  parseObjectiveNote,
  parsePlanNote,
  parseSubjectiveNote,
  soapDraftToConsultationNoteJson,
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
    vaccinationReview: undefined,
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
      vaccinationReview: undefined,
      planByProblem: undefined,
    },
  );
});

test("contrato SOAP persiste revisão vacinal estruturada sem transformar pendência em conduta", () => {
  const draft = consultationNoteJsonToSoapDraft({
    subjective: null,
    objective: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "objective",
      vaccinationReview: {
        status: "PENDING",
        pendingVaccines: ["Influenza", "Pneumocócica"],
      },
    },
    plan: null,
  });

  assert.deepEqual(draft.vaccinationReview, {
    status: "PENDING",
    pendingVaccines: ["Influenza", "Pneumocócica"],
  });
  assert.deepEqual(
    soapDraftToConsultationNoteJson(draft).objective.vaccinationReview,
    draft.vaccinationReview,
  );
  assert.throws(
    () => parseObjectiveNote({
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "objective",
      vaccinationReview: { status: "PENDING", pendingVaccines: [] },
    }),
    /ao menos uma vacina/,
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
