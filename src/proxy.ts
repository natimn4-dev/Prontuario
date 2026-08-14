import type { NextRequest } from "next/server.js";
import { parseEmailSet } from "./domain/security/auth-policy";
import { isWorkspaceSessionAuthorized } from "./domain/security/route-access";
import { auth } from "./server/auth/auth";
import { createRequestGuard } from "./server/auth/request-guard";

const allowedEmails = parseEmailSet(process.env.AUTH_ALLOWED_EMAILS);

const guardRequest = createRequestGuard(async (requestHeaders) => {
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });

  return isWorkspaceSessionAuthorized(session?.user, allowedEmails);
});

export async function proxy(request: NextRequest) {
  return guardRequest(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
