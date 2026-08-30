import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, type Prisma } from "../../src/generated/prisma/client.ts";
import { emptyAdvanceDirectiveTopics } from "../../src/domain/advance-directives.ts";
import { advanceDirectiveWorkspaceContext } from "../../src/server/clinical/advance-directives-workspace-context.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;

function testClient() {
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL não configurada.");
  const url = new URL(databaseUrl);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 4,
    }),
  });
}

test("diretivas preservam versões, recarregamento e horizonte longitudinal do paciente", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const userId = `user-ad-${suffix}`;
  const patientAId = `patient-ad-a-${suffix}`;
  const patientBId = `patient-ad-b-${suffix}`;
  const consultationA1Id = `consultation-ad-a1-${suffix}`;
  const consultationA2Id = `consultation-ad-a2-${suffix}`;
  const consultationBId = `consultation-ad-b-${suffix}`;
  const topics = emptyAdvanceDirectiveTopics();

  try {
    await client.user.create({ data: { id: userId, email: `ad-${suffix}@example.test`, name: "Médica Teste" } });
    await client.patient.createMany({ data: [
      { id: patientAId, fullName: "Paciente A", normalizedFullName: `paciente a ${suffix}`, identityFingerprint: `ad-a-${suffix}` },
      { id: patientBId, fullName: "Paciente B", normalizedFullName: `paciente b ${suffix}`, identityFingerprint: `ad-b-${suffix}` },
    ] });
    await client.consultation.createMany({ data: [
      { id: consultationA1Id, patientId: patientAId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date("2026-08-01T12:00:00.000Z") },
      { id: consultationA2Id, patientId: patientAId, physicianId: userId, type: "FOLLOW_UP", occurredAt: new Date("2026-08-20T12:00:00.000Z") },
      { id: consultationBId, patientId: patientBId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date("2026-08-10T12:00:00.000Z") },
    ] });

    const shared = {
      recordedById: userId,
      protocolVersion: "advance-directives-conversation-2026-08-v1",
      priorities: [],
      topics: topics as unknown as Prisma.InputJsonValue,
      documentStatus: "NOT_INFORMED",
      reviewTrigger: "WHEN_PERSON_WANTS_OR_CONDITION_CHANGES",
    };
    await client.advanceDirectiveRecord.createMany({ data: [
      { ...shared, patientId: patientAId, consultationId: consultationA1Id, version: 1, disposition: "WANTS_TO_TALK", whatMatters: "Registro original" },
      { ...shared, patientId: patientAId, consultationId: consultationA1Id, version: 2, disposition: "WANTS_TO_TALK", whatMatters: "Registro revisado" },
      { ...shared, patientId: patientAId, consultationId: consultationA2Id, version: 1, disposition: "PREFERS_LATER" },
      { ...shared, patientId: patientBId, consultationId: consultationBId, version: 1, disposition: "DECLINED", whatMatters: "Outro paciente" },
    ] });

    const first = await client.$transaction((tx) => advanceDirectiveWorkspaceContext(tx, consultationA1Id));
    assert.equal(first.latestVersion, 2);
    assert.equal(first.current?.whatMatters, "Registro revisado");
    assert.deepEqual(first.history.map((record) => record.version), [2, 1]);
    assert.doesNotMatch(JSON.stringify(first), /Outro paciente|PREFERS_LATER/);

    const reloaded = await client.$transaction((tx) => advanceDirectiveWorkspaceContext(tx, consultationA2Id));
    assert.equal(reloaded.current?.disposition, "PREFERS_LATER");
    assert.equal(reloaded.history.length, 3);
    assert.ok(reloaded.history.some((record) => record.whatMatters === "Registro original"));

    await assert.rejects(client.advanceDirectiveRecord.create({ data: {
      ...shared,
      patientId: patientAId,
      consultationId: consultationA1Id,
      version: 2,
      disposition: "DECLINED",
    } }));
    await assert.rejects(client.advanceDirectiveRecord.create({ data: {
      ...shared,
      patientId: patientAId,
      consultationId: consultationBId,
      version: 2,
      disposition: "DECLINED",
    } }));
  } finally {
    await client.advanceDirectiveRecord.deleteMany({ where: { recordedById: userId } });
    await client.consultation.deleteMany({ where: { id: { in: [consultationA1Id, consultationA2Id, consultationBId] } } });
    await client.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await client.user.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
});
