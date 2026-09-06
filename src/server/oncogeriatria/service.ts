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
import { isOncogeriatriaEnabled } from "@/domain/oncogeriatria/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

export class OncogeriatricError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
  }
}

type SafeJsonValue = string | number | boolean | null | SafeJsonObject | SafeJsonValue[];
type SafeJsonObject = { [key: string]: SafeJsonValue };

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
    select: { id: true, episodeId: true, patientId: true },
  });
  if (!course) throw new OncogeriatricError("COURSE_NOT_FOUND", "Curso terapêutico não encontrado para este episódio.", 404);
  return course;
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
    },
  });
  if (!checkpoint) throw new OncogeriatricError("CHECKPOINT_NOT_FOUND", "Checkpoint oncogeriátrico não encontrado para este paciente.", 404);
  return checkpoint;
}

async function audit(userId: string, entityType: string, entityId: string, action: string, reasonCode?: string) {
  await prisma.auditEvent.create({
    data: { userId, entityType, entityId, action, outcome: "success", reasonCode },
  });
}

export async function createOncogeriatricEpisode(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  await ensurePatient(patientId);
  const diagnosis = requiredText(input.diagnosis, "Diagnóstico", 255);

  const episode = await prisma.oncogeriatricEpisode.create({
    data: {
      patientId,
      status: "ACTIVE",
      diagnosis,
      primarySite: safeText(input.primarySite, 191),
      histology: safeText(input.histology, 255),
      stage: safeText(input.stage, 100),
      diagnosedAt: optionalDate(input.diagnosedAt),
      diseaseStatus: safeText(input.diseaseStatus, 100),
      notes: safeText(input.notes),
      createdById: user.id,
    },
    select: { id: true, status: true },
  });
  await audit(user.id, "OncogeriatricEpisode", episode.id, "oncogeriatria.episode.create");
  return episode;
}

export async function createOncogeriatricTreatmentCourse(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const plannedCycles = optionalPositiveInt(input.plannedCycles, "Número de ciclos");

  const course = await prisma.oncogeriatricTreatmentCourse.create({
    data: {
      episodeId,
      patientId,
      modality: requiredText(input.modality, "Modalidade", 64),
      intent: requiredText(input.intent, "Intenção terapêutica", 64),
      therapyLine: safeText(input.therapyLine, 100),
      regimenName: requiredText(input.regimenName, "Esquema", 255),
      plannedCycles,
      plannedStartAt: optionalDate(input.plannedStartAt),
      actualStartAt: optionalDate(input.actualStartAt),
      endedAt: optionalDate(input.endedAt),
      status: safeText(input.status, 32) ?? "PLANNED",
      riskFlags: safeObject(input.riskFlags),
      notes: safeText(input.notes),
      createdById: user.id,
    },
    select: { id: true, status: true },
  });
  await audit(user.id, "OncogeriatricTreatmentCourse", course.id, "oncogeriatria.treatment-course.create");
  return course;
}

const CHECKPOINT_TYPES = new Set([
  "PRE_TREATMENT",
  "CYCLE",
  "PERIODIC_REASSESSMENT",
  "EVENT_DRIVEN",
  "END_OF_TREATMENT",
  "POST_3_MONTHS",
  "POST_6_MONTHS",
  "POST_12_MONTHS",
]);

export async function createOncogeriatricCheckpoint(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const type = requiredText(input.type, "Tipo de checkpoint", 48);
  if (!CHECKPOINT_TYPES.has(type)) throw new OncogeriatricError("INVALID_CHECKPOINT_TYPE", "Tipo de checkpoint inválido.");

  const treatmentCourseId = safeText(input.treatmentCourseId, 191);
  if (treatmentCourseId) await courseContext(patientId, episodeId, treatmentCourseId);
  const consultationId = safeText(input.consultationId, 191);
  if (consultationId) {
    const consultation = await prisma.consultation.findFirst({ where: { id: consultationId, patientId }, select: { id: true } });
    if (!consultation) throw new OncogeriatricError("CONSULTATION_NOT_FOUND", "Consulta selecionada não pertence a este paciente.", 404);
  }

  const checkpoint = await prisma.oncogeriatricCheckpoint.create({
    data: {
      patientId,
      episodeId,
      treatmentCourseId,
      consultationId,
      type,
      cycleNumber: optionalPositiveInt(input.cycleNumber, "Número do ciclo"),
      occurredAt: safeDate(input.occurredAt, new Date()),
      scheduledAt: optionalDate(input.scheduledAt),
      status: safeText(input.status, 32) ?? "IN_PROGRESS",
      structuredData: safeObject(input.structuredData),
      createdById: user.id,
    },
    select: { id: true, type: true, occurredAt: true },
  });
  await audit(user.id, "OncogeriatricCheckpoint", checkpoint.id, "oncogeriatria.checkpoint.create", type);
  return checkpoint;
}

export async function saveOncogeriatricCheckpointData(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  await checkpointContext(patientId, episodeId, checkpointId);
  const status = safeText(input.status, 32) ?? "IN_PROGRESS";
  const allowedStatus = new Set(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "REVIEWED"]);
  if (!allowedStatus.has(status)) throw new OncogeriatricError("INVALID_WORKFLOW_STATUS", "Status operacional inválido.");

  const checkpoint = await prisma.oncogeriatricCheckpoint.update({
    where: { id: checkpointId },
    data: { structuredData: safeObject(input.structuredData), status },
    select: { id: true, status: true },
  });
  await audit(user.id, "OncogeriatricCheckpoint", checkpoint.id, "oncogeriatria.checkpoint.update");
  return checkpoint;
}

export async function saveG8(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  const checkpoint = await checkpointContext(patientId, episodeId, checkpointId);
  if (!checkpoint.consultationId) {
    throw new OncogeriatricError("CONSULTATION_REQUIRED_FOR_SCALE", "Vincule o checkpoint a uma consulta existente para persistir o G8 no motor único de escalas.", 409);
  }
  const answers = safeObject(input.answers) as unknown as G8Input | undefined;
  if (!answers) throw new OncogeriatricError("G8_ANSWERS_REQUIRED", "Respostas do G8 são obrigatórias.");
  const result = calculateG8(answers);
  const definition = await prisma.scaleDefinition.findUnique({
    where: { code_version: { code: G8_SCALE_CODE, version: G8_SCALE_VERSION } },
    select: { id: true },
  });
  if (!definition) throw new OncogeriatricError("G8_DEFINITION_MISSING", "Definição versionada do G8 não encontrada.", 503);

  const assessment = await prisma.$transaction(async (tx) => {
    const data = {
      scaleDefinitionId: definition.id,
      patientId,
      consultationId: checkpoint.consultationId as string,
      scaleCode: G8_SCALE_CODE,
      scaleVersion: G8_SCALE_VERSION,
      answers: answers as never,
      scoreNumeric: result.score,
      scoreText: `${result.score}/17`,
      classification: result.classification === "VULNERABLE_SCREEN" ? "Triagem vulnerável" : "Triagem não vulnerável",
      interpretation: result.classification === "VULNERABLE_SCREEN"
        ? "G8 ≤14: rastreio compatível com vulnerabilidade geriátrica; considerar avaliação geriátrica ampla conforme julgamento clínico."
        : "G8 >14: rastreio sem sinalização pelo cutoff tradicional; não substitui avaliação clínica.",
      appliedAt: checkpoint.occurredAt,
    };
    const saved = checkpoint.g8AssessmentId
      ? await tx.scaleAssessment.update({ where: { id: checkpoint.g8AssessmentId }, data, select: { id: true } })
      : await tx.scaleAssessment.create({ data, select: { id: true } });
    await tx.oncogeriatricCheckpoint.update({ where: { id: checkpoint.id }, data: { g8AssessmentId: saved.id } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "ScaleAssessment", entityId: saved.id, action: "oncogeriatria.g8.upsert", outcome: "success", reasonCode: G8_SCALE_VERSION } });
    return saved;
  });
  return { assessmentId: assessment.id, ...result };
}

export async function saveCarg(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  const checkpointId = requiredText(input.checkpointId, "Checkpoint", 191);
  const checkpoint = await checkpointContext(patientId, episodeId, checkpointId);
  if (!checkpoint.consultationId) {
    throw new OncogeriatricError("CONSULTATION_REQUIRED_FOR_SCALE", "Vincule o checkpoint a uma consulta existente para persistir o CARG no motor único de escalas.", 409);
  }
  const answers = safeObject(input.answers) as unknown as CargInput | undefined;
  if (!answers) throw new OncogeriatricError("CARG_ANSWERS_REQUIRED", "Dados do CARG são obrigatórios.");
  const result = calculateCarg(answers);
  const definition = await prisma.scaleDefinition.findUnique({
    where: { code_version: { code: CARG_SCALE_CODE, version: CARG_SCALE_VERSION } },
    select: { id: true },
  });
  if (!definition) throw new OncogeriatricError("CARG_DEFINITION_MISSING", "Definição versionada do CARG não encontrada.", 503);

  const assessment = await prisma.$transaction(async (tx) => {
    const category = result.category === "LOW" ? "Baixo risco" : result.category === "INTERMEDIATE" ? "Risco intermediário" : "Alto risco";
    const data = {
      scaleDefinitionId: definition.id,
      patientId,
      consultationId: checkpoint.consultationId as string,
      scaleCode: CARG_SCALE_CODE,
      scaleVersion: CARG_SCALE_VERSION,
      answers: answers as never,
      scoreNumeric: result.score,
      scoreText: `${result.score}/23`,
      classification: category,
      interpretation: `${result.decisionSupportMessage}${result.populationNote ? ` ${result.populationNote}` : ""} O resultado não indica, contraindica, reduz, suspende ou modifica tratamento antineoplásico.`,
      appliedAt: checkpoint.occurredAt,
    };
    const saved = checkpoint.cargAssessmentId
      ? await tx.scaleAssessment.update({ where: { id: checkpoint.cargAssessmentId }, data, select: { id: true } })
      : await tx.scaleAssessment.create({ data, select: { id: true } });
    await tx.oncogeriatricCheckpoint.update({ where: { id: checkpoint.id }, data: { cargAssessmentId: saved.id } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "ScaleAssessment", entityId: saved.id, action: "oncogeriatria.carg.upsert", outcome: "success", reasonCode: CARG_SCALE_VERSION } });
    return saved;
  });
  return { assessmentId: assessment.id, ...result };
}

export async function createOncogeriatricIntervention(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const checkpointId = safeText(input.checkpointId, 191);
  if (checkpointId) await checkpointContext(patientId, episodeId, checkpointId);
  const record = await prisma.oncogeriatricIntervention.create({
    data: {
      patientId,
      episodeId,
      checkpointId,
      domain: requiredText(input.domain, "Domínio", 64),
      description: requiredText(input.description, "Vulnerabilidade"),
      intervention: safeText(input.intervention),
      responsibleProfessional: safeText(input.responsibleProfessional, 191),
      dueAt: optionalDate(input.dueAt),
      status: safeText(input.status, 32) ?? "PLANNED",
      result: safeText(input.result),
      createdById: user.id,
    },
    select: { id: true, status: true },
  });
  await audit(user.id, "OncogeriatricIntervention", record.id, "oncogeriatria.intervention.create");
  return record;
}

export async function createOncogeriatricToxicityEvent(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const treatmentCourseId = safeText(input.treatmentCourseId, 191);
  if (treatmentCourseId) await courseContext(patientId, episodeId, treatmentCourseId);
  const checkpointId = safeText(input.checkpointId, 191);
  if (checkpointId) await checkpointContext(patientId, episodeId, checkpointId);

  const record = await prisma.oncogeriatricToxicityEvent.create({
    data: {
      patientId,
      episodeId,
      treatmentCourseId,
      checkpointId,
      occurredAt: safeDate(input.occurredAt, new Date()),
      toxicityType: requiredText(input.toxicityType, "Tipo de toxicidade", 191),
      grade: safeText(input.grade, 32),
      consequences: safeText(input.consequences),
      hospitalizationAssociated: input.hospitalizationAssociated === true,
      cycleDelayAssociated: input.cycleDelayAssociated === true,
      treatmentModificationRecorded: safeText(input.treatmentModificationRecorded),
      createdById: user.id,
    },
    select: { id: true, occurredAt: true },
  });
  await audit(user.id, "OncogeriatricToxicityEvent", record.id, "oncogeriatria.toxicity.create");
  return record;
}

export async function createOncogeriatricRecoveryAssessment(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const checkpointId = safeText(input.checkpointId, 191);
  if (checkpointId) await checkpointContext(patientId, episodeId, checkpointId);
  const allowed = new Set(["RECOVERED", "RECOVERING", "PERSISTENT_DEFICIT", "NEW_DEFICIT", "NOT_ASSESSED"]);
  const status = requiredText(input.status, "Situação da recuperação", 32);
  if (!allowed.has(status)) throw new OncogeriatricError("INVALID_RECOVERY_STATUS", "Situação de recuperação inválida.");

  const record = await prisma.oncogeriatricRecoveryAssessment.create({
    data: {
      patientId,
      episodeId,
      checkpointId,
      domain: requiredText(input.domain, "Domínio", 64),
      status,
      notes: safeText(input.notes),
      assessedAt: safeDate(input.assessedAt, new Date()),
      createdById: user.id,
    },
    select: { id: true, status: true },
  });
  await audit(user.id, "OncogeriatricRecoveryAssessment", record.id, "oncogeriatria.recovery.create", status);
  return record;
}

export async function createOncogeriatricReportSnapshot(patientId: string, input: Record<string, unknown>) {
  const user = await writeActor();
  const episodeId = requiredText(input.episodeId, "Episódio", 191);
  await episodeContext(patientId, episodeId);
  const content = safeObject(input.content);
  if (!content) throw new OncogeriatricError("REPORT_CONTENT_REQUIRED", "Conteúdo do resumo oncogeriátrico é obrigatório.");
  const consultationId = safeText(input.consultationId, 191);
  if (consultationId) {
    const consultation = await prisma.consultation.findFirst({ where: { id: consultationId, patientId }, select: { id: true } });
    if (!consultation) throw new OncogeriatricError("CONSULTATION_NOT_FOUND", "Consulta selecionada não pertence a este paciente.", 404);
  }
  const latest = await prisma.oncogeriatricReportSnapshot.findFirst({
    where: { episodeId }, orderBy: { version: "desc" }, select: { version: true },
  });
  const snapshot = await prisma.oncogeriatricReportSnapshot.create({
    data: { patientId, episodeId, consultationId, version: (latest?.version ?? 0) + 1, content, generatedById: user.id },
    select: { id: true, version: true, createdAt: true },
  });
  await audit(user.id, "OncogeriatricReportSnapshot", snapshot.id, "oncogeriatria.report.snapshot");
  return snapshot;
}
