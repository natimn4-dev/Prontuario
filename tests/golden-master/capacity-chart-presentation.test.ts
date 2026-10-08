import assert from "node:assert/strict";
import test from "node:test";
import { buildCapacityDimensionHistory, hasDisplayableLongitudinalHistory } from "../../src/domain/capacity-dimension-history.ts";
import { capacityChartHistory, capacityChartPositions, capacityChartSegments, capacityRecordedResults } from "../../src/domain/capacity-chart-presentation.ts";

const consultations = [1, 2, 3].map((number) => ({ id: `c${number}`, patientId: "synthetic", occurredAt: `2026-0${number}-01` }));
const assessment = (number: number, score: number, version = "1") => ({ patientId: "synthetic", consultationId: `c${number}`, scaleCode: "moca", scaleVersion: version, scoreNumeric: score, clinicalColor: "amarelo" as const, appliedAt: `2026-0${number}-01` });

test("HTML and PDF projection excludes sensory charts while preserving clinical records", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [1, 2].flatMap((number) => [assessment(number, 25), { ...assessment(number, 1), scaleCode: "audicao" }, { ...assessment(number, 1), scaleCode: "visao" }]) });
  const before = JSON.stringify(history);
  const chart = capacityChartHistory(history);
  assert.deepEqual(new Set(chart.dimensions.map((dimension) => dimension.code)), new Set(["funcionalidade", "cognicao", "locomocao", "psicologico", "vitalidade"]));
  assert.ok(history.dimensions.find((dimension) => dimension.code === "audicao")!.cells[0]!.assessments.length);
  assert.ok(history.dimensions.find((dimension) => dimension.code === "visao")!.cells[0]!.assessments.length);
  assert.equal(JSON.stringify(history), before);
  assert.equal(hasDisplayableLongitudinalHistory(history), true);
});

test("sensory assessments alone cannot enable a longitudinal chart", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [1, 2].flatMap((number) => [{ ...assessment(number, 1), scaleCode: "audicao" }, { ...assessment(number, 1), scaleCode: "visao" }]) });
  assert.equal(hasDisplayableLongitudinalHistory(history), false);
});

test("return without reapplication preserves results but does not enable a chart", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations: consultations.slice(0, 2), assessments: [assessment(1, 25)] });
  assert.equal(hasDisplayableLongitudinalHistory(history), false);
  assert.equal(history.hasLongitudinalHistoryData, false);
  assert.equal(hasDisplayableLongitudinalHistory({ ...history, hasLongitudinalHistoryData: true }), false);
  const cognition = history.dimensions.find((item) => item.code === "cognicao")!;
  assert.equal(cognition.cells[1]!.status, "not-assessed");
  assert.deepEqual(capacityChartSegments(cognition), []);
  assert.deepEqual(capacityRecordedResults(cognition.cells[1]!), []);
});

test("reapplication enables the chart even after an unassessed return", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 25), assessment(3, 23)] });
  assert.equal(hasDisplayableLongitudinalHistory(history), true);
  assert.equal(history.hasLongitudinalHistoryData, true);
});

test("multiple scales in one visit and repeated unassessed returns do not enable a chart", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 25), { ...assessment(1, 20), scaleCode: "mmse" }] });
  assert.equal(hasDisplayableLongitudinalHistory(history), false);
});

test("two visits with assessments in different domains do not imply domain reapplication", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 25), { ...assessment(2, 5), scaleCode: "gds15" }] });
  assert.equal(hasDisplayableLongitudinalHistory(history), false);
});

test("first consultation and empty history do not display a longitudinal chart", () => {
  for (const [visits, assessments] of [[consultations.slice(0, 1), [assessment(1, 25)]], [consultations, []]] as const) {
    assert.equal(hasDisplayableLongitudinalHistory(buildCapacityDimensionHistory({ patientId: "synthetic", consultations: visits, assessments })), false);
  }
});

test("HTML and PDF share the gap segment and preserve score changes within the same category", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 25), assessment(3, 18)] });
  const cognition = history.dimensions.find((item) => item.code === "cognicao")!;
  assert.deepEqual(capacityChartSegments(cognition), [{ from: "c1", to: "c3", crossesUnassessedVisit: true }]);
  assert.match(capacityRecordedResults(cognition.cells[0]!)[0]!, /25/);
  assert.match(capacityRecordedResults(cognition.cells[2]!)[0]!, /18/);
  assert.equal(history.inflectionPoints.length, 0);
});

test("version change does not create a comparable segment", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 25), assessment(3, 18, "2")] });
  assert.deepEqual(capacityChartSegments(history.dimensions.find((item) => item.code === "cognicao")!), []);
});

test("colliding dates retain their temporal anchors and get distinct bounded markers", () => {
  const positions = capacityChartPositions([{ id: "a", occurredAt: "2026-01-01" }, { id: "b", occurredAt: "2026-01-01" }, { id: "c", occurredAt: "2026-01-02" }], 24, 676);
  assert.equal(positions[0]!.anchor, positions[1]!.anchor);
  assert.ok(positions[1]!.x > positions[0]!.x);
  assert.ok(positions.every((item) => item.x >= 24 && item.x <= 676));
  assert.equal(positions[2]!.anchor, 676);
});

test("zero remains measured and missing score is never replaced with zero", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 0), { ...assessment(2, 0), scoreNumeric: null }] });
  const cognition = history.dimensions.find((item) => item.code === "cognicao")!;
  assert.match(capacityRecordedResults(cognition.cells[0]!)[0]!, /: 0/);
  assert.match(capacityRecordedResults(cognition.cells[1]!)[0]!, /sem escore numérico/);
});


test("convergent instruments keep a visible segment without changing the clinical model", () => {
  const assessments = [1, 2, 3].flatMap((number) => ["lawton", "barthel"].map((scaleCode) => ({ ...assessment(number, 5), scaleCode })));
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments });
  const functionality = history.dimensions.find((item) => item.code === "funcionalidade")!;
  assert.equal(functionality.cells[0]!.comparabilityKey, undefined);
  assert.deepEqual(capacityChartSegments(functionality), [
    { from: "c1", to: "c2", crossesUnassessedVisit: false },
    { from: "c2", to: "c3", crossesUnassessedVisit: false },
  ]);
  assert.equal(history.inflectionPoints.length, 0);
  const changedVersion = structuredClone(functionality);
  changedVersion.cells[1]!.assessments[0]!.scaleVersion = "2";
  assert.deepEqual(capacityChartSegments(changedVersion), []);
  const changedSet = structuredClone(functionality);
  changedSet.cells[1]!.assessments.pop();
  assert.deepEqual(capacityChartSegments(changedSet), []);
});

test("discordant instruments remain disconnected and an unmeasured visit is dashed", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [1, 3].flatMap((number) => ["lawton", "barthel"].map((scaleCode) => ({ ...assessment(number, 5), scaleCode }))) });
  const functionality = history.dimensions.find((item) => item.code === "funcionalidade")!;
  assert.deepEqual(capacityChartSegments(functionality), [{ from: "c1", to: "c3", crossesUnassessedVisit: true }]);
  functionality.cells[2]!.status = "indeterminate";
  assert.deepEqual(capacityChartSegments(functionality), []);
});

test("only the five requested domains generate graphs, preserving sensory records", async () => {
  const { capacityChartDimensions } = await import("../../src/domain/capacity-chart-presentation.ts");
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [assessment(1, 25), { ...assessment(2, 1), scaleCode: "hearing", scaleVersion: "hearing-v1" }] });
  assert.deepEqual(capacityChartDimensions(history.dimensions).map((item) => item.code), ["funcionalidade", "cognicao", "locomocao", "psicologico", "vitalidade"]);
  assert.equal(history.dimensions.find((item) => item.code === "audicao")!.cells[1]!.assessments.length, 1);
  const sensoryOnly = buildCapacityDimensionHistory({ patientId: "synthetic", consultations, assessments: [{ ...assessment(2, 1), scaleCode: "hearing", scaleVersion: "hearing-v1" }] });
  assert.equal(hasDisplayableLongitudinalHistory({ ...sensoryOnly, dimensions: capacityChartDimensions(sensoryOnly.dimensions) }), false);
});
