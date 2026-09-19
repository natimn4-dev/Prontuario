import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { isCiE2EAuthEnvironment } from "../src/domain/security/ci-e2e-auth-policy.ts";

function databaseConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL não configurada.");
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\\//, ""),
    connectionLimit: 2,
  };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseConfig()) });
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const secret = process.env.E2E_AUTH_SECRET ?? "";
const email = "ci-e2e-dietary@example.com";
const userId = "ci-e2e-user-dietary";
const assignedPatientId = "ci-e2e-patient-assigned";
const unassignedPatientId = "ci-e2e-patient-unassigned";
const assignedConsultationId = "ci-e2e-consultation-assigned";
const unassignedConsultationId = "ci-e2e-consultation-unassigned";

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function cleanup() {
  await prisma.auditEvent.deleteMany({ where: { userId } });
  await prisma.patientUserAssignment.deleteMany({
    where: { OR: [{ userId }, { assignedByUserId: userId }] },
  });
  await prisma.consultation.deleteMany({
    where: { id: { in: [assignedConsultationId, unassignedConsultationId] } },
  });
  await prisma.patient.deleteMany({
    where: { id: { in: [assignedPatientId, unassignedPatientId] } },
  });
  await prisma.user.deleteMany({ where: { id: userId } });
}

async function seed() {
  await cleanup();

  await prisma.user.create({
    data: {
      id: userId,
      email,
      emailVerified: true,
      name: "Usuária Sintética E2E",
      role: "PHYSICIAN",
      active: true,
      professionalRole: "MEDICO",
      patientAccessScope: "ASSIGNED_PATIENTS",
      canManageUsers: false,
      accessManaged: true,
    },
  });

  await prisma.patient.createMany({
    data: [
      {
        id: assignedPatientId,
        fullName: "Paciente Sintético E2E A",
        normalizedFullName: "paciente sintetico e2e a",
        identityFingerprint: fingerprint("ci-e2e-patient-a"),
      },
      {
        id: unassignedPatientId,
        fullName: "Paciente Sintético E2E B",
        normalizedFullName: "paciente sintetico e2e b",
        identityFingerprint: fingerprint("ci-e2e-patient-b"),
      },
    ],
  });

  await prisma.consultation.createMany({
    data: [
      {
        id: assignedConsultationId,
        patientId: assignedPatientId,
        physicianId: userId,
        type: "FOLLOW_UP",
        status: "DRAFT",
        occurredAt: new Date("2026-01-15T12:00:00.000Z"),
      },
      {
        id: unassignedConsultationId,
        patientId: unassignedPatientId,
        physicianId: userId,
        type: "FOLLOW_UP",
        status: "DRAFT",
        occurredAt: new Date("2026-01-15T12:30:00.000Z"),
      },
    ],
  });

  await prisma.patientUserAssignment.create({
    data: {
      userId,
      patientId: assignedPatientId,
      assignedByUserId: userId,
      active: true,
    },
  });
}

async function request(path: string, authenticated: boolean) {
  const headers = new Headers({ "cache-control": "no-cache" });
  if (authenticated) {
    headers.set("x-prontuario-e2e-user", email);
    headers.set("x-prontuario-e2e-secret", secret);
  }
  return fetch(new URL(path, baseUrl), {
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
}

async function main() {
  assert.equal(isCiE2EAuthEnvironment(), true, "O smoke E2E recusou o ambiente: a trava de segurança não foi satisfeita.");
  assert.ok(secret.length >= 32, "E2E_AUTH_SECRET ausente ou curta.");
  assert.match(baseUrl, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/);

  await seed();

  const anonymous = await request(
    `/api/consultations/${assignedConsultationId}/dietary-assessment`,
    false,
  );
  assert.equal(anonymous.status, 401, "A rota clínica deveria exigir autenticação.");

  const allowed = await request(
    `/api/consultations/${assignedConsultationId}/dietary-assessment`,
    true,
  );
  assert.equal(allowed.status, 200, `A consulta sintética atribuída falhou com HTTP ${allowed.status}.`);
  const payload = await allowed.json() as { consultationId?: string; assessment?: unknown };
  assert.equal(payload.consultationId, assignedConsultationId);
  assert.equal(payload.assessment, null);

  const denied = await request(
    `/api/consultations/${unassignedConsultationId}/dietary-assessment`,
    true,
  );
  assert.equal(denied.status, 403, "O smoke deve provar isolamento de paciente para usuário ASSIGNED_PATIENTS.");

  const deniedBody = await denied.json() as { code?: string };
  assert.equal(deniedBody.code, "ACCESS_FORBIDDEN");

  const audit = await prisma.auditEvent.findFirst({
    where: {
      userId,
      entityType: "Patient",
      entityId: unassignedPatientId,
      action: "patient.access.denied_unassigned",
      outcome: "denied",
    },
  });
  assert.ok(audit, "A tentativa de acesso ao paciente não atribuído precisa deixar trilha de auditoria.");

  console.log("AUTHENTICATED_CI_E2E=SMOKE_OK");
  console.log("- usuário sintético autenticado exclusivamente pelo contexto de CI");
  console.log("- MySQL efêmero validado");
  console.log("- rota alimentar protegida retornou 401 sem autenticação");
  console.log("- paciente atribuído retornou 200");
  console.log("- paciente não atribuído retornou 403 e gerou auditoria");
}

try {
  await main();
} finally {
  await cleanup().catch(() => undefined);
  await prisma.$disconnect();
}
