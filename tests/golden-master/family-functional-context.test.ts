import assert from "node:assert/strict";
import test from "node:test";
import type { AgaScaleReportSection } from "../../src/domain/aga-report.ts";
import {
  contextualFamilyGuidance,
  deriveFamilyFunctionalContext,
} from "../../src/domain/family-functional-context.ts";

function scale(code: string, score: number): AgaScaleReportSection {
  return {
    code,
    version: "test",
    name: code,
    dimension: code === "katz" || code === "barthel" || code === "lawton" ? "funcionalidade" : "cognicao",
    assessedInTargetConsultation: true,
    lastKnown: { consultationId: "c1", appliedAt: "2026-08-28T12:00:00.000Z", score, version: "test" },
    collectedData: [],
    result: { score },
    relatedProblemProposals: [],
    interventionSuggestions: [],
    evolution: {
      previous: null,
      previousVersion: null,
      baseline: score,
      baselineVersion: "test",
      current: score,
      currentVersion: "test",
      trend: "insufficient-data",
      vsPrevious: "Sem comparação",
      vsBaseline: "insufficient-data",
    },
    chartSeries: {
      patientId: "p1",
      scaleCode: code,
      points: [],
      segments: [],
      hasMultipleVersions: false,
    },
    source: { status: "needs-review", note: "test" },
  };
}

test("FAST 7d não apaga dependência em ABVD identificada pelo Katz", () => {
  const context = deriveFamilyFunctionalContext([
    scale("fast", 7.4),
    scale("katz", 2),
    scale("barthel", 100),
    scale("lawton", 21),
  ]);

  assert.equal(context.level, "advanced-dementia");
  assert.equal(context.fastStage, "7d");
  assert.equal(context.katzScore, 2);
  assert.match(context.sourceSummary, /FAST 7d/);
  assert.match(context.sourceSummary, /Katz 2/);

  const guidance = contextualFamilyGuidance("funcionalidade", ["Orientação genérica"], context).join(" ");
  assert.match(guidance, /necessidade importante de ajuda nas atividades básicas/i);
  assert.match(guidance, /banho, vestir-se, higiene, alimentação e transferências/i);
  assert.doesNotMatch(guidance, /Orientação genérica/i);
});

test("FAST continua sendo fallback funcional quando Katz Barthel e Lawton não foram aplicados", () => {
  const context = deriveFamilyFunctionalContext([scale("fast", 7.4)]);
  const guidance = contextualFamilyGuidance("funcionalidade", ["Orientação genérica"], context).join(" ");
  assert.match(guidance, /ajuda muito ampla nas atividades básicas/i);
  assert.match(guidance, /conforto, segurança e dignidade/i);
});

test("Katz com dependência severa eleva orientação para ajuda nas atividades básicas", () => {
  const context = deriveFamilyFunctionalContext([
    scale("fast", 3),
    scale("katz", 2),
    scale("barthel", 100),
    scale("lawton", 21),
  ]);

  assert.equal(context.level, "high-dependence");
  assert.equal(context.katzScore, 2);
  assert.match(context.sourceSummary, /Katz 2/);
  const guidance = contextualFamilyGuidance("funcionalidade", ["Orientação genérica"], context).join(" ");
  assert.match(guidance, /necessidade importante de ajuda/i);
  assert.match(guidance, /banho, vestir-se, higiene, alimentação e transferências/i);
});

test("Katz com dependência moderada orienta ajuda e supervisão em ABVD", () => {
  const context = deriveFamilyFunctionalContext([
    scale("fast", 3),
    scale("katz", 4),
    scale("barthel", 100),
    scale("lawton", 21),
  ]);

  assert.equal(context.level, "adl-support");
  const guidance = contextualFamilyGuidance("funcionalidade", ["Orientação genérica"], context).join(" ");
  assert.match(guidance, /atividades básicas/i);
  assert.match(guidance, /precisa de ajuda/i);
});

test("Barthel grave pode elevar necessidade de ajuda mesmo sem FAST avançado", () => {
  const context = deriveFamilyFunctionalContext([
    scale("fast", 4),
    scale("katz", 6),
    scale("barthel", 25),
    scale("lawton", 21),
  ]);

  assert.equal(context.level, "high-dependence");
  const guidance = contextualFamilyGuidance("funcionalidade", ["Orientação genérica"], context).join(" ");
  assert.match(guidance, /necessidade importante de ajuda/i);
  assert.match(guidance, /banho, vestir-se, higiene, alimentação e transferências/i);
});

test("Lawton alterado contextualiza AIVD sem transformar dependência instrumental em dependência básica", () => {
  const context = deriveFamilyFunctionalContext([
    scale("fast", 3),
    scale("katz", 6),
    scale("barthel", 100),
    scale("lawton", 15),
  ]);

  assert.equal(context.level, "iadl-support");
  const guidance = contextualFamilyGuidance("funcionalidade", ["Orientação genérica"], context).join(" ");
  assert.match(guidance, /atividades instrumentais/i);
  assert.match(guidance, /finanças, compras, transporte/i);
  assert.doesNotMatch(guidance, /ajuda muito ampla nas atividades básicas/i);
});

test("FAST 7d adapta cognição para comunicação e cuidado, sem exigir desempenho independente", () => {
  const context = deriveFamilyFunctionalContext([scale("fast", 7.4)]);
  const guidance = contextualFamilyGuidance("cognicao", [
    "Use calendário e relógio para orientar tarefas independentes.",
  ], context).join(" ");

  assert.match(guidance, /comunicação calma e afetuosa/i);
  assert.match(guidance, /sinais não verbais/i);
  assert.match(guidance, /em vez de cobrar memória ou orientação/i);
});
