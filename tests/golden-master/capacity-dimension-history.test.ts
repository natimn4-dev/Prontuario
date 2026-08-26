import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCapacityDimensionHistory,
  CAPACITY_DIMENSIONS,
  hasDisplayableLongitudinalHistory,
} from "../../src/domain/capacity-dimension-history.ts";
import { INTRINSIC_CAPACITY_MODEL_VERSION } from "../../src/domain/intrinsic-capacity-methodology.ts";

const consultations = [
  { id: "c1", patientId: "p1", occurredAt: "2026-01-10", createdAt: "2026-01-10" },
  { id: "c2", patientId: "p1", occurredAt: "2026-04-10", createdAt: "2026-04-10" },
  { id: "c3", patientId: "p1", occurredAt: "2026-08-21", createdAt: "2026-08-21" },
];

function dimension(history: ReturnType<typeof buildCapacityDimensionHistory>, code: string) {
  return history.dimensions.find((item) => item.code === code)!;
}

test("modelo usa independência funcional separada dos cinco domínios de capacidade intrínseca", () => {
  assert.deepEqual(CAPACITY_DIMENSIONS.map((item) => item.code), [
    "funcionalidade",
    "locomocao",
    "cognicao",
    "psicologico",
    "vitalidade",
    "sensorial",
  ]);
  assert.equal(CAPACITY_DIMENSIONS[0]?.label, "Independência funcional");
  assert.equal(INTRINSIC_CAPACITY_MODEL_VERSION, "intrinsic-capacity-model-v1.0.0");
});

test("modelo não aplica pior resultado vence quando assessments de mesma prioridade discordam", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "amarelo", appliedAt: "2026-01-10T10:00:00Z" },
      { patientId: "p1", consultationId: "c1", scaleCode: "barthel", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-01-10T10:01:00Z" },
    ],
  });

  const functionality = dimension(history, "funcionalidade");
  assert.equal(functionality.cells[0]?.status, "indeterminate");
  assert.match(functionality.cells[0]?.statusReason ?? "", /discordantes/);
  assert.ok(functionality.cells[0]?.assessments.every((item) => item.selectedForDomainState));
});

test("âncora locomotora tem precedência sobre rastreio sem somar nem misturar os instrumentos", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "sppb", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10T10:00:00Z" },
      { patientId: "p1", consultationId: "c1", scaleCode: "sarcf", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-01-10T10:01:00Z" },
    ],
  });

  const locomotion = dimension(history, "locomocao");
  assert.equal(locomotion.cells[0]?.status, "preserved");
  assert.equal(locomotion.cells[0]?.comparabilityKey, "sppb@1");
  assert.equal(locomotion.cells[0]?.assessments.find((item) => item.scaleCode === "sppb")?.selectedForDomainState, true);
  assert.equal(locomotion.cells[0]?.assessments.find((item) => item.scaleCode === "sarcf")?.selectedForDomainState, false);
});

test("rastreio positivo gera atenção e rastreio negativo não afirma preservação de todo o domínio", () => {
  const positive = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "sarcf", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-01-10" },
    ],
  });
  const negative = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "sarcf", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
    ],
  });

  assert.equal(dimension(positive, "locomocao").cells[0]?.status, "attention");
  assert.equal(dimension(positive, "locomocao").cells[0]?.evidenceBasis, "screening");
  assert.equal(dimension(negative, "locomocao").cells[0]?.status, "recorded");
});

test("FAST e CAM não definem cognição; ISI não define capacidade psicológica; FRAIL-BR não define locomoção ou vitalidade", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "fast", clinicalColor: "vermelho", appliedAt: "2026-01-10T09:00:00Z" },
      { patientId: "p1", consultationId: "c1", scaleCode: "cam", clinicalColor: "vermelho", appliedAt: "2026-01-10T09:01:00Z" },
      { patientId: "p1", consultationId: "c1", scaleCode: "isi", clinicalColor: "vermelho", appliedAt: "2026-01-10T09:02:00Z" },
      { patientId: "p1", consultationId: "c1", scaleCode: "frail_br", clinicalColor: "vermelho", appliedAt: "2026-01-10T09:03:00Z" },
    ],
  });

  assert.equal(dimension(history, "cognicao").cells[0]?.status, "recorded");
  assert.equal(dimension(history, "psicologico").cells[0]?.status, "recorded");
  assert.equal(dimension(history, "locomocao").cells[0]?.status, "recorded");
  assert.equal(dimension(history, "vitalidade").cells[0]?.status, "recorded");
});

test("MNA-SF é indicador nutricional proxy de vitalidade e a limitação permanece explícita", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      {
        id: "a-mna",
        patientId: "p1",
        consultationId: "c1",
        scaleCode: "mna_sf",
        scaleVersion: "mna-sf-v1",
        scoreNumeric: 7,
        scoreText: "7/14",
        classification: "Desnutrido",
        clinicalColor: "vermelho",
        appliedAt: "2026-01-10",
        sourceCitation: "Kaiser MJ et al. 2009",
        definitionHash: "hash-mna",
      },
    ],
  });

  const vitality = dimension(history, "vitalidade");
  assert.equal(vitality.cells[0]?.status, "altered");
  assert.equal(vitality.cells[0]?.evidenceBasis, "proxy");
  assert.match(vitality.cells[0]?.statusReason ?? "", /proxy/);
  assert.equal(vitality.cells[0]?.assessments[0]?.assessmentId, "a-mna");
  assert.equal(vitality.cells[0]?.assessments[0]?.scoreNumeric, 7);
  assert.equal(vitality.cells[0]?.assessments[0]?.classification, "Desnutrido");
  assert.equal(vitality.cells[0]?.assessments[0]?.sourceCitation, "Kaiser MJ et al. 2009");
  assert.equal(vitality.cells[0]?.assessments[0]?.definitionHash, "hash-mna");
});

test("instrumentos ou versões diferentes não criam falsa tendência longitudinal", () => {
  const differentInstrument = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!, consultations[1]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "barthel", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-04-10" },
    ],
  });
  const differentVersion = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!, consultations[1]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "lawton", scaleVersion: "2", clinicalColor: "vermelho", appliedAt: "2026-04-10" },
    ],
  });

  assert.equal(differentInstrument.inflectionPoints.length, 0);
  assert.equal(differentVersion.inflectionPoints.length, 0);
  assert.equal(differentInstrument.hasLongitudinalHistoryData, true);
  assert.equal(differentVersion.hasLongitudinalHistoryData, true);
  assert.equal(hasDisplayableLongitudinalHistory(differentInstrument), true);
  assert.equal(hasDisplayableLongitudinalHistory(differentVersion), true);
  assert.equal(differentInstrument.hasLongitudinalTrendData, false);
  assert.equal(differentVersion.hasLongitudinalTrendData, false);
});

test("consulta sem avaliação de capacidade permanece no eixo como missing explícito e interrompe comparabilidade", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c3", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-08-21" },
    ],
  });

  assert.deepEqual(history.consultations.map((item) => item.id), ["c1", "c2", "c3"]);
  const functionality = dimension(history, "funcionalidade");
  assert.equal(functionality.cells[0]?.status, "preserved");
  assert.equal(functionality.cells[1]?.status, "not-assessed");
  assert.equal(functionality.cells[2]?.status, "altered");
  assert.equal(history.inflectionPoints.length, 0);
  assert.equal(history.hasLongitudinalHistoryData, true);
  assert.equal(hasDisplayableLongitudinalHistory(history), true);
  assert.equal(history.hasLongitudinalTrendData, false);
});

test("gráfico permanece após consulta subsequente sem reaplicação", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-04-10" },
    ],
    targetConsultationId: "c3",
    includeTargetWhenEmpty: true,
  });

  assert.equal(history.hasLongitudinalHistoryData, true);
  assert.equal(history.hasLongitudinalTrendData, true);
  assert.equal(hasDisplayableLongitudinalHistory(history), true);
  assert.equal(dimension(history, "funcionalidade").cells.at(-1)?.status, "not-assessed");
});

test("snapshot anterior reconstrói a persistência visual a partir das células", () => {
  const current = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!, consultations[1]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "barthel", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-04-10" },
    ],
  });
  const legacySnapshot = { ...current, hasLongitudinalHistoryData: undefined };

  assert.equal(legacySnapshot.hasLongitudinalTrendData, false);
  assert.equal(hasDisplayableLongitudinalHistory(legacySnapshot), true);
});

test("mesmo instrumento e versão produz inflexão observada sem inferir causalidade", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!, consultations[1]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-04-10" },
    ],
    milestones: [
      {
        patientId: "p1",
        consultationId: "c2",
        title: "AVC",
        note: "Evento vascular registrado na evolução.",
        recordedAt: "2026-04-10T11:00:00Z",
        source: "problem-origin",
      },
    ],
  });

  assert.equal(history.inflectionPoints.length, 1);
  assert.equal(history.inflectionPoints[0]?.dimensionCode, "funcionalidade");
  assert.equal(history.inflectionPoints[0]?.fromStatus, "preserved");
  assert.equal(history.inflectionPoints[0]?.toStatus, "altered");
  assert.equal(history.inflectionPoints[0]?.comparabilityKey, "lawton@1");
  assert.equal(history.inflectionPoints[0]?.milestones[0]?.title, "AVC");
  assert.equal(history.hasLongitudinalTrendData, true);
});

test("último registro da mesma escala na consulta é o efetivo sem apagar proveniência", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { id: "old", patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "vermelho", appliedAt: "2026-01-10T09:00:00Z" },
      { id: "new", patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", scoreText: "21", clinicalColor: "verde", appliedAt: "2026-01-10T10:00:00Z" },
    ],
  });

  const functionality = dimension(history, "funcionalidade");
  assert.equal(functionality.cells[0]?.status, "preserved");
  assert.equal(functionality.cells[0]?.assessments.length, 1);
  assert.equal(functionality.cells[0]?.assessments[0]?.assessmentId, "new");
  assert.equal(functionality.cells[0]?.assessments[0]?.scoreText, "21");
});

test("consulta alvo vazia permanece explicitamente não avaliada no relatório", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", scaleVersion: "1", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "sarcf", scaleVersion: "1", clinicalColor: "amarelo", appliedAt: "2026-04-10" },
    ],
    targetConsultationId: "c3",
    includeTargetWhenEmpty: true,
  });

  assert.deepEqual(history.consultations.map((item) => item.id), ["c1", "c2", "c3"]);
  assert.equal(history.consultations.at(-1)?.isTarget, true);
  assert.ok(history.dimensions.every((item) => item.cells.at(-1)?.status === "not-assessed"));
});

test("gráfico bloqueia mistura de pacientes em avaliações, consultas e marcos", () => {
  assert.throws(() => buildCapacityDimensionHistory({
    patientId: "p1",
    assessments: [
      { patientId: "p2", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10" },
    ],
  }), /pacientes diferentes/);

  assert.throws(() => buildCapacityDimensionHistory({
    patientId: "p1",
    assessments: [],
    consultations: [{ id: "c1", patientId: "p2", occurredAt: "2026-01-10" }],
  }), /consultas de pacientes diferentes/);

  assert.throws(() => buildCapacityDimensionHistory({
    patientId: "p1",
    assessments: [],
    milestones: [{
      patientId: "p2",
      consultationId: "c1",
      title: "Queda",
      recordedAt: "2026-01-10",
      source: "problem-event",
    }],
  }), /marcos clínicos/);
});

test("UI usa tempo real, comparabilidade e o design system clínico aprovado sem criar tabela estatística", () => {
  const patientPage = readFileSync("src/app/patients/[id]/page.tsx", "utf8");
  const report = readFileSync("src/components/reports/aga-report-preview.tsx", "utf8");
  const generator = readFileSync("src/server/clinical/generate-aga-report.ts", "utf8");
  const chart = readFileSync("src/components/reports/capacity-dimension-history-chart.tsx", "utf8");
  const chartStyles = readFileSync("src/components/reports/capacity-dimension-history-chart.module.css", "utf8");

  assert.match(patientPage, /CapacityDimensionHistoryChart/);
  assert.match(patientPage, /includeTargetWhenEmpty: false/);
  assert.match(patientPage, /scaleDefinition/);
  assert.match(report, /context="final-report"/);
  assert.match(generator, /includeTargetWhenEmpty: true/);
  assert.match(generator, /definitionHash/);
  assert.match(generator, /content: \{ report, text \}/);
  assert.match(chart, /timeSpan/);
  assert.match(chart, /comparabilityKey/);
  assert.match(chart, /Pontos de inflexão observados/);
  assert.match(chart, /não atribui causa/);
  assert.doesNotMatch(chart, /<table/);
  assert.match(chartStyles, /var\(--primary\)/);
  assert.match(chartStyles, /var\(--line\)/);
  assert.match(chartStyles, /var\(--primary-soft\)/);
});
