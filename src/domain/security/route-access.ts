export type RouteAccess = "public" | "authenticated" | "redirect-login" | "unauthorized-api";

export const WORKSPACE_ACCESS_CONTRACT_VERSION = "managed-or-approved-v2" as const;

export interface WorkspaceSessionUser {
  id?: string | null;
  email?: string | null;
  active?: boolean | null;
  accessManaged?: boolean | null;
}

function normalizedPath(pathname: string): string {
  if (!pathname.startsWith("/")) return `/${pathname}`;
  if (pathname.length === 1) return pathname;
  return pathname.replace(/\/+$/, "");
}

export function isPublicRoute(pathname: string): boolean {
  const path = normalizedPath(pathname);
  return path === "/login"
    // Rota sintética exclusiva da branch de inspeção visual; não usa sessão,
    // banco ou dados clínicos reais.
    || path === "/visual-dietary"
    || path === "/auth/google"
    || path === "/auth/error"
    || path === "/api/health"
    || path === "/api/health/assets"
    || path === "/api/health/auth"
    || path === "/api/auth"
    || path.startsWith("/api/auth/")
    || path === "/verificar"
    || path.startsWith("/verificar/")
    || path === "/favicon.ico"
    || path === "/robots.txt"
    || path === "/sitemap.xml"
    || path.startsWith("/_next/");
}

export function isWorkspaceSessionAuthorized(
  user: WorkspaceSessionUser | null | undefined,
  emailAuthorized: boolean,
): boolean {
  return Boolean(
    user?.id
      && user.email
      && user.active === true
      && (user.accessManaged === true || emailAuthorized),
  );
}

export function routeAccessFor(input: {
  pathname: string;
  authenticated: boolean;
}): RouteAccess {
  const path = normalizedPath(input.pathname);
  if (isPublicRoute(path)) return "public";
  if (input.authenticated) return "authenticated";
  return path === "/api" || path.startsWith("/api/")
    ? "unauthorized-api"
    : "redirect-login";
}
