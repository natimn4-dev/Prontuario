import assert from "node:assert/strict";
import test from "node:test";
import { latestCurrentScaleAssessments } from "../../src/domain/current-scale-assessments.ts";
import { latestPreviousScaleAssessments } from "../../src/domain/previous-scale-assessments.ts";

const baseline = ["katz", "fast", "ecog", "crash_mna_sf"].map((scaleCode) => ({
  id: `baseline-${scaleCode}`, patientId: "synthetic-patient", consultationId: "initial",
  scaleCode, scaleVersion: "1", appliedAt: "2026-01-01", answers: { item: 1 },
}));
const scope = { patientId: "synthetic-patient", consultationId: "follow-up" };

test("segunda consulta inicia sem respostas ou marcas de aplicação herdadas, mantendo histórico", () => {
  assert.equal(latestCurrentScaleAssessments({ ...scope, assessments: baseline }).size, 0);
  const previous = latestPreviousScaleAssessments({
    patientId: scope.patientId, targetConsultationId: scope.consultationId,
    consultationIds: ["initial", "follow-up"], assessments: baseline,
  });
  assert.equal(previous.length, baseline.length);
  assert.deepEqual(previous.find((item) => item.scaleCode === "katz")?.answers, { item: 1 });
  assert.equal(latestCurrentScaleAssessments({ ...scope, assessments: [] }).size, 0);
});

test("reaplicação e reabertura recuperam só a resposta atual e preservam a primeira aplicação", () => {
  const current = { ...baseline[0]!, id: "new", consultationId: scope.consultationId, appliedAt: "2026-02-01", answers: { item: 0 } };
  const rows = [...baseline, current];
  const before = structuredClone(rows);
  const reopened = latestCurrentScaleAssessments({ ...scope, assessments: rows });
  assert.equal(reopened.size, 1);
  assert.deepEqual(reopened.get("katz")?.answers, { item: 0 });
  assert.deepEqual(rows, before);
  assert.deepEqual(latestCurrentScaleAssessments({ ...scope, consultationId: "initial", assessments: rows }).get("katz")?.answers, { item: 1 });
});

test("edições da mesma consulta escolhem a última aplicação, sem depender da ordem de leitura", () => {
  const first = { ...baseline[0]!, consultationId: scope.consultationId, id: "a", appliedAt: "2026-02-01" };
  const second = { ...first, id: "b", appliedAt: "2026-02-02" };
  const tie = { ...second, id: "c" };
  assert.equal(latestCurrentScaleAssessments({ ...scope, assessments: [tie, first, second] }).get("katz")?.id, "c");
});

test("dados de outro paciente falham fechado, mesmo quando não pertencem à consulta atual", () => {
  assert.throws(() => latestCurrentScaleAssessments({
    ...scope, assessments: [{ ...baseline[0]!, patientId: "other-patient" }],
  }), /pacientes diferentes/);
});
