import assert from "node:assert/strict";
import test from "node:test";

import { isRetryableDocumentSnapshotWriteError } from "../../src/domain/document-snapshot-versioning.ts";

test("retries unique version collisions", () => {
  assert.equal(isRetryableDocumentSnapshotWriteError({ code: "P2002" }), true);
});

test("retries Serializable transaction conflicts", () => {
  assert.equal(isRetryableDocumentSnapshotWriteError({ code: "P2034" }), true);
});

test("does not retry unrelated database failures", () => {
  assert.equal(isRetryableDocumentSnapshotWriteError({ code: "P2025" }), false);
});

test("does not retry non-Prisma errors", () => {
  assert.equal(isRetryableDocumentSnapshotWriteError(new Error("falha")), false);
  assert.equal(isRetryableDocumentSnapshotWriteError(null), false);
});
