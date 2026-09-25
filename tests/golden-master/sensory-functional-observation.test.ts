import assert from "node:assert/strict";
import test from "node:test";
import { SENSORY_OBSERVATION_STATUS } from "../../src/domain/sensory-functional-observation.ts";
import {
  parseSensoryObservationSave,
  sensoryObservationHttpHandlers,
  SensoryObservationRequestError,
} from "../../src/server/clinical/sensory-functional-observation-http.ts";

test("observação avaliada preserva a indicação e o uso de lentes", () => {
  assert.deepEqual(parseSensoryObservationSave({
    expectedRevision: 2,
    assessmentStatus: SENSORY_OBSERVATION_STATUS.ASSESSED,
    multisensoryDysfunction: true,
    usesCorrectiveLenses: false,
  }), {
    expectedRevision: 2,
    values: {
      assessmentStatus: "ASSESSED",
      multisensoryDysfunction: true,
      usesCorrectiveLenses: false,
    },
  });
});

test("situação não avaliada nunca persiste achados marcados em rascunho", () => {
  assert.deepEqual(parseSensoryObservationSave({
    expectedRevision: 0,
    assessmentStatus: SENSORY_OBSERVATION_STATUS.NOT_ASSESSED,
    multisensoryDysfunction: true,
    usesCorrectiveLenses: true,
  }), {
    expectedRevision: 0,
    values: {
      assessmentStatus: "NOT_ASSESSED",
      multisensoryDysfunction: false,
      usesCorrectiveLenses: false,
    },
  });
});

test("entrada inválida ou campos adicionais são rejeitados", () => {
  assert.throws(() => parseSensoryObservationSave({
    expectedRevision: -1,
    assessmentStatus: "ASSESSED",
    multisensoryDysfunction: false,
    usesCorrectiveLenses: false,
  }), SensoryObservationRequestError);
  assert.throws(() => parseSensoryObservationSave({
    expectedRevision: 0,
    assessmentStatus: "ASSESSED",
    multisensoryDysfunction: false,
    usesCorrectiveLenses: false,
    patientId: "outro-paciente",
  }), SensoryObservationRequestError);
});

test("endpoint associa a observação somente à consulta informada e respeita revisão", async () => {
  const calls: unknown[] = [];
  const handlers = sensoryObservationHttpHandlers({
    async getSensoryObservationWorkspace(consultationId) {
      calls.push(["get", consultationId]);
      return { consultationId, saved: false };
    },
    async saveSensoryObservation(input) {
      calls.push(["save", input]);
      return { consultationId: input.consultationId, revision: input.expectedRevision + 1 };
    },
  });

  const get = await handlers.GET("consultation-target");
  assert.equal(get.status, 200);
  assert.deepEqual(await get.json(), { consultationId: "consultation-target", saved: false });

  const save = await handlers.PUT(new Request("http://localhost/api", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      expectedRevision: 4,
      assessmentStatus: "ASSESSED",
      multisensoryDysfunction: true,
      usesCorrectiveLenses: true,
    }),
  }), "consultation-target");
  assert.equal(save.status, 200);
  assert.deepEqual(await save.json(), { consultationId: "consultation-target", revision: 5 });
  assert.deepEqual(calls[0], ["get", "consultation-target"]);
  assert.deepEqual(calls[1], ["save", {
    consultationId: "consultation-target",
    expectedRevision: 4,
    values: {
      assessmentStatus: "ASSESSED",
      multisensoryDysfunction: true,
      usesCorrectiveLenses: true,
    },
    requestId: undefined,
  }]);
});
