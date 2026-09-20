import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_SLOW_REQUEST_MS = 10_000;

type ClinicalPerformanceContext = {
  requestId: string;
  route: string;
  startedAt: number;
  prismaOperations: number;
  prismaDurationMs: number;
  transactions: number;
  transactionDurationMs: number;
};

const storage = new AsyncLocalStorage<ClinicalPerformanceContext>();

function enabled(): boolean {
  return process.env.CLINICAL_PERFORMANCE_LOGGING === "1";
}

function durationMs(startedAt: number): number {
  return Math.round((performance.now() - startedAt) * 100) / 100;
}

function requestIdFrom(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && OPERATIONAL_REQUEST_ID.test(supplied) ? supplied : randomUUID();
}

function emit(context: ClinicalPerformanceContext, outcome: "success" | "error", statusCode?: number): void {
  if (!enabled()) return;
  const elapsedMs = durationMs(context.startedAt);
  const slowThreshold = Number(process.env.CLINICAL_PERFORMANCE_SLOW_REQUEST_MS ?? DEFAULT_SLOW_REQUEST_MS);
  console.info(JSON.stringify({
    event: "clinical.performance",
    requestId: context.requestId,
    route: context.route,
    durationMs: elapsedMs,
    prismaOperations: context.prismaOperations,
    prismaDurationMs: Math.round(context.prismaDurationMs * 100) / 100,
    transactions: context.transactions,
    transactionDurationMs: Math.round(context.transactionDurationMs * 100) / 100,
    outcome,
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(Number.isFinite(slowThreshold) && elapsedMs >= slowThreshold ? { slow: true } : {}),
  }));
}

export function observePrismaQuery(duration: number): void {
  const context = storage.getStore();
  if (!context) return;
  context.prismaOperations += 1;
  if (Number.isFinite(duration) && duration >= 0) context.prismaDurationMs += duration;
}

export function observeClinicalTransaction(duration: number): void {
  const context = storage.getStore();
  if (!context) return;
  context.transactions += 1;
  if (Number.isFinite(duration) && duration >= 0) context.transactionDurationMs += duration;
}

export async function measureClinicalTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    observeClinicalTransaction(performance.now() - startedAt);
  }
}

export async function withClinicalPerformance<T>(
  request: Request,
  route: string,
  operation: () => Promise<T>,
): Promise<T> {
  const context: ClinicalPerformanceContext = {
    requestId: requestIdFrom(request),
    route,
    startedAt: performance.now(),
    prismaOperations: 0,
    prismaDurationMs: 0,
    transactions: 0,
    transactionDurationMs: 0,
  };

  return storage.run(context, async () => {
    try {
      const result = await operation();
      emit(context, "success", result instanceof Response ? result.status : undefined);
      return result;
    } catch (error) {
      emit(context, "error");
      throw error;
    }
  });
}

export function clinicalPerformanceRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
