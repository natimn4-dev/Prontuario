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

test("avaliação alimentar e formulário parcial sobrevivem à gravação e reabertura MySQL", {
  skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada",
}, async () => {
  const db = client();
  const suffix = randomUUID();
  const userId = `dietary-persist-u-${suffix}`;
  const patientId = `dietary-persist-p-${suffix}`;
  const consultationId = `dietary-persist-c-${suffix}`;
  const dietaryAssessment = {
    schemaVersion: "dietary-assessment-v1",
    meals: [{ id: "breakfast", label: "Café da manhã", items: [] }],
    targets: { proteinGPerKgMin: 0.8, proteinGPerKgMax: 1.0 },
    clinicalContext: { weightKg: 62, weightSource: "clinician" },
    entryDraft: {
      freeText: "Relato sintético: dois ovos e um copo de leite",
      mealId: "breakfast",
      foodQuery: "leite",
      selectedFood: null,
      quantity: "1",
      measure: "copo",
      grams: "",
      observation: "sem açúcar",
      qualityFlags: ["whole-food"],
    },
  };

  try {
    await db.user.create({
      data: { id: userId, email: `${suffix}@example.test`, name: "Médica Sintética" },
    });
    await db.patient.create({
      data: {
        id: patientId,
        fullName: "Paciente Sintética — Teste Alimentar",
        normalizedFullName: `paciente sintetica teste alimentar ${suffix}`,
        identityFingerprint: `dietary-${suffix}`,
      },
    });
    await db.consultation.create({
      data: {
        id: consultationId,
        patientId,
        physicianId: userId,
        type: "AGA_INITIAL",
        occurredAt: new Date(),
      },
    });

    const version = await db.consultation.findUniqueOrThrow({
      where: { id: consultationId },
      select: { updatedAt: true },
    });
    const write = await db.consultation.updateMany({
      where: {
        id: consultationId,
        patientId,
        status: { not: "FINALIZED" },
        updatedAt: version.updatedAt,
      },
      data: { assessment: { dietaryAssessment } },
    });
    assert.equal(write.count, 1);

    const reopened = await db.consultation.findUniqueOrThrow({
      where: { id: consultationId },
      select: { patientId: true, assessment: true },
    });
    assert.equal(reopened.patientId, patientId);
    assert.deepEqual(
      (reopened.assessment as { dietaryAssessment: typeof dietaryAssessment })
        .dietaryAssessment.entryDraft,
      dietaryAssessment.entryDraft,
    );
    assert.deepEqual(
      (reopened.assessment as { dietaryAssessment: typeof dietaryAssessment })
        .dietaryAssessment.targets,
      dietaryAssessment.targets,
    );
  } finally {
    await db.consultation.deleteMany({ where: { id: consultationId } });
    await db.patient.deleteMany({ where: { id: patientId } });
    await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
