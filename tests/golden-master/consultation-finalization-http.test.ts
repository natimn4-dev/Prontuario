import assert from "node:assert/strict";
import test from "node:test";
import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../../src/server/auth/access-errors.ts";
import {
  ConsultationWorkflowError,
  type ConsultationWorkflowView,
} from "../../src/server/clinical/consultation-finalization-service.ts";
import {
  ConsultationWorkflowRequestError,
  consultationWorkflowHttpHandlers,
  parseConsultationWorkflowCommand,
} from "../../src/server/clinical/consultation-finalization-http.ts";

const state: ConsultationWorkflowView = {
  consultationId: "consultation-synthetic",
  status: "IN_REVIEW",
  urgentAlerts: [],
};

function postRequest(body: unknown): Request {
  return new Request("https://prontuario.test/api/consultations/consultation-synthetic/workflow", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": "123e4567-e89b-42d3-a456-426614174000",
    },
    body: JSON.stringify(body),
  });
}

function operations(overrides: Partial<Parameters<typeof consultationWorkflowHttpHandlers>[0]> = {}) {
  return {
    getWorkflowState: async () => state,
    startReview: async () => state,
    finalize: async () => state,
    ...overrides,
  };
}

test("request rejeita patientId e lista de alertas não resolvidos controlados pelo cliente", () => {
  assert.throws(
    () => parseConsultationWorkflowCommand({
      action: "finalize",
      clinicalReviewConfirmed: true,
      acknowledgedUrgentAlertCodes: [],
      patientId: "patient-forged",
    }),
    ConsultationWorkflowRequestError,
  );
  assert.throws(
    () => parseConsultationWorkflowCommand({
      action: "finalize",
      clinicalReviewConfirmed: true,
      acknowledgedUrgentAlertCodes: [],
      unresolvedUrgentAlerts: [],
    }),
    ConsultationWorkflowRequestError,
  );
});

test("handler envia ao serviço somente consulta da rota, revisão e códigos reconhecidos", async () => {
  let received: unknown;
  const handlers = consultationWorkflowHttpHandlers(operations({
    finalize: async (input) => {
      received = input;
      return { ...state, status: "FINALIZED" };
    },
  }));

  const response = await handlers.POST(postRequest({
    action: "finalize",
    clinicalReviewConfirmed: true,
    acknowledgedUrgentAlertCodes: ["cam-positive-delirium", "cam-positive-delirium"],
  }), "consultation-from-route");

  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    consultationId: "consultation-from-route",
    clinicalReviewConfirmed: true,
    acknowledgedUrgentAlertCodes: ["cam-positive-delirium"],
    requestId: "123e4567-e89b-42d3-a456-426614174000",
  });
  assert.equal("patientId" in (received as Record<string, unknown>), false);
  assert.equal("unresolvedUrgentAlerts" in (received as Record<string, unknown>), false);
});

test("fronteira HTTP preserva 401 e 403 sem vazar detalhes", async () => {
  const unauthorized = consultationWorkflowHttpHandlers(operations({
    getWorkflowState: async () => { throw new AuthenticationRequiredError(); },
  }));
  const unauthorizedResponse = await unauthorized.GET(new Request("https://prontuario.test"), "c1");
  assert.equal(unauthorizedResponse.status, 401);
  assert.deepEqual(await unauthorizedResponse.json(), {
    code: "AUTHENTICATION_REQUIRED",
    message: "Autenticação obrigatória.",
  });

  const forbidden = consultationWorkflowHttpHandlers(operations({
    startReview: async () => { throw new AccessForbiddenError(); },
  }));
  const forbiddenResponse = await forbidden.POST(postRequest({ action: "start-review" }), "c1");
  assert.equal(forbiddenResponse.status, 403);
  assert.deepEqual(await forbiddenResponse.json(), {
    code: "ACCESS_FORBIDDEN",
    message: "Acesso não autorizado.",
  });
});

test("erros de workflow usam códigos públicos e estados conflitantes retornam 409", async () => {
  const handlers = consultationWorkflowHttpHandlers(operations({
    finalize: async () => {
      throw new ConsultationWorkflowError(
        "URGENT_ALERTS_UNRESOLVED",
        "Existem alertas clínicos urgentes ainda não revisados.",
      );
    },
  }));
  const response = await handlers.POST(postRequest({
    action: "finalize",
    clinicalReviewConfirmed: true,
    acknowledgedUrgentAlertCodes: [],
  }), "c1");

  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "URGENT_ALERTS_UNRESOLVED",
    message: "Existem alertas clínicos urgentes ainda não revisados.",
  });
});

test("erro interno não devolve mensagem de banco ou infraestrutura", async () => {
  const secret = "Prisma database password secret";
  const handlers = consultationWorkflowHttpHandlers(operations({
    getWorkflowState: async () => { throw new Error(secret); },
  }));
  const response = await handlers.GET(new Request("https://prontuario.test"), "c1");
  const raw = await response.text();

  assert.equal(response.status, 500);
  assert.doesNotMatch(raw, new RegExp(secret));
  assert.deepEqual(JSON.parse(raw), {
    code: "CONSULTATION_WORKFLOW_FAILED",
    message: "Não foi possível atualizar o estado da consulta.",
  });
});
