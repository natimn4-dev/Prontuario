import { requireAuthenticatedUser } from "../auth/require-user";
import { prisma } from "../db";

export async function listPatientAssignments(targetUserId: string) {
  await requireAuthenticatedUser("user.manage");
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) throw new Error("Profissional não encontrado.");

  return prisma.patientUserAssignment.findMany({
    where: { userId: targetUserId, active: true },
    orderBy: [{ patient: { fullName: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      patientId: true,
      createdAt: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          birthDate: true,
          needsIdentityReview: true,
        },
      },
    },
  });
}
