import assert from "node:assert/strict";
import test from "node:test";
import {
  isRetryableDocumentSnapshotWriteError,
  withDocumentSnapshotWriteRetry,
} from "../../src/domain/document-snapshot-versioning.ts";

test("classifica colisão de versão e conflito serializável como repetíveis", () => {
  assert.equal(isRetryableDocumentSnapshotWriteError({ code: "P2002" }), true);
  assert.equal(isRetryableDocumentSnapshotWriteError({ code: "P2034" }), true);
});

test("não repete falhas de banco não reconhecidas nem erros genéricos", () => {
  assert.equal(isRetryableDocumentSnapshotWriteError({ code: "P2025" }), false);
  assert.equal(isRetryableDocumentSnapshotWriteError(new Error("falha")), false);
  assert.equal(isRetryableDocumentSnapshotWriteError(null), false);
});

test("reexecuta a operação inteira até obter sucesso dentro do limite", async () => {
  const attempts: number[] = [];
  const result = await withDocumentSnapshotWriteRetry(async (attempt) => {
    attempts.push(attempt);
    if (attempt === 1) throw { code: "P2034" };
    if (attempt === 2) throw { code: "P2002" };
    return "snapshot-versioned";
  });

  assert.equal(result, "snapshot-versioned");
  assert.deepEqual(attempts, [1, 2, 3]);
});

test("erro não repetível é propagado sem executar nova tentativa", async () => {
  const error = { code: "P2025", marker: "synthetic" };
  let attempts = 0;

  await assert.rejects(
    withDocumentSnapshotWriteRetry(async () => {
      attempts += 1;
      throw error;
    }),
    (caught) => caught === error,
  );
  assert.equal(attempts, 1);
});

test("ao atingir o limite, propaga o último conflito em vez de ocultá-lo", async () => {
  const errors = [{ code: "P2034", attempt: 1 }, { code: "P2034", attempt: 2 }];
  let calls = 0;

  await assert.rejects(
    withDocumentSnapshotWriteRetry(async () => {
      const error = errors[calls] ?? errors[errors.length - 1]!;
      calls += 1;
      throw error;
    }, 2),
    (caught) => caught === errors[1],
  );
  assert.equal(calls, 2);
});

test("quantidade inválida de tentativas falha antes de acessar persistência", async () => {
  let called = false;
  await assert.rejects(
    withDocumentSnapshotWriteRetry(async () => {
      called = true;
      return "unexpected";
    }, 0),
    /Quantidade de tentativas/,
  );
  assert.equal(called, false);
});
