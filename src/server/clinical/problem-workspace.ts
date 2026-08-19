import type { Prisma } from "../../generated/prisma/client.ts";
import {
  consultationHorizon,
  problemsAsOf,
  type ProblemTimelineRecord,
} from "../../domain/as-of-consultation.ts";
import {
  assertProblemWorkspaceEditable,
  ProblemWorkspaceError,
  type ChangeProblemStatusCommand,
  type CreateProblemCommand,
  type ProblemWorkspaceView,
} from "../../domain/problem-workspace.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";

async function context(tx: Prisma.TransactionClient, consultationId: string) {
  const consultation = await tx.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, patientId: true, status: true, occurredAt: true, createdAt: true },
  });
  if (!consultation) throw new ProblemWorkspaceError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");

  const consultations = await tx.consultation.findMany({
    where: { patientId: consultation.patientId },
    select: { id: true, patientId: true, occurredAt: true, createdAt: true },
  });
  const horizon = consultationHorizon({ patientId: consultation.patientId, targetConsultationId: consultation.id, consultations });
  const consultationIds = horizon.map((item) => item.id);
  const isLatestConsultation = consultationIds.length === consultations.length;

  const persisted = await tx.clinicalProblem.findMany({
    where: { patientId: consultation.patientId },
    include: { events: { select: { problemId: true, patientId: true, consultationId: true, previousStatus: true, newStatus: true, createdAt: true } } },
  });
  const problems = problemsAsOf({
    patientId: consultation.patientId,
    consultationIds,
    problems: persisted.map((problem) => ({
      id: problem.id, patientId: problem.patientId, originConsultationId: problem.originConsultationId,
      type: problem.type, status: problem.status, title: problem.title,
      description: problem.description ?? undefined, priority: problem.priority ?? undefined, events: problem.events,
    })) satisfies ProblemTimelineRecord[],
  });
  return { consultation, isLatestConsultation, problems };
}

function publicView(input: Awaited<ReturnType<typeof context>>): ProblemWorkspaceView {
  return {
    consultationId: input.consultation.id,
    consultationStatus: input.consultation.status,
    isLatestConsultation: input.isLatestConsultation,
    problems: [...input.problems]
      .sort((a, b) => (a.status === "RESOLVED" ? 1 : 0) - (b.status === "RESOLVED" ? 1 : 0) || (a.priority ?? 999) - (b.priority ?? 999) || a.title.localeCompare(b.title, "pt-BR"))
      .map((problem) => ({ id: problem.id, type: problem.type, status: problem.status, title: problem.title, description: problem.description, priority: problem.priority })),
  };
}

function assertEditable(input: Awaited<ReturnType<typeof context>>): void {
  assertProblemWorkspaceEditable({ consultationStatus: input.consultation.status, isLatestConsultation: input.isLatestConsultation });
}

export async function getProblemWorkspace(consultationId: string): Promise<ProblemWorkspaceView> {
  await requireAuthenticatedUser("patient.read");
  return prisma.$transaction(async (tx) => publicView(await context(tx, consultationId)));
}

export async function createProblem(command: CreateProblemCommand): Promise<ProblemWorkspaceView> {
  const { user } = await requireAuthenticatedUser("consultation.write");
  return prisma.$transaction(async (tx) => {
    const current = await context(tx, command.consultationId); assertEditable(current);
    const title = command.title.trim(); if (!title) throw new Error("Título do problema é obrigatório.");
    const created = await tx.clinicalProblem.create({ data: { patientId: current.consultation.patientId, originConsultationId: current.consultation.id, type: command.type, status: "ACTIVE", title, description: command.description?.trim() || undefined }, select: { id: true } });
    await tx.problemEvent.create({ data: { problemId: created.id, patientId: current.consultation.patientId, consultationId: current.consultation.id, previousStatus: null, newStatus: "ACTIVE" } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "ClinicalProblem", entityId: created.id, action: "problem.create", requestId: command.requestId, outcome: "success", reasonCode: command.type === "GERIATRIC" ? "geriatric-problem" : "clinical-problem" } });
    return publicView(await context(tx, command.consultationId));
  }, { isolationLevel: "Serializable" });
}

export async function changeProblemStatus(command: ChangeProblemStatusCommand): Promise<ProblemWorkspaceView> {
  const { user } = await requireAuthenticatedUser("consultation.write");
  return prisma.$transaction(async (tx) => {
    const current = await context(tx, command.consultationId); assertEditable(current);
    const projected = current.problems.find((problem) => problem.id === command.problemId);
    if (!projected) throw new ProblemWorkspaceError("PROBLEM_NOT_FOUND", "Problema não encontrado nesta consulta.");
    if (projected.status === command.newStatus) return publicView(current);
    const updated = await tx.clinicalProblem.updateMany({ where: { id: projected.id, patientId: current.consultation.patientId, status: projected.status }, data: { status: command.newStatus, resolvedAt: command.newStatus === "RESOLVED" ? new Date() : null } });
    if (updated.count !== 1) throw new ProblemWorkspaceError("PROBLEM_CHANGED", "O problema foi alterado em outra sessão. Recarregue antes de tentar novamente.");
    await tx.problemEvent.create({ data: { problemId: projected.id, patientId: current.consultation.patientId, consultationId: current.consultation.id, previousStatus: projected.status, newStatus: command.newStatus } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "ClinicalProblem", entityId: projected.id, action: "problem.status.change", requestId: command.requestId, outcome: "success", reasonCode: `${projected.status.toLowerCase()}-to-${command.newStatus.toLowerCase()}` } });
    return publicView(await context(tx, command.consultationId));
  }, { isolationLevel: "Serializable" });
}
