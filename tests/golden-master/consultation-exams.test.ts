import assert from "node:assert/strict";
import test from "node:test";
import { buildConsultationExamView } from "../../src/domain/consultation-exams.ts";

const consultations = [
  { id: "c1", patientId: "p1", occurredAt: "2026-01-10T12:00:00Z", createdAt: "2026-01-10T12:00:00Z" },
  { id: "c2", patientId: "p1", occurredAt: "2026-04-10T12:00:00Z", createdAt: "2026-04-10T12:00:00Z" },
  { id: "c3", patientId: "p1", occurredAt: "2026-08-10T12:00:00Z", createdAt: "2026-08-10T12:00:00Z" },
];

test("exames da consulta atual e anteriores são separados sem trazer o futuro", () => {
  const view = buildConsultationExamView({
    patientId: "p1",
    targetConsultationId: "c2",
    consultations,
    records: [
      { id: "e1", patientId: "p1", consultationId: "c1", content: "  Exame anterior  ", updatedAt: "2026-01-10T13:00:00Z" },
      { id: "e2", patientId: "p1", consultationId: "c2", content: "  Exame atual  ", updatedAt: "2026-04-10T13:00:00Z" },
      { id: "e3", patientId: "p1", consultationId: "c3", content: "Exame futuro", updatedAt: "2026-08-10T13:00:00Z" },
    ],
  });

  assert.equal(view.current, "Exame atual");
  assert.deepEqual(view.history.map((item) => [item.consultationId, item.content]), [["c1", "Exame anterior"]]);
  assert.doesNotMatch(JSON.stringify(view), /Exame futuro/);
});

test("histórico de exames falha fechado se misturar pacientes", () => {
  assert.throws(
    () => buildConsultationExamView({
      patientId: "p1",
      targetConsultationId: "c2",
      consultations,
      records: [{ id: "e-forged", patientId: "p2", consultationId: "c1", content: "Outro paciente", updatedAt: "2026-01-10" }],
    }),
    /pacientes diferentes/,
  );
});

test("histórico mostra todas as consultas anteriores com exames da mais recente para a mais antiga", () => {
  const view = buildConsultationExamView({
    patientId: "p1",
    targetConsultationId: "c3",
    consultations,
    records: [
      { id: "e1", patientId: "p1", consultationId: "c1", content: "Primeiro", updatedAt: "2026-01-10" },
      { id: "e2", patientId: "p1", consultationId: "c2", content: "Segundo", updatedAt: "2026-04-10" },
    ],
  });

  assert.deepEqual(view.history.map((item) => item.consultationId), ["c2", "c1"]);
});
