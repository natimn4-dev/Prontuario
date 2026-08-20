import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel, renderAgaReportText } from "../../src/domain/aga-report.ts";

const problems = [
  { id: "c1", patientId: "p1", type: "CLINICAL" as const, status: "ACTIVE" as const, title: "Hipertensão arterial" },
  { id: "g1", patientId: "p1", type: "GERIATRIC" as const, status: "RESOLVED" as const, title: "Delirium prévio" },
];

test("relatório separa dado, resultado, interpretação, proposta, intervenção e evolução", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "current",
    consultationStatus: "DRAFT",
    patientName: "Paciente Teste",
    longitudinalProblems: problems,
    longitudinalAssessments: [
      { patientId: "p1", consultationId: "baseline", scaleCode: "sarcf", scaleVersion: "1.0", score: 3, scoreText: "3", classification: "Baixo risco", interpretation: "Rastreio inicial.", answers: { sf1: 1 }, color: "verde", isBaseline: true, appliedAt: "2026-01-01" },
      { patientId: "p1", consultationId: "current", scaleCode: "sarcf", scaleVersion: "1.0", score: 5, scoreText: "5", classification: "Rastreio positivo", interpretation: "Sarcopenia provável.", answers: { sf1: 2 }, color: "vermelho", appliedAt: "2026-08-01" },
    ],
  });
  const section = report.assessedScales[0]!;
  assert.deepEqual(section.collectedData, [{ field: "sf1", value: "2" }]);
  assert.equal(section.result.score, 5);
  assert.equal(section.assessedInTargetConsultation, true);
  assert.equal(section.interpretation, "Sarcopenia provável.");
  assert.ok(section.relatedProblemProposals.length > 0);
  assert.ok(section.interventionSuggestions.every((item) => item.reviewStatus === "pending-medical-review"));
  assert.equal(section.evolution.baseline, 3);
  assert.equal(report.geriatricProblems[0]?.status, "RESOLVED");
});

test("relatório distingue último valor conhecido quando escala não foi reaplicada", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "consultation-b",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      { patientId: "p1", consultationId: "baseline", scaleCode: "barthel", scaleVersion: "1", score: 80, color: "verde", appliedAt: "2026-01-01", isBaseline: true },
      { patientId: "p1", consultationId: "consultation-a", scaleCode: "barthel", scaleVersion: "1", score: 60, color: "vermelho", appliedAt: "2026-03-01" },
    ],
  });
  const scale = report.assessedScales[0]!;

  assert.equal(scale.assessedInTargetConsultation, false);
  assert.equal(scale.lastKnown.consultationId, "consultation-a");
  assert.equal(scale.lastKnown.score, 60);
  assert.equal(scale.evolution.current, null);
  assert.ok(report.notAssessedScaleCodes.includes("barthel"));
  assert.match(renderAgaReportText(report), /Último valor conhecido — não avaliado nesta consulta/);
  assert.doesNotMatch(renderAgaReportText(report), /atual 60/);
  assert.deepEqual(scale.interventionSuggestions, []);
  assert.deepEqual(scale.relatedProblemProposals, []);
});

test("alerta urgente histórico não é recriado sem reaplicação na consulta alvo", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "consultation-b",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      { patientId: "p1", consultationId: "consultation-a", scaleCode: "cam", scaleVersion: "1", score: 1, scoreText: "Positivo", color: "vermelho", answers: { c1: 1, c2: 1, c3: 1 }, appliedAt: "2026-03-01", isBaseline: true },
    ],
  });

  assert.equal(report.assessedScales[0]?.assessedInTargetConsultation, false);
  assert.deepEqual(report.alerts, []);
  assert.equal(report.changeSummary.counts.urgentAlerts, 0);
  assert.deepEqual(report.carePlan.urgent, []);
  assert.equal(report.assessedScales[0]?.lastKnown.score, 1);
});

test("relatório sem escala não inventa pontuação ou interpretação", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "c1",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Teste",
    longitudinalProblems: [],
    longitudinalAssessments: [],
  });
  assert.deepEqual(report.assessedScales, []);
  assert.ok(report.notAssessedScaleCodes.includes("katz"));
  assert.doesNotMatch(renderAgaReportText(report), /Katz \(/);
});

test("relatório pode ser gerado antes da finalização e mantém aviso", () => {
  const report = buildAgaReportModel({
    patientId: "p1", consultationId: "c1", consultationStatus: "DRAFT", patientName: "Teste",
    longitudinalProblems: [], longitudinalAssessments: [],
  });
  assert.equal(report.draftContext, true);
  assert.match(renderAgaReportText(report), /antes da finalização/);
});

test("relatório familiar mantém vacinas em seção própria sem prescrição automática", () => {
  const report = buildAgaReportModel({
    patientId: "p1", consultationId: "c1", consultationStatus: "IN_REVIEW", patientName: "Teste",
    longitudinalProblems: [], longitudinalAssessments: [],
    vaccinationReview: { status: "PENDING", pendingVaccines: ["Influenza", "Pneumocócica"] },
  });
  const text = renderAgaReportText(report);

  assert.deepEqual(report.vaccinationPrevention.pendingVaccines, ["Influenza", "Pneumocócica"]);
  assert.equal(report.vaccinationPrevention.automaticPrescription, false);
  assert.match(text, /VACINAS E PREVENÇÃO/);
  assert.match(text, /Influenza/);
  assert.match(text, /Pneumocócica/);
  assert.match(text, /não contém prescrição automática.*separada da tabela de medicamentos/i);
  assert.doesNotMatch(text, /aplicar|administrar|prescrever.*vacina/i);
});

test("relatório familiar orienta revisão da carteira quando status é desconhecido", () => {
  const report = buildAgaReportModel({
    patientId: "p1", consultationId: "c1", consultationStatus: "IN_REVIEW", patientName: "Teste",
    longitudinalProblems: [], longitudinalAssessments: [],
  });

  assert.equal(report.vaccinationPrevention.status, "UNKNOWN");
  assert.match(renderAgaReportText(report), /status vacinal desconhecido/i);
  assert.match(renderAgaReportText(report), /carteira de vacinação.*revisão/i);
});

test("relatório bloqueia mistura de pacientes", () => {
  assert.throws(() => buildAgaReportModel({
    patientId: "p1", consultationId: "c1", consultationStatus: "DRAFT", patientName: "Teste",
    longitudinalProblems: [{ ...problems[0]!, patientId: "p2" }], longitudinalAssessments: [],
  }), /outro paciente/);
});
