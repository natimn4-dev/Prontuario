import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

type Operation = {
  name: string;
  method: "GET" | "PUT" | "POST";
  path: string;
  fixtureKey?: string;
  safeRead?: boolean;
  requiresUi?: boolean;
};

type Fixture = Record<string, unknown>;

const baseUrl = (process.env.CLINICAL_PERFORMANCE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const consultationId = process.env.CLINICAL_PERFORMANCE_CONSULTATION_ID;
const repeats = Math.max(1, Number.parseInt(process.env.CLINICAL_PERFORMANCE_REPEATS ?? "3", 10) || 3);
const allowWrites = process.env.CLINICAL_PERFORMANCE_ALLOW_WRITES === "1";
const fixturePath = process.env.CLINICAL_PERFORMANCE_WRITE_FIXTURE;
const e2eUser = process.env.CLINICAL_PERFORMANCE_USER_EMAIL ?? "synthetic-performance@example.invalid";
const e2eSecret = process.env.E2E_AUTH_SECRET;

if (!consultationId) {
  throw new Error("Defina CLINICAL_PERFORMANCE_CONSULTATION_ID para medir uma consulta sintética.");
}

const operations: Operation[] = [
  { name: "abrir consulta", method: "GET", path: `/consultations/${consultationId}`, safeRead: true },
  { name: "carregar SOAP", method: "GET", path: `/api/consultations/${consultationId}/note`, safeRead: true },
  { name: "abrir Problemas", method: "GET", path: `/api/consultations/${consultationId}/problems`, safeRead: true },
  { name: "abrir Medicamentos", method: "GET", path: `/api/consultations/${consultationId}/medications`, safeRead: true },
  { name: "abrir Escalas", method: "GET", path: `/api/consultations/${consultationId}/scales/workspace`, safeRead: true },
  { name: "abrir Alimentação", method: "GET", path: `/api/consultations/${consultationId}/dietary-assessment`, safeRead: true },
  { name: "abrir Demência", method: "GET", path: `/api/consultations/${consultationId}/dementia-assessment`, safeRead: true },
  { name: "salvar SOAP", method: "PUT", path: `/api/consultations/${consultationId}/note`, fixtureKey: "salvar SOAP" },
  { name: "salvar Problema", method: "POST", path: `/api/consultations/${consultationId}/problems`, fixtureKey: "salvar Problema" },
  { name: "salvar Medicamento", method: "POST", path: `/api/consultations/${consultationId}/medications`, fixtureKey: "salvar Medicamento" },
  { name: "salvar Escala", method: "POST", path: `/api/consultations/${consultationId}/scales/freitas-core`, fixtureKey: "salvar Escala" },
  { name: "salvar Alimentação", method: "PUT", path: `/api/consultations/${consultationId}/dietary-assessment`, fixtureKey: "salvar Alimentação" },
  { name: "abrir Relatório", method: "GET", path: `/consultations/${consultationId}`, requiresUi: true },
  { name: "finalizar consulta", method: "GET", path: `/consultations/${consultationId}`, requiresUi: true },
];

function urlFor(path: string): string {
  return `${baseUrl}${path}`;
}

function headers() {
  const result = new Headers({
    accept: "application/json, text/html",
    "x-request-id": randomUUID(),
    "x-prontuario-e2e-user": e2eUser,
  });
  if (e2eSecret) result.set("x-prontuario-e2e-secret", e2eSecret);
  return result;
}

async function loadFixture(): Promise<Fixture> {
  if (!fixturePath) return {};
  const parsed = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Fixture de performance inválido.");
  return parsed as Fixture;
}

async function measure(operation: Operation, fixture: Fixture): Promise<{ status: number; durationMs: number }> {
  const init: RequestInit = { method: operation.method, headers: headers(), cache: "no-store" };
  if (operation.method !== "GET") {
    init.headers = new Headers({ ...Object.fromEntries(headers()), "content-type": "application/json" });
    init.body = JSON.stringify(fixture[operation.fixtureKey ?? operation.name]);
  }
  const startedAt = performance.now();
  const response = await fetch(urlFor(operation.path), init);
  await response.arrayBuffer();
  return {
    status: response.status,
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
  };
}

const fixture = await loadFixture();
console.log(JSON.stringify({
  event: "clinical.performance.baseline",
  baseUrl,
  repeats,
  writesEnabled: allowWrites && Boolean(fixturePath),
  note: "Somente duração, status HTTP e rótulos operacionais; nenhum corpo de resposta é impresso.",
}));

for (const operation of operations) {
  if (operation.requiresUi || (!operation.safeRead && (!allowWrites || !fixturePath || fixture[operation.fixtureKey ?? operation.name] === undefined))) {
    console.log(JSON.stringify({ operation: operation.name, status: "SKIPPED", reason: operation.requiresUi ? "requires_authenticated_browser_flow" : "write_requires_synthetic_fixture_and_CLINICAL_PERFORMANCE_ALLOW_WRITES=1" }));
    continue;
  }

  const samples: number[] = [];
  const statuses: number[] = [];
  for (let index = 0; index < repeats; index += 1) {
    const result = await measure(operation, fixture);
    samples.push(result.durationMs);
    statuses.push(result.status);
    console.log(JSON.stringify({ operation: operation.name, sample: index + 1, statusCode: result.status, durationMs: result.durationMs }));
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (fraction: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? null;
  console.log(JSON.stringify({
    operation: operation.name,
    status: "MEASURED",
    statusCodes: [...new Set(statuses)],
    samples: samples.length,
    p50Ms: percentile(0.5),
    p95Ms: percentile(0.95),
    minMs: sorted[0] ?? null,
    maxMs: sorted.at(-1) ?? null,
  }));
}
