import { buildProgram55CheckpointPlan } from "@/domain/program55/checkpoints";
import {
  canManageProgram55,
  canWriteProgram55Discipline,
  canWriteProgram55SharedData,
  canWriteRestrictedPsychologyNote,
  type ExistingUserRole,
  type Program55ActorAccess,
  type Program55Discipline,
} from "@/domain/program55/access";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

export class Program55Error extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
  }
}

type WorkflowStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED";
type SafeJsonValue = string | number | boolean | null | SafeJsonObject | SafeJsonValue[];
type SafeJsonObject = { [key: string]: SafeJsonValue };

function finiteOrNull(value: unknown, field: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Program55Error("INVALID_NUMERIC_VALUE", `${field} precisa ser um número não negativo.`);
  }
  return parsed;
}

function safeText(value: unknown, maxLength = 5000): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Program55Error("TEXT_TOO_LONG", "O texto excede o limite permitido.");
  return text;
}

function safeDate(value: unknown, fallback = new Date()): Date {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Program55Error("INVALID_DATE", "Data inválida.");
  return parsed;
}

function safeJsonValue(value: unknown, depth = 0): SafeJsonValue {
  if (depth > 20) {
    throw new Program55Error("INVALID_STRUCTURED_DATA", "Dados estruturados excedem a profundidade permitida.");
  }
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Program55Error("INVALID_STRUCTURED_DATA", "Dados estruturados contêm número inválido.");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => safeJsonValue(item, depth + 1));
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Program55Error("INVALID_STRUCTURED_DATA", "Dados estruturados precisam usar objetos JSON simples.");
    }
    const normalized: SafeJsonObject = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined) continue;
      normalized[key] = safeJsonValue(item, depth + 1);
    }
    return normalized;
  }
  throw new Program55Error("INVALID_STRUCTURED_DATA", "Dados estruturados contêm valor não suportado.");
}

function safeObject(value: unknown): SafeJsonObject | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Program55Error("INVALID_STRUCTURED_DATA", "Dados estruturados inválidos.");
  }
  return safeJsonValue(value) as SafeJsonObject;
}

async function authenticatedActor() {
  const { user } = await requireAuthenticatedUser("patient.read");
  return user;
}

async function actorAccess(enrollmentId: string, user: { id: string; role: string }): Promise<Program55ActorAccess> {
  const memberships = await prisma.program55ProfessionalMembership.findMany({
    where: { enrollmentId, userId: user.id, active: true },
    select: { discipline: true, active: true },
  });
  return {
    userId: user.id,
    role: user.role as ExistingUserRole,
    memberships: memberships.map((membership) => ({
      discipline: membership.discipline as Program55Discipline,
      active: membership.active,
    })),
  };
}

async function checkpointContext(checkpointId: string, patientId: string) {
  const checkpoint = await prisma.program55Checkpoint.findFirst({
    where: { id: checkpointId, patientId },
    select: { id: true, patientId: true, enrollmentId: true, status: true },
  });
  if (!checkpoint) throw new Program55Error("CHECKPOINT_NOT_FOUND", "Checkpoint não encontrado para este paciente.", 404);
  return checkpoint;
}

export async function startProgram55(patientId: string, startedAtInput?: string | null) {
  const user = await authenticatedActor();
  const actor: Program55ActorAccess = { userId: user.id, role: user.role as ExistingUserRole, memberships: [] };
  if (!canManageProgram55(actor)) {
    throw new Program55Error("PROGRAM55_CREATE_FORBIDDEN", "Este perfil não pode iniciar o Programa 55+.", 403);
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, birthDate: true } });
  if (!patient) throw new Program55Error("PATIENT_NOT_FOUND", "Paciente não encontrado.", 404);
  if (!isProgram55Eligible(patient.birthDate)) {
    throw new Program55Error("PATIENT_NOT_ELIGIBLE", "O Programa 55+ está disponível para pacientes de 55 a 70 anos.", 422);
  }

  const startedAt = safeDate(startedAtInput, new Date());
  const plan = buildProgram55CheckpointPlan(startedAt);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.program55Enrollment.findUnique({
      where: { patientId },
      select: { id: true, status: true },
    });
    if (existing) return { enrollmentId: existing.id, created: false };

    const enrollment = await tx.program55Enrollment.create({
      data: {
        patientId,
        status: "ACTIVE",
        startedAt,
        coordinatingPhysicianId: user.id,
        checkpoints: {
          create: plan.map((item, index) => ({
            patientId,
            checkpointType: item.checkpointType,
            referenceDate: item.referenceDate,
            status: index === 0 ? "IN_PROGRESS" : "NOT_STARTED",
          })),
        },
        memberships: user.role === "PHYSICIAN"
          ? { create: { userId: user.id, discipline: "PHYSICIAN", active: true } }
          : undefined,
      },
      select: { id: true },
    });

    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Program55Enrollment",
        entityId: enrollment.id,
        action: "program55.enrollment.create",
        outcome: "success",
      },
    });

    return { enrollmentId: enrollment.id, created: true };
  }, { isolationLevel: "Serializable" });
}

export interface SaveBodyCompositionInput {
  checkpointId: string;
  measuredAt?: string | null;
  weightKg?: unknown;
  heightCm?: unknown;
  bmi?: unknown;
  waistCm?: unknown;
  bodyFatPercent?: unknown;
  fatMassKg?: unknown;
  fatFreeMassKg?: unknown;
  muscleMassKg?: unknown;
  additionalMetrics?: unknown;
  sourceLabel?: unknown;
  deviceLabel?: unknown;
  notes?: unknown;
}

export async function saveProgram55BodyComposition(patientId: string, input: SaveBodyCompositionInput) {
  const user = await authenticatedActor();
  const checkpoint = await checkpointContext(input.checkpointId, patientId);
  const actor = await actorAccess(checkpoint.enrollmentId, user);
  if (!canWriteProgram55SharedData(actor)) {
    throw new Program55Error("PROGRAM55_WRITE_FORBIDDEN", "Este perfil não pode registrar composição corporal.", 403);
  }

  const data = {
    checkpointId: checkpoint.id,
    patientId,
    measuredAt: safeDate(input.measuredAt, new Date()),
    weightKg: finiteOrNull(input.weightKg, "Peso"),
    heightCm: finiteOrNull(input.heightCm, "Altura"),
    bmi: finiteOrNull(input.bmi, "IMC"),
    waistCm: finiteOrNull(input.waistCm, "Circunferência abdominal"),
    bodyFatPercent: finiteOrNull(input.bodyFatPercent, "Percentual de gordura"),
    fatMassKg: finiteOrNull(input.fatMassKg, "Massa de gordura"),
    fatFreeMassKg: finiteOrNull(input.fatFreeMassKg, "Massa livre de gordura"),
    muscleMassKg: finiteOrNull(input.muscleMassKg, "Massa muscular"),
    additionalMetrics: safeObject(input.additionalMetrics),
    sourceLabel: safeText(input.sourceLabel, 191),
    deviceLabel: safeText(input.deviceLabel, 191),
    notes: safeText(input.notes),
    createdById: user.id,
  };

  return prisma.$transaction(async (tx) => {
    const record = await tx.program55BodyComposition.create({ data, select: { id: true } });
    if (checkpoint.status === "NOT_STARTED") {
      await tx.program55Checkpoint.update({ where: { id: checkpoint.id }, data: { status: "IN_PROGRESS" } });
    }
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Program55BodyComposition",
        entityId: record.id,
        action: "program55.body-composition.create",
        outcome: "success",
      },
    });
    return record;
  });
}

export interface SaveProfessionalAssessmentInput {
  checkpointId: string;
  discipline: Program55Discipline;
  status?: WorkflowStatus;
  structuredData?: unknown;
  sharedSummary?: unknown;
  assessedAt?: string | null;
}

export async function saveProgram55ProfessionalAssessment(patientId: string, input: SaveProfessionalAssessmentInput) {
  const user = await authenticatedActor();
  const checkpoint = await checkpointContext(input.checkpointId, patientId);
  const actor = await actorAccess(checkpoint.enrollmentId, user);
  if (!canWriteProgram55Discipline(actor, input.discipline)) {
    throw new Program55Error("PROGRAM55_DOMAIN_FORBIDDEN", "Este perfil não pode editar esse domínio profissional.", 403);
  }

  const status: WorkflowStatus = input.status ?? "IN_PROGRESS";
  if (!["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "REVIEWED"].includes(status)) {
    throw new Program55Error("INVALID_WORKFLOW_STATUS", "Status operacional inválido.");
  }

  return prisma.$transaction(async (tx) => {
    const assessment = await tx.program55ProfessionalAssessment.upsert({
      where: { checkpointId_discipline: { checkpointId: checkpoint.id, discipline: input.discipline } },
      create: {
        checkpointId: checkpoint.id,
        patientId,
        discipline: input.discipline,
        status,
        structuredData: safeObject(input.structuredData),
        sharedSummary: safeText(input.sharedSummary),
        authorUserId: user.id,
        assessedAt: safeDate(input.assessedAt, new Date()),
      },
      update: {
        status,
        structuredData: safeObject(input.structuredData),
        sharedSummary: safeText(input.sharedSummary),
        authorUserId: user.id,
        assessedAt: safeDate(input.assessedAt, new Date()),
      },
      select: { id: true },
    });
    if (checkpoint.status === "NOT_STARTED") {
      await tx.program55Checkpoint.update({ where: { id: checkpoint.id }, data: { status: "IN_PROGRESS" } });
    }
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Program55ProfessionalAssessment",
        entityId: assessment.id,
        action: "program55.assessment.upsert",
        outcome: "success",
        reasonCode: input.discipline,
      },
    });
    return assessment;
  });
}

export async function saveProgram55RestrictedPsychologyNote(
  patientId: string,
  input: { assessmentId: string; content: unknown },
) {
  const user = await authenticatedActor();
  const assessment = await prisma.program55ProfessionalAssessment.findFirst({
    where: { id: input.assessmentId, patientId, discipline: "PSYCHOLOGY" },
    select: { id: true, checkpoint: { select: { enrollmentId: true } }, restrictedPsychologyNote: { select: { authorUserId: true } } },
  });
  if (!assessment) throw new Program55Error("PSYCHOLOGY_ASSESSMENT_NOT_FOUND", "Avaliação de psicologia não encontrada.", 404);
  const actor = await actorAccess(assessment.checkpoint.enrollmentId, user);
  if (!canWriteRestrictedPsychologyNote(actor)) {
    throw new Program55Error("PSYCHOLOGY_NOTE_FORBIDDEN", "Este perfil não pode editar nota restrita de psicologia.", 403);
  }
  if (assessment.restrictedPsychologyNote && assessment.restrictedPsychologyNote.authorUserId !== user.id) {
    throw new Program55Error("PSYCHOLOGY_NOTE_AUTHOR_MISMATCH", "Uma nota restrita existente só pode ser alterada por seu autor.", 403);
  }
  const content = safeText(input.content, 20000);
  if (!content) throw new Program55Error("PSYCHOLOGY_NOTE_EMPTY", "A nota restrita não pode ser vazia.");

  return prisma.$transaction(async (tx) => {
    const note = await tx.program55RestrictedPsychologyNote.upsert({
      where: { assessmentId: assessment.id },
      create: { assessmentId: assessment.id, patientId, authorUserId: user.id, content },
      update: { content },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Program55RestrictedPsychologyNote",
        entityId: note.id,
        action: "program55.psychology-note.upsert",
        outcome: "success",
      },
    });
    return note;
  });
}

export interface CreateGoalInput {
  checkpointId?: string | null;
  domain: unknown;
  objective: unknown;
  indicator?: unknown;
  baselineValue?: unknown;
  targetValue?: unknown;
  dueDate?: string | null;
  responsibleDiscipline?: Program55Discipline | null;
  notes?: unknown;
}

export async function createProgram55Goal(patientId: string, input: CreateGoalInput) {
  const user = await authenticatedActor();
  const enrollment = await prisma.program55Enrollment.findUnique({ where: { patientId }, select: { id: true } });
  if (!enrollment) throw new Program55Error("PROGRAM55_NOT_STARTED", "O Programa 55+ ainda não foi iniciado.", 409);
  const actor = await actorAccess(enrollment.id, user);
  if (!canWriteProgram55SharedData(actor)) {
    throw new Program55Error("PROGRAM55_GOAL_FORBIDDEN", "Este perfil não pode registrar metas do programa.", 403);
  }
  if (input.checkpointId) await checkpointContext(input.checkpointId, patientId);

  const objective = safeText(input.objective);
  const domain = safeText(input.domain, 191);
  if (!objective || !domain) throw new Program55Error("GOAL_REQUIRED_FIELDS", "Objetivo e domínio são obrigatórios.");

  return prisma.$transaction(async (tx) => {
    const goal = await tx.program55Goal.create({
      data: {
        enrollmentId: enrollment.id,
        checkpointId: input.checkpointId || null,
        patientId,
        domain,
        objective,
        indicator: safeText(input.indicator, 191),
        baselineValue: safeText(input.baselineValue, 191),
        targetValue: safeText(input.targetValue, 191),
        dueDate: input.dueDate ? safeDate(input.dueDate) : null,
        responsibleDiscipline: input.responsibleDiscipline ?? null,
        notes: safeText(input.notes),
        createdById: user.id,
      },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Program55Goal",
        entityId: goal.id,
        action: "program55.goal.create",
        outcome: "success",
      },
    });
    return goal;
  });
}

export async function addProgram55Professional(
  patientId: string,
  input: { email: unknown; discipline: Program55Discipline },
) {
  const user = await authenticatedActor();
  const enrollment = await prisma.program55Enrollment.findUnique({ where: { patientId }, select: { id: true } });
  if (!enrollment) throw new Program55Error("PROGRAM55_NOT_STARTED", "O Programa 55+ ainda não foi iniciado.", 409);
  const actor = await actorAccess(enrollment.id, user);
  if (!canManageProgram55(actor)) {
    throw new Program55Error("PROGRAM55_MEMBERSHIP_FORBIDDEN", "Este perfil não pode gerenciar participantes.", 403);
  }
  const email = safeText(input.email, 320)?.toLowerCase();
  if (!email) throw new Program55Error("PROFESSIONAL_EMAIL_REQUIRED", "Informe o e-mail do profissional já autorizado no sistema.");
  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, active: true } });
  if (!target || !target.active) {
    throw new Program55Error("PROFESSIONAL_NOT_AUTHORIZED", "Profissional não encontrado entre usuários ativos autorizados.", 404);
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.program55ProfessionalMembership.upsert({
      where: {
        enrollmentId_userId_discipline: {
          enrollmentId: enrollment.id,
          userId: target.id,
          discipline: input.discipline,
        },
      },
      create: { enrollmentId: enrollment.id, userId: target.id, discipline: input.discipline, active: true },
      update: { active: true },
      select: { id: true },
    });
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Program55ProfessionalMembership",
        entityId: membership.id,
        action: "program55.membership.upsert",
        outcome: "success",
        reasonCode: input.discipline,
      },
    });
    return membership;
  });
}
