import assert from "node:assert/strict";
import test from "node:test";
import {
  ConsultationWorkflowError,
  consultationFinalizationService,
  type ConsultationFinalizationTransaction,
  type ConsultationWorkflowContext,
} from "../../src/server/clinical/consultation-finalization-service.ts";

function fixture(initial: ConsultationWorkflowContext) {
  let context = { ...initial, urgentAlerts: initial.urgentAlerts.map((alert) => ({ ...alert })) };
  const permissions: string[] = [];
  const transitions: Array<{ consultationId: string; patientId: string; from: string; to: string }> = [];
  const audits: Array<{ action: string; reasonCode?: string }> = [];
  let allowTransition = true;

  const service = consultationFinalizationService({
    authenticate: async (permission) => {
      permissions.push(permission);
      return { user: { id: "physician-synthetic" } };
    },
    transaction: async (operation) => operation({
      findWorkflowContext: async (consultationId) => consultationId === context.id ? context : null,
      transitionStatus: async (input) => {
        transitions.push(input);
        if (!allowTransition || input.consultationId !== context.id || input.patientId !== context.patientId || input.from !== context.status) {
          return false;
        }
        context = { ...context, status: input.to };
        return true;
      },
      createAuditEvent: async (input) => {
        audits.push({ action: input.action, reasonCode: input.reasonCode });
      },
    } satisfies ConsultationFinalizationTransaction),
  });

  return {
    service,
    permissions,
    transitions,
    audits,
    state: () => context,
    denyNextTransition: () => { allowTransition = false; },
  };
}

function workflowErrorCode(error: unknown): string | undefined {
  return error instanceof ConsultationWorkflowError ? error.code : undefined;
}

test("estado do workflow usa leitura autenticada e não expõe patientId", async () => {
  const testFixture = fixture({
    id: "consultation-synthetic",
    patientId: "patient-server-owned",
    status: "DRAFT",
    urgentAlerts: [{ code: "cam-positive-delirium", message: "Alerta sintético" }],
  });

  const state = await testFixture.service.getWorkflowState("consultation-synthetic");
  assert.equal(testFixture.permissions[0], "patient.read");
  assert.deepEqual(state, {
    consultationId: "consultation-synthetic",
    status: "DRAFT",
    urgentAlerts: [{ code: "cam-positive-delirium", message: "Alerta sintético" }],
  });
  assert.equal("patientId" in state, false);
});

test("início da revisão deriva patientId do contexto persistido", async () => {
  const testFixture = fixture({
    id: "consultation-synthetic",
    patientId: "patient-server-owned",
    status: "DRAFT",
    urgentAlerts: [],
  });

  const state = await testFixture.service.startReview({ consultationId: "consultation-synthetic" });
  assert.equal(state.status, "IN_REVIEW");
  assert.equal(testFixture.permissions[0], "consultation.finalize");
  assert.deepEqual(testFixture.transitions, [{
    consultationId: "consultation-synthetic",
    patientId: "patient-server-owned",
    from: "DRAFT",
    to: "IN_REVIEW",
  }]);
  assert.deepEqual(testFixture.audits, [{ action: "consultation.review.start", reasonCode: undefined }]);
});

test("finalização bloqueia revisão não iniciada e confirmação clínica ausente", async () => {
  const draftFixture = fixture({
    id: "consultation-synthetic",
    patientId: "patient-server-owned",
    status: "DRAFT",
    urgentAlerts: [],
  });
  await assert.rejects(
    draftFixture.service.finalize({
      consultationId: "consultation-synthetic",
      clinicalReviewConfirmed: true,
      acknowledgedUrgentAlertCodes: [],
    }),
    (error) => workflowErrorCode(error) === "REVIEW_REQUIRED",
  );

  const reviewFixture = fixture({
    id: "consultation-synthetic",
    patientId: "patient-server-owned",
    status: "IN_REVIEW",
    urgentAlerts: [],
  });
  await assert.rejects(
    reviewFixture.service.finalize({
      consultationId: "consultation-synthetic",
      clinicalReviewConfirmed: false,
      acknowledgedUrgentAlertCodes: [],
    }),
    (error) => workflowErrorCode(error) === "CLINICAL_REVIEW_REQUIRED",
  );
});

test("alerta urgente atual só é liberado pelo código derivado pelo servidor", async () => {
  const testFixture = fixture({
    id: "consultation-synthetic",
    patientId: "patient-server-owned",
    status: "IN_REVIEW",
    urgentAlerts: [{ code: "cam-positive-delirium", message: "Alerta sintético" }],
  });

  await assert.rejects(
    testFixture.service.finalize({
      consultationId: "consultation-synthetic",
      clinicalReviewConfirmed: true,
      acknowledgedUrgentAlertCodes: ["codigo-obsoleto-ou-inventado"],
    }),
    (error) => workflowErrorCode(error) === "URGENT_ALERTS_UNRESOLVED",
  );
  assert.equal(testFixture.transitions.length, 0);

  const finalized = await testFixture.service.finalize({
    consultationId: "consultation-synthetic",
    clinicalReviewConfirmed: true,
    acknowledgedUrgentAlertCodes: ["cam-positive-delirium"],
  });
  assert.equal(finalized.status, "FINALIZED");
  assert.deepEqual(testFixture.transitions[0], {
    consultationId: "consultation-synthetic",
    patientId: "patient-server-owned",
    from: "IN_REVIEW",
    to: "FINALIZED",
  });
  assert.deepEqual(testFixture.audits, [{
    action: "consultation.finalize",
    reasonCode: "current-urgent-alerts-reviewed",
  }]);
});

test("mudança concorrente impede transição sem criar auditoria de sucesso", async () => {
  const testFixture = fixture({
    id: "consultation-synthetic",
    patientId: "patient-server-owned",
    status: "IN_REVIEW",
    urgentAlerts: [],
  });
  testFixture.denyNextTransition();

  await assert.rejects(
    testFixture.service.finalize({
      consultationId: "consultation-synthetic",
      clinicalReviewConfirmed: true,
      acknowledgedUrgentAlertCodes: [],
    }),
    (error) => workflowErrorCode(error) === "CONSULTATION_CHANGED",
  );
  assert.deepEqual(testFixture.audits, []);
});
