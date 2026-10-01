import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { renderAccessibleAgaReportText } from "../../src/domain/accessible-aga-report-text.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";

test("relatório familiar mantém orientações da fase de demência e omite detalhe técnico", () => {
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
  assert.ok(domains.filter((domain) => domain.code !== "cognicao").every((domain) => domain.guidance.length <= 2));
  const cognition = domains.find((domain) => domain.code === "cognicao");
  assert.ok(cognition && cognition.guidance.length >= 5);
  assert.match(cognition.guidance.join(" "), /Fase grave.*cuidados paliativos.*luto antecipatório/is);
  assert.deepEqual(domains[0]?.results[0], {
    scaleCode: "fast",
    scaleName: "FAST",
    value: "7D — FAST 7D",
  });

  const text = renderAccessibleAgaReportText(report);
  assert.match(text, /FAST.*7D — FAST 7D/);
  assert.match(text, /luto antecipatório/);
  assert.doesNotMatch(text, /Dado coletado|stage=7d|Fonte:|Trajetória:|Sugestões que ainda/);
  assert.doesNotMatch(text, /PLANO DE CUIDADO/);
  assert.doesNotMatch(text, /Base científica|PMID/);
});
