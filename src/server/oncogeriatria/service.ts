import { createHash } from "node:crypto";
import {
  calculateCarg,
  calculateG8,
  CARG_SCALE_CODE,
  CARG_SCALE_VERSION,
  G8_SCALE_CODE,
  G8_SCALE_VERSION,
  type CargInput,
  type G8Input,
} from "@/domain/oncogeriatria/calculators";
import {
  diffCargInputs,
  sanitizeCargLaboratoryProvenance,
  summarizeCargCompleteness,
  type CargLaboratoryProvenance,
  type PartialCargInput,
} from "@/domain/oncogeriatria/carg-audit";
import { isOncogeriatriaEnabled } from "@/domain/oncogeriatria/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

export class OncogeriatricError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type SafeJsonValue = string | number | boolean | null | SafeJsonObject | SafeJsonValue[];
type SafeJsonObject = { [key: string]: SafeJsonValue };

type SaveStatus = "created" | "already_saved";

function ensureEnabled(): void {
  if (!isOncogeriatriaEnabled(process.env.ONCOGERIATRIA_EMERGENCY_DISABLED)) {
    throw new OncogeriatricError("ONCOGERIATRIA_DISABLED", "A Oncogeriatria está temporariamente indisponível.", 404);
  }
}

function safeText(value: unknown, maxLength = 5000): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new OncogeriatricError("TEXT_TOO_LONG", "O texto excede o limite permitido.");
  return text;
}

function requiredText(value: unknown, label: string, maxLength = 5000): string {
  const text = safeText(value, maxLength);
  if (!text) throw new OncogeriatricError("REQUIRED_FIELD", `${label} é obrigatório.`);
  return text;
}

function operationId(input: Record<string, unknown>): string {
  const value = requiredText(input.operationId, "Identificador da operação", 128);
  if (!/^[A-Za-z0-9:_-]{16,128}$/.test(value)) {
    throw new OncogeriatricError("INVALID_OPERATION_ID", "Identificador da operação inválido.");
  }
  return value;
}

function expectedRevision(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new OncogeriatricError("EXPECTED_REVISION_REQUIRED", "A revisão esperada do checkpoint é obrigatória.");
  }
  return parsed;
}

function safeDate(value: unknown, fallback = new Date()): Date {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new OncogeriatricError("INVALID_DATE", "Data inválida.");
  return parsed;
}

function optionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  return safeDate(value);
}

function optionalPositiveInt(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new OncogeriatricError("INVALID_INTEGER", `${label} inválido.`);
  return parsed;
}

function safeJsonValue(value: unknown, depth = 0): SafeJsonValue {
  if (depth > 20) throw new OncogeriatricError("INVALID_STRUCTURED_DATA", "Dados estruturados excedem o limite de profundidade.");
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new OncogeriatricError("INVALID_STRUCTURED_DATA", "Dados estruturados contêm número inválido.");
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => safeJsonValue(item, depth + 1));
  if (typeof value === "object") {
    const result: SafeJsonObject = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) result[key] = safeJsonValue(item, depth + 1);
    }
    return result;
  }
  throw new OncogeriatricError("INVALID_STRUCTURED_DATA", "Dados estruturados contêm valor não suportado.");
}

function safeObject(value: unknown): SafeJsonObject | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new OncogeriatricError("INVALID_STRUCTURED_DATA", "Dados estruturados inválidos.");
  return safeJsonValue(value) as SafeJsonObject;
}

function canonicalJson(value: SafeJsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function contentHash(content: SafeJsonObject): string {
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002");
}

function saveStatusMessage(status: SaveStatus): string {
  return status === "already_saved" ? "O registro já havia sido salvo." : "Registro confirmado.";
}

async function writeActor() {
  ensureEnabled();
  const { user } = await requireAuthenticatedUser("patient.read");
  if (user.role !== "ADMIN" && user.role !== "PHYSICIAN") {
    throw new OncogeriatricError("ONCOGERIATRIA_WRITE_FORBIDDEN", "Este perfil não pode alterar a linha oncogeriátrica.", 403);
  }
  return user;
}

async function ensurePatient(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new OncogeriatricError("PATIENT_NOT_FOUND", "Paciente não encontrado.", 404);
  return patient;
}

async function episodeContext(patientId: string, episodeId: string) {
  const episode = await prisma.oncogeriatricEpisode.findFirst({
    where: { id: episodeId, patientId },
    select: { id: true, patientId: true, status: true },
  });
  if (!episode) throw new OncogeriatricError("EPISODE_NOT_FOUND", "Episódio oncológico não encontrado para este paciente.", 404);
  return episode;
}

async function courseContext(patientId: string, episodeId: string, courseId: string) {
  const course = await prisma.oncogeriatricTreatmentCourse.findFirst({
    where: { id: courseId, episodeId, patientId },
    select: { id: true, episodeId: true, patientId: true, regimenName: true },
  });
  if (!course) throw new OncogeriatricError("COURSE_NOT_FOUND", "Curso terapêutico não encontrado para este episódio.", 404);
  return course;
}

async function consultationContext(patientId: string, consultationId: string) {
  const consultation = await prisma.consultation.findFirst({ where: { id: consultationId, patientId }, select: { id: true } });
  if (!consultation) throw new OncogeriatricError("CONSULTATION_NOT_FOUND", "Consulta selecionada não pertence a este paciente.", 404);
  return consultation;
}

async function checkpointContext(patientId: string, episodeId: string, checkpointId: string) {
  const checkpoint = await prisma.oncogeriatricCheckpoint.findFirst({
    where: { id: checkpointId, episodeId, patientId },
    select: {
      id: true,
      patientId: true,
      episodeId: true,
      treatmentCourseId: true,
      consultationId: true,
      occurredAt: true,
      g8AssessmentId: true,
      cargAssessmentId: true,
      revision: true,
      cargDraft: true,
      cargLabProvenance: true,
      cargCompletionCount: true,
      cargPendingFields: true,
      cargSavedAt: true,
      cargSavedById: true,
    },
  });
  if (!checkpoint) throw new OncogeriatricError("CHECKPOINT_NOT_FOUND", "Checkpoint oncogeriátrico não encontrado para este paciente.", 404);
  return checkpoint;
}


async function resolveEventLinks(
  patientId: string,
  episodeId: string,
  input: Record<string, unknown>,
) {
  const checkpointId = safeText(input.checkpointId, 191);
  const consultationIdInput = safeText(input.consultationId, 191);
  const checkpoint = checkpointId ? await checkpointContext(patientId, episodeId, checkpointId) : null;
  if (consultationIdInput) await consultationContext(patientId, consultationIdInput);
  if (checkpoint?.consultationId && consultationIdInput && checkpoint.consultationId !== consultationIdInput) {
    throw new OncogeriatricError(
      "EVENT_CONSULTATION_MISMATCH",
      "A consulta selecionada é diferente da consulta vinculada ao checkpoint. Revise os vínculos antes de salvar.",
      409,
    );
  }
  return {
    checkpointId,
    consultationId: consultationIdInput ?? checkpoint?.consultationId ?? null,
    checkpoint,
  };
}

async function existingReceipt(patientId: string, opId: string, action: string) {
  const receipt = await prisma.oncogeriatricOperationReceipt.findUnique({
    where: { patientId_operationId: { patientId, operationId: opId } },
    select: { action: true, entityType: true, entityId: true },
  });
  if (receipt && receipt.action !== action) {
    throw new OncogeriatricError("IDEMPOTENCY_KEY_REUSED", "Esta chave de operação já foi utilizada em outra ação. Recarregue a tela antes de tentar novamente.", 409);
  }
  return receipt;
}

async function replayEpisode(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "EPISODE_CREATE");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricEpisode.findFirst({ where: { id: receipt.entityId, patientId }, select: { id: true, status: true } });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

async function replayCourse(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "TREATMENT_COURSE_CREATE");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricTreatmentCourse.findFirst({ where: { id: receipt.entityId, patientId }, select: { id: true, status: true } });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

async function replayCheckpoint(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "CHECKPOINT_CREATE");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricCheckpoint.findFirst({ where: { id: receipt.entityId, patientId }, select: { id: true, type: true, occurredAt: true, revision: true } });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

async function replayIntervention(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "INTERVENTION_CREATE");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricIntervention.findFirst({ where: { id: receipt.entityId, patientId }, select: { id: true, status: true } });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

async function replayToxicity(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "TOXICITY_CREATE");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricToxicityEvent.findFirst({ where: { id: receipt.entityId, patientId }, select: { id: true, occurredAt: true } });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

async function replayRecovery(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "RECOVERY_CREATE");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricRecoveryAssessment.findFirst({ where: { id: receipt.entityId, patientId }, select: { id: true, status: true } });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

async function replaySnapshot(patientId: string, opId: string) {
  const receipt = await existingReceipt(patientId, opId, "REPORT_SNAPSHOT");
  if (!receipt) return null;
  const record = await prisma.oncogeriatricReportSnapshot.findFirst({
    where: { id: receipt.entityId, patientId },
    select: { id: true, version: true, createdAt: true, clinicalReviewConfirmedAt: true },
  });
  return record ? { ...record, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") } : null;
}

export async function createOncogeriatricEpisode(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  await ensurePatient(patientId);
  const opId = operationId(input);
  const replay = await replayEpisode(patientId, opId);
  if (replay) return replay;
  const diagnosis = requiredText(input.diagnosis, "Diagnóstico", 255);

  try {
    return await prisma.$transaction(async (tx) => {
      const episode = await tx.oncogeriatricEpisode.create({
        data: { patientId, status: "ACTIVE", diagnosis, primarySite: safeText(input.primarySite, 191), histology: safeText(input.histology, 255), stage: safeText(input.stage, 100), diagnosedAt: optionalDate(input.diagnosedAt), diseaseStatus: safeText(input.diseaseStatus, 100), notes: safeText(input.notes), createdById: user.id },
        select: { id: true, status: true },
      });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricEpisode", entityId: episode.id, action: "oncogeriatria.episode.create", outcome: "success", requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId: episode.id, operationId: opId, action: "EPISODE_CREATE", entityType: "OncogeriatricEpisode", entityId: episode.id } });
      return { ...episode, saveStatus: "created" as const, message: saveStatusMessage("created") };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const repeated = await replayEpisode(patientId, opId);
      if (repeated) return repeated;
    }
    throw error;
  }
}

export async function createOncogeriatricTreatmentCourse(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const opId = operationId(input);
  const replay = await replayCourse(patientId, opId);
  if (replay) return replay;
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const plannedCycles = optionalPositiveInt(input.plannedCycles, "Número de ciclos");

  try {
    return await prisma.$transaction(async (tx) => {
      const course = await tx.oncogeriatricTreatmentCourse.create({
        data: { episodeId, patientId, modality: requiredText(input.modality, "Modalidade", 64), intent: requiredText(input.intent, "Intenção terapêutica", 64), therapyLine: safeText(input.therapyLine, 100), regimenName: requiredText(input.regimenName, "Esquema", 255), plannedCycles, plannedStartAt: optionalDate(input.plannedStartAt), actualStartAt: optionalDate(input.actualStartAt), endedAt: optionalDate(input.endedAt), status: safeText(input.status, 32) ?? "PLANNED", riskFlags: safeObject(input.riskFlags), notes: safeText(input.notes), createdById: user.id },
        select: { id: true, status: true },
      });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricTreatmentCourse", entityId: course.id, action: "oncogeriatria.treatment-course.create", outcome: "success", requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId, operationId: opId, action: "TREATMENT_COURSE_CREATE", entityType: "OncogeriatricTreatmentCourse", entityId: course.id } });
      return { ...course, saveStatus: "created" as const, message: saveStatusMessage("created") };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const repeated = await replayCourse(patientId, opId);
      if (repeated) return repeated;
    }
    throw error;
  }
}

const CHECKPOINT_TYPES = new Set(["PRE_TREATMENT", "CYCLE", "PERIODIC_REASSESSMENT", "EVENT_DRIVEN", "END_OF_TREATMENT", "POST_3_MONTHS", "POST_6_MONTHS", "POST_12_MONTHS"]);

export async function createOncogeriatricCheckpoint(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const opId = operationId(input);
  const replay = await replayCheckpoint(patientId, opId);
  if (replay) return replay;
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const type = requiredText(input.type, "Tipo de checkpoint", 48);
  if (!CHECKPOINT_TYPES.has(type)) throw new OncogeriatricError("INVALID_CHECKPOINT_TYPE", "Tipo de checkpoint inválido.");
  const treatmentCourseId = safeText(input.treatmentCourseId, 191);
  if (treatmentCourseId) await courseContext(patientId, episodeId, treatmentCourseId);
  const consultationId = safeText(input.consultationId, 191);
  if (consultationId) await consultationContext(patientId, consultationId);

  try {
    return await prisma.$transaction(async (tx) => {
      const checkpoint = await tx.oncogeriatricCheckpoint.create({
        data: { patientId, episodeId, treatmentCourseId, consultationId, type, cycleNumber: optionalPositiveInt(input.cycleNumber, "Número do ciclo"), occurredAt: safeDate(input.occurredAt, new Date()), scheduledAt: optionalDate(input.scheduledAt), status: safeText(input.status, 32) ?? "IN_PROGRESS", structuredData: safeObject(input.structuredData), createdById: user.id, revision: 1 },
        select: { id: true, type: true, occurredAt: true, revision: true },
      });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricCheckpoint", entityId: checkpoint.id, action: "oncogeriatria.checkpoint.create", outcome: "success", reasonCode: type, requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId, operationId: opId, action: "CHECKPOINT_CREATE", entityType: "OncogeriatricCheckpoint", entityId: checkpoint.id } });
      return { ...checkpoint, saveStatus: "created" as const, message: saveStatusMessage("created") };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const repeated = await replayCheckpoint(patientId, opId);
      if (repeated) return repeated;
    }
    throw error;
  }
}

export async function saveOncogeriatricCheckpointData(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  await checkpointContext(patientId, episodeId, checkpointId);
  const revision = expectedRevision(input.expectedRevision);
  const status = safeText(input.status, 32) ?? "IN_PROGRESS";
  const allowedStatus = new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "REVIEWED"]);
  if (!allowedStatus.has(status)) throw new OncogeriatricError("INVALID_WORKFLOW_STATUS", "Status operacional inválido.");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.oncogeriatricCheckpoint.updateMany({
      where: { id: checkpointId, patientId, episodeId, revision },
      data: { structuredData: safeObject(input.structuredData), status, revision: { increment: 1 } },
    });
    if (updated.count !== 1) {
      const current = await tx.oncogeriatricCheckpoint.findFirst({ where: { id: checkpointId, patientId, episodeId }, select: { revision: true } });
      throw new OncogeriatricError("CHECKPOINT_REVISION_CONFLICT", "Existe uma versão mais recente deste checkpoint. Recarregue e revise as mudanças antes de substituir qualquer conteúdo clínico.", 409, { expectedRevision: revision, currentRevision: current?.revision ?? null });
    }
    const checkpoint = await tx.oncogeriatricCheckpoint.findUnique({ where: { id: checkpointId }, select: { id: true, status: true, revision: true } });
    if (!checkpoint) throw new OncogeriatricError("CHECKPOINT_NOT_FOUND", "Checkpoint oncogeriátrico não encontrado.", 404);
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricCheckpoint", entityId: checkpoint.id, action: "oncogeriatria.checkpoint.update", outcome: "success", reasonCode: `revision:${checkpoint.revision}` } });
    return checkpoint;
  });
}

export async function linkOncogeriatricCheckpointConsultation(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  const consultationId = requiredText(input.consultationId, "Consulta", 191);
  const revision = expectedRevision(input.expectedRevision);
  const checkpoint = await checkpointContext(patientId, episodeId, checkpointId);
  await consultationContext(patientId, consultationId);

  if (checkpoint.consultationId === consultationId) {
    return { checkpointId, consultationId, revision: checkpoint.revision, saveStatus: "already_linked" as const };
  }
  if (checkpoint.consultationId) {
    throw new OncogeriatricError(
      "CHECKPOINT_CONSULTATION_ALREADY_LINKED",
      "Esta avaliação já está vinculada a outra consulta. Revise o vínculo existente antes de qualquer alteração.",
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.oncogeriatricCheckpoint.updateMany({
      where: { id: checkpointId, patientId, episodeId, revision, consultationId: null },
      data: { consultationId, revision: { increment: 1 } },
    });
    if (updated.count !== 1) {
      const current = await tx.oncogeriatricCheckpoint.findFirst({
        where: { id: checkpointId, patientId, episodeId },
        select: { revision: true, consultationId: true },
      });
      throw new OncogeriatricError(
        "CHECKPOINT_REVISION_CONFLICT",
        "Existe uma versão mais recente desta avaliação. Recarregue a página antes de vincular a consulta.",
        409,
        { expectedRevision: revision, currentRevision: current?.revision ?? null, consultationId: current?.consultationId ?? null },
      );
    }
    const saved = await tx.oncogeriatricCheckpoint.findUnique({
      where: { id: checkpointId },
      select: { id: true, consultationId: true, revision: true },
    });
    if (!saved) throw new OncogeriatricError("CHECKPOINT_NOT_FOUND", "Avaliação oncogeriátrica não encontrada.", 404);
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "OncogeriatricCheckpoint",
        entityId: checkpointId,
        action: "oncogeriatria.checkpoint.link-consultation",
        outcome: "success",
        reasonCode: `revision:${saved.revision}`,
      },
    });
    return { checkpointId: saved.id, consultationId: saved.consultationId, revision: saved.revision, saveStatus: "linked" as const };
  });
}

export async function saveG8(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  const checkpoint = await checkpointContext(patientId, episodeId, checkpointId);
  if (!checkpoint.consultationId) throw new OncogeriatricError("CONSULTATION_REQUIRED_FOR_SCALE", "Vincule o checkpoint a uma consulta existente para persistir o G8 no motor único de escalas.", 409);
  const answers = safeObject(input.answers) as unknown as G8Input | undefined;
  if (!answers) throw new OncogeriatricError("G8_ANSWERS_REQUIRED", "Respostas do G8 são obrigatórias.");
  const result = calculateG8(answers);
  const definition = await prisma.scaleDefinition.findUnique({ where: { code_version: { code: G8_SCALE_CODE, version: G8_SCALE_VERSION } }, select: { id: true } });
  if (!definition) throw new OncogeriatricError("G8_DEFINITION_MISSING", "Definição versionada do G8 não encontrada.", 503);

  const assessment = await prisma.$transaction(async (tx) => {
    const data = { scaleDefinitionId: definition.id, patientId, consultationId: checkpoint.consultationId as string, scaleCode: G8_SCALE_CODE, scaleVersion: G8_SCALE_VERSION, answers: answers as never, scoreNumeric: result.score, scoreText: `${result.score}/17`, classification: result.classification === "VULNERABLE_SCREEN" ? "Triagem vulnerável" : "Triagem não vulnerável", interpretation: result.classification === "VULNERABLE_SCREEN" ? "G8 ≤14: rastreio compatível com vulnerabilidade geriátrica; considerar avaliação geriátrica ampla conforme julgamento clínico." : "G8 >14: rastreio sem sinalização pelo cutoff tradicional; não substitui avaliação clínica.", appliedAt: checkpoint.occurredAt };
    const saved = checkpoint.g8AssessmentId ? await tx.scaleAssessment.update({ where: { id: checkpoint.g8AssessmentId }, data, select: { id: true } }) : await tx.scaleAssessment.create({ data, select: { id: true } });
    await tx.oncogeriatricCheckpoint.update({ where: { id: checkpoint.id }, data: { g8AssessmentId: saved.id } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "ScaleAssessment", entityId: saved.id, action: "oncogeriatria.g8.upsert", outcome: "success", reasonCode: G8_SCALE_VERSION } });
    return saved;
  });
  return { assessmentId: assessment.id, ...result };
}

export async function saveCargDraft(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  await checkpointContext(patientId, episodeId, checkpointId);
  const answers = (safeObject(input.answers) ?? {}) as unknown as PartialCargInput;
  const completion = summarizeCargCompleteness(answers);
  const provenance = sanitizeCargLaboratoryProvenance(safeObject(input.labProvenance) as unknown as CargLaboratoryProvenance | undefined);
  const savedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.oncogeriatricCheckpoint.update({ where: { id: checkpointId }, data: { cargDraft: answers as never, cargCompletionCount: completion.completedCount, cargPendingFields: completion.pendingLabels as never, cargLabProvenance: provenance as never, cargSavedAt: savedAt, cargSavedById: user.id } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricCheckpoint", entityId: checkpointId, action: "oncogeriatria.carg.draft", outcome: "success", reasonCode: `${completion.completedCount}/11` } });
  });
  return { checkpointId, completion, savedAt, savedBy: user.name };
}

export async function saveCarg(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  const checkpoint = await checkpointContext(patientId, episodeId, checkpointId);
  if (!checkpoint.consultationId) throw new OncogeriatricError("CONSULTATION_REQUIRED_FOR_SCALE", "Vincule o checkpoint a uma consulta existente para persistir o CARG no motor único de escalas.", 409);
  const answers = safeObject(input.answers) as unknown as CargInput | undefined;
  if (!answers) throw new OncogeriatricError("CARG_ANSWERS_REQUIRED", "Dados do CARG são obrigatórios.");
  const completion = summarizeCargCompleteness(answers);
  if (!completion.complete) throw new OncogeriatricError("CARG_INCOMPLETE", "Complete os 11 fatores do CARG antes de registrar o resultado.", 400, { pendingFields: completion.pendingLabels });
  const result = calculateCarg(answers);
  const provenance = sanitizeCargLaboratoryProvenance(safeObject(input.labProvenance) as unknown as CargLaboratoryProvenance | undefined);
  const definition = await prisma.scaleDefinition.findUnique({ where: { code_version: { code: CARG_SCALE_CODE, version: CARG_SCALE_VERSION } }, select: { id: true } });
  if (!definition) throw new OncogeriatricError("CARG_DEFINITION_MISSING", "Definição versionada do CARG não encontrada.", 503);

  const previous = checkpoint.cargAssessmentId ? await prisma.scaleAssessment.findFirst({ where: { id: checkpoint.cargAssessmentId, patientId, consultationId: checkpoint.consultationId }, select: { id: true, answers: true } }) : null;
  const archived = previous ? await prisma.oncogeriatricReportSnapshot.findFirst({ where: { episodeId, patientId, cargAssessmentId: previous.id }, select: { id: true, version: true } }) : null;
  const differences = previous ? diffCargInputs(previous.answers as PartialCargInput, answers) : [];
  if (archived && differences.length && input.confirmArchivedDifference !== true) {
    throw new OncogeriatricError("CARG_ARCHIVED_DIFFERENCE_REVIEW_REQUIRED", `O CARG atual já integra a versão ${archived.version} de um relatório arquivado. Revise as diferenças antes de registrar uma nova avaliação.`, 409, { snapshotVersion: archived.version, differences });
  }

  const assessment = await prisma.$transaction(async (tx) => {
    const category = result.category === "LOW" ? "Baixo risco" : result.category === "INTERMEDIATE" ? "Risco intermediário" : "Alto risco";
    const data = { scaleDefinitionId: definition.id, patientId, consultationId: checkpoint.consultationId as string, scaleCode: CARG_SCALE_CODE, scaleVersion: CARG_SCALE_VERSION, answers: answers as never, scoreNumeric: result.score, scoreText: `${result.score}/23`, classification: category, interpretation: `${result.decisionSupportMessage}${result.populationNote ? ` ${result.populationNote}` : ""} O resultado não indica, contraindica, reduz, suspende ou modifica tratamento antineoplásico.`, appliedAt: checkpoint.occurredAt };
    const shouldCreateNewAssessment = Boolean(archived && differences.length);
    const saved = previous && !shouldCreateNewAssessment ? await tx.scaleAssessment.update({ where: { id: previous.id }, data, select: { id: true } }) : await tx.scaleAssessment.create({ data, select: { id: true } });
    const savedAt = new Date();
    await tx.oncogeriatricCheckpoint.update({ where: { id: checkpoint.id }, data: { cargAssessmentId: saved.id, cargDraft: answers as never, cargCompletionCount: 11, cargPendingFields: [] as never, cargLabProvenance: provenance as never, cargSavedAt: savedAt, cargSavedById: user.id } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "ScaleAssessment", entityId: saved.id, action: "oncogeriatria.carg.upsert", outcome: "success", reasonCode: CARG_SCALE_VERSION } });
    return { id: saved.id, savedAt };
  });
  return { assessmentId: assessment.id, savedAt: assessment.savedAt, savedBy: user.name, completion, provenance, ...result };
}

export async function createOncogeriatricIntervention(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const opId = operationId(input);
  const replay = await replayIntervention(patientId, opId);
  if (replay) return replay;
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const { checkpointId, consultationId } = await resolveEventLinks(patientId, episodeId, input);
  const startedAt = optionalDate(input.startedAt);
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.oncogeriatricIntervention.create({ data: { patientId, episodeId, checkpointId, consultationId, startedAt, domain: requiredText(input.domain, "Domínio", 64), description: requiredText(input.description, "Vulnerabilidade"), intervention: safeText(input.intervention), responsibleProfessional: safeText(input.responsibleProfessional, 191), dueAt: optionalDate(input.dueAt), status: safeText(input.status, 32) ?? "PLANNED", result: safeText(input.result), createdById: user.id }, select: { id: true, status: true, startedAt: true } });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricIntervention", entityId: record.id, action: "oncogeriatria.intervention.create", outcome: "success", requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId, operationId: opId, action: "INTERVENTION_CREATE", entityType: "OncogeriatricIntervention", entityId: record.id } });
      return { ...record, saveStatus: "created" as const, message: saveStatusMessage("created") };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) { const repeated = await replayIntervention(patientId, opId); if (repeated) return repeated; }
    throw error;
  }
}

export async function createOncogeriatricToxicityEvent(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const opId = operationId(input);
  const replay = await replayToxicity(patientId, opId);
  if (replay) return replay;
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const treatmentCourseId = safeText(input.treatmentCourseId, 191);
  if (treatmentCourseId) await courseContext(patientId, episodeId, treatmentCourseId);
  const { checkpointId, consultationId, checkpoint } = await resolveEventLinks(patientId, episodeId, input);
  if (checkpoint?.treatmentCourseId && treatmentCourseId && checkpoint.treatmentCourseId !== treatmentCourseId) {
    throw new OncogeriatricError(
      "EVENT_TREATMENT_COURSE_MISMATCH",
      "O tratamento selecionado é diferente do tratamento vinculado ao checkpoint. Revise os vínculos antes de salvar.",
      409,
    );
  }
  const resolvedTreatmentCourseId = treatmentCourseId ?? checkpoint?.treatmentCourseId ?? null;
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.oncogeriatricToxicityEvent.create({ data: { patientId, episodeId, treatmentCourseId: resolvedTreatmentCourseId, checkpointId, consultationId, occurredAt: safeDate(input.occurredAt, new Date()), toxicityType: requiredText(input.toxicityType, "Tipo de toxicidade", 191), grade: safeText(input.grade, 32), consequences: safeText(input.consequences), hospitalizationAssociated: input.hospitalizationAssociated === true, cycleDelayAssociated: input.cycleDelayAssociated === true, treatmentModificationRecorded: safeText(input.treatmentModificationRecorded), createdById: user.id }, select: { id: true, occurredAt: true } });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricToxicityEvent", entityId: record.id, action: "oncogeriatria.toxicity.create", outcome: "success", requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId, operationId: opId, action: "TOXICITY_CREATE", entityType: "OncogeriatricToxicityEvent", entityId: record.id } });
      return { ...record, saveStatus: "created" as const, message: saveStatusMessage("created") };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) { const repeated = await replayToxicity(patientId, opId); if (repeated) return repeated; }
    throw error;
  }
}

export async function createOncogeriatricRecoveryAssessment(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const opId = operationId(input);
  const replay = await replayRecovery(patientId, opId);
  if (replay) return replay;
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const { checkpointId, consultationId } = await resolveEventLinks(patientId, episodeId, input);
  const allowed = new Set(["RECOVERED", "RECOVERING", "PERSISTENT_DEFICIT", "NEW_DEFICIT", "NOT_ASSESSED"]);
  const status = requiredText(input.status, "Situação da recuperação", 32);
  if (!allowed.has(status)) throw new OncogeriatricError("INVALID_RECOVERY_STATUS", "Situação de recuperação inválida.");
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.oncogeriatricRecoveryAssessment.create({ data: { patientId, episodeId, checkpointId, consultationId, domain: requiredText(input.domain, "Domínio", 64), status, notes: safeText(input.notes), assessedAt: safeDate(input.assessedAt, new Date()), createdById: user.id }, select: { id: true, status: true } });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricRecoveryAssessment", entityId: record.id, action: "oncogeriatria.recovery.create", outcome: "success", reasonCode: status, requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId, operationId: opId, action: "RECOVERY_CREATE", entityType: "OncogeriatricRecoveryAssessment", entityId: record.id } });
      return { ...record, saveStatus: "created" as const, message: saveStatusMessage("created") };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) { const repeated = await replayRecovery(patientId, opId); if (repeated) return repeated; }
    throw error;
  }
}

export async function createOncogeriatricReportSnapshot(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const opId = operationId(input);
  const replay = await replaySnapshot(patientId, opId);
  if (replay) return replay;
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  if (input.clinicalReviewConfirmed !== true) {
    throw new OncogeriatricError("CLINICAL_REVIEW_REQUIRED", "Confirme a revisão clínica no servidor antes de arquivar ou compartilhar o relatório.", 409);
  }
  const content = safeObject(input.content);
  if (!content) throw new OncogeriatricError("REPORT_CONTENT_REQUIRED", "Conteúdo do resumo oncogeriátrico é obrigatório.");
  const consultationId = safeText(input.consultationId, 191);
  if (consultationId) await consultationContext(patientId, consultationId);
  const g8AssessmentId = safeText(input.g8AssessmentId, 191);
  const cargAssessmentId = safeText(input.cargAssessmentId, 191);
  if (g8AssessmentId) {
    const link = await prisma.oncogeriatricCheckpoint.findFirst({ where: { patientId, episodeId, g8AssessmentId }, select: { id: true } });
    if (!link) throw new OncogeriatricError("G8_EPISODE_MISMATCH", "O G8 selecionado não pertence a este episódio.", 409);
  }
  if (cargAssessmentId) {
    const link = await prisma.oncogeriatricCheckpoint.findFirst({ where: { patientId, episodeId, cargAssessmentId }, select: { id: true } });
    if (!link) throw new OncogeriatricError("CARG_EPISODE_MISMATCH", "O CARG selecionado não pertence a este episódio.", 409);
  }
  const hash = contentHash(content);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM OncogeriatricEpisode WHERE id = ${episodeId} AND patientId = ${patientId} FOR UPDATE`;
      const receipt = await tx.oncogeriatricOperationReceipt.findUnique({ where: { patientId_operationId: { patientId, operationId: opId } }, select: { action: true, entityId: true } });
      if (receipt) {
        if (receipt.action !== "REPORT_SNAPSHOT") throw new OncogeriatricError("IDEMPOTENCY_KEY_REUSED", "Esta chave de operação já foi utilizada em outra ação.", 409);
        const repeated = await tx.oncogeriatricReportSnapshot.findUnique({ where: { id: receipt.entityId }, select: { id: true, version: true, createdAt: true, clinicalReviewConfirmedAt: true } });
        if (repeated) return { ...repeated, saveStatus: "already_saved" as const, message: saveStatusMessage("already_saved") };
      }
      const latest = await tx.oncogeriatricReportSnapshot.findFirst({ where: { episodeId, patientId }, orderBy: { version: "desc" }, select: { version: true } });
      const reviewAt = new Date();
      const snapshot = await tx.oncogeriatricReportSnapshot.create({ data: { patientId, episodeId, consultationId, version: (latest?.version ?? 0) + 1, content, contentHash: hash, g8AssessmentId, cargAssessmentId, generatedById: user.id, clinicalReviewConfirmedById: user.id, clinicalReviewConfirmedAt: reviewAt }, select: { id: true, version: true, createdAt: true, clinicalReviewConfirmedAt: true } });
      await tx.auditEvent.create({ data: { userId: user.id, entityType: "OncogeriatricReportSnapshot", entityId: snapshot.id, action: "oncogeriatria.report.snapshot", outcome: "success", reasonCode: `version:${snapshot.version}`, requestId: opId } });
      await tx.oncogeriatricOperationReceipt.create({ data: { patientId, episodeId, operationId: opId, action: "REPORT_SNAPSHOT", entityType: "OncogeriatricReportSnapshot", entityId: snapshot.id } });
      return { ...snapshot, saveStatus: "created" as const, message: saveStatusMessage("created") };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (isUniqueConstraintError(error)) { const repeated = await replaySnapshot(patientId, opId); if (repeated) return repeated; }
    throw error;
  }
}
