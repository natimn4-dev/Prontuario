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
    adapter: new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.replace(/^\//, ""), connectionLimit: 4 }),
  });
}

test("oncogeriatria permite múltiplos episódios no mesmo Patient.id e bloqueia mistura horizontal", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const userId = `onco-u-${suffix}`;
  const patientAId = `onco-pa-${suffix}`;
  const patientBId = `onco-pb-${suffix}`;
  const consultationAId = `onco-ca-${suffix}`;
  const consultationBId = `onco-cb-${suffix}`;
  const episodeA1 = `onco-ea1-${suffix}`;
  const episodeA2 = `onco-ea2-${suffix}`;
  const episodeB = `onco-eb-${suffix}`;
  const courseA = `onco-course-a-${suffix}`;
  const checkpointA = `onco-cp-a-${suffix}`;
  try {
    await client.user.create({ data: { id: userId, email: `onco-${suffix}@example.test`, name: "Médica Oncogeriatria" } });
    await client.patient.createMany({ data: [
      { id: patientAId, fullName: "Paciente Onco A", normalizedFullName: `paciente onco a ${suffix}`, identityFingerprint: `onco-a-${suffix}` },
      { id: patientBId, fullName: "Paciente Onco B", normalizedFullName: `paciente onco b ${suffix}`, identityFingerprint: `onco-b-${suffix}` },
    ] });
    await client.consultation.createMany({ data: [
      { id: consultationAId, patientId: patientAId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date() },
      { id: consultationBId, patientId: patientBId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date() },
    ] });
    await client.oncogeriatricEpisode.createMany({ data: [
      { id: episodeA1, patientId: patientAId, diagnosis: "Neoplasia A1", createdById: userId },
      { id: episodeA2, patientId: patientAId, diagnosis: "Neoplasia A2", createdById: userId },
      { id: episodeB, patientId: patientBId, diagnosis: "Neoplasia B", createdById: userId },
    ] });
    assert.equal(await client.oncogeriatricEpisode.count({ where: { patientId: patientAId } }), 2);

    await client.oncogeriatricTreatmentCourse.create({ data: { id: courseA, episodeId: episodeA1, patientId: patientAId, modality: "SYSTEMIC", intent: "CURATIVE", regimenName: "Esquema teste", createdById: userId } });
    await client.oncogeriatricCheckpoint.create({ data: { id: checkpointA, patientId: patientAId, episodeId: episodeA1, treatmentCourseId: courseA, consultationId: consultationAId, type: "PRE_TREATMENT", occurredAt: new Date(), createdById: userId } });

    await assert.rejects(client.oncogeriatricTreatmentCourse.create({ data: { episodeId: episodeA1, patientId: patientBId, modality: "SYSTEMIC", intent: "CURATIVE", regimenName: "Mistura indevida", createdById: userId } }));
    await assert.rejects(client.oncogeriatricCheckpoint.create({ data: { patientId: patientAId, episodeId: episodeA1, consultationId: consultationBId, type: "CYCLE", occurredAt: new Date(), createdById: userId } }));
    await assert.rejects(client.oncogeriatricCheckpoint.create({ data: { patientId: patientBId, episodeId: episodeB, treatmentCourseId: courseA, type: "CYCLE", occurredAt: new Date(), createdById: userId } }));
  } finally {
    await client.oncogeriatricRecoveryAssessment.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.oncogeriatricToxicityEvent.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.oncogeriatricIntervention.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.oncogeriatricReportSnapshot.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.oncogeriatricCheckpoint.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.oncogeriatricTreatmentCourse.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.oncogeriatricEpisode.deleteMany({ where: { patientId: { in: [patientAId, patientBId] } } });
    await client.consultation.deleteMany({ where: { id: { in: [consultationAId, consultationBId] } } });
    await client.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await client.user.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
});

test("CARG em consultas A1, A2 e B1 permanece isolado por checkpoint e paciente", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const userId = `onco-carg-u-${suffix}`;
  const patientAId = `onco-carg-pa-${suffix}`;
  const patientBId = `onco-carg-pb-${suffix}`;
  const episodeAId = `onco-carg-ea-${suffix}`;
  const episodeBId = `onco-carg-eb-${suffix}`;
  const consultationA1 = `onco-carg-ca1-${suffix}`;
  const consultationA2 = `onco-carg-ca2-${suffix}`;
  const consultationB1 = `onco-carg-cb1-${suffix}`;
  const checkpointA1 = `onco-carg-cpa1-${suffix}`;
  const checkpointA2 = `onco-carg-cpa2-${suffix}`;
  const checkpointB1 = `onco-carg-cpb1-${suffix}`;
  try {
    await client.user.create({ data: { id: userId, email: `onco-carg-${suffix}@example.test`, name: "Médica Sintética" } });
    await client.patient.createMany({ data: [
      { id: patientAId, fullName: "Paciente Sintética A", normalizedFullName: `paciente sintetica a ${suffix}`, identityFingerprint: `onco-carg-a-${suffix}` },
      { id: patientBId, fullName: "Paciente Sintética B", normalizedFullName: `paciente sintetica b ${suffix}`, identityFingerprint: `onco-carg-b-${suffix}` },
    ] });
    await client.consultation.createMany({ data: [
      { id: consultationA1, patientId: patientAId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date("2026-09-01T09:00:00Z") },
      { id: consultationA2, patientId: patientAId, physicianId: userId, type: "FOLLOW_UP", occurredAt: new Date("2026-09-08T09:00:00Z") },
      { id: consultationB1, patientId: patientBId, physicianId: userId, type: "AGA_INITIAL", occurredAt: new Date("2026-09-02T09:00:00Z") },
    ] });
    await client.oncogeriatricEpisode.createMany({ data: [
      { id: episodeAId, patientId: patientAId, diagnosis: "Neoplasia sintética A", createdById: userId },
      { id: episodeBId, patientId: patientBId, diagnosis: "Neoplasia sintética B", createdById: userId },
    ] });
    await client.oncogeriatricCheckpoint.createMany({ data: [
      { id: checkpointA1, patientId: patientAId, episodeId: episodeAId, consultationId: consultationA1, type: "PRE_TREATMENT", occurredAt: new Date("2026-09-01T09:00:00Z"), createdById: userId, cargDraft: { ageYears: 74, marker: "A1" }, cargCompletionCount: 2 },
      { id: checkpointA2, patientId: patientAId, episodeId: episodeAId, consultationId: consultationA2, type: "PERIODIC_REASSESSMENT", occurredAt: new Date("2026-09-08T09:00:00Z"), createdById: userId, cargDraft: { ageYears: 75, marker: "A2" }, cargCompletionCount: 3 },
      { id: checkpointB1, patientId: patientBId, episodeId: episodeBId, consultationId: consultationB1, type: "PRE_TREATMENT", occurredAt: new Date("2026-09-02T09:00:00Z"), createdById: userId, cargDraft: { ageYears: 81, marker: "B1" }, cargCompletionCount: 1 },
    ] });

    const reopened = await client.oncogeriatricCheckpoint.findMany({
      where: { id: { in: [checkpointA1, checkpointA2, checkpointB1] }, patientId: { in: [patientAId, patientBId] } },
      select: { id: true, patientId: true, episodeId: true, consultationId: true, cargDraft: true, cargCompletionCount: true },
    });
    const byId = new Map(reopened.map((item) => [item.id, item]));
    assert.deepEqual(byId.get(checkpointA1)?.cargDraft, { ageYears: 74, marker: "A1" });
    assert.deepEqual(byId.get(checkpointA2)?.cargDraft, { ageYears: 75, marker: "A2" });
    assert.deepEqual(byId.get(checkpointB1)?.cargDraft, { ageYears: 81, marker: "B1" });
    assert.equal(byId.get(checkpointA1)?.consultationId, consultationA1);
    assert.equal(byId.get(checkpointA2)?.consultationId, consultationA2);
    assert.equal(byId.get(checkpointB1)?.patientId, patientBId);
    assert.equal(byId.get(checkpointA1)?.cargCompletionCount, 2);
    assert.equal(byId.get(checkpointA2)?.cargCompletionCount, 3);
    assert.equal(byId.get(checkpointB1)?.cargCompletionCount, 1);
  } finally {
    await client.oncogeriatricCheckpoint.deleteMany({ where: { id: { in: [checkpointA1, checkpointA2, checkpointB1] } } });
    await client.oncogeriatricEpisode.deleteMany({ where: { id: { in: [episodeAId, episodeBId] } } });
    await client.consultation.deleteMany({ where: { id: { in: [consultationA1, consultationA2, consultationB1] } } });
    await client.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await client.user.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
});
