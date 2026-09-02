export type ExistingUserRole = "ADMIN" | "PHYSICIAN" | "READ_ONLY";
export type Program55Discipline = "PHYSICIAN" | "PHYSIOTHERAPY" | "NUTRITION" | "PSYCHOLOGY";

export interface Program55MembershipGrant {
  discipline: Program55Discipline;
  active: boolean;
}

export interface Program55ActorAccess {
  userId: string;
  role: ExistingUserRole;
  memberships: readonly Program55MembershipGrant[];
}

export function canManageProgram55(actor: Program55ActorAccess): boolean {
  return actor.role === "ADMIN" || actor.role === "PHYSICIAN";
}

export function canWriteProgram55Discipline(
  actor: Program55ActorAccess,
  discipline: Program55Discipline,
): boolean {
  if ((actor.role === "ADMIN" || actor.role === "PHYSICIAN") && discipline === "PHYSICIAN") return true;
  return actor.memberships.some((membership) => membership.active && membership.discipline === discipline);
}

export function canWriteProgram55SharedData(actor: Program55ActorAccess): boolean {
  return canManageProgram55(actor) || actor.memberships.some((membership) => membership.active);
}

export function canReadRestrictedPsychologyNote(
  actor: Program55ActorAccess,
  noteAuthorUserId: string,
): boolean {
  if (actor.userId === noteAuthorUserId) return true;
  return actor.memberships.some((membership) => membership.active && membership.discipline === "PSYCHOLOGY");
}

export function canWriteRestrictedPsychologyNote(actor: Program55ActorAccess): boolean {
  return actor.memberships.some((membership) => membership.active && membership.discipline === "PSYCHOLOGY");
}
