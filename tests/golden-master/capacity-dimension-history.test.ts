import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCapacityDimensionHistory,
  CAPACITY_DIMENSIONS,
} from "../../src/domain/capacity-dimension-history.ts";

const consultations = [
  { id: "c1", patientId: "p1", occurredAt: "2026-01-10", createdAt: "2026-01-10" },
  { id: "c2", patientId: "p1", occurredAt: "2026-04-10", createdAt: "2026-04-10" },
  { id: "c3", patientId: "p1", occurredAt: "2026-08-21", createdAt: "2026-08-21" },
];

test("gráfico usa capacidade funcional mais os cinco domínios de capacidade intrínseca", () => {
  assert.deepEqual(CAPACITY_DIMENSIONS.map((item) => item.code), [
    "funcionalidade",
    "locomocao",
    "cognicao",
    "psicologico",
    "vitalidade",
    "sensorial",
  ]);
});

test("gráfico não cria média entre escalas e preserva o maior nível de atenção registrado", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10T10:00:00Z" },
      { patientId: "p1", consultationId: "c2", scaleCode: "lawton", clinicalColor: "amarelo", appliedAt: "2026-04-10T10:00:00Z" },
      { patientId: "p1", consultationId: "c2", scaleCode: "barthel", clinicalColor: "vermelho", appliedAt: "2026-04-10T10:01:00Z" },
      { patientId: "p1", consultationId: "c2", scaleCode: "sarcf", clinicalColor: "amarelo", appliedAt: "2026-04-10T10:02:00Z" },
      { patientId: "p1", consultationId: "c3", scaleCode: "moca", clinicalColor: "verde", appliedAt: "2026-08-21T10:00:00Z" },
      { patientId: "p1", consultationId: "c3", scaleCode: "charlson", clinicalColor: "vermelho", appliedAt: "2026-08-21T10:01:00Z" },
    ],
    targetConsultationId: "c3",
  });

  const functionality = history.dimensions.find((item) => item.code === "funcionalidade")!;
  const locomotion = history.dimensions.find((item) => item.code === "locomocao")!;
  const cognition = history.dimensions.find((item) => item.code === "cognicao")!;

  assert.deepEqual(history.consultations.map((item) => item.id), ["c1", "c2", "c3"]);
  assert.equal(functionality.cells[0]?.status, "preserved");
  assert.equal(functionality.cells[1]?.status, "altered");
  assert.deepEqual(functionality.cells[1]?.assessments.map((item) => item.scaleCode), ["barthel", "lawton"]);
  assert.equal(functionality.cells[2]?.status, "not-assessed");
  assert.equal(locomotion.cells[1]?.status, "attention");
  assert.equal(cognition.cells[2]?.status, "preserved");
  assert.ok(history.dimensions.every((dimension) => dimension.cells.every((cell) => !cell.assessments.some((item) => item.scaleCode === "charlson"))));
});

test("página do paciente só inclui consulta atual quando ela já possui dimensão pertinente preenchida", () => {
  const withoutCurrentData = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "sarcf", clinicalColor: "amarelo", appliedAt: "2026-04-10" },
    ],
    targetConsultationId: "c3",
    includeTargetWhenEmpty: false,
  });
  assert.deepEqual(withoutCurrentData.consultations.map((item) => item.id), ["c1", "c2"]);

  const withCurrentData = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "sarcf", clinicalColor: "amarelo", appliedAt: "2026-04-10" },
      { patientId: "p1", consultationId: "c3", scaleCode: "gds15", clinicalColor: "verde", appliedAt: "2026-08-21" },
    ],
    targetConsultationId: "c3",
    includeTargetWhenEmpty: false,
  });
  assert.deepEqual(withCurrentData.consultations.map((item) => item.id), ["c1", "c2", "c3"]);
  assert.equal(withCurrentData.consultations.at(-1)?.isTarget, true);
});

test("relatório preserva a consulta atual no horizonte mesmo se uma dimensão não foi reaplicada", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations,
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10" },
      { patientId: "p1", consultationId: "c2", scaleCode: "sarcf", clinicalColor: "amarelo", appliedAt: "2026-04-10" },
    ],
    targetConsultationId: "c3",
    includeTargetWhenEmpty: true,
  });

  assert.deepEqual(history.consultations.map((item) => item.id), ["c1", "c2", "c3"]);
  assert.equal(history.consultations.at(-1)?.isTarget, true);
  assert.ok(history.dimensions.every((dimension) => dimension.cells.at(-1)?.status === "not-assessed"));
});

test("último registro da mesma escala na consulta é o efetivo", () => {
  const history = buildCapacityDimensionHistory({
    patientId: "p1",
    consultations: [consultations[0]!],
    assessments: [
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", clinicalColor: "vermelho", appliedAt: "2026-01-10T09:00:00Z" },
      { patientId: "p1", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10T10:00:00Z" },
    ],
  });
  const functionality = history.dimensions.find((item) => item.code === "funcionalidade")!;
  assert.equal(functionality.cells[0]?.status, "preserved");
  assert.equal(functionality.cells[0]?.assessments.length, 1);
});

test("gráfico bloqueia mistura de pacientes", () => {
  assert.throws(() => buildCapacityDimensionHistory({
    patientId: "p1",
    assessments: [
      { patientId: "p2", consultationId: "c1", scaleCode: "lawton", clinicalColor: "verde", appliedAt: "2026-01-10" },
    ],
  }), /pacientes diferentes/);
});

test("página do paciente e relatório final renderizam o mesmo gráfico longitudinal", () => {
  const patientPage = readFileSync("src/app/patients/[id]/page.tsx", "utf8");
  const report = readFileSync("src/components/reports/aga-report-preview.tsx", "utf8");
  const generator = readFileSync("src/server/clinical/generate-aga-report.ts", "utf8");

  assert.match(patientPage, /CapacityDimensionHistoryChart/);
  assert.match(patientPage, /includeTargetWhenEmpty: false/);
  assert.match(report, /Capacidade intrínseca e funcional/);
  assert.match(report, /context="final-report"/);
  assert.match(generator, /includeTargetWhenEmpty: true/);
  assert.match(generator, /content: \{ report, text \}/);
});
