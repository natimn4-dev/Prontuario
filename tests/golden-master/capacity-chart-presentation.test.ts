import assert from "node:assert/strict";
import test from "node:test";
import { buildCapacityDimensionHistory, hasDisplayableLongitudinalHistory } from "../../src/domain/capacity-dimension-history.ts";
import { capacityChartPositions, capacityChartSegments, capacityRecordedResults } from "../../src/domain/capacity-chart-presentation.ts";

const consultations = [1, 2, 3].map((number) => ({ id: `c${number}`, patientId: "synthetic", occurredAt: `2026-0${number}-01` }));
const assessment = (number: number, score: number, version = "1") => ({ patientId: "synthetic", consultationId: `c${number}`, scaleCode: "moca", scaleVersion: version, scoreNumeric: score, clinicalColor: "amarelo" as const, appliedAt: `2026-0${number}-01` });

test("second consultation preserves the first measured result without fabricating a second one", () => {
  const history = buildCapacityDimensionHistory({ patientId: "synthetic", consultations: consultations.slice(0, 2), assessments: [assessment(1, 25)] });
  assert.equal(hasDisplayableLongitudinalHistory(history), true);
  const cognition = history.dimensions.find((item) => item.code === "cognicao")!;
  assert.equal(cognition.cells[1]!.status, "not-assessed");
  assert.deepEqual(capacityChartSegments(cognition), []);
  assert.deepEqual(capacityRecordedResults(cognition.cells[1]!), []);
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
