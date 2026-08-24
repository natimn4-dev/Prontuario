import assert from "node:assert/strict";
import test from "node:test";
import type { AgaScaleReportSection } from "../../src/domain/aga-report.ts";
import { buildReportScaleEvolution } from "../../src/domain/report-scale-evolution.ts";

function scale(input: {
  code: string;
  patientId?: string;
  scores: readonly number[];
  drawable?: readonly boolean[];
}): AgaScaleReportSection {
  const points = input.scores.map((score, index) => ({
    consultationId: `c${index + 1}`,
    appliedAt: `2026-0${index + 1}-10T12:00:00.000Z`,
    score,
    version: "v1",
    isBaseline: index === 0,
  }));
  return {
    code: input.code,
    version: "v1",
    name: input.code,
    dimension: "synthetic",
    assessedInTargetConsultation: true,
    lastKnown: {
      consultationId: points.at(-1)!.consultationId,
      appliedAt: points.at(-1)!.appliedAt,
      score: points.at(-1)!.score,
      version: "v1",
    },
    collectedData: [],
    result: { score: points.at(-1)!.score },
    relatedProblemProposals: [],
    interventionSuggestions: [],
    evolution: {
      previous: points.at(-2)?.score ?? null,
      previousVersion: "v1",
      baseline: points[0]!.score,
      baselineVersion: "v1",
      current: points.at(-1)!.score,
      currentVersion: "v1",
      trend: "stable",
      vsPrevious: "Estável numericamente",
      vsBaseline: "stable",
    },
    chartSeries: {
      patientId: input.patientId ?? "patient-synthetic",
      scaleCode: input.code,
      points,
      segments: points.slice(1).map((point, index) => ({
        fromConsultationId: points[index]!.consultationId,
        toConsultationId: point.consultationId,
        trend: "stable",
        drawable: input.drawable?.[index] ?? true,
      })),
      hasMultipleVersions: input.drawable?.some((drawable) => !drawable) ?? false,
    },
    source: { status: "synthetic", note: "Teste sintético." },
  };
}

test("gráfico consolida as escalas do modelo pela própria faixa sem alterar o valor exato", () => {
  const model = buildReportScaleEvolution([
    scale({ code: "lawton", scores: [21, 14] }),
    scale({ code: "gds15", scores: [15, 0] }),
  ]);

  assert.deepEqual(model.consultations.map((item) => item.id), ["c1", "c2"]);
  const lawton = model.series.find((item) => item.code === "lawton")!;
  const gds = model.series.find((item) => item.code === "gds15")!;
  assert.deepEqual(lawton.points.map((point) => [point.score, point.percentOfRange]), [[21, 100], [14, 50]]);
  assert.deepEqual(gds.points.map((point) => [point.score, point.percentOfRange]), [[15, 100], [0, 0]]);
  assert.equal(lawton.direction, "higher-better");
  assert.equal(gds.direction, "higher-worse");
});

test("gráfico preserva as seis séries e a ordem visual aprovada quando existem dados", () => {
  const model = buildReportScaleEvolution([
    scale({ code: "dez_cs", scores: [8, 7, 6] }),
    scale({ code: "lawton", scores: [20, 18, 16] }),
    scale({ code: "gds15", scores: [4, 5, 6] }),
    scale({ code: "isi", scores: [8, 10, 12] }),
    scale({ code: "sppb", scores: [10, 9, 8] }),
    scale({ code: "zarit_reduzida", scores: [8, 12, 16] }),
  ]);

  assert.deepEqual(model.series.map((item) => [item.label, item.tone]), [
    ["10-CS (Cognição)", "blue"],
    ["AIVD (Funcionalidade)", "green"],
    ["GDS-15 (Humor)", "orange"],
    ["ISI (Sono)", "red"],
    ["SPPB (Desempenho físico)", "purple"],
    ["Zarit (Sobrecarga)", "pink"],
  ]);
});

test("gráfico preserva interrupção de versão e não desenha trecho não comparável", () => {
  const model = buildReportScaleEvolution([
    scale({ code: "dez_cs", scores: [8, 7, 6], drawable: [true, false] }),
  ]);
  assert.deepEqual(model.series[0]?.drawableSegments, [
    { fromConsultationId: "c1", toConsultationId: "c2" },
  ]);
  assert.equal(model.series[0]?.hasMultipleVersions, true);
});

test("gráfico consolidado falha fechado quando recebe pacientes diferentes", () => {
  assert.throws(() => buildReportScaleEvolution([
    scale({ code: "lawton", patientId: "patient-a", scores: [21, 20] }),
    scale({ code: "gds15", patientId: "patient-b", scores: [3, 4] }),
  ]), /não pode misturar pacientes/);
});

test("gráfico consolidado falha fechado quando um valor está fora da faixa válida", () => {
  assert.throws(() => buildReportScaleEvolution([
    scale({ code: "gds15", scores: [4, 16] }),
  ]), /fora da faixa válida 0-15/);
});
