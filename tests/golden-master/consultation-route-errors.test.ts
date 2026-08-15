import assert from "node:assert/strict";
import test from "node:test";
import {
  AccessForbiddenError,
  AuthenticationRequiredError,
} from "../../src/server/auth/access-errors.ts";
import {
  ConsultationCreationError,
  ConsultationCreationRequestError,
} from "../../src/server/clinical/create-consultation-service.ts";
import { createConsultationPostHandler } from "../../src/server/clinical/create-consultation-http.ts";

function request(body: unknown = {
  patientId: "patient-synthetic",
  expectedBaselineConsultationId: null,
}): Request {
  return new Request("https://prontuario.test/api/consultations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": "123e4567-e89b-42d3-a456-426614174000",
    },
    body: JSON.stringify(body),
  });
}

async function bodyOf(response: Response) {
  return await response.json() as { code?: string; message?: string; consultationId?: string };
}

test("sessão ausente retorna 401 seguro", async () => {
  const handler = createConsultationPostHandler(async () => {
    throw new AuthenticationRequiredError();
  });
  const response = await handler(request());

  assert.equal(response.status, 401);
  assert.deepEqual(await bodyOf(response), {
    code: "AUTHENTICATION_REQUIRED",
    message: "Autenticação obrigatória.",
  });
});

test("permissão insuficiente retorna 403 seguro", async () => {
  const handler = createConsultationPostHandler(async () => {
    throw new AccessForbiddenError();
  });
  const response = await handler(request());

  assert.equal(response.status, 403);
  assert.deepEqual(await bodyOf(response), {
    code: "ACCESS_FORBIDDEN",
    message: "Acesso não autorizado.",
  });
});

test("usuário inativo ou fora da allowlist usa a mesma fronteira 403", async () => {
  for (const reason of ["inactive", "not-allowlisted"] as const) {
    const handler = createConsultationPostHandler(async () => {
      void reason;
      throw new AccessForbiddenError();
    });
    const response = await handler(request());
    const body = await bodyOf(response);

    assert.equal(response.status, 403);
    assert.equal(body.code, "ACCESS_FORBIDDEN");
    assert.equal(body.message, "Acesso não autorizado.");
  }
});

test("erro interno nunca devolve mensagem de Prisma ou infraestrutura", async () => {
  const secret = "Prisma database password secret";
  const handler = createConsultationPostHandler(async () => {
    throw new Error(secret);
  });
  const response = await handler(request());
  const rawBody = await response.text();

  assert.equal(response.status, 500);
  assert.doesNotMatch(rawBody, new RegExp(secret));
  assert.deepEqual(JSON.parse(rawBody), {
    code: "CONSULTATION_CREATE_FAILED",
    message: "Não foi possível criar a consulta.",
  });
});

test("erros de domínio preservam códigos e status públicos", async () => {
  const cases = [
    ["PATIENT_NOT_FOUND", 404],
    ["INITIAL_ALREADY_EXISTS", 409],
    ["FOLLOW_UP_REQUIRES_BASELINE", 409],
    ["BASELINE_CONCURRENTLY_CREATED", 409],
    ["PATIENT_STATE_CHANGED", 409],
  ] as const;

  for (const [code, status] of cases) {
    const handler = createConsultationPostHandler(async () => {
      throw new ConsultationCreationError(code, `safe-${code}`);
    });
    const response = await handler(request());
    const body = await bodyOf(response);

    assert.equal(response.status, status);
    assert.equal(body.code, code);
    assert.equal(body.message, `safe-${code}`);
  }
});

test("erro de requisição permanece 400 com mensagem segura", async () => {
  const handler = createConsultationPostHandler(async () => {
    throw new ConsultationCreationRequestError("Requisição inválida.");
  });
  const response = await handler(request());

  assert.equal(response.status, 400);
  assert.deepEqual(await bodyOf(response), {
    code: "INVALID_REQUEST",
    message: "Requisição inválida.",
  });
});
