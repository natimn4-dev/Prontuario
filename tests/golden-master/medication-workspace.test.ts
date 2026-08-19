import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMedicationWorkspaceEditable,
  effectiveMedicationRegimens,
  medicationStatusForWorkspace,
  MedicationWorkspaceError,
  type MedicationWorkspaceView,
} from "../../src/domain/medication-workspace.ts";
import {
  medicationWorkspaceHttpHandlers,
  parseMedicationWorkspaceCommand,
  MedicationWorkspaceRequestError,
} from "../../src/server/clinical/medication-workspace-http.ts";

const view: MedicationWorkspaceView = {
  consultationId: "c2",
  consultationStatus: "DRAFT",
  isLatestConsultation: true,
  items: [],
};

function operations(overrides: Partial<Parameters<typeof medicationWorkspaceHttpHandlers>[0]> = {}) {
  return {
    getMedicationWorkspace: async () => view,
    createMedicationWithRegimen: async () => view,
    addMedicationRegimen: async () => view,
    ...overrides,
  };
}
function request(body: unknown) {
  return new Request("https://prontuario.test/api/consultations/c2/medications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

test("regime efetivo usa consulta mais recente e última gravação dentro da mesma consulta", () => {
  const projected = effectiveMedicationRegimens({
    consultationIds: ["c0", "c1", "c2"],
    regimens: [
      { id: "r0", medicationId: "m1", patientId: "p1", consultationId: "c0", createdAt: "2026-01-01T10:00:00Z", moments: [] },
      { id: "r1", medicationId: "m1", patientId: "p1", consultationId: "c2", createdAt: "2026-03-01T09:00:00Z", dose: "1 cp", moments: ["manha"] },
      { id: "r2", medicationId: "m1", patientId: "p1", consultationId: "c2", createdAt: "2026-03-01T10:00:00Z", dose: "2 cp", moments: ["manha", "noite"] },
      { id: "future", medicationId: "m1", patientId: "p1", consultationId: "c3", createdAt: "2026-04-01T10:00:00Z", dose: "3 cp", moments: ["noite"] },
    ],
  });
  assert.equal(projected.length, 1);
  assert.equal(projected[0]?.id, "r2");
  assert.equal(projected[0]?.dose, "2 cp");
});

test("status explícito prevalece; estado atual não reconstrói consulta histórica", () => {
  assert.deepEqual(medicationStatusForWorkspace({ isLatestConsultation: false, explicitStatus: "SUSPENDED", currentStatus: "ACTIVE" }), { status: "SUSPENDED", source: "explicit-history" });
  assert.deepEqual(medicationStatusForWorkspace({ isLatestConsultation: false, explicitStatus: null, currentStatus: "ACTIVE" }), { status: "UNKNOWN", source: "unknown" });
  assert.deepEqual(medicationStatusForWorkspace({ isLatestConsultation: true, explicitStatus: null, currentStatus: "ACTIVE" }), { status: "ACTIVE", source: "current-record-only" });
});

test("reconciliação bloqueia consulta finalizada e edição retrospectiva", () => {
  assert.throws(() => assertMedicationWorkspaceEditable({ consultationStatus: "FINALIZED", isLatestConsultation: true }), (error: unknown) => error instanceof MedicationWorkspaceError && error.code === "CONSULTATION_FINALIZED");
  assert.throws(() => assertMedicationWorkspaceEditable({ consultationStatus: "DRAFT", isLatestConsultation: false }), (error: unknown) => error instanceof MedicationWorkspaceError && error.code === "RETROSPECTIVE_EDIT_BLOCKED");
});

test("API rejeita identidade, status e campos legados controlados pelo cliente", () => {
  const base = { action: "create", name: "Medicamento sintético", moments: ["manha"] };
  for (const forged of [
    { ...base, patientId: "p-forged" },
    { ...base, consultationId: "c-forged" },
    { ...base, status: "ACTIVE" },
    { ...base, frequency: "2x/dia" },
    { ...base, schedule: { morning: true } },
  ]) assert.throws(() => parseMedicationWorkspaceCommand(forged), MedicationWorkspaceRequestError);
});

test("API deriva consulta da rota e preserva horários estruturados", async () => {
  let received: unknown;
  const handlers = medicationWorkspaceHttpHandlers(operations({ createMedicationWithRegimen: async (input) => { received = input; return view; } }));
  const response = await handlers.POST(request({ action: "create", name: "Medicamento sintético", presentation: "50 mg", doseInstruction: "1 comprimido", route: "Oral", moments: ["manha", "noite"], continuous: true }), "consultation-from-route");
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    consultationId: "consultation-from-route",
    name: "Medicamento sintético",
    presentation: "50 mg",
    doseInstruction: "1 comprimido",
    route: "Oral",
    moments: ["manha", "noite"],
    continuous: true,
    instructions: undefined,
    requestId: undefined,
  });
});

test("erro interno da reconciliação não vaza infraestrutura", async () => {
  const secret = "Prisma medication database secret";
  const handlers = medicationWorkspaceHttpHandlers(operations({ getMedicationWorkspace: async () => { throw new Error(secret); } }));
  const response = await handlers.GET(new Request("https://prontuario.test"), "c2");
  const raw = await response.text();
  assert.equal(response.status, 500);
  assert.doesNotMatch(raw, new RegExp(secret));
});
