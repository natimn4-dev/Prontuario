import assert from "node:assert/strict";
import test from "node:test";
import { scaleConsultationHorizonIds } from "../../src/domain/scale-consultation-horizon.ts";

test("scale history excludes later consultations", () => {
  const patientId = "patient-1";
  const consultations = [
    { id: "baseline", patientId, occurredAt: "2026-01-10T10:00:00Z", createdAt: "2026-01-10T10:00:00Z" },
    { id: "target", patientId, occurredAt: "2026-02-10T10:00:00Z", createdAt: "2026-02-10T10:00:00Z" },
    { id: "future", patientId, occurredAt: "2026-03-10T10:00:00Z", createdAt: "2026-03-10T10:00:00Z" },
  ];
  assert.deepEqual(scaleConsultationHorizonIds({ patientId, targetConsultationId: "target", consultations }), ["baseline", "target"]);
});

test("scale history rejects mixed-patient timelines", () => {
  assert.throws(() => scaleConsultationHorizonIds({
    patientId: "patient-1",
    targetConsultationId: "target",
    consultations: [
      { id: "target", patientId: "patient-1", occurredAt: "2026-02-10T10:00:00Z", createdAt: "2026-02-10T10:00:00Z" },
      { id: "foreign", patientId: "patient-2", occurredAt: "2026-01-10T10:00:00Z", createdAt: "2026-01-10T10:00:00Z" },
    ],
  }), /misturar pacientes diferentes/i);
});

test("scale history rejects a missing target consultation", () => {
  assert.throws(() => scaleConsultationHorizonIds({
    patientId: "patient-1",
    targetConsultationId: "missing",
    consultations: [
      { id: "baseline", patientId: "patient-1", occurredAt: "2026-01-10T10:00:00Z", createdAt: "2026-01-10T10:00:00Z" },
    ],
  }), /consulta alvo não pertence/i);
});
