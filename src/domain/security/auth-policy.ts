export type UserRole = "ADMIN" | "PHYSICIAN" | "READ_ONLY";
export type ProfessionalRole =
  | "MEDICO"
  | "FISIOTERAPEUTA"
  | "NUTRICIONISTA"
  | "PSICOLOGO"
  | "FONOAUDIOLOGO";
export type PatientAccessScope = "ALL_PATIENTS" | "ASSIGNED_PATIENTS";

export type Permission =
  | "patient.read"
  | "patient.write"
  | "consultation.write"
  | "consultation.finalize"
  | "document.generate"
  | "professional.evolution.write"
  | "user.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  ADMIN: new Set<Permission>([
    "patient.read",
    "patient.write",
    "consultation.write",
    "consultation.finalize",
    "document.generate",
    "professional.evolution.write",
    "user.manage",
    "audit.read",
  ]),
  PHYSICIAN: new Set<Permission>([
    "patient.read",
    "patient.write",
    "consultation.write",
    "consultation.finalize",
    "document.generate",
    "professional.evolution.write",
  ]),
  READ_ONLY: new Set<Permission>(["patient.read"]),
};

const ALLIED_PROFESSIONAL_PERMISSIONS = new Set<Permission>([
  "patient.read",
  "professional.evolution.write",
]);

export interface AccessProfile {
  role: UserRole;
  professionalRole: ProfessionalRole;
  canManageUsers: boolean;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function parseEmailSet(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(/[;,\n]/)
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export function isEmailAllowed(email: string, allowed: ReadonlySet<string>): boolean {
  return allowed.has(normalizeEmail(email));
}

export function roleForFirstLogin(input: {
  email: string;
  bootstrapAdmins: ReadonlySet<string>;
}): UserRole {
  return input.bootstrapAdmins.has(normalizeEmail(input.email)) ? "ADMIN" : "PHYSICIAN";
}

export function roleForProfessional(professionalRole: ProfessionalRole): UserRole {
  return professionalRole === "MEDICO" ? "PHYSICIAN" : "READ_ONLY";
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permissão negada: ${permission}.`);
  }
}

export function hasAccessProfilePermission(profile: AccessProfile, permission: Permission): boolean {
  if (profile.role === "ADMIN") return true;
  if (permission === "user.manage") return profile.canManageUsers;
  if (profile.professionalRole === "MEDICO") return hasPermission(profile.role, permission);
  return ALLIED_PROFESSIONAL_PERMISSIONS.has(permission);
}

export function assertAccessProfilePermission(profile: AccessProfile, permission: Permission): void {
  if (!hasAccessProfilePermission(profile, permission)) {
    throw new Error(`Permissão negada: ${permission}.`);
  }
}

export interface SecurityUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
}

export function assertActiveAllowedUser(input: {
  user: SecurityUser;
  allowedEmails: ReadonlySet<string>;
}): void {
  if (!input.user.active) {
    throw new Error("Usuário inativo.");
  }
  if (!isEmailAllowed(input.user.email, input.allowedEmails)) {
    throw new Error("Usuário fora da lista de acesso autorizada.");
  }
}

export function assertRecentAuthentication(input: {
  authenticatedAt: Date;
  now?: Date;
  maxAgeSeconds?: number;
}): void {
  const now = input.now ?? new Date();
  const maxAgeSeconds = input.maxAgeSeconds ?? 10 * 60;
  const ageMs = now.getTime() - input.authenticatedAt.getTime();
  if (ageMs < 0 || ageMs > maxAgeSeconds * 1000) {
    throw new Error("Ação sensível exige autenticação recente.");
  }
}

export function assertCanChangeAdminState(input: {
  targetUserId: string;
  targetRole: UserRole;
  targetActive: boolean;
  nextRole?: UserRole;
  nextActive?: boolean;
  activeAdminIds: readonly string[];
}): void {
  const removingAdmin =
    input.targetRole === "ADMIN" &&
    input.targetActive &&
    (input.nextRole !== undefined && input.nextRole !== "ADMIN" || input.nextActive === false);

  if (removingAdmin) {
    const otherActiveAdmins = input.activeAdminIds.filter((id) => id !== input.targetUserId);
    if (otherActiveAdmins.length === 0) {
      throw new Error("Não é permitido remover ou desativar o último administrador ativo.");
    }
  }
}

export function assertCanChangeUserManagerState(input: {
  targetUserId: string;
  targetCanManageUsers: boolean;
  targetActive: boolean;
  nextCanManageUsers?: boolean;
  nextActive?: boolean;
  activeManagerIds: readonly string[];
}): void {
  const removingManager =
    input.targetCanManageUsers &&
    input.targetActive &&
    (input.nextCanManageUsers === false || input.nextActive === false);

  if (!removingManager) return;
  const otherActiveManagers = input.activeManagerIds.filter((id) => id !== input.targetUserId);
  if (otherActiveManagers.length === 0) {
    throw new Error("Não é permitido remover ou desativar o último gestor de usuários ativo.");
  }
}
