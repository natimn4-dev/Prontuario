export type PrismaLikeError = {
  code?: unknown;
};

/**
 * Document snapshot versioning runs inside a Serializable transaction.
 * A concurrent writer may surface either as a unique-version collision
 * (P2002) or as a transaction write conflict/deadlock (P2034).
 * Both are safe to retry because the whole transaction is replayed.
 */
export function isRetryableDocumentSnapshotWriteError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = (error as PrismaLikeError).code;
  return code === "P2002" || code === "P2034";
}
