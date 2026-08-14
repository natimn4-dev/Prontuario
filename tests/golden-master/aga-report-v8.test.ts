import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel, renderAgaReportText } from "../../src/domain/aga-report.ts";

test("v8 expõe resumo longitudinal, tendência e plano consolidado sem mudar regra clínica", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "current",
    consultationStatus: "DRAFT",
    patientName: "Paciente Sintético",
    longitudinalProblems: [
      { id: "g1", patientId: "p1", type: "GERIATRIC", status: "ACTIVE", title: "Risco de sarcopenia" },
    ],
    longitudinalAssessments: [
      {
        patientId: "p1",
        consultationId: "baseline",
        scaleCode: "sarcf",
        scaleVersion: "1.0",
        score: 3,
        scoreText: "3",
        classification: "Baixo risco",
        color: "verde",
        answers: { sf1: 1 },
        isBaseline: true,
        appliedAt: "2026-01-01",
      },
      {
        patientId: "p1",
        consultationId: "current",
        scaleCode: "sarcf",
        scaleVersion: "1.0",
        score: 5,
        scoreText: "5",
        classification: "Rastreio positivo",
        color: "vermelho",
        answers: { sf1: 2 },
        appliedAt: "2026-08-01",
      },
    ],
  });

  assert.equal(report.schemaVersion, "1.1");
  assert.equal(report.assessedScales[0]?.evolution.trend, "unfavorable");
  assert.equal(report.changeSummary.counts.unfavorable, 1);
  assert.ok(report.carePlan.now.length > 0);
  const text = renderAgaReportText(report);
  assert.match(text, /RESUMO LONGITUDINAL/);
  assert.match(text, /Dado coletado nesta consulta: sf1=2/);
  assert.match(text, /Fonte\/status:/);
  assert.match(text, /SUGESTÕES PENDENTES DE REVISÃO MÉDICA/);
});

test("v8 não inventa trajetória quando não há avaliações", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "c1",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [],
  });

  assert.deepEqual(report.assessedScales, []);
  assert.equal(report.changeSummary.counts.unfavorable, 0);
  assert.deepEqual(report.carePlan.now, []);
  assert.doesNotMatch(renderAgaReportText(report), /Katz \(/);
});

test("v8 identifica versões incompatíveis em cada ponto da trajetória", () => {
  const report = buildAgaReportModel({
    patientId: "p1",
    consultationId: "current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      {
        patientId: "p1",
        consultationId: "baseline",
        scaleCode: "sarcf",
        scaleVersion: "1.0",
        score: 3,
        isBaseline: true,
        appliedAt: "2026-01-01",
      },
      {
        patientId: "p1",
        consultationId: "current",
        scaleCode: "sarcf",
        scaleVersion: "2.0",
        score: 5,
        appliedAt: "2026-08-01",
      },
    ],
  });

  const evolution = report.assessedScales[0]!.evolution;
  assert.equal(evolution.trend, "not-comparable");
  assert.equal(evolution.baselineVersion, "1.0");
  assert.equal(evolution.previousVersion, "1.0");
  assert.equal(evolution.currentVersion, "2.0");
  assert.match(renderAgaReportText(report), /baseline 3 \(v1\.0\).*atual 5 \(v2\.0\).*Não comparável/);
});
