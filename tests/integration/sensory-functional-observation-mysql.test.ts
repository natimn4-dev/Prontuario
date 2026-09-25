import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;

function client() {
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL não configurada.");
  const url = new URL(databaseUrl);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 3,
    }),
  });
}

test("observações sensoriais persistem por revisão e não cruzam paciente ou consulta", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const db = client();
  const suffix = randomUUID();
  const userId = `sensory-u-${suffix}`;
  const patientAId = `sensory-pa-${suffix}`;
  const patientBId = `sensory-pb-${suffix}`;
  const consultationAId = `sensory-ca-${suffix}`;
  const consultationANextId = `sensory-can-${suffix}`;
  const consultationBId = `sensory-cb-${suffix}`;

  try {
    await db.user.create({ data: { id: userId, email: `${suffix}@example.test`, name: "Médica Sintética" } });
    await db.patient.createMany({ data: [
      { id: patientAId, fullName: "Paciente A Sintética", normalizedFullName: `paciente a ${suffix}`, identityFingerprint: `sensory-a-${suffix}` },
      { id: patientBId, fullName: "Paciente B Sintética", normalizedFullName: `paciente b ${suffix}`, identityFingerprint: `sensory-b-${suffix}` },
    ] });
    await db.consultation.createMany({ data: [
      { id: consultationAId, patientId: patientAId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date("2026-09-01T12:00:00Z") },
      { id: consultationANextId, patientId: patientAId, physicianId: userId, type: "FOLLOW_UP", occurredAt: new Date("2026-09-15T12:00:00Z") },
      { id: consultationBId, patientId: patientBId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date("2026-09-01T12:00:00Z") },
    ] });

    await db.sensoryFunctionalObservation.createMany({ data: [
      { patientId: patientAId, consultationId: consultationAId, assessmentStatus: "ASSESSED", multisensoryDysfunction: true, usesCorrectiveLenses: false, revision: 1 },
      { patientId: patientAId, consultationId: consultationAId, assessmentStatus: "ASSESSED", multisensoryDysfunction: true, usesCorrectiveLenses: true, revision: 2 },
      { patientId: patientAId, consultationId: consultationANextId, assessmentStatus: "NOT_ASSESSED", revision: 1 },
      { patientId: patientBId, consultationId: consultationBId, assessmentStatus: "ASSESSED", multisensoryDysfunction: false, usesCorrectiveLenses: false, revision: 1 },
    ] });

    const current = await db.sensoryFunctionalObservation.findFirstOrThrow({
      where: { patientId: patientAId, consultationId: consultationAId },
      orderBy: [{ revision: "desc" }, { id: "desc" }],
    });
    assert.equal(current.revision, 2);
    assert.equal(current.usesCorrectiveLenses, true);
    assert.equal(await db.sensoryFunctionalObservation.count({ where: { patientId: patientAId, consultationId: consultationAId } }), 2);
    assert.equal(await db.sensoryFunctionalObservation.count({ where: { patientId: patientAId, consultationId: consultationANextId } }), 1);
    assert.equal(await db.sensoryFunctionalObservation.count({ where: { patientId: patientBId, consultationId: consultationBId } }), 1);

    await assert.rejects(db.sensoryFunctionalObservation.create({
      data: { patientId: patientBId, consultationId: consultationAId, assessmentStatus: "ASSESSED", revision: 1 },
    }));
  } finally {
    await db.sensoryFunctionalObservation.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await db.consultation.deleteMany({ where: { id: { in: [consultationAId, consultationANextId, consultationBId] } } });
    await db.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
