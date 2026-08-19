import assert from "node:assert/strict";
import test from "node:test";
import {
  assertProblemWorkspaceEditable,
  ProblemWorkspaceError,
  type ProblemWorkspaceView,
} from "../../src/domain/problem-workspace.ts";
import {
  parseProblemWorkspaceCommand,
  problemWorkspaceHttpHandlers,
  ProblemWorkspaceRequestError,
} from "../../src/server/clinical/problem-workspace-http.ts";

const view: ProblemWorkspaceView = {
  consultationId: "consultation-synthetic",
  consultationStatus: "DRAFT",
  isLatestConsultation: true,
  problems: [],
};

function operations(overrides: Partial<Parameters<typeof problemWorkspaceHttpHandlers>[0]> = {}) {
  return {
    getProblemWorkspace: async () => view,
    createProblem: async () => view,
    changeProblemStatus: async () => view,
    ...overrides,
  };
}

function request(body: unknown) {
  return new Request("https://prontuario.test/api/consultations/c1/problems", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("edição longitudinal falha em consulta finalizada ou histórica", () => {
  assert.throws(() => assertProblemWorkspaceEditable({ consultationStatus: "FINALIZED", isLatestConsultation: true }), (error: unknown) => error instanceof ProblemWorkspaceError && error.code === "CONSULTATION_FINALIZED");
  assert.throws(() => assertProblemWorkspaceEditable({ consultationStatus: "DRAFT", isLatestConsultation: false }), (error: unknown) => error instanceof ProblemWorkspaceError && error.code === "RETROSPECTIVE_EDIT_BLOCKED");
  assert.doesNotThrow(() => assertProblemWorkspaceEditable({ consultationStatus: "IN_REVIEW", isLatestConsultation: true }));
});

test("parser rejeita identidade e status controlados pelo cliente", () => {
  for (const forged of [
    { action: "create", type: "CLINICAL", title: "Problema", patientId: "p-forged" },
    { action: "create", type: "GERIATRIC", title: "Problema", consultationId: "c-forged" },
    { action: "status", problemId: "problem-1", newStatus: "ACTIVE", previousStatus: "RESOLVED" },
  ]) assert.throws(() => parseProblemWorkspaceCommand(forged), ProblemWorkspaceRequestError);
});

test("handler deriva consulta da rota e envia somente campos permitidos", async () => {
  let received: unknown;
  const handlers = problemWorkspaceHttpHandlers(operations({
    createProblem: async (input) => { received = input; return view; },
  }));
  const response = await handlers.POST(request({ action: "create", type: "GERIATRIC", title: "Instabilidade postural" }), "consultation-from-route");
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    consultationId: "consultation-from-route",
    type: "GERIATRIC",
    title: "Instabilidade postural",
    description: undefined,
    requestId: undefined,
  });
});

test("conflito longitudinal retorna 409 e erro interno não vaza infraestrutura", async () => {
  const conflict = problemWorkspaceHttpHandlers(operations({
    changeProblemStatus: async () => { throw new ProblemWorkspaceError("RETROSPECTIVE_EDIT_BLOCKED", "Alteração retrospectiva bloqueada."); },
  }));
  const conflictResponse = await conflict.POST(request({ action: "status", problemId: "problem-1", newStatus: "RESOLVED" }), "c1");
  assert.equal(conflictResponse.status, 409);

  const secret = "Prisma database secret";
  const internal = problemWorkspaceHttpHandlers(operations({ getProblemWorkspace: async () => { throw new Error(secret); } }));
  const response = await internal.GET(new Request("https://prontuario.test"), "c1");
  const raw = await response.text();
  assert.equal(response.status, 500);
  assert.doesNotMatch(raw, new RegExp(secret));
});
