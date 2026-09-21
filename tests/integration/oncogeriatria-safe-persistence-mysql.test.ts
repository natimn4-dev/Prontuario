import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;

function client() {
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL não configurada.");
  const url = new URL(databaseUrl);
  return new PrismaClient({ adapter: new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.replace(/^\//, ""), connectionLimit: 6 }) });
}

async function seed(c: ReturnType<typeof client>, suffix: string) {
  const userId = `onco-safe-u-${suffix}`;
  const patientId = `onco-safe-p-${suffix}`;
  const episodeId = `onco-safe-e-${suffix}`;
  await c.user.create({ data: { id: userId, email: `onco-safe-${suffix}@example.test`, name: "Médica Sintética" } });
  await c.patient.create({ data: { id: patientId, fullName: "Paciente Sintética Oncogeriatria", normalizedFullName: `paciente sintetica oncogeriatria ${suffix}`, identityFingerprint: `onco-safe-${suffix}` } });
  await c.oncogeriatricEpisode.create({ data: { id: episodeId, patientId, diagnosis: "Neoplasia sintética", createdById: userId } });
  return { userId, patientId, episodeId };
}

async function cleanup(c: ReturnType<typeof client>, ids: { userId: string; patientId: string; episodeId: string }) {
  await c.oncogeriatricOperationReceipt.deleteMany({ where: { patientId: ids.patientId } });
  await c.auditEvent.deleteMany({ where: { userId: ids.userId } });
  await c.oncogeriatricReportSnapshot.deleteMany({ where: { patientId: ids.patientId } });
  await c.oncogeriatricRecoveryAssessment.deleteMany({ where: { patientId: ids.patientId } });
  await c.oncogeriatricToxicityEvent.deleteMany({ where: { patientId: ids.patientId } });
  await c.oncogeriatricIntervention.deleteMany({ where: { patientId: ids.patientId } });
  await c.oncogeriatricCheckpoint.deleteMany({ where: { patientId: ids.patientId } });
  await c.oncogeriatricTreatmentCourse.deleteMany({ where: { patientId: ids.patientId } });
  await c.oncogeriatricEpisode.deleteMany({ where: { id: ids.episodeId } });
  await c.patient.deleteMany({ where: { id: ids.patientId } });
  await c.user.deleteMany({ where: { id: ids.userId } });
}

test("falha na auditoria reverte o dado clínico criado na mesma transação", { skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada" }, async () => {
  const c = client(); const suffix = randomUUID(); const ids = await seed(c, suffix); const checkpointId = `onco-safe-cp-audit-${suffix}`;
  try {
    await assert.rejects(c.$transaction(async (tx) => {
      await tx.oncogeriatricCheckpoint.create({ data: { id: checkpointId, patientId: ids.patientId, episodeId: ids.episodeId, type: "CYCLE", occurredAt: new Date(), createdById: ids.userId } });
      await tx.auditEvent.create({ data: { userId: `missing-${suffix}`, entityType: "OncogeriatricCheckpoint", entityId: checkpointId, action: "synthetic.audit.failure", outcome: "success" } });
    }));
    assert.equal(await c.oncogeriatricCheckpoint.count({ where: { id: checkpointId } }), 0);
    assert.equal(await c.auditEvent.count({ where: { entityId: checkpointId } }), 0);
  } finally { await cleanup(c, ids); await c.$disconnect(); }
});

test("duas tentativas com a mesma operationId deixam somente uma criação clínica confirmada", { skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada" }, async () => {
  const c = client(); const suffix = randomUUID(); const ids = await seed(c, suffix); const operationId = `op:${randomUUID()}`;
  async function createOnce(marker: string) {
    return c.$transaction(async (tx) => {
      const recovery = await tx.oncogeriatricRecoveryAssessment.create({ data: { patientId: ids.patientId, episodeId: ids.episodeId, domain: "FUNCTIONAL", status: "RECOVERING", notes: marker, assessedAt: new Date(), createdById: ids.userId } });
      await tx.auditEvent.create({ data: { userId: ids.userId, entityType: "OncogeriatricRecoveryAssessment", entityId: recovery.id, action: "synthetic.recovery.create", outcome: "success", requestId: operationId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId: ids.patientId, episodeId: ids.episodeId, operationId, action: "RECOVERY_CREATE", entityType: "OncogeriatricRecoveryAssessment", entityId: recovery.id } });
      return recovery.id;
    });
  }
  try {
    const results = await Promise.allSettled([createOnce("tentativa A"), createOnce("tentativa B")]);
    assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(results.filter((item) => item.status === "rejected").length, 1);
    assert.equal(await c.oncogeriatricRecoveryAssessment.count({ where: { patientId: ids.patientId, episodeId: ids.episodeId } }), 1);
    assert.equal(await c.oncogeriatricOperationReceipt.count({ where: { patientId: ids.patientId, operationId } }), 1);
  } finally { await cleanup(c, ids); await c.$disconnect(); }
});

test("duas atualizações com a mesma revisão esperada confirmam somente uma versão", { skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada" }, async () => {
  const c = client(); const suffix = randomUUID(); const ids = await seed(c, suffix); const checkpointId = `onco-safe-cp-rev-${suffix}`;
  try {
    await c.oncogeriatricCheckpoint.create({ data: { id: checkpointId, patientId: ids.patientId, episodeId: ids.episodeId, type: "CYCLE", occurredAt: new Date(), createdById: ids.userId, revision: 1 } });
    const write = (note: string) => c.oncogeriatricCheckpoint.updateMany({ where: { id: checkpointId, patientId: ids.patientId, episodeId: ids.episodeId, revision: 1 }, data: { structuredData: { notes: note }, revision: { increment: 1 } } });
    const [a, b] = await Promise.all([write("aba A"), write("aba B")]);
    assert.equal(a.count + b.count, 1);
    const final = await c.oncogeriatricCheckpoint.findUniqueOrThrow({ where: { id: checkpointId }, select: { revision: true, structuredData: true } });
    assert.equal(final.revision, 2);
    assert.ok(final.structuredData);
  } finally { await cleanup(c, ids); await c.$disconnect(); }
});

test("duas solicitações simultâneas de snapshot recebem versões sequenciais sem colisão", { skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada" }, async () => {
  const c = client(); const suffix = randomUUID(); const ids = await seed(c, suffix);
  async function snapshot(operationId: string) {
    return c.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM OncogeriatricEpisode WHERE id = ${ids.episodeId} AND patientId = ${ids.patientId} FOR UPDATE`;
      const latest = await tx.oncogeriatricReportSnapshot.findFirst({ where: { episodeId: ids.episodeId, patientId: ids.patientId }, orderBy: { version: "desc" }, select: { version: true } });
      const saved = await tx.oncogeriatricReportSnapshot.create({ data: { patientId: ids.patientId, episodeId: ids.episodeId, version: (latest?.version ?? 0) + 1, content: { schemaVersion: "synthetic" }, contentHash: "0".repeat(64), generatedById: ids.userId, clinicalReviewConfirmedById: ids.userId, clinicalReviewConfirmedAt: new Date() } });
      await tx.auditEvent.create({ data: { userId: ids.userId, entityType: "OncogeriatricReportSnapshot", entityId: saved.id, action: "synthetic.snapshot.create", outcome: "success", requestId: operationId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId: ids.patientId, episodeId: ids.episodeId, operationId, action: "REPORT_SNAPSHOT", entityType: "OncogeriatricReportSnapshot", entityId: saved.id } });
      return saved.version;
    }, { isolationLevel: "Serializable" });
  }
  try {
    const versions = await Promise.all([snapshot(`op:${randomUUID()}`), snapshot(`op:${randomUUID()}`)]);
    assert.deepEqual(versions.sort((a, b) => a - b), [1, 2]);
    assert.equal(await c.oncogeriatricReportSnapshot.count({ where: { episodeId: ids.episodeId } }), 2);
  } finally { await cleanup(c, ids); await c.$disconnect(); }
});

test("rascunho do CARG persiste por atualização e reaparece após reabertura", { skip: databaseUrl ? false : "TEST_DATABASE_URL não configurada" }, async () => {
  const c = client(); const suffix = randomUUID(); const ids = await seed(c, suffix); const checkpointId = `onco-safe-cp-carg-${suffix}`;
  try {
    await c.oncogeriatricCheckpoint.create({ data: { id: checkpointId, patientId: ids.patientId, episodeId: ids.episodeId, type: "PRE_TREATMENT", occurredAt: new Date(), createdById: ids.userId } });
    const savedAt = new Date();
    const saved = await c.oncogeriatricCheckpoint.update({
      where: { id: checkpointId },
      data: {
        cargDraft: { ageYears: 74, cancerType: "OTHER" },
        cargCompletionCount: 2,
        cargPendingFields: ["Dose planejada", "Número de quimioterápicos"],
        cargLabProvenance: { laboratoryDate: "2026-09-01", laboratorySource: "Laboratório sintético", creatinineClearanceMethod: "Método registrado pelo médico" },
        cargSavedById: ids.userId,
        cargSavedAt: savedAt,
      },
      select: { cargCompletionCount: true, cargSavedAt: true },
    });
    assert.equal(saved.cargCompletionCount, 2);
    assert.ok(saved.cargSavedAt);

    const reopened = await c.oncogeriatricCheckpoint.findUniqueOrThrow({ where: { id: checkpointId }, select: { cargDraft: true, cargCompletionCount: true, cargPendingFields: true, cargLabProvenance: true, cargSavedById: true, cargSavedAt: true } });
    assert.deepEqual(reopened.cargDraft, { ageYears: 74, cancerType: "OTHER" });
    assert.equal(reopened.cargCompletionCount, 2);
    assert.equal(reopened.cargSavedById, ids.userId);
    assert.ok(reopened.cargSavedAt);
    assert.ok(reopened.cargLabProvenance);
  } finally { await cleanup(c, ids); await c.$disconnect(); }
});
