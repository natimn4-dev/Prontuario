import type { Permission } from "../../domain/security/auth-policy";
import { prisma } from "../db";
import { AccessForbiddenError } from "./access-errors";
import { requireAuthenticatedUser } from "./require-user";

export async function requirePatientAccess(
  patientId: string,
  permission: Permission = "patient.read",
) {
  const authenticated = await requireAuthenticatedUser(permission);
  const { user } = authenticated;

  if (user.patientAccessScope === "ALL_PATIENTS") return authenticated;

  const assignment = await prisma.patientUserAssignment.findUnique({
    where: {
      userId_patientId: {
        userId: user.id,
        patientId,
      },
    },
    select: { active: true },
  });

  if (!assignment?.active) {
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

  return authenticated;
}

export async function assignedPatientIdsForUser(userId: string): Promise<string[]> {
  const assignments = await prisma.patientUserAssignment.findMany({
    where: { userId, active: true },
    select: { patientId: true },
  });
  return assignments.map((assignment) => assignment.patientId);
}
