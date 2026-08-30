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
  assert.equal(mobility?.guidance.length, 2);
  assert.deepEqual(mobility?.results.map((result) => result.scaleCode), ["sarcf", "sppb"]);
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

test("tabela inclui somente domínios avaliados na consulta alvo e nunca usa orientação genérica", () => {
  const report = buildAgaReportModel({
    patientId: "patient-current-domains-only",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      {
        patientId: "patient-current-domains-only",
        consultationId: "consultation-old",
        scaleCode: "gds15",
        scaleVersion: "1.0",
        score: 8,
        color: "amarelo",
        appliedAt: "2026-07-20",
      },
      {
        patientId: "patient-current-domains-only",
        consultationId: "consultation-current",
        scaleCode: "barthel",
        scaleVersion: "barthel-items-2026-08-v1",
        score: 80,
        color: "amarelo",
        appliedAt: "2026-08-24",
      },
    ],
  });

  const domains = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity);
  assert.deepEqual(domains.map((domain) => domain.code), ["funcionalidade"]);
  assert.ok(domains[0]!.guidance.length > 0);
  assert.ok(domains[0]!.evidenceReferences.some((reference) => reference.pmid === "29953830"));
  const text = domains.flatMap((domain) => domain.guidance).join(" ");
  assert.doesNotMatch(text, /Manter o plano de cuidado já acordado/);
  assert.doesNotMatch(text, /orientação individual deste domínio/i);
});

test("FAST 7d com Katz dependente mantém alteração e orientação baseada em ABVD", () => {
  const report = buildAgaReportModel({
    patientId: "patient-katz-fast7d",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      {
        patientId: "patient-katz-fast7d",
        consultationId: "consultation-current",
        scaleCode: "fast",
        scaleVersion: "1.0",
        score: 7.4,
        scoreText: "7d",
        classification: "FAST 7d",
        color: "verde",
        appliedAt: "2026-08-29",
      },
      {
        patientId: "patient-katz-fast7d",
        consultationId: "consultation-current",
        scaleCode: "katz",
        scaleVersion: "1.0",
        score: 0,
        scoreText: "0",
        classification: "registro legado",
        color: "verde",
        appliedAt: "2026-08-29",
      },
    ],
  });

  const katz = report.assessedScales.find((scale) => scale.code === "katz");
  assert.equal(katz?.assessedInTargetConsultation, true);
  assert.equal(katz?.result.score, 0);

  const functionality = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
    .find((domain) => domain.code === "funcionalidade");

  assert.equal(functionality?.state, "altered");
  assert.equal(functionality?.stateLabel, "Alteração identificada — requer atenção");
  const guidance = functionality?.guidance.join(" ") ?? "";
  assert.match(guidance, /dependência importante para atividades básicas/i);
  assert.match(guidance, /banho, vestir-se, higiene, alimentação e transferências/i);
  assert.doesNotMatch(guidance, /consolidadas no Plano de cuidados/i);
  assert.doesNotMatch(guidance, /ajuda apenas na medida necessária/i);
});
