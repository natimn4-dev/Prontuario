import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { auth, isAuthorizedEmail } from "./auth";
import { prisma } from "../db";
import {
  assertAccessProfilePermission,
  type Permission,
} from "../../domain/security/auth-policy";
import {
  isCiE2EAuthEnvironment,
  isSyntheticCiEmail,
} from "../../domain/security/ci-e2e-auth-policy";
import { AccessForbiddenError, AuthenticationRequiredError } from "./access-errors";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  professionalRole: true,
  patientAccessScope: true,
  canManageUsers: true,
  accessManaged: true,
} as const;

function secretsMatch(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function ciE2EUser(requestHeaders: Headers) {
  if (!isCiE2EAuthEnvironment()) return null;

  const email = requestHeaders.get("x-prontuario-e2e-user")?.trim() ?? "";
  const receivedSecret = requestHeaders.get("x-prontuario-e2e-secret") ?? "";
  const expectedSecret = process.env.E2E_AUTH_SECRET ?? "";

  if (!isSyntheticCiEmail(email) || !receivedSecret || !secretsMatch(receivedSecret, expectedSecret)) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: userSelect,
  });

  if (!user?.active || !user.accessManaged) return null;

  return {
    session: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ciE2E: true as const,
    },
    user,
  };
}

export async function requireAuthenticatedUser(permission?: Permission) {
  const requestHeaders = await headers();
  const synthetic = await ciE2EUser(requestHeaders);

  const session = synthetic?.session ?? await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });

  if (!session?.user?.id) {
    throw new AuthenticationRequiredError();
  }

  const user = synthetic?.user ?? await prisma.user.findUnique({
    where: { id: session.user.id },
    select: userSelect,
  });

  if (!user) throw new AccessForbiddenError();

  try {
    if (!user.active || (!user.accessManaged && !isAuthorizedEmail(user.email))) {
      throw new Error("Usuário inativo ou fora do contrato de acesso autorizado.");
    }

    if (permission) {
      assertAccessProfilePermission({
        role: user.role,
        professionalRole: user.professionalRole,
        canManageUsers: user.canManageUsers,
      }, permission);
    }
  } catch {
    throw new AccessForbiddenError();
  }

  return { session, user };
}
