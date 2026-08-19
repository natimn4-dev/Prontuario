import assert from "node:assert/strict";
import test from "node:test";
import { buildChangeSummaryDashboard } from "../../src/domain/change-summary-dashboard.ts";

const summary = {
  headline: "Resumo sintético",
  narrative: [],
  counts: {
    favorable: 2,
    stable: 3,
    unfavorable: 1,
    notComparable: 4,
    insufficientData: 5,
    urgentAlerts: 1,
  },
};

test("dashboard longitudinal expõe todos os estados calculados sem colapsar comparabilidade", () => {
  const cards = buildChangeSummaryDashboard(summary);

  assert.deepEqual(
    cards.map((card) => [card.key, card.value]),
    [
      ["unfavorable", 1],
      ["favorable", 2],
      ["stable", 3],
      ["notComparable", 4],
      ["insufficientData", 5],
      ["urgentAlerts", 1],
    ],
  );
});

test("dashboard não apresenta não comparável ou dados insuficientes como estabilidade", () => {
  const cards = buildChangeSummaryDashboard(summary);
  const stable = cards.find((card) => card.key === "stable");
  const notComparable = cards.find((card) => card.key === "notComparable");
  const insufficientData = cards.find((card) => card.key === "insufficientData");

  assert.equal(stable?.value, 3);
  assert.equal(notComparable?.value, 4);
  assert.equal(insufficientData?.value, 5);
  assert.equal(notComparable?.tone, "neutral");
  assert.equal(insufficientData?.tone, "neutral");
  assert.match(notComparable?.explanation ?? "", /não devem ser interpretadas/i);
  assert.match(insufficientData?.explanation ?? "", /sem dados suficientes/i);
});
