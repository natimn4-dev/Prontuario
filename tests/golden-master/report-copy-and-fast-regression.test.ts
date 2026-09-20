import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { AgaScaleReportSection } from "../../src/domain/aga-report.ts";
import { intrinsicCapacityGuidanceForDomain } from "../../src/domain/intrinsic-capacity-guidance.ts";
import { buildAgaReportEnrichment } from "../../src/domain/report-overview.ts";

function fastScale(score: number, scoreText = String(score), classification = "Estágio FAST registrado"): AgaScaleReportSection {
  return {
    code: "fast",
    version: "1.0",
    name: "FAST",
    dimension: "cognicao",
    assessedInTargetConsultation: true,
    lastKnown: {
      consultationId: "consultation-1",
      appliedAt: "2026-09-03T12:00:00.000Z",
      score,
      version: "1.0",
    },
    collectedData: [],
    result: { score, scoreText, classification },
    interpretation: classification,
    relatedProblemProposals: [],
    interventionSuggestions: [],
    evolution: {
      previous: null,
      previousVersion: null,
      baseline: null,
      baselineVersion: "1.0",
      current: score,
      currentVersion: "1.0",
      trend: "insufficient-data",
      vsPrevious: "Sem avaliação anterior comparável.",
      vsBaseline: "insufficient-data",
    },
    chartSeries: {
      patientId: "patient-1",
      scaleCode: "fast",
      points: [],
      segments: [],
      hasMultipleVersions: false,
    },
    source: { status: "verified", note: "Teste de regressão" },
  };
}

function overviewValue(score: number, scoreText = String(score)): string {
  const enrichment = buildAgaReportEnrichment({
    consultationDate: "2026-09-03T12:00:00.000Z",
    scales: [fastScale(score, scoreText)],
    gastrostomyPresent: false,
    directiveHistory: [],
  });
  assert.ok(enrichment.overview.cognition);
  return enrichment.overview.cognition.value;
}

test("FAST usa nomenclatura clínica canônica na visão geral sem expor o decimal interno", () => {
  assert.match(overviewValue(6.5), /^6E(?:\s|—|$)/);
  assert.doesNotMatch(overviewValue(6.5), /6\.5/);
  assert.match(overviewValue(6.3), /^6C(?:\s|—|$)/);
  assert.doesNotMatch(overviewValue(6.3), /6\.3/);
  assert.match(overviewValue(7.6), /^7F(?:\s|—|$)/);
});

test("FAST preserva a semântica do estágio: 6.3 não é convertido indevidamente em 6E", () => {
  assert.match(overviewValue(6.3), /^6C(?:\s|—|$)/);
  assert.doesNotMatch(overviewValue(6.3), /^6E(?:\s|—|$)/);
});

test("vitalidade mantém orientação familiar prática e referência geriátrica verificável", () => {
  const vitality = intrinsicCapacityGuidanceForDomain("vitalidade");
  assert.ok(vitality.actions.some((item) => item.includes("refeições mais agradáveis e menos cansativas")));
  assert.ok(vitality.actions.some((item) => item.includes("Ofereça líquidos várias vezes ao longo do dia")));
  assert.ok(vitality.attentionSigns.some((item) => item.includes("perda de peso sem intenção")));
  assert.ok(vitality.evidenceReferences.some((reference) => reference.pmid === "35306388"));
});

test("relatório não reintroduz os avisos suprimidos e preserva explicação robusta de diretivas", async () => {
  const reportRenderer = await readFile(new URL("../../src/domain/accessible-aga-report-text.ts", import.meta.url), "utf8");
  const reportGenerator = await readFile(new URL("../../src/server/clinical/generate-aga-report.ts", import.meta.url), "utf8");

  assert.doesNotMatch(reportRenderer, /Esta seção é informativa, não contém prescrição automática/);
  assert.doesNotMatch(reportGenerator, /não autoriza iniciar, suspender, substituir ou alterar medicamentos, doses ou horários por conta própria/);
  assert.match(reportRenderer, /valores, prioridades e preferências conversadas/);
  assert.match(reportRenderer, /podem ser revistas sempre que a pessoa desejar/);
});
