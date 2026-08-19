import assert from "node:assert/strict";
import test from "node:test";
import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../../src/server/auth/access-errors.ts";
import {
  MedicationStatusRequestError,
  medicationStatusHttpHandlers,
  parseMedicationStatusCommand,
} from "../../src/server/clinical/medication-status-http.ts";
import { MedicationStatusWriteError } from "../../src/server/clinical/medication-status-write-service.ts";

function postRequest(body: unknown): Request {
  return new Request("https://prontuario.test/api/consultations/c1/medications/status", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": "123e4567-e89b-42d3-a456-426614174000",
    },
    body: JSON.stringify(body),
  });
}

test("parser aceita somente medicamento e novo status válidos", () => {
  assert.deepEqual(parseMedicationStatusCommand({
    medicationId: "  med-1  ",
    newStatus: "SUSPENDED",
  }), {
    medicationId: "med-1",
    newStatus: "SUSPENDED",
  });

  for (const newStatus of ["ACTIVE", "SUSPENDED", "FINISHED"] as const) {
    assert.equal(parseMedicationStatusCommand({ medicationId: "med-1", newStatus }).newStatus, newStatus);
  }
});

test("parser rejeita qualquer campo controlado pelo servidor", () => {
  for (const forged of [
    { patientId: "patient-forged" },
    { consultationId: "consultation-forged" },
    { previousStatus: "ACTIVE" },
    { currentStatus: "ACTIVE" },
    { explicitStatusKnown: true },
  ]) {
    assert.throws(
      () => parseMedicationStatusCommand({
        medicationId: "med-1",
        newStatus: "SUSPENDED",
        ...forged,
      }),
      MedicationStatusRequestError,
    );
  }
});

test("parser rejeita status desconhecido e identificador inválido", () => {
  assert.throws(
    () => parseMedicationStatusCommand({ medicationId: "med-1", newStatus: "PAUSED" }),
    /Status de medicamento inválido/,
  );
  assert.throws(
    () => parseMedicationStatusCommand({ medicationId: "   ", newStatus: "ACTIVE" }),
    /Medicamento inválido/,
  );
  assert.throws(
    () => parseMedicationStatusCommand({ medicationId: "med\nforged", newStatus: "ACTIVE" }),
    /Medicamento inválido/,
  );
});

test("handler usa a consulta da rota e não aceita contexto de identidade do corpo", async () => {
  let received: unknown;
  const handlers = medicationStatusHttpHandlers(async (input) => {
    received = input;
    return { eventId: "event-1", ...input };
  });

  const response = await handlers.POST(postRequest({
    medicationId: "med-1",
    newStatus: "FINISHED",
  }), "consultation-from-route");

  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    consultationId: "consultation-from-route",
    medicationId: "med-1",
    newStatus: "FINISHED",
    requestId: "123e4567-e89b-42d3-a456-426614174000",
  });
  assert.equal("patientId" in (received as Record<string, unknown>), false);
  assert.equal("previousStatus" in (received as Record<string, unknown>), false);
});

test("fronteira preserva 401 e 403 sem expor detalhes", async () => {
  const unauthorized = medicationStatusHttpHandlers(async () => {
    throw new AuthenticationRequiredError();
  });
  const unauthorizedResponse = await unauthorized.POST(postRequest({
    medicationId: "med-1",
    newStatus: "ACTIVE",
  }), "c1");
  assert.equal(unauthorizedResponse.status, 401);
  assert.deepEqual(await unauthorizedResponse.json(), {
    code: "AUTHENTICATION_REQUIRED",
    message: "Autenticação obrigatória.",
  });

  const forbidden = medicationStatusHttpHandlers(async () => {
    throw new AccessForbiddenError();
  });
  const forbiddenResponse = await forbidden.POST(postRequest({
    medicationId: "med-1",
    newStatus: "ACTIVE",
  }), "c1");
  assert.equal(forbiddenResponse.status, 403);
  assert.deepEqual(await forbiddenResponse.json(), {
    code: "ACCESS_FORBIDDEN",
    message: "Acesso não autorizado.",
  });
});

test("erros de contexto usam 404 e conflitos seguros usam 409", async () => {
  const missing = medicationStatusHttpHandlers(async () => {
    throw new MedicationStatusWriteError("MEDICATION_NOT_FOUND", "Medicamento não encontrado para o paciente desta consulta.");
  });
  const missingResponse = await missing.POST(postRequest({
    medicationId: "med-1",
    newStatus: "ACTIVE",
  }), "c1");
  assert.equal(missingResponse.status, 404);

  const conflict = medicationStatusHttpHandlers(async () => {
    throw new MedicationStatusWriteError(
      "RETROSPECTIVE_STATUS_WRITE_BLOCKED",
      "O status atual do medicamento não pode ser alterado a partir de uma consulta anterior. Registre a mudança na consulta mais recente.",
    );
  });
  const conflictResponse = await conflict.POST(postRequest({
    medicationId: "med-1",
    newStatus: "SUSPENDED",
  }), "c1");
  assert.equal(conflictResponse.status, 409);
  assert.equal((await conflictResponse.json()).code, "RETROSPECTIVE_STATUS_WRITE_BLOCKED");
});

test("erro interno não vaza mensagem de banco ou infraestrutura", async () => {
  const secret = "Prisma database password secret";
  const handlers = medicationStatusHttpHandlers(async () => {
    throw new Error(secret);
  });
  const response = await handlers.POST(postRequest({
    medicationId: "med-1",
    newStatus: "ACTIVE",
  }), "c1");
  const raw = await response.text();

  assert.equal(response.status, 500);
  assert.doesNotMatch(raw, new RegExp(secret));
  assert.deepEqual(JSON.parse(raw), {
    code: "MEDICATION_STATUS_UPDATE_FAILED",
    message: "Não foi possível atualizar o status do medicamento.",
  });
});
