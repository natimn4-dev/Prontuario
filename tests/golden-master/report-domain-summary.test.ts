import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";

test("relatório compartilhável agrega avaliações por domínio sem expor escalas", () => {
  const report = buildAgaReportModel({
    patientId: "patient-domain-summary",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      {
        patientId: "patient-domain-summary",
        consultationId: "consultation-current",
        scaleCode: "sarcf",
        scaleVersion: "1.0",
        score: 6,
        scoreText: "6",
        classification: "Rastreio positivo",
        color: "vermelho",
        appliedAt: "2026-08-24",
      },
      {
        patientId: "patient-domain-summary",
        consultationId: "consultation-current",
        scaleCode: "sppb",
        scaleVersion: "1.0",
        score: 7,
        scoreText: "7",
        classification: "Desempenho reduzido",
        color: "amarelo",
        appliedAt: "2026-08-24",
      },
    ],
  });

  const domains = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity);
  const mobility = domains.find((domain) => domain.code === "mobilidade");

  assert.equal(domains.filter((domain) => domain.code === "mobilidade").length, 1);
  assert.equal(mobility?.label, "Locomoção e equilíbrio");
  assert.equal(mobility?.state, "altered");
  assert.ok((mobility?.guidance.length ?? 0) >= 4);
  assert.ok(mobility?.evidenceReferences.some((reference) => reference.pmid === "30703272"));
  assert.equal(mobility?.requiresMedicalGuidance, false);
});

test("domínio alterado nunca é silenciosamente apresentado como sem orientação", () => {
  const report = buildAgaReportModel({
    patientId: "patient-domain-guidance",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [{
      patientId: "patient-domain-guidance",
      consultationId: "consultation-current",
      scaleCode: "pps",
      scaleVersion: "1.0",
      score: 40,
      color: "vermelho",
      appliedAt: "2026-08-24",
    }],
  });

  const domains = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity);
  const altered = domains.filter((domain) => domain.state === "altered" || domain.state === "attention");

  assert.ok(altered.length >= 1);
  assert.ok(altered.every((domain) => domain.guidance.length > 0 || domain.requiresMedicalGuidance));
});
