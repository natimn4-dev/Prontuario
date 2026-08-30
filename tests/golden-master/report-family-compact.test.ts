import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { renderAccessibleAgaReportText } from "../../src/domain/accessible-aga-report-text.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";

test("relatório familiar limita orientações, mostra resultados e omite detalhe técnico", () => {
  const report = buildAgaReportModel({
    patientId: "patient-family-compact",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [{
      patientId: "patient-family-compact",
      consultationId: "consultation-current",
      scaleCode: "fast",
      scaleVersion: "1.0",
      score: 7.4,
      scoreText: "7d",
      classification: "FAST 7d",
      color: "vermelho",
      answers: { stage: "7d" },
      appliedAt: "2026-08-30",
    }],
  });

  const domains = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity);
  assert.ok(domains.every((domain) => domain.guidance.length <= 2));
  assert.deepEqual(domains[0]?.results[0], {
    scaleCode: "fast",
    scaleName: "FAST",
    value: "7d — FAST 7d",
  });

  const text = renderAccessibleAgaReportText(report);
  assert.match(text, /FAST.*7d — FAST 7d/);
  assert.doesNotMatch(text, /Dado coletado|stage=7d|Fonte:|Trajetória:|Sugestões que ainda/);
  assert.doesNotMatch(text, /PLANO DE CUIDADO/);
  assert.doesNotMatch(text, /Base científica|PMID/);
});
