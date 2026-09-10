import { prisma } from "../db";
import { requireAuthenticatedUser } from "../auth/require-user";
import {
  assertCanChangeAdminState,
  assertCanChangeUserManagerState,
  assertRecentAuthentication,
  normalizeEmail,
  roleForProfessional,
  type PatientAccessScope,
  type ProfessionalRole,
  type UserRole,
} from "../../domain/security/auth-policy";

function assertProfessionalInput(input: {
  professionalRole: ProfessionalRole;
  patientAccessScope: PatientAccessScope;
  email?: string;
}) {
  if (![
    "MEDICO",
    "FISIOTERAPEUTA",
    "NUTRICIONISTA",
    "PSICOLOGO",
    "FONOAUDIOLOGO",
  ].includes(input.professionalRole)) {
    throw new Error("Perfil profissional inválido.");
  }
  if (!["ALL_PATIENTS", "ASSIGNED_PATIENTS"].includes(input.patientAccessScope)) {
    throw new Error("Escopo de pacientes inválido.");
  }
  if (input.email !== undefined) {
    const normalized = normalizeEmail(input.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error("E-mail inválido.");
    }
  }
}

async function requireRecentUserManager() {
  const { session, user } = await requireAuthenticatedUser("user.manage");
  assertRecentAuthentication({
    authenticatedAt: new Date(session.session.createdAt),
    maxAgeSeconds: 10 * 60,
  });
  return user;
}

export async function listClinicalUsers() {
  await requireAuthenticatedUser("user.manage");
  const [users, pendingGrants] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        professionalRole: true,
        patientAccessScope: true,
        canManageUsers: true,
        accessManaged: true,
        createdAt: true,
        _count: { select: { patientAssignments: { where: { active: true } } } },
      },
    }),
    prisma.userAccessGrant.findMany({
      where: { active: true, acceptedAt: null },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        email: true,
        name: true,
        professionalRole: true,
        patientAccessScope: true,
        canManageUsers: true,
        createdAt: true,
      },
    }),
  ]);
  return { users, pendingGrants };
}

export async function preauthorizeClinicalUser(input: {
  email: string;
  name?: string;
  professionalRole: ProfessionalRole;
  patientAccessScope: PatientAccessScope;
  canManageUsers?: boolean;
  requestId?: string;
}) {
  assertProfessionalInput(input);
  const actor = await requireRecentUserManager();
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      const nextRole = existing.role === "ADMIN"
        ? "ADMIN"
        : roleForProfessional(input.professionalRole);
      const updated = await tx.user.update({
        where: { id: existing.id },
        data: {
          ...(name ? { name } : {}),
          role: nextRole,
          active: true,
          professionalRole: input.professionalRole,
          patientAccessScope: input.patientAccessScope,
          canManageUsers: input.canManageUsers ?? false,
          accessManaged: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          professionalRole: true,
          patientAccessScope: true,
          canManageUsers: true,
        },
      });
      await tx.userAccessGrant.updateMany({
        where: { email },
        data: {
          active: true,
          name,
          professionalRole: input.professionalRole,
          patientAccessScope: input.patientAccessScope,
          canManageUsers: input.canManageUsers ?? false,
          acceptedAt: new Date(),
        },
      });
      await tx.auditEvent.create({
        data: {
          userId: actor.id,
          entityType: "User",
          entityId: existing.id,
          action: "user.access.preauthorize_existing",
          requestId: input.requestId,
          outcome: "success",
          reasonCode: "MANAGED_ACCESS_ENABLED",
        },
      });
      return { kind: "existing" as const, user: updated };
    }

    const grant = await tx.userAccessGrant.upsert({
      where: { email },
      create: {
        email,
        name,
        professionalRole: input.professionalRole,
        patientAccessScope: input.patientAccessScope,
        canManageUsers: input.canManageUsers ?? false,
        active: true,
        createdByUserId: actor.id,
      },
      update: {
        name,
        professionalRole: input.professionalRole,
        patientAccessScope: input.patientAccessScope,
        canManageUsers: input.canManageUsers ?? false,
        active: true,
        acceptedAt: null,
        createdByUserId: actor.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        professionalRole: true,
        patientAccessScope: true,
        canManageUsers: true,
        createdAt: true,
      },
    });
    await tx.auditEvent.create({
      data: {
        userId: actor.id,
        entityType: "UserAccessGrant",
        entityId: grant.id,
        action: "user.access.preauthorize",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: "GOOGLE_LOGIN_PREAUTHORIZED",
      },
    });
    return { kind: "pending" as const, grant };
  });
}

export async function updateClinicalUserAccess(input: {
  targetUserId: string;
  nextRole?: UserRole;
  nextActive?: boolean;
  nextProfessionalRole?: ProfessionalRole;
  nextPatientAccessScope?: PatientAccessScope;
  nextCanManageUsers?: boolean;
  requestId?: string;
}) {
  const actor = await requireRecentUserManager();

  return prisma.$transaction(async (tx) => {
    const [target, activeAdmins, activeManagers] = await Promise.all([
      tx.user.findUnique({ where: { id: input.targetUserId } }),
      tx.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }),
      tx.user.findMany({
        where: { active: true, OR: [{ role: "ADMIN" }, { canManageUsers: true }] },
        select: { id: true },
      }),
    ]);
    if (!target) throw new Error("Usuário alvo não encontrado.");

    if (input.nextProfessionalRole || input.nextPatientAccessScope) {
      assertProfessionalInput({
        professionalRole: input.nextProfessionalRole ?? target.professionalRole,
        patientAccessScope: input.nextPatientAccessScope ?? target.patientAccessScope,
      });
    }

    const derivedRole = input.nextProfessionalRole
      ? (target.role === "ADMIN" ? "ADMIN" : roleForProfessional(input.nextProfessionalRole))
      : target.role;
    const nextRole = input.nextRole ?? derivedRole;
    const targetIsManager = target.role === "ADMIN" || target.canManageUsers;
    const nextManagerState = nextRole === "ADMIN"
      ? true
      : (input.nextCanManageUsers ?? target.canManageUsers);

    assertCanChangeAdminState({
      targetUserId: target.id,
      targetRole: target.role,
      targetActive: target.active,
      nextRole,
      nextActive: input.nextActive,
      activeAdminIds: activeAdmins.map((item) => item.id),
    });
    assertCanChangeUserManagerState({
      targetUserId: target.id,
      targetCanManageUsers: targetIsManager,
      targetActive: target.active,
      nextCanManageUsers: nextManagerState,
      nextActive: input.nextActive,
      activeManagerIds: activeManagers.map((item) => item.id),
    });

    const updated = await tx.user.update({
      where: { id: target.id },
      data: {
        role: nextRole,
        ...(input.nextActive !== undefined ? { active: input.nextActive } : {}),
        ...(input.nextProfessionalRole ? { professionalRole: input.nextProfessionalRole } : {}),
        ...(input.nextPatientAccessScope ? { patientAccessScope: input.nextPatientAccessScope } : {}),
        ...(input.nextCanManageUsers !== undefined ? { canManageUsers: input.nextCanManageUsers } : {}),
        accessManaged: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        professionalRole: true,
        patientAccessScope: true,
        canManageUsers: true,
      },
    });

    if (input.nextActive === false) {
      await tx.userAccessGrant.updateMany({ where: { email: target.email }, data: { active: false } });
    }

    const privilegeChanged = input.nextRole !== undefined
      || input.nextProfessionalRole !== undefined
      || input.nextPatientAccessScope !== undefined
      || input.nextCanManageUsers !== undefined;
    if (privilegeChanged || input.nextActive === false) {
      await tx.session.deleteMany({ where: { userId: target.id } });
    }

    await tx.auditEvent.create({
      data: {
        userId: actor.id,
        entityType: "User",
        entityId: target.id,
        action: "user.access.update",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: input.nextActive === false ? "USER_DISABLED" : "ACCESS_CHANGED",
      },
    });

    return updated;
  });
}

export async function setPatientAssignment(input: {
  targetUserId: string;
  patientId: string;
  active: boolean;
  requestId?: string;
}) {
  const actor = await requireRecentUserManager();

  return prisma.$transaction(async (tx) => {
    const [target, patient] = await Promise.all([
      tx.user.findUnique({ where: { id: input.targetUserId }, select: { id: true, active: true } }),
      tx.patient.findUnique({ where: { id: input.patientId }, select: { id: true } }),
    ]);
    if (!target?.active) throw new Error("Profissional não encontrado ou inativo.");
    if (!patient) throw new Error("Paciente não encontrado.");

    const assignment = await tx.patientUserAssignment.upsert({
      where: {
        userId_patientId: {
          userId: target.id,
          patientId: patient.id,
        },
      },
      create: {
        userId: target.id,
        patientId: patient.id,
        assignedByUserId: actor.id,
        active: input.active,
      },
      update: {
        active: input.active,
        assignedByUserId: actor.id,
      },
      select: { id: true, userId: true, patientId: true, active: true },
    });

    await tx.auditEvent.create({
      data: {
        userId: actor.id,
        entityType: "PatientUserAssignment",
        entityId: assignment.id,
        action: input.active ? "patient.assignment.enable" : "patient.assignment.disable",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: input.active ? "PATIENT_ASSIGNED" : "PATIENT_UNASSIGNED",
      },
    });
    return assignment;
  });
}
