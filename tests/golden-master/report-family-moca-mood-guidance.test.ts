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
  collectedData?: AgaScaleReportSection["collectedData"];
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
    collectedData: input.collectedData ?? [],
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

test("MoCA exibe as faixas de rastreio solicitadas sem tratá-las como diagnóstico etiológico", () => {
  const cases = [
    { score: 27, state: "preserved", text: /Cognição Normal/i },
    { score: 21, state: "attention", text: /Comprometimento Cognitivo Leve/i },
    { score: 15, state: "altered", text: /Comprometimento Cognitivo Moderado/i },
    { score: 8, state: "altered", text: /Comprometimento Cognitivo Grave/i },
  ] as const;

  for (const current of cases) {
    const summary = domainSummary([
      scale({
        code: "moca",
        name: "MoCA",
        dimension: "cognicao",
        score: current.score,
        scoreText: `Bruto ${current.score}/30 · corrigido ${current.score}/30`,
        classification: "Registro legado",
      }),
    ], "cognicao");

    assert.equal(summary.state, current.state);
    assert.match(summary.results[0]?.value ?? "", current.text);
    assert.match(summary.results[0]?.value ?? "", /rastreio/i);
  }
});

test("MEEM exibe as faixas de rastreio solicitadas", () => {
  const cases = [
    { score: 24, state: "preserved", text: /Cognição Preservada/i },
    { score: 23, state: "attention", text: /Comprometimento Cognitivo Leve/i },
    { score: 19, state: "altered", text: /Comprometimento Cognitivo Moderado/i },
    { score: 9, state: "altered", text: /Comprometimento Cognitivo Grave/i },
  ] as const;

  for (const current of cases) {
    const summary = domainSummary([
      scale({
        code: "meem",
        name: "MEEM",
        dimension: "cognicao",
        score: current.score,
        scoreText: `${current.score}/30`,
        classification: "Registro legado",
      }),
    ], "cognicao");
    assert.equal(summary.state, current.state);
    assert.match(summary.results[0]?.value ?? "", current.text);
    assert.match(summary.results[0]?.value ?? "", /rastreio/i);
  }
});

test("FRAIL-BR diferencia orientações para robusto, pré-frágil e frágil", () => {
  const cases = [
    { score: 0, color: "verde" as const, marker: "não mostrou sinais de fragilidade" },
    { score: 1, color: "amarelo" as const, marker: "mostrou sinais iniciais de fragilidade" },
    { score: 3, color: "vermelho" as const, marker: "mostrou fragilidade" },
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
  assert.ok(preserved.guidance.some((item) => /mantenha a autonomia nas atividades habituais/i.test(item)));
  assert.ok(preserved.guidance.some((item) => /participação ativa nas decisões/i.test(item)));
  assert.ok(preserved.guidance.some((item) => /reserva cognitiva/i.test(item)));
  assert.ok(preserved.guidance.some((item) => /alimentação saudável/i.test(item)));
  assert.ok(preserved.guidance.some((item) => /mudança persistente de memória, raciocínio ou autonomia/i.test(item)));
  assert.ok(!preserved.guidance.some((item) => /supervisão nas tarefas complexas|erros em medicamentos|apoio direto do cuidador/i.test(item)));
  assert.doesNotMatch(preserved.guidance.join(" "), /\bnão\b/i);
  assert.doesNotMatch(preserved.guidance.join(" "), /vascular|metabólic/i);
  assert.ok(preserved.evidenceReferences.some((reference) => reference.pmid === "42442374"));
  assert.ok(preserved.evidenceReferences.some((reference) => reference.pmid === "25771249"));
  assert.ok(preserved.evidenceReferences.some((reference) => reference.pmid === "31270114"));

  assert.equal(attention.state, "attention");
  assert.ok(attention.guidance.some((item) => /não significa, sozinho, diagnóstico de demência/i.test(item)));
  assert.ok(attention.guidance.some((item) => /apoio de forma discreta e proporcional à dificuldade/i.test(item)));

  assert.equal(altered.state, "altered");
  assert.ok(altered.guidance.some((item) => /sozinho, não define diagnóstico de demência/i.test(item)));
  assert.ok(altered.guidance.some((item) => /ofereça ajuda direta nessas situações/i.test(item)));
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

test("dependência apenas em AIVD usa linguagem de apoio proporcional", () => {
  const summary = domainSummary([
    scale({ code: "katz", name: "Katz", dimension: "funcionalidade", score: 6, scoreText: "6/6" }),
    scale({ code: "lawton", name: "Lawton", dimension: "funcionalidade", score: 15, scoreText: "15/21" }),
  ], "funcionalidade");

  assert.ok(summary.guidance.some((item) => item.includes("atividades mais complexas") && item.includes("ajuda por perto")));
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


test("MoCA preservado com NPI positivo mantém cognição preservada no texto e acrescenta manejo comportamental", () => {
  const moca = scale({
    code: "cognitive_domain_observation",
    name: "MEEM/MoCA — preenchimento por domínios",
    dimension: "cognicao",
    score: 27,
    scoreText: "MoCA — bruto 27/30 · corrigido 27/30",
    classification: "Cognição Normal no rastreio",
    clinicalColor: "verde",
    collectedData: [
      { field: "instrument", value: "moca" },
      { field: "moca_visuospatial", value: "5" },
      { field: "moca_naming", value: "3" },
      { field: "moca_attention", value: "6" },
      { field: "moca_language", value: "3" },
      { field: "moca_abstraction", value: "2" },
      { field: "moca_delayed_recall", value: "2" },
      { field: "moca_orientation", value: "6" },
      { field: "moca_education_years", value: "13" },
    ],
  });
  const npi = scale({
    code: "npi",
    name: "NPI — Inventário Neuropsiquiátrico",
    dimension: "cognicao",
    score: 6,
    scoreText: "NPI 6/120 · 1 domínio(s) positivo(s)",
    classification: "Sintomas neuropsiquiátricos presentes em 1 domínio(s)",
    clinicalColor: "amarelo",
    collectedData: [
      { field: "npi_agitation_frequency", value: "3" },
      { field: "npi_agitation_severity", value: "2" },
    ],
  });

  const summary = domainSummary([moca, npi], "cognicao");
  const guidance = summary.guidance.join(" ");

  assert.equal(summary.state, "attention");
  assert.match(summary.results.find((item) => item.scaleCode === "cognitive_domain_observation")?.value ?? "", /Cognição Normal no rastreio/i);
  assert.doesNotMatch(guidance, /rastreio cognitivo foi positivo/i);
  assert.doesNotMatch(guidance, /Memória\/orientação foi uma das áreas mais acometidas/i);
  assert.match(guidance, /avaliação da memória e do raciocínio nesta consulta foi tranquilizadora/i);
  assert.match(guidance, /NPI registrou sintomas neuropsiquiátricos/i);
  assert.match(guidance, /agitação, agressividade ou irritabilidade/i);
  assert.ok(summary.evidenceReferences.some((reference) => reference.pmid === "40051590"));
  assert.ok(summary.evidenceReferences.some((reference) => reference.pmid === "42563132"));
});


test("10-CS normal não recebe supervisão cognitiva por Lawton alterado", () => {
  const summaries = buildReportDomainSummaries([
    scale({
      code: "dez_cs",
      name: "10-CS",
      dimension: "cognicao",
      score: 9,
      scoreText: "9/10",
      classification: "Normal",
      clinicalColor: "verde",
    }),
    scale({
      code: "lawton",
      name: "Lawton",
      dimension: "funcionalidade",
      score: 15,
      scoreText: "15/21",
      classification: "Dependência parcial em AIVD",
      clinicalColor: "amarelo",
    }),
  ], EMPTY_INTRINSIC_CAPACITY);

  const cognition = summaries.find((item) => item.code === "cognicao");
  const functionality = summaries.find((item) => item.code === "funcionalidade");
  assert.ok(cognition);
  assert.ok(functionality);

  assert.equal(cognition.state, "preserved");
  assert.match(cognition.guidance.join(" "), /mantenha a autonomia nas atividades habituais/i);
  assert.match(cognition.guidance.join(" "), /reserva cognitiva/i);
  assert.match(cognition.guidance.join(" "), /mudança persistente de memória, raciocínio ou autonomia/i);
  assert.doesNotMatch(cognition.guidance.join(" "), /supervisão nas tarefas complexas|apoio direto do cuidador/i);
  assert.doesNotMatch(cognition.guidance.join(" "), /\bnão\b/i);

  assert.equal(functionality.state, "altered");
  assert.match(functionality.guidance.join(" "), /atividades instrumentais|finanças, compras, transporte/i);
});
