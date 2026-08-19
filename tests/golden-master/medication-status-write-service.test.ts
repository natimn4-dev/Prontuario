import assert from "node:assert/strict";
import test from "node:test";
import {
  MedicationStatusWriteError,
  medicationStatusWriteService,
  type MedicationStatusWriteContext,
  type MedicationStatusWriteTransaction,
} from "../../src/server/clinical/medication-status-write-service.ts";

function baseContext(
  overrides: Partial<MedicationStatusWriteContext> = {},
): MedicationStatusWriteContext {
  return {
    consultationId: "consultation-current",
    patientId: "patient-1",
    consultationStatus: "DRAFT",
    isLatestConsultation: true,
    medicationId: "med-1",
    currentStatus: "ACTIVE",
    explicitStatusKnown: false,
    previousExplicitStatus: null,
    ...overrides,
  };
}

function harness(
  context: MedicationStatusWriteContext | null,
  options: { updateSucceeds?: boolean } = {},
) {
  const updates: Parameters<MedicationStatusWriteTransaction["updateCurrentMedicationStatus"]>[0][] = [];
  const events: Parameters<MedicationStatusWriteTransaction["createStatusEvent"]>[0][] = [];
  const audits: Parameters<MedicationStatusWriteTransaction["createAuditEvent"]>[0][] = [];
  let permission: string | undefined;

  const service = medicationStatusWriteService({
    authenticate: async (requestedPermission) => {
      permission = requestedPermission;
      return { user: { id: "user-1" } };
    },
    transaction: async (operation) => operation({
      findWriteContext: async () => context,
      updateCurrentMedicationStatus: async (input) => {
        updates.push(input);
        return options.updateSucceeds ?? true;
      },
      createStatusEvent: async (input) => {
        events.push(input);
        return { id: `event-${events.length}` };
      },
      createAuditEvent: async (input) => {
        audits.push(input);
      },
    }),
  });

  return { service, updates, events, audits, permission: () => permission };
}

test("primeiro evento explícito não inventa status anterior", async () => {
  const state = harness(baseContext());
  const result = await state.service.recordStatusChange({
    consultationId: "consultation-current",
    medicationId: "med-1",
    newStatus: "SUSPENDED",
    requestId: "request-1",
  });

  assert.equal(state.permission(), "consultation.write");
  assert.deepEqual(state.events, [{
    medicationId: "med-1",
    patientId: "patient-1",
    consultationId: "consultation-current",
    previousStatus: null,
    newStatus: "SUSPENDED",
  }]);
  assert.equal(state.updates[0]?.expectedCurrentStatus, "ACTIVE");
  assert.equal(state.updates[0]?.newStatus, "SUSPENDED");
  assert.equal(result.previousStatus, null);
  assert.equal(result.newStatus, "SUSPENDED");
  assert.deepEqual(state.audits, [{
    userId: "user-1",
    entityType: "MedicationStatusEvent",
    entityId: "event-1",
    action: "medication.status.change",
    requestId: "request-1",
    outcome: "success",
    reasonCode: "explicit-prospective-status",
  }]);
});

test("evento subsequente usa somente o último status explícito coerente", async () => {
  const state = harness(baseContext({
    currentStatus: "SUSPENDED",
    explicitStatusKnown: true,
    previousExplicitStatus: "SUSPENDED",
  }));

  await state.service.recordStatusChange({
    consultationId: "consultation-current",
    medicationId: "med-1",
    newStatus: "ACTIVE",
  });

  assert.equal(state.events[0]?.previousStatus, "SUSPENDED");
  assert.equal(state.events[0]?.newStatus, "ACTIVE");
});

test("consulta finalizada bloqueia qualquer mudança de status", async () => {
  const state = harness(baseContext({ consultationStatus: "FINALIZED" }));
  await assert.rejects(
    state.service.recordStatusChange({
      consultationId: "consultation-current",
      medicationId: "med-1",
      newStatus: "SUSPENDED",
    }),
    (error) => error instanceof MedicationStatusWriteError
      && error.code === "CONSULTATION_FINALIZED",
  );
  assert.equal(state.events.length, 0);
  assert.equal(state.updates.length, 0);
});

test("consulta anterior não pode alterar o status atual do medicamento", async () => {
  const state = harness(baseContext({ isLatestConsultation: false }));
  await assert.rejects(
    state.service.recordStatusChange({
      consultationId: "consultation-old",
      medicationId: "med-1",
      newStatus: "FINISHED",
    }),
    (error) => error instanceof MedicationStatusWriteError
      && error.code === "RETROSPECTIVE_STATUS_WRITE_BLOCKED",
  );
  assert.equal(state.events.length, 0);
  assert.equal(state.updates.length, 0);
});

test("medicamento ausente ou de outro paciente falha sem expor outro contexto", async () => {
  const state = harness(baseContext({ medicationId: null, currentStatus: null }));
  await assert.rejects(
    state.service.recordStatusChange({
      consultationId: "consultation-current",
      medicationId: "med-other",
      newStatus: "SUSPENDED",
    }),
    (error) => error instanceof MedicationStatusWriteError
      && error.code === "MEDICATION_NOT_FOUND",
  );
  assert.equal(state.events.length, 0);
});

test("divergência entre estado atual e histórico explícito exige revisão", async () => {
  const state = harness(baseContext({
    currentStatus: "ACTIVE",
    explicitStatusKnown: true,
    previousExplicitStatus: "SUSPENDED",
  }));

  await assert.rejects(
    state.service.recordStatusChange({
      consultationId: "consultation-current",
      medicationId: "med-1",
      newStatus: "FINISHED",
    }),
    (error) => error instanceof MedicationStatusWriteError
      && error.code === "STATUS_HISTORY_DIVERGED",
  );
  assert.equal(state.events.length, 0);
  assert.equal(state.updates.length, 0);
});

test("mudança concorrente do estado atual aborta antes de criar evento", async () => {
  const state = harness(baseContext(), { updateSucceeds: false });
  await assert.rejects(
    state.service.recordStatusChange({
      consultationId: "consultation-current",
      medicationId: "med-1",
      newStatus: "SUSPENDED",
    }),
    (error) => error instanceof MedicationStatusWriteError
      && error.code === "MEDICATION_CHANGED",
  );
  assert.equal(state.events.length, 0);
  assert.equal(state.audits.length, 0);
});

test("consulta inexistente falha antes de tocar em medicamento", async () => {
  const state = harness(null);
  await assert.rejects(
    state.service.recordStatusChange({
      consultationId: "missing",
      medicationId: "med-1",
      newStatus: "ACTIVE",
    }),
    (error) => error instanceof MedicationStatusWriteError
      && error.code === "CONSULTATION_NOT_FOUND",
  );
  assert.equal(state.events.length, 0);
  assert.equal(state.updates.length, 0);
});
