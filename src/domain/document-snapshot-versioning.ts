export const DOCUMENT_SNAPSHOT_MAX_WRITE_ATTEMPTS = 3;

export type PrismaLikeWriteError = {
  code?: unknown;
};

/**
 * Snapshots are versioned inside a Serializable transaction. Concurrent
 * generation can surface either as a unique version collision (P2002) or as
 * a transaction write conflict/deadlock (P2034). Both are safe to retry only
 * because the complete transaction is replayed.
 */
export function isRetryableDocumentSnapshotWriteError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = (error as PrismaLikeWriteError).code;
  return code === "P2002" || code === "P2034";
}

export async function withDocumentSnapshotWriteRetry<T>(
  operation: (attempt: number) => Promise<T>,
  maxAttempts = DOCUMENT_SNAPSHOT_MAX_WRITE_ATTEMPTS,
): Promise<T> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error("Quantidade de tentativas para versionar documento deve ser positiva.");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      const canRetry = isRetryableDocumentSnapshotWriteError(error) && attempt < maxAttempts;
      if (!canRetry) throw error;
    }
  }

  throw new Error("Não foi possível versionar o documento após tentativas concorrentes.");
}
