import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "../db";
import {
  assertActiveAllowedUser,
  assertPermission,
  parseEmailSet,
  type Permission,
} from "../../domain/security/auth-policy";
import { AccessForbiddenError, AuthenticationRequiredError } from "./access-errors";

export async function requireAuthenticatedUser(permission?: Permission) {
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session?.user?.id) {
    throw new AuthenticationRequiredError();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  if (!user) throw new AccessForbiddenError();

  try {
    assertActiveAllowedUser({
      user,
      allowedEmails: parseEmailSet(process.env.AUTH_ALLOWED_EMAILS),
    });

    if (permission) assertPermission(user.role, permission);
  } catch {
    throw new AccessForbiddenError();
  }

  return { session, user };
}
