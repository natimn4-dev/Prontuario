import { NextResponse, type NextRequest } from "next/server.js";
import { isPublicRoute, routeAccessFor } from "../../domain/security/route-access.ts";

export type SessionValidator = (headers: Headers) => Promise<boolean>;

function preventSharedCaching(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.append("Vary", "Cookie");
  return response;
}

export function createRequestGuard(validateSession: SessionValidator) {
  return async function guardRequest(request: NextRequest): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;

    // Rotas públicas não consultam sessão nem banco de autenticação, mas também
    // não podem ser armazenadas por cache compartilhado. O login e o bootstrap
    // OAuth mudam com a release e precisam sempre chegar ao origin.
    if (isPublicRoute(pathname)) return preventSharedCaching(NextResponse.next());

    let authenticated = false;
    try {
      authenticated = await validateSession(request.headers);
    } catch {
      // Falha de validação ou indisponibilidade da sessão deve falhar fechada.
      authenticated = false;
    }

    const access = routeAccessFor({ pathname, authenticated });
    if (access === "authenticated") return preventSharedCaching(NextResponse.next());
    if (access === "unauthorized-api") {
      return preventSharedCaching(NextResponse.json(
        { code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." },
        { status: 401 },
      ));
    }

    return preventSharedCaching(NextResponse.redirect(new URL("/login", request.url)));
  };
}
