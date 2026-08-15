import assert from "node:assert/strict";
import test from "node:test";
import { consultationCreationPresentation, type ConsultationType } from "../../src/domain/consultation.ts";
import { assertPermission } from "../../src/domain/security/auth-policy.ts";
import {
  ConsultationCreationError,
  assertConsultationTypeAllowed,
  createConsultationService,
  parseConsultationCreationRequest,
  type ConsultationCreationTransaction,
} from "../../src/server/clinical/create-consultation-service.ts";

interface MemoryConsultation {
  id: string;
  patientId: string;
  physicianId: string;
  type: ConsultationType;
  status: "DRAFT";
}

function fixture(options?: { baselineConsultationId?: string | null; patientExists?: boolean }) {
  const state = {
    baselineConsultationId: options?.baselineConsultationId ?? null,
    consultations: [] as MemoryConsultation[],
    audits: [] as Array<Record<string, unknown>>,
    permissions: [] as string[],
    transactionCalls: 0,
  };
  let sequence = 0;
  let queue = Promise.resolve();

  const service = createConsultationService({
    authenticate: async (permission) => {
      state.permissions.push(permission);
      return { user: { id: "physician-from-session" } };
    },
    transaction: async (operation) => {
      state.transactionCalls += 1;
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      try {
        const tx: ConsultationCreationTransaction = {
          findPatient: async (patientId) => options?.patientExists === false
            ? null
            : { id: patientId, baselineConsultationId: state.baselineConsultationId },
          createConsultation: async (input) => {
            const consultation = { id: `consultation-${++sequence}`, ...input } as MemoryConsultation;
            state.consultations.push(consultation);
            return consultation;
          },
          claimBaseline: async (_patientId, consultationId) => {
            if (state.baselineConsultationId) return false;
            state.baselineConsultationId = consultationId;
            return true;
          },
          createAuditEvent: async (input) => { state.audits.push(input); },
        };
        return await operation(tx);
      } finally {
        release();
      }
    },
    now: () => new Date("2026-08-15T12:00:00.000Z"),
  });

  return { state, service };
}

test("paciente sem baseline cria AGA_INITIAL DRAFT, vincula a mesma consulta e audita", async () => {
  const { state, service } = fixture();
  const result = await service({
    patientId: "patient-1",
    expectedBaselineConsultationId: null,
    requestId: "request-1",
  });

  assert.equal(result.type, "AGA_INITIAL");
  assert.equal(result.status, "DRAFT");
  assert.equal(state.baselineConsultationId, result.id);
  assert.equal(state.consultations[0]?.physicianId, "physician-from-session");
  assert.deepEqual(state.permissions, ["consultation.write"]);
  assert.deepEqual(state.audits, [{
    userId: "physician-from-session",
    entityType: "Consultation",
    entityId: result.id,
    action: "consultation.create",
    requestId: "request-1",
    outcome: "success",
    reasonCode: "aga-initial",
  }]);
  assert.equal("subjective" in state.audits[0]!, false);
});

test("paciente com baseline cria FOLLOW_UP e usa physicianId da sessão", async () => {
  const { state, service } = fixture({ baselineConsultationId: "baseline-1" });
  const result = await service({
    patientId: "patient-1",
    expectedBaselineConsultationId: "baseline-1",
  });

  assert.equal(result.type, "FOLLOW_UP");
  assert.equal(state.consultations[0]?.physicianId, "physician-from-session");
  assert.equal(state.baselineConsultationId, "baseline-1");
});

test("regras recusam segunda AGA inicial e follow-up sem baseline", () => {
  assert.throws(
    () => assertConsultationTypeAllowed("baseline-1", "AGA_INITIAL"),
    (error: unknown) => error instanceof ConsultationCreationError && error.code === "INITIAL_ALREADY_EXISTS",
  );
  assert.throws(
    () => assertConsultationTypeAllowed(null, "FOLLOW_UP"),
    (error: unknown) => error instanceof ConsultationCreationError && error.code === "FOLLOW_UP_REQUIRES_BASELINE",
  );
});

test("fronteira HTTP rejeita type e physicianId controlados pelo navegador", () => {
  const valid = {
    patientId: "patient-1",
    expectedBaselineConsultationId: null,
  };
  assert.deepEqual(parseConsultationCreationRequest(valid), valid);
  assert.throws(
    () => parseConsultationCreationRequest({ ...valid, type: "FOLLOW_UP" }),
    /definidos pelo servidor/,
  );
  assert.throws(
    () => parseConsultationCreationRequest({ ...valid, physicianId: "browser-user" }),
    /definidos pelo servidor/,
  );
});

test("tela obsoleta sem baseline não cria segunda AGA nem follow-up acidental", async () => {
  const { state, service } = fixture({ baselineConsultationId: "baseline-1" });

  await assert.rejects(
    () => service({ patientId: "patient-1", expectedBaselineConsultationId: null }),
    (error: unknown) => error instanceof ConsultationCreationError && error.code === "PATIENT_STATE_CHANGED",
  );
  assert.equal(state.consultations.length, 0);
  assert.equal(state.audits.length, 0);
});

test("usuário sem consultation.write é bloqueado antes da transação", async () => {
  let transactionCalled = false;
  const service = createConsultationService({
    authenticate: async (permission) => {
      assertPermission("READ_ONLY", permission);
      return { user: { id: "read-only" } };
    },
    transaction: async () => {
      transactionCalled = true;
      throw new Error("não deveria executar");
    },
  });

  await assert.rejects(
    () => service({ patientId: "patient-1", expectedBaselineConsultationId: null }),
    /Permissão negada/,
  );
  assert.equal(transactionCalled, false);
});

test("paciente inexistente é recusado sem criar consulta nem auditoria", async () => {
  const { state, service } = fixture({ patientExists: false });
  await assert.rejects(
    () => service({ patientId: "missing", expectedBaselineConsultationId: null }),
    (error: unknown) => error instanceof ConsultationCreationError && error.code === "PATIENT_NOT_FOUND",
  );
  assert.equal(state.consultations.length, 0);
  assert.equal(state.audits.length, 0);
});

test("duplo clique concorrente cria somente uma AGA inicial e nenhuma consulta extra", async () => {
  const { state, service } = fixture();
  const results = await Promise.allSettled([
    service({ patientId: "patient-1", expectedBaselineConsultationId: null, requestId: "click-1" }),
    service({ patientId: "patient-1", expectedBaselineConsultationId: null, requestId: "click-2" }),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(state.consultations.filter((consultation) => consultation.type === "AGA_INITIAL").length, 1);
  assert.equal(state.consultations.length, 1);
  assert.equal(state.baselineConsultationId, state.consultations[0]?.id);
});

test("CTA da página do paciente acompanha a existência do baseline", () => {
  assert.deepEqual(consultationCreationPresentation(null), {
    label: "Iniciar AGA inicial",
    helperText: "Esta será a linha de base longitudinal deste paciente.",
  });
  assert.deepEqual(consultationCreationPresentation("baseline-1"), {
    label: "Nova consulta subsequente",
  });
});
