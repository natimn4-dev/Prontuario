import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { buildPublicAuthReadiness } from "@/domain/security/auth-readiness";
import { prisma } from "@/server/db";

const VIDAAS_DIAGNOSTIC_TOKEN_SHA256 = "aba53744d206b12ac8bcb8755f49bf68a8551da983cb53a965af69b7d17beaf8";

function diagnosticAuthorized(request: Request): boolean {
  const token = new URL(request.url).searchParams.get("vidaasDiagnosticToken") ?? "";
  if (!token) return false;
  return createHash("sha256").update(token, "utf8").digest("hex") === VIDAAS_DIAGNOSTIC_TOKEN_SHA256;
}

export async function GET(request: Request) {
  const headers = request.headers;
  const readiness = buildPublicAuthReadiness(
    {
      appUrl: process.env.APP_URL,
      betterAuthSecret: process.env.BETTER_AUTH_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowedEmails: process.env.AUTH_ALLOWED_EMAILS,
      bootstrapAdminEmails: process.env.AUTH_BOOTSTRAP_ADMIN_EMAILS,
    },
    {
      requestUrl: request.url,
      forwardedProto: headers.get("x-forwarded-proto"),
      forwardedHost: headers.get("x-forwarded-host"),
      host: headers.get("host"),
    },
  );

  if (diagnosticAuthorized(request)) {
    const latestFailure = await prisma.digitalSignature.findFirst({
      where: { provider: "VIDAAS", status: "FAILED" },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { errorCode: true },
    });
    return NextResponse.json({
      ...readiness,
      vidaasDiagnostic: {
        lastFailureCode: latestFailure?.errorCode ?? null,
      },
    }, {
      status: readiness.status === "ready" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
