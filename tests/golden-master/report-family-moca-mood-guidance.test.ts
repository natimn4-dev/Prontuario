import assert from "node:assert/strict";
import test from "node:test";
import type { AgaScaleReportSection } from "../../src/domain/aga-report.ts";
import { conciseUrgentGuidance } from "../../src/domain/accessible-aga-report-text.ts";
import type { IntrinsicCapacityGuidance } from "../../src/domain/intrinsic-capacity-guidance.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";
import { buildAgaReportEnrichment } from "../../src/domain/report-overview.ts";

const EMPTY_INTRINSIC_CAPACITY = { alteredDomains: [] } as unknown as IntrinsicCapacityGuidance;

function scale(input: {
  code: string;
  name: string;
  dimension: AgaScaleReportSection["dimension"];
  score: number;
  scoreText?: string;
  classification?: string;
  clinicalColor?: AgaScaleReportSection["clinicalColor"];
}): AgaScaleReportSection {
  return {
    code: input.code,
    version: "1.0",
    name: input.name,
    dimension: input.dimension,
    assessedInTargetConsultation: true,
    lastKnown: {
      consultationId: "consultation-1",
      appliedAt: "2026-09-04T12:00:00.000Z",
      score: input.score,
      version: "1.0",
    },
    collectedData: [],
    result: {
      score: input.score,
      scoreText: input.scoreText ?? `${input.score}`,
      ...(input.classification ? { classification: input.classification } : {}),
    },
    ...(input.clinicalColor ? { clinicalColor: input.clinicalColor } : {}),
    interpretation: input.classification,
    relatedProblemProposals: [],
    interventionSuggestions: [],
    evolution: {
      previous: null,
      previousVersion: null,
      baseline: null,
      baselineVersion: "1.0",
      current: input.score,
      currentVersion: "1.0",
      trend: "insufficient-data",
      vsPrevious: "Sem avaliação anterior comparável.",
      vsBaseline: "insufficient-data",
    },
    chartSeries: {
      patientId: "patient-1",
      scaleCode: input.code,
      points: [],
      segments: [],
      hasMultipleVersions: false,
    },
    source: { status: "verified", note: "Teste de regressão" },
  };
}

function domainSummary(scales: AgaScaleReportSection[], code: string) {
  const summary = buildReportDomainSummaries(scales, EMPTY_INTRINSIC_CAPACITY).find((item) => item.code === code);
  assert.ok(summary);
  return summary;
}

test("visão geral mostra MoCA conciso e explica ABVD/AIVD", () => {
  const moca = scale({
    code: "moca",
    name: "MoCA",
    dimension: "cognicao",
    score: 21,
    scoreText: "Bruto 21/30 · corrigido 21/30",
    classification: "Na ou acima da referência de rastreio educacional adotada",
  });
  const katz = scale({ code: "katz", name: "Katz", dimension: "funcionalidade", score: 6, scoreText: "6/6" });
  const lawton = scale({ code: "lawton", name: "Lawton", dimension: "funcionalidade", score: 15, scoreText: "15/21" });

  const enrichment = buildAgaReportEnrichment({
    consultationDate: "2026-09-04",
    scales: [moca, katz, lawton],
    gastrostomyPresent: false,
    directiveHistory: [],
  });

  assert.equal(enrichment.overview.cognition?.label, "MoCA");
  assert.equal(enrichment.overview.cognition?.value, "21/30");
  assert.doesNotMatch(enrichment.overview.cognition?.value ?? "", /Bruto|corrigido|referência de rastreio/i);
  assert.ok(enrichment.overview.functionality.some((item) => item.label.includes("ABVD (atividades básicas da vida diária)")));
  assert.ok(enrichment.overview.functionality.some((item) => item.label.includes("AIVD (atividades instrumentais da vida diária)")));
});

test("MoCA preserva a interpretação educacional registrada sem criar gravidade diagnóstica", () => {
  const cases = [
    { score: 27, state: "preserved" },
    { score: 21, state: "attention" },
    { score: 15, state: "altered" },
    { score: 8, state: "altered" },
  ] as const;

  for (const current of cases) {
    const summary = domainSummary([
      scale({
        code: "moca",
        name: "MoCA",
        dimension: "cognicao",
        score: current.score,
        scoreText: `Bruto ${current.score}/30 · corrigido ${current.score}/30`,
        classification: "Abaixo da referência de rastreio educacional adotada",
      }),
    ], "cognicao");

    assert.equal(summary.state, current.state);
    assert.match(summary.results[0]?.value ?? "", /rastreio educacional/i);
    assert.doesNotMatch(summary.results[0]?.value ?? "", /comprometimento cognitivo (leve|moderado|grave)|CCL|MCI/i);
    if (current.score < 26) assert.notEqual(summary.stateLabel, "Sem alteração sinalizada nesta consulta");
  }
});

test("FRAIL-BR diferencia orientações para robusto, pré-frágil e frágil", () => {
  const cases = [
    { score: 0, color: "verde" as const, marker: "não identificou critérios de fragilidade" },
    { score: 1, color: "amarelo" as const, marker: "indica pré-fragilidade" },
    { score: 3, color: "vermelho" as const, marker: "indica fragilidade" },
  ];

  const summaries = cases.map((current) => domainSummary([
    scale({
      code: "frail_br",
      name: "FRAIL-BR",
      dimension: "fragilidade",
      score: current.score,
      scoreText: `${current.score}/5`,
      clinicalColor: current.color,
    }),
  ], "fragilidade"));

  assert.deepEqual(summaries.map((summary) => summary.state), ["preserved", "attention", "altered"]);
  assert.ok(summaries.every((summary, index) => summary.guidance.some((item) => item.includes(cases[index]!.marker))));
  assert.notDeepEqual(summaries[0]?.guidance, summaries[1]?.guidance);
  assert.notDeepEqual(summaries[1]?.guidance, summaries[2]?.guidance);
  assert.ok(summaries[0]?.evidenceReferences.some((reference) => reference.pmid === "42560630"));
  assert.ok(summaries[1]?.evidenceReferences.some((reference) => reference.pmid === "42620771"));
  assert.ok(summaries[2]?.evidenceReferences.some((reference) => reference.pmid === "42570706"));
});

test("cognição preservada não recebe orientação de supervisão própria de alteração cognitiva", () => {
  const preserved = domainSummary([
    scale({
      code: "moca",
      name: "MoCA",
      dimension: "cognicao",
      score: 27,
      scoreText: "27/30",
      classification: "Dentro do esperado",
    }),
  ], "cognicao");
  const attention = domainSummary([
    scale({
      code: "moca",
      name: "MoCA",
      dimension: "cognicao",
      score: 21,
      scoreText: "21/30",
      classification: "Sinal de atenção no rastreio",
    }),
  ], "cognicao");
  const altered = domainSummary([
    scale({
      code: "moca",
      name: "MoCA",
      dimension: "cognicao",
      score: 15,
      scoreText: "15/30",
      classification: "Alteração no rastreio",
    }),
  ], "cognicao");

  assert.equal(preserved.state, "preserved");
  assert.ok(preserved.guidance.some((item) => /não institua supervisão/i.test(item)));
  assert.ok(preserved.guidance.some((item) => /reavalie se paciente ou familiar perceber mudança/i.test(item)));
  assert.ok(!preserved.guidance.some((item) => /erros em medicamentos|apoio direto do cuidador/i.test(item)));

  assert.equal(attention.state, "attention");
  assert.ok(attention.guidance.some((item) => /não é diagnóstico de demência/i.test(item)));
  assert.ok(attention.guidance.some((item) => /supervisão apenas nas tarefas/i.test(item)));

  assert.equal(altered.state, "altered");
  assert.ok(altered.guidance.some((item) => /não estabelece sozinho diagnóstico de demência/i.test(item)));
  assert.ok(altered.guidance.some((item) => /apoio direto do cuidador/i.test(item)));
  assert.ok(altered.evidenceReferences.some((reference) => reference.pmid === "39713942"));
  assert.notDeepEqual(preserved.guidance, altered.guidance);
});

test("GDS alterada nunca aparece como preservada e recebe orientação específica para depressão tardia", () => {
  const attention = domainSummary([
    scale({
      code: "gds15",
      name: "GDS-15",
      dimension: "humor",
      score: 8,
      scoreText: "8/15",
      classification: "Rastreio positivo",
    }),
  ], "humor");
  const altered = domainSummary([
    scale({
      code: "gds15",
      name: "GDS-15",
      dimension: "humor",
      score: 12,
      scoreText: "12/15",
      classification: "Sintomas moderados a graves",
    }),
  ], "humor");

  assert.equal(attention.state, "attention");
  assert.equal(altered.state, "altered");
  assert.notEqual(attention.stateLabel, "Sem alteração sinalizada nesta consulta");
  assert.notEqual(altered.stateLabel, "Sem alteração sinalizada nesta consulta");
  assert.ok(attention.guidance.some((item) => item.includes("GDS") && item.includes("envelhecimento")));
  assert.ok(attention.guidance.some((item) => item.includes("não altere medicamentos por conta própria")));
  assert.ok(attention.guidance.some((item) => /fala sobre morte|intenção de se machucar/i.test(item)));
  assert.ok(attention.evidenceReferences.some((reference) => reference.pmid === "36649548"));
  assert.ok(attention.evidenceReferences.some((reference) => reference.pmid === "40809860"));
});

test("dependência apenas em AIVD usa linguagem de autonomia vigiada", () => {
  const summary = domainSummary([
    scale({ code: "katz", name: "Katz", dimension: "funcionalidade", score: 6, scoreText: "6/6" }),
    scale({ code: "lawton", name: "Lawton", dimension: "funcionalidade", score: 15, scoreText: "15/21" }),
  ], "funcionalidade");

  assert.ok(summary.guidance.some((item) => item.includes("autonomia vigiada")));
  assert.ok(summary.results.some((result) => result.scaleName.includes("ABVD — atividades básicas da vida diária")));
  assert.ok(summary.results.some((result) => result.scaleName.includes("AIVD — atividades instrumentais da vida diária")));
});

test("ajuda médica imediata é resumida sem perder alerta de autoagressão", () => {
  const guidance = conciseUrgentGuidance([
    "Dor torácica intensa, falta de ar ou desmaio exigem avaliação imediata.",
    "Fala sobre morte, desesperança intensa ou intenção de se machucar exige ajuda imediata.",
    "Sangramento importante ou piora súbita do estado geral exigem atendimento.",
  ]);

  assert.ok(guidance.length <= 2);
  assert.match(guidance[0] ?? "", /piora súbita importante/i);
  assert.ok(guidance.some((item) => /fala sobre morte|intenção de se machucar/i.test(item)));
});
