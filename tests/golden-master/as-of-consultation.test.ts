import assert from "node:assert/strict";
import test from "node:test";
import {
  assessmentsAsOf,
  consultationHorizon,
  medicationRegimensAsOf,
  problemsAsOf,
} from "../../src/domain/as-of-consultation.ts";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";

const consultations = [
  { id: "baseline", patientId: "p1", occurredAt: "2026-01-01", createdAt: "2026-01-01" },
  { id: "consultation-a", patientId: "p1", occurredAt: "2026-03-01", createdAt: "2026-03-01" },
  { id: "consultation-b", patientId: "p1", occurredAt: "2026-06-01", createdAt: "2026-06-01" },
];

const assessments = [
  { patientId: "p1", consultationId: "baseline", scaleCode: "barthel", scaleVersion: "1.0", score: 10, appliedAt: "2026-01-01", isBaseline: true },
  { patientId: "p1", consultationId: "consultation-a", scaleCode: "barthel", scaleVersion: "1.0", score: 20, appliedAt: "2026-03-01" },
  { patientId: "p1", consultationId: "consultation-b", scaleCode: "barthel", scaleVersion: "1.0", score: 25, appliedAt: "2026-06-01T09:00:00Z" },
  { patientId: "p1", consultationId: "consultation-b", scaleCode: "barthel", scaleVersion: "1.0", score: 30, appliedAt: "2026-06-01T10:00:00Z" },
];

const medicationRegimens = [
  { id: "regimen-baseline", medicationId: "med-1", patientId: "p1", consultationId: "baseline", dose: "50 mg" },
  { id: "regimen-a", medicationId: "med-1", patientId: "p1", consultationId: "consultation-a", dose: "25 mg" },
  { id: "regimen-b", medicationId: "med-2", patientId: "p1", consultationId: "consultation-b", dose: "10 mg" },
];

const problems = [
  {
    id: "problem-baseline",
    patientId: "p1",
    originConsultationId: "baseline",
    type: "GERIATRIC" as const,
    status: "RESOLVED" as const,
    title: "Dependência funcional sintética",
    events: [
      { problemId: "problem-baseline", patientId: "p1", consultationId: "consultation-a", previousStatus: "ACTIVE" as const, newStatus: "MONITORING" as const, createdAt: "2026-03-01" },
      { problemId: "problem-baseline", patientId: "p1", consultationId: "consultation-b", previousStatus: "MONITORING" as const, newStatus: "RESOLVED" as const, createdAt: "2026-06-01" },
    ],
  },
  {
    id: "problem-b",
    patientId: "p1",
    originConsultationId: "consultation-b",
    type: "CLINICAL" as const,
    status: "ACTIVE" as const,
    title: "Problema sintético originado em B",
    events: [
      { problemId: "problem-b", patientId: "p1", consultationId: "consultation-b", previousStatus: null, newStatus: "ACTIVE" as const, createdAt: "2026-06-01" },
    ],
  },
];

function reportAsOf(targetConsultationId: string) {
  const horizon = consultationHorizon({ patientId: "p1", targetConsultationId, consultations });
  const consultationIds = horizon.map((item) => item.id);
  return buildAgaReportModel({
    patientId: "p1",
    consultationId: targetConsultationId,
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalAssessments: assessmentsAsOf({ patientId: "p1", consultationIds, assessments }),
    longitudinalProblems: problemsAsOf({ patientId: "p1", consultationIds, problems }),
  });
}

test("relatório de B inclui somente baseline, A e B até seu horizonte", () => {
  const report = reportAsOf("consultation-b");
  const evolution = report.assessedScales[0]!.evolution;

  assert.equal(evolution.baseline, 10);
  assert.equal(evolution.previous, 20);
  assert.equal(evolution.current, 30);
  assert.equal(report.geriatricProblems[0]?.status, "RESOLVED");
  assert.ok(report.clinicalProblems.some((problem) => problem.id === "problem-b"));
});

test("regenerar A depois de B existir não retroage avaliações, problemas ou status de B", () => {
  const report = reportAsOf("consultation-a");
  const evolution = report.assessedScales[0]!.evolution;

  assert.equal(evolution.baseline, 10);
  assert.equal(evolution.previous, 10);
  assert.equal(evolution.current, 20);
  assert.equal(report.geriatricProblems[0]?.status, "MONITORING");
  assert.ok(!report.clinicalProblems.some((problem) => problem.id === "problem-b"));
  assert.ok(!report.assessedScales.some((scale) => scale.evolution.current === 30));
});

test("regimes de medicamentos respeitam o mesmo horizonte da consulta", () => {
  const horizon = consultationHorizon({ patientId: "p1", targetConsultationId: "consultation-a", consultations });
  const projected = medicationRegimensAsOf({
    patientId: "p1",
    consultationIds: horizon.map((item) => item.id),
    regimens: medicationRegimens,
  });

  assert.deepEqual(projected.map((item) => item.id), ["regimen-baseline", "regimen-a"]);
  assert.ok(!projected.some((item) => item.consultationId === "consultation-b"));
});

test("corte temporal falha fechado ao receber dados de outro paciente", () => {
  assert.throws(() => assessmentsAsOf({
    patientId: "p1",
    consultationIds: ["baseline"],
    assessments: [{ ...assessments[0]!, patientId: "p2" }],
  }), /pacientes diferentes/);

  assert.throws(() => medicationRegimensAsOf({
    patientId: "p1",
    consultationIds: ["baseline"],
    regimens: [{ ...medicationRegimens[0]!, patientId: "p2" }],
  }), /pacientes diferentes/);
});
