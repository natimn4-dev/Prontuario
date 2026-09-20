import type { NextRequest } from "next/server.js";
import { hasCiE2ERequestCredentials } from "./domain/security/ci-e2e-auth-policy";
import { auth, isWorkspaceAccessAuthorized } from "./server/auth/auth";
import { createRequestGuard } from "./server/auth/request-guard";

const guardRequest = createRequestGuard(async (requestHeaders) => {
  if (hasCiE2ERequestCredentials(requestHeaders)) return true;

  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });

  return isWorkspaceAccessAuthorized(session?.user);
});

export async function proxy(request: NextRequest) {
  return guardRequest(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
