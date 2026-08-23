import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { normalizePersonName } from "../../src/domain/patient-identity.ts";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { searchPatientsInDatabase } from "../../src/server/patients/search-patients-database.ts";

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

test("busca real no MySQL localiza pacientes novos, legado e consulta ativa sem falso positivo", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const client = testClient();
  const suffix = randomUUID();
  const userId = `patient-search-user-${suffix}`;
  const mariaId = `patient-search-maria-${suffix}`;
  const joseId = `patient-search-jose-${suffix}`;
  const anaId = `patient-search-ana-${suffix}`;
  const legacyId = `patient-search-legacy-${suffix}`;
  const consultationId = `patient-search-consultation-${suffix}`;

  try {
    await client.user.create({
      data: {
        id: userId,
        email: `patient-search-${suffix}@example.test`,
        name: "Médica Sintética",
      },
    });

    await client.patient.createMany({
      data: [
        {
          id: mariaId,
          fullName: "Maria Clara Andrade",
          normalizedFullName: normalizePersonName("Maria Clara Andrade"),
          identityFingerprint: `maria-clara-${suffix}`,
          birthDate: new Date("1944-03-20T12:00:00.000Z"),
        },
        {
          id: joseId,
          fullName: "José Ávila Souza",
          normalizedFullName: normalizePersonName("José Ávila Souza"),
          identityFingerprint: `jose-avila-${suffix}`,
          birthDate: new Date("1941-04-12T12:00:00.000Z"),
        },
        {
          id: anaId,
          fullName: "Ana Beatriz de Almeida",
          normalizedFullName: normalizePersonName("Ana Beatriz de Almeida"),
          identityFingerprint: `ana-beatriz-${suffix}`,
          birthDate: new Date("1948-08-10T12:00:00.000Z"),
        },
        {
          id: legacyId,
          fullName: "Paciente Histórico José Ávila",
          normalizedFullName: `legacy-inconsistent-${suffix}`,
          identityFingerprint: `legacy-search-${suffix}`,
          birthDate: new Date("1939-05-02T12:00:00.000Z"),
        },
      ],
    });

    await client.consultation.create({
      data: {
        id: consultationId,
        patientId: mariaId,
        physicianId: userId,
        type: "AGA_INITIAL",
        status: "DRAFT",
        occurredAt: new Date("2026-08-23T12:00:00.000Z"),
      },
    });

    const mariaQueries = [
      "Maria Clara Andrade",
      "maria clara",
      "MARIA",
      "Maria Andrade",
      "Andrade Maria",
      "  Maria   Clara  ",
    ];
    for (const query of mariaQueries) {
      const results = await searchPatientsInDatabase(client, query);
      const maria = results.find((patient) => patient.id === mariaId);
      assert.ok(maria, `Maria Clara deveria ser localizada por consulta sintética ${JSON.stringify(query)}`);
      assert.equal(maria.activeConsultationId, consultationId);
      assert.equal(maria.activeConsultationStatus, "DRAFT");
      assert.equal(maria.destinationPath, `/consultations/${consultationId}`);
    }

    for (const query of ["Ávila", "Avila", "jose avila"]) {
      const results = await searchPatientsInDatabase(client, query);
      assert.ok(results.some((patient) => patient.id === joseId));
    }

    const anaResults = await searchPatientsInDatabase(client, "Ana Beatriz");
    assert.ok(anaResults.some((patient) => patient.id === anaId));

    const falsePositive = await searchPatientsInDatabase(client, "Mariana");
    assert.equal(falsePositive.some((patient) => patient.id === mariaId), false);

    const legacyResults = await searchPatientsInDatabase(client, "Historico Avila");
    const legacy = legacyResults.find((patient) => patient.id === legacyId);
    assert.ok(legacy, "registro histórico com normalizedFullName inconsistente deve ser recuperado pelo fallback");
    assert.equal(legacy.destinationPath, `/patients/${legacyId}`);

    const collations = await client.$queryRawUnsafe<Array<{
      COLUMN_NAME: string;
      COLLATION_NAME: string | null;
    }>>(
      "SELECT COLUMN_NAME, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Patient' AND COLUMN_NAME IN ('fullName', 'normalizedFullName') ORDER BY COLUMN_NAME",
    );
    assert.equal(collations.length, 2);
    for (const column of collations) {
      assert.ok(column.COLLATION_NAME, `${column.COLUMN_NAME} precisa ter collation explícita no MySQL`);
      assert.match(column.COLLATION_NAME ?? "", /^utf8mb4_/i);
    }
  } finally {
    await client.consultation.deleteMany({ where: { id: consultationId } });
    await client.patient.deleteMany({
      where: { id: { in: [mariaId, joseId, anaId, legacyId] } },
    });
    await client.user.deleteMany({ where: { id: userId } });
    await client.$disconnect();
  }
});
