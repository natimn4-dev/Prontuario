import type { PatientAccessScope, Permission } from "../../domain/security/auth-policy";
import { prisma } from "../db";
import { AccessForbiddenError } from "./access-errors";
import { requireAuthenticatedUser } from "./require-user";

type PatientScopedUser = {
  id: string;
  patientAccessScope: PatientAccessScope;
};

export async function assertPatientAccessForUser(
  user: PatientScopedUser,
  patientId: string,
): Promise<void> {
  if (user.patientAccessScope === "ALL_PATIENTS") return;

  const assignment = await prisma.patientUserAssignment.findUnique({
    where: {
      userId_patientId: {
        userId: user.id,
        patientId,
      },
    },
    select: { active: true },
  });

  if (assignment?.active) return;

  await prisma.auditEvent.create({
    data: {
      userId: user.id,
      entityType: "Patient",
      entityId: patientId,
      action: "patient.access.denied_unassigned",
      outcome: "denied",
      reasonCode: "patient-not-assigned",
    },
  });
  throw new AccessForbiddenError();
}

export async function requirePatientAccess(
  patientId: string,
  permission: Permission = "patient.read",
) {
  const authenticated = await requireAuthenticatedUser(permission);
  await assertPatientAccessForUser(authenticated.user, patientId);
  return authenticated;
}

export async function requireConsultationAccess(
  consultationId: string,
  permission: Permission = "patient.read",
) {
  const authenticated = await requireAuthenticatedUser(permission);
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { patientId: true },
  });
  if (!consultation) throw new AccessForbiddenError();
  await assertPatientAccessForUser(authenticated.user, consultation.patientId);
  return { ...authenticated, patientId: consultation.patientId };
}

export async function assignedPatientIdsForUser(userId: string): Promise<string[]> {
  const assignments = await prisma.patientUserAssignment.findMany({
    where: { userId, active: true },
    select: { patientId: true },
  });
  return assignments.map((assignment) => assignment.patientId);
}
