import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { buildMedicationPlanSnapshotModel } from "../../src/domain/medication-plan-snapshot.ts";
import { medicationDocumentWorkspaceContext } from "../../src/server/clinical/medication-document-workspace.ts";

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

test("plano de impressão usa somente medicamentos efetivos do paciente da consulta", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const userId = `user-print-${suffix}`;
  const patientAId = `patient-print-a-${suffix}`;
  const patientBId = `patient-print-b-${suffix}`;
  const consultationAId = `consultation-print-a-${suffix}`;
  const consultationBId = `consultation-print-b-${suffix}`;
  const medicationAId = `medication-print-a-${suffix}`;
  const medicationBId = `medication-print-b-${suffix}`;

  try {
    await client.user.create({
      data: { id: userId, email: `print-${suffix}@example.test`, name: "Médica Teste" },
    });
    await client.patient.createMany({
      data: [
        {
          id: patientAId,
          fullName: "Paciente Sintético A",
          normalizedFullName: `paciente sintetico a ${suffix}`,
          identityFingerprint: `print-a-${suffix}`,
          birthDate: new Date("1940-01-01T12:00:00.000Z"),
        },
        {
          id: patientBId,
          fullName: "Paciente Sintético B",
          normalizedFullName: `paciente sintetico b ${suffix}`,
          identityFingerprint: `print-b-${suffix}`,
          birthDate: new Date("1942-02-02T12:00:00.000Z"),
        },
      ],
    });
    await client.consultation.createMany({
      data: [
        {
          id: consultationAId,
          patientId: patientAId,
          physicianId: userId,
          type: "AGA_INITIAL",
          occurredAt: new Date("2026-08-20T12:00:00.000Z"),
        },
        {
          id: consultationBId,
          patientId: patientBId,
          physicianId: userId,
          type: "AGA_INITIAL",
          occurredAt: new Date("2026-08-20T12:05:00.000Z"),
        },
      ],
    });
    await client.medication.createMany({
      data: [
        { id: medicationAId, patientId: patientAId, name: "Medicamento Sintético A", presentation: "5 mg" },
        { id: medicationBId, patientId: patientBId, name: "Medicamento Sintético B", presentation: "10 mg" },
      ],
    });
    await client.medicationRegimen.create({
      data: {
        medicationId: medicationAId,
        patientId: patientAId,
        consultationId: consultationAId,
        dose: "1 comprimido",
        route: "oral",
        continuous: true,
        instructions: "Observação sintética A",
        scheduleSlots: { create: [{ moment: "MORNING" }, { moment: "BEDTIME" }] },
      },
    });
    await client.medicationRegimen.create({
      data: {
        medicationId: medicationBId,
        patientId: patientBId,
        consultationId: consultationBId,
        dose: "1 comprimido",
        route: "oral",
        continuous: true,
        instructions: "Observação sintética B",
        scheduleSlots: { create: [{ moment: "EVENING" }] },
      },
    });
    await client.medicationStatusEvent.createMany({
      data: [
        {
          patientId: patientAId,
          medicationId: medicationAId,
          consultationId: consultationAId,
          previousStatus: null,
          newStatus: "ACTIVE",
        },
        {
          patientId: patientBId,
          medicationId: medicationBId,
          consultationId: consultationBId,
          previousStatus: null,
          newStatus: "ACTIVE",
        },
      ],
    });

    const context = await client.$transaction(async (tx) => medicationDocumentWorkspaceContext(tx, consultationAId));
    const snapshot = buildMedicationPlanSnapshotModel({
      consultationId: consultationAId,
      patientName: "Paciente Sintético A",
      workspace: context.view,
    });

    assert.equal(context.consultation.patientId, patientAId);
    assert.equal(snapshot.consultationId, consultationAId);
    assert.equal(snapshot.patientName, "Paciente Sintético A");
    assert.equal(snapshot.plan.rows.length, 1);
    assert.equal(snapshot.plan.rows[0]?.id, medicationAId);
    assert.match(snapshot.plan.rows[0]?.medicationText ?? "", /Medicamento Sintético A/);
    assert.doesNotMatch(JSON.stringify(snapshot.plan), /Medicamento Sintético B/);
    assert.equal(snapshot.plan.rows[0]?.moments.manha, true);
    assert.equal(snapshot.plan.rows[0]?.moments.ao_deitar, true);
    assert.equal(snapshot.plan.rows[0]?.moments.noite, false);

    await assert.rejects(
      client.medicationRegimen.create({
        data: {
          medicationId: medicationBId,
          patientId: patientAId,
          consultationId: consultationAId,
          dose: "tentativa cruzada",
        },
      }),
    );
  } finally {
    await client.medicationScheduleSlot.deleteMany({
      where: { regimen: { medicationId: { in: [medicationAId, medicationBId] } } },
    });
    await client.medicationRegimen.deleteMany({ where: { medicationId: { in: [medicationAId, medicationBId] } } });
    await client.medicationStatusEvent.deleteMany({ where: { medicationId: { in: [medicationAId, medicationBId] } } });
    await client.medication.deleteMany({ where: { id: { in: [medicationAId, medicationBId] } } });
    await client.consultation.deleteMany({ where: { id: { in: [consultationAId, consultationBId] } } });
    await client.patient.deleteMany({ where: { id: { in: [patientAId, patientBId] } } });
    await client.user.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
});
