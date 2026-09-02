import { canManageProgram55, canWriteProgram55SharedData, type ExistingUserRole, type Program55ActorAccess, type Program55Discipline } from "@/domain/program55/access";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import { Program55Error } from "./service";

type CheckpointStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED";
type GoalStatus = "ACTIVE" | "ACHIEVED" | "PAUSED" | "CANCELLED";

async function accessFor(enrollmentId: string, user: { id: string; role: string }): Promise<Program55ActorAccess> {
  const memberships = await prisma.program55ProfessionalMembership.findMany({
    where: { enrollmentId, userId: user.id, active: true },
    select: { discipline: true, active: true },
  });
  return {
    userId: user.id,
    role: user.role as ExistingUserRole,
    memberships: memberships.map((item) => ({ discipline: item.discipline as Program55Discipline, active: item.active })),
  };
}

export async function updateProgram55CheckpointStatus(patientId: string, checkpointId: string, status: CheckpointStatus) {
  if (!["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "REVIEWED"].includes(status)) {
    throw new Program55Error("INVALID_CHECKPOINT_STATUS", "Status de checkpoint inválido.");
  }
  const { user } = await requireAuthenticatedUser("patient.read");
  const checkpoint = await prisma.program55Checkpoint.findFirst({
    where: { id: checkpointId, patientId },
    select: { id: true, enrollmentId: true, status: true },
  });
  if (!checkpoint) throw new Program55Error("CHECKPOINT_NOT_FOUND", "Checkpoint não encontrado para este paciente.", 404);
  const actor = await accessFor(checkpoint.enrollmentId, user);
  if (!canManageProgram55(actor)) throw new Program55Error("CHECKPOINT_REVIEW_FORBIDDEN", "Somente coordenação médica autorizada pode concluir/revisar o checkpoint.", 403);

  const allowed: Record<CheckpointStatus, readonly CheckpointStatus[]> = {
    NOT_STARTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"],
    COMPLETED: ["IN_PROGRESS", "REVIEWED"],
    REVIEWED: ["IN_PROGRESS"],
  };
  if (checkpoint.status !== status && !allowed[checkpoint.status as CheckpointStatus].includes(status)) {
    throw new Program55Error("INVALID_CHECKPOINT_TRANSITION", `Transição operacional ${checkpoint.status} → ${status} não permitida.`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.program55Checkpoint.update({ where: { id: checkpoint.id }, data: { status }, select: { id: true, status: true } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "Program55Checkpoint", entityId: checkpoint.id, action: "program55.checkpoint.status", outcome: "success", reasonCode: status } });
    return updated;
  });
}

export async function updateProgram55GoalStatus(patientId: string, goalId: string, status: GoalStatus) {
  if (!["ACTIVE", "ACHIEVED", "PAUSED", "CANCELLED"].includes(status)) throw new Program55Error("INVALID_GOAL_STATUS", "Situação da meta inválida.");
  const { user } = await requireAuthenticatedUser("patient.read");
  const goal = await prisma.program55Goal.findFirst({ where: { id: goalId, patientId }, select: { id: true, enrollmentId: true } });
  if (!goal) throw new Program55Error("GOAL_NOT_FOUND", "Meta não encontrada para este paciente.", 404);
  const actor = await accessFor(goal.enrollmentId, user);
  if (!canWriteProgram55SharedData(actor)) throw new Program55Error("GOAL_STATUS_FORBIDDEN", "Este perfil não pode atualizar a situação da meta.", 403);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.program55Goal.update({ where: { id: goal.id }, data: { status }, select: { id: true, status: true } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "Program55Goal", entityId: goal.id, action: "program55.goal.status", outcome: "success", reasonCode: status } });
    return updated;
  });
}
