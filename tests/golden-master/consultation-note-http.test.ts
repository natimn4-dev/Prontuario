import assert from "node:assert/strict";
import test from "node:test";
import {
  consultationNoteJsonToSoapDraft,
  soapDraftToConsultationNoteJson,
} from "../../src/domain/consultation-note-contract.ts";
import {
  ConsultationNoteError,
  type ConsultationNoteView,
} from "../../src/domain/consultation-note-view.ts";
import {
  consultationNoteHttpHandlers,
  parseConsultationNoteUpdate,
  ConsultationNoteRequestError,
} from "../../src/server/clinical/consultation-note-http.ts";

const view: ConsultationNoteView = {
  consultationId: "consultation-synthetic",
  consultationStatus: "DRAFT",
  updatedAt: "2026-08-19T12:00:00.000Z",
  fields: { subjective: "Queixa sintética" },
  problems: [{ id: "problem-1", type: "CLINICAL", status: "ACTIVE", title: "Problema sintético" }],
};

function operations(overrides: Partial<Parameters<typeof consultationNoteHttpHandlers>[0]> = {}) {
  return {
    getConsultationNote: async () => view,
    saveConsultationNote: async () => view,
    ...overrides,
  };
}

function request(body: unknown): Request {
  return new Request("https://prontuario.test/api/consultations/c1/note", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("serialização SOAP v1 faz roundtrip sem criar assessment ou dados ausentes", () => {
  const serialized = soapDraftToConsultationNoteJson({
    subjective: "  História clínica sintética  ",
    physicalExam: "Exame sintético",
    planByProblem: { "problem-1": ["  Ação sintética  ", "   "] },
  });

  assert.equal(serialized.subjective.text, "História clínica sintética");
  assert.equal(serialized.objective.physicalExam, "Exame sintético");
  assert.deepEqual(serialized.plan.byProblem, { "problem-1": ["Ação sintética"] });
  assert.deepEqual(consultationNoteJsonToSoapDraft(serialized), {
    subjective: "História clínica sintética",
    physicalExam: "Exame sintético",
    vitalSigns: undefined,
    anthropometry: undefined,
    planByProblem: { "problem-1": ["Ação sintética"] },
  });
  assert.equal("assessment" in serialized, false);
});

test("fronteira SOAP rejeita patientId, consultationId e assessment controlados pelo cliente", () => {
  const base = { expectedUpdatedAt: view.updatedAt, subjective: "texto" };
  for (const forged of [
    { ...base, patientId: "patient-forged" },
    { ...base, consultationId: "consultation-forged" },
    { ...base, assessment: "diagnóstico forjado" },
  ]) {
    assert.throws(() => parseConsultationNoteUpdate(forged), ConsultationNoteRequestError);
  }
});

test("PUT deriva consultationId exclusivamente da rota e preserva controle de versão", async () => {
  let received: unknown;
  const handlers = consultationNoteHttpHandlers(operations({
    saveConsultationNote: async (input) => {
      received = input;
      return view;
    },
  }));

  const response = await handlers.PUT(request({
    expectedUpdatedAt: view.updatedAt,
    subjective: "Subjetivo",
    physicalExam: "Exame",
    vitalSigns: "PA sintética",
    anthropometry: "Peso sintético",
    planByProblem: { "problem-1": ["Ação sintética"] },
  }), "consultation-from-route");

  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    consultationId: "consultation-from-route",
    expectedUpdatedAt: view.updatedAt,
    fields: {
      subjective: "Subjetivo",
      physicalExam: "Exame",
      vitalSigns: "PA sintética",
      anthropometry: "Peso sintético",
      planByProblem: { "problem-1": ["Ação sintética"] },
    },
    requestId: undefined,
  });
});

test("conflitos clínicos/concorrência retornam 409 sem expor infraestrutura", async () => {
  const handlers = consultationNoteHttpHandlers(operations({
    saveConsultationNote: async () => {
      throw new ConsultationNoteError("CONSULTATION_CHANGED", "A consulta foi alterada em outra sessão.");
    },
  }));
  const response = await handlers.PUT(request({ expectedUpdatedAt: view.updatedAt }), "c1");
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "CONSULTATION_CHANGED",
    message: "A consulta foi alterada em outra sessão.",
  });
});

test("erro interno não vaza mensagem de banco", async () => {
  const secret = "Prisma MySQL internal secret";
  const handlers = consultationNoteHttpHandlers(operations({
    getConsultationNote: async () => { throw new Error(secret); },
  }));
  const response = await handlers.GET(new Request("https://prontuario.test"), "c1");
  const raw = await response.text();
  assert.equal(response.status, 500);
  assert.doesNotMatch(raw, new RegExp(secret));
});
