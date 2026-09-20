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
  assert.match(guidance, /necessidade importante de ajuda nas atividades básicas/i);
  assert.match(guidance, /banho, vestir-se, higiene, alimentação e transferências/i);
  assert.doesNotMatch(guidance, /consolidadas no Plano de cuidados/i);
  assert.doesNotMatch(guidance, /ajuda apenas na medida necessária/i);
});


test("fragilidade usa orientações clinicamente distintas para robusto, pré-frágil e frágil", () => {
  const makeDomain = (score: number, color: "verde" | "amarelo" | "vermelho") => {
    const report = buildAgaReportModel({
      patientId: `patient-frailty-${score}`,
      consultationId: "consultation-current",
      consultationStatus: "IN_REVIEW",
      patientName: "Paciente Sintético",
      longitudinalProblems: [],
      longitudinalAssessments: [{
        patientId: `patient-frailty-${score}`,
        consultationId: "consultation-current",
        scaleCode: "frail_br",
        scaleVersion: "1.0",
        score,
        scoreText: `${score}/5`,
        color,
        appliedAt: "2026-09-19",
      }],
    });
    return buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
      .find((domain) => domain.code === "fragilidade");
  };

  const robust = makeDomain(0, "verde");
  const preFrail = makeDomain(1, "amarelo");
  const frail = makeDomain(3, "vermelho");

  assert.equal(robust?.state, "preserved");
  assert.match(robust?.guidance.join(" ") ?? "", /não mostrou sinais de fragilidade/i);
  assert.match(robust?.guidance.join(" ") ?? "", /preservar força, equilíbrio, disposição e independência/i);
  assert.doesNotMatch(robust?.guidance.join(" ") ?? "", /maior vulnerabilidade|plano geriátrico individualizado/i);

  assert.equal(preFrail?.state, "attention");
  assert.match(preFrail?.guidance.join(" ") ?? "", /pré-fragilidade/i);
  assert.match(preFrail?.guidance.join(" ") ?? "", /bom momento para fortalecer a reserva/i);

  assert.equal(frail?.state, "altered");
  assert.match(frail?.guidance.join(" ") ?? "", /mostrou fragilidade/i);
  assert.match(frail?.guidance.join(" ") ?? "", /cuidado pode ser organizado em etapas/i);

  assert.notDeepEqual(robust?.guidance, preFrail?.guidance);
  assert.notDeepEqual(preFrail?.guidance, frail?.guidance);
  assert.ok(robust?.evidenceReferences.some((reference) => reference.pmid === "42560630"));
});

test("fragilidade preservada sem FRAIL-BR não cai em orientação genérica de paciente frágil", () => {
  const report = buildAgaReportModel({
    patientId: "patient-frailty-fallback",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [{
      patientId: "patient-frailty-fallback",
      consultationId: "consultation-current",
      scaleCode: "ves13",
      scaleVersion: "1.0",
      score: 0,
      scoreText: "0",
      classification: "Sem vulnerabilidade sinalizada",
      color: "verde",
      appliedAt: "2026-09-19",
    }],
  });
  const domain = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
    .find((item) => item.code === "fragilidade");

  assert.equal(domain?.state, "preserved");
  assert.match(domain?.guidance.join(" ") ?? "", /não mostrou sinais de vulnerabilidade/i);
  assert.match(domain?.guidance.join(" ") ?? "", /respeitando o ritmo e as preferências da pessoa/i);
});

test("rastreio cognitivo negativo e positivo geram orientações claramente diferentes", () => {
  const makeDomain = (score: number, color: "verde" | "amarelo" | "vermelho") => {
    const report = buildAgaReportModel({
      patientId: `patient-cognition-${score}`,
      consultationId: "consultation-current",
      consultationStatus: "IN_REVIEW",
      patientName: "Paciente Sintético",
      longitudinalProblems: [],
      longitudinalAssessments: [{
        patientId: `patient-cognition-${score}`,
        consultationId: "consultation-current",
        scaleCode: "moca",
        scaleVersion: "1.0",
        score,
        scoreText: `${score}/30`,
        color,
        appliedAt: "2026-09-19",
      }],
    });
    return buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
      .find((domain) => domain.code === "cognicao");
  };

  const negative = makeDomain(27, "verde");
  const positive = makeDomain(21, "amarelo");
  const markedlyAltered = makeDomain(15, "vermelho");

  assert.equal(negative?.state, "preserved");
  assert.match(negative?.guidance.join(" ") ?? "", /rastreio cognitivo desta consulta está preservado/i);
  assert.match(negative?.guidance.join(" ") ?? "", /mantenha a autonomia nas atividades habituais/i);
  assert.match(negative?.guidance.join(" ") ?? "", /alimentação saudável/i);
  assert.match(negative?.guidance.join(" ") ?? "", /reserva cognitiva/i);
  assert.doesNotMatch(negative?.guidance.join(" ") ?? "", /supervisão nas tarefas complexas|apoio direto do cuidador|rastreio cognitivo foi positivo/i);

  assert.equal(positive?.state, "attention");
  assert.match(positive?.guidance.join(" ") ?? "", /rastreio cognitivo mostrou um sinal de atenção/i);
  assert.match(positive?.guidance.join(" ") ?? "", /não significa, sozinho, diagnóstico de demência/i);
  assert.match(positive?.guidance.join(" ") ?? "", /aprofundar a avaliação/i);

  assert.equal(markedlyAltered?.state, "altered");
  assert.match(markedlyAltered?.guidance.join(" ") ?? "", /veio bastante alterado/i);
  assert.match(markedlyAltered?.guidance.join(" ") ?? "", /sozinho, não define diagnóstico de demência/i);
  assert.ok(positive?.evidenceReferences.some((reference) => reference.pmid === "39713942"));
  assert.ok(negative?.evidenceReferences.some((reference) => reference.pmid === "42442374"));

  assert.notDeepEqual(negative?.guidance, positive?.guidance);
  assert.notDeepEqual(positive?.guidance, markedlyAltered?.guidance);
});
