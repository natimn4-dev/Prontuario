import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { clinicalScaleDomain } from "../../src/domain/clinical-scale-workspace.ts";
import {
  EAT10_CODE,
  EAT10_MAX_SCORE,
  EAT10_POSITIVE_CUTOFF,
  classifyEat10,
  scoreEat10,
} from "../../src/domain/eat10.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";

const eat10Source = readFileSync(new URL("../../src/domain/eat10.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../../src/app/api/consultations/[id]/scales/complementary/route.ts", import.meta.url), "utf8");
const licensingSource = readFileSync(new URL("../../docs/ELECTRONIC_SCALE_LICENSING.md", import.meta.url), "utf8");

test("EAT-10 usa total 0-40 e ponto de corte brasileiro >=3 sem criar diagnóstico", () => {
  assert.equal(EAT10_CODE, "eat10");
  assert.equal(EAT10_MAX_SCORE, 40);
  assert.equal(EAT10_POSITIVE_CUTOFF, 3);

  const negative = scoreEat10({ score: 2 });
  assert.equal(negative.result.scoreText, "2/40");
  assert.equal(negative.result.clinicalColor, "verde");
  assert.match(negative.result.classification, /não positivo/i);

  const positive = scoreEat10({ score: 3 });
  assert.equal(positive.result.scoreText, "3/40");
  assert.equal(positive.result.clinicalColor, "vermelho");
  assert.match(positive.result.classification, /rastreio positivo/i);
  assert.match(positive.result.interpretation, /fonoaudiológica/i);
  assert.match(positive.result.interpretation, /não confirma diagnóstico|não.*diagnóstico/i);
});

test("EAT-10 rejeita valores fora da faixa e campos inesperados", () => {
  assert.throws(() => scoreEat10({ score: -1 }), /EAT10_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreEat10({ score: 41 }), /EAT10_SCORE_OUT_OF_RANGE/);
  assert.throws(() => classifyEat10(2.5), /EAT10_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreEat10({ score: 3, item1: 1 }), /EAT10_UNEXPECTED_FIELD/);
});

test("workspace unificado agrupa EAT-10 no domínio Disfagia", () => {
  assert.equal(clinicalScaleDomain("eat10", "disfagia"), "Disfagia");
});

test("API complementar expõe e persiste EAT-10 pelo scorer server-side", () => {
  assert.match(routeSource, /EAT10_QUICK_DEFINITION/);
  assert.match(routeSource, /scaleCode === EAT10_CODE[\s\S]*scoreEat10\(answers\)/);
});

function reportWithEat10(score: number, color: "verde" | "vermelho") {
  return buildAgaReportModel({
    patientId: "patient-eat10",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [{
      patientId: "patient-eat10",
      consultationId: "consultation-current",
      scaleCode: "eat10",
      scaleVersion: "EAT-10-total-score-BR-2014-2023-v1",
      score,
      scoreText: `${score}/40`,
      classification: score >= 3 ? "Rastreio positivo para disfagia" : "Rastreio não positivo pelo ponto de corte",
      color,
      appliedAt: "2026-09-02",
    }],
  });
}

test("EAT-10 positivo gera domínio de disfagia com orientação específica e evidência PubMed", () => {
  const report = reportWithEat10(3, "vermelho");
  const dysphagia = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
    .find((domain) => domain.code === "disfagia");

  assert.equal(dysphagia?.label, "Deglutição / disfagia");
  assert.equal(dysphagia?.state, "altered");
  assert.equal(dysphagia?.guidance.length, 2);
  assert.match(dysphagia?.guidance.join(" ") ?? "", /avaliação clínica da deglutição/i);
  assert.match(dysphagia?.guidance.join(" ") ?? "", /fonoaudiologia/i);
  assert.match(dysphagia?.guidance.join(" ") ?? "", /Não mude por conta própria a textura dos alimentos nem use espessantes/i);
  assert.ok(dysphagia?.evidenceReferences.some((reference) => reference.pmid === "37501570"));
  assert.ok(dysphagia?.evidenceReferences.some((reference) => reference.pmid === "35623866"));
  assert.equal(dysphagia?.requiresMedicalGuidance, false);
});

test("EAT-10 abaixo do corte não dispara orientação de disfagia alterada", () => {
  const report = reportWithEat10(2, "verde");
  const dysphagia = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
    .find((domain) => domain.code === "disfagia");

  assert.equal(dysphagia?.state, "preserved");
  assert.deepEqual(dysphagia?.guidance, []);
  assert.deepEqual(dysphagia?.evidenceReferences, []);
  assert.equal(dysphagia?.requiresMedicalGuidance, false);
});

test("formulário eletrônico literal permanece fail-closed até confirmação de licença", () => {
  assert.doesNotMatch(eat10Source, /Meu problema para engolir me faz perder peso/i);
  assert.doesNotMatch(eat10Source, /Eu tusso quando como/i);
  assert.match(licensingSource, /Mapi Research Trust/i);
  assert.match(licensingSource, /registro do escore total de 0 a 40/i);
  assert.match(licensingSource, /não devem ser copiados para o código/i);
});
