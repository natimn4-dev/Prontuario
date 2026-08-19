import assert from "node:assert/strict";
import test from "node:test";
import { urgentAlertsForCurrentConsultation } from "../../src/domain/consultation-urgent-alerts.ts";

test("finalização usa apenas a reaplicação mais recente de cada escala", () => {
  const alerts = urgentAlertsForCurrentConsultation([
    {
      id: "cornell-1",
      scaleCode: "cornell",
      answers: { co16: 2 },
      score: 10,
      appliedAt: "2026-08-19T10:00:00.000Z",
    },
    {
      id: "cornell-2",
      scaleCode: "cornell",
      answers: { co16: 0 },
      score: 8,
      appliedAt: "2026-08-19T11:00:00.000Z",
    },
  ]);

  assert.deepEqual(alerts, []);
});

test("CAM positivo atual permanece alerta urgente derivado pelo servidor", () => {
  const alerts = urgentAlertsForCurrentConsultation([
    {
      id: "cam-current",
      scaleCode: "cam",
      score: 1,
      scoreText: "Positivo",
      appliedAt: "2026-08-19T11:00:00.000Z",
    },
  ]);

  assert.deepEqual(alerts.map((alert) => alert.code), ["cam-positive-delirium"]);
});

test("reaplicação CAM negativa posterior remove alerta urgente antigo da mesma consulta", () => {
  const alerts = urgentAlertsForCurrentConsultation([
    {
      id: "cam-1",
      scaleCode: "cam",
      score: 1,
      scoreText: "Positivo",
      appliedAt: "2026-08-19T10:00:00.000Z",
    },
    {
      id: "cam-2",
      scaleCode: "cam",
      score: 0,
      scoreText: "Negativo",
      appliedAt: "2026-08-19T11:00:00.000Z",
    },
  ]);

  assert.deepEqual(alerts, []);
});

test("empate temporal usa id como desempate determinístico", () => {
  const alerts = urgentAlertsForCurrentConsultation([
    {
      id: "cam-a",
      scaleCode: "cam",
      score: 1,
      scoreText: "Positivo",
      appliedAt: "2026-08-19T11:00:00.000Z",
    },
    {
      id: "cam-b",
      scaleCode: "cam",
      score: 0,
      scoreText: "Negativo",
      appliedAt: "2026-08-19T11:00:00.000Z",
    },
  ]);

  assert.deepEqual(alerts, []);
});
