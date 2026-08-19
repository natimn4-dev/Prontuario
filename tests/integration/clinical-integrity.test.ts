import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

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

test("índice de identidade permite somente um cadastro concorrente padrão", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const fingerprint = `paciente concorrente ${suffix}::1940-01-01`;
  const data = {
    fullName: `Paciente Concorrente ${suffix}`,
    normalizedFullName: `paciente concorrente ${suffix}`,
    identityFingerprint: fingerprint,
    birthDate: new Date("1940-01-01T12:00:00.000Z"),
  };
  try {
    const attempts = await Promise.allSettled([
      client.patient.create({ data }),
      client.patient.create({ data }),
    ]);
    assert.equal(attempts.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((result) => result.status === "rejected").length, 1);
  } finally {
    await client.patient.deleteMany({ where: { identityFingerprint: fingerprint } });
    await client.$disconnect();
  }
});

test("chaves compostas bloqueiam mistura entre pacientes", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const userId = `u-${suffix}`;
  const patientAId = `pa-${suffix}`;
  const patientBId = `pb-${suffix}`;
  const consultationAId = `ca-${suffix}`;
  const consultationBId = `cb-${suffix}`;
  const problemId = `problem-${suffix}`;
  const medicationAId = `med-a-${suffix}`;
  const medicationBId = `med-b-${suffix}`;
  try {
    await client.user.create({ data: { id: userId, email: `${suffix}@example.test`, name: "Médica Teste" } });
    await client.patient.createMany({ data: [
      { id: patientAId, fullName: "Paciente A", normalizedFullName: `paciente a ${suffix}`, identityFingerprint: `a-${suffix}` },
      { id: patientBId, fullName: "Paciente B", normalizedFullName: `paciente b ${suffix}`, identityFingerprint: `b-${suffix}` },
    ] });
    await client.consultation.createMany({ data: [
      { id: consultationAId, patientId: patientAId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date() },
      { id: consultationBId, patientId: patientBId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date() },
    ] });
    await client.clinicalProblem.create({ data: {
      id: problemId, patientId: patientAId, originConsultationId: consultationAId,
      type: "CLINICAL", title: "Problema teste",
    } });
    await client.medication.createMany({ data: [
      { id: medicationAId, patientId: patientAId, name: "Medicamento teste A" },
      { id: medicationBId, patientId: patientBId, name: "Medicamento teste B" },
    ] });

    await client.medicationStatusEvent.create({ data: {
      patientId: patientAId,
      medicationId: medicationAId,
      consultationId: consultationAId,
      previousStatus: null,
      newStatus: "ACTIVE",
    } });

    await assert.rejects(client.scaleAssessment.create({ data: {
      patientId: patientAId, consultationId: consultationBId,
      scaleCode: "katz", scaleVersion: "1.0", answers: {},
    } }));
    await assert.rejects(client.medicationRegimen.create({ data: {
      patientId: patientAId, medicationId: medicationAId, consultationId: consultationBId,
    } }));
    await assert.rejects(client.problemEvent.create({ data: {
      patientId: patientAId, problemId, consultationId: consultationBId, newStatus: "ACTIVE",
    } }));
    await assert.rejects(client.documentSnapshot.create({ data: {
      patientId: patientAId, consultationId: consultationBId, type: "AGA_REPORT",
      version: 1, content: {}, sourceConsultationStatus: "DRAFT",
    } }));
    await assert.rejects(client.medicationStatusEvent.create({ data: {
      patientId: patientAId,
      medicationId: medicationAId,
      consultationId: consultationBId,
      previousStatus: "ACTIVE",
      newStatus: "SUSPENDED",
    } }));
    await assert.rejects(client.medicationStatusEvent.create({ data: {
      patientId: patientAId,
      medicationId: medicationBId,
      consultationId: consultationAId,
      previousStatus: null,
      newStatus: "ACTIVE",
    } }));
  } finally {
    await client.medicationStatusEvent.deleteMany({ where: { medicationId: { in: [medicationAId, medicationBId] } } });
    await client.medication.deleteMany({ where: { id: { in: [medicationAId, medicationBId] } } });
    await client.clinicalProblem.deleteMany({ where: { id: problemId } });
    await client.consultation.deleteMany({ where: { id: { in: [consultationAId, consultationBId] } } });
    await client.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await client.user.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
});
