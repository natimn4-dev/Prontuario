import { NextResponse } from "next/server";
import { buildPublicAuthReadiness } from "@/domain/security/auth-readiness";
import { prisma } from "@/server/db";

function classifyVidaasFailure(errorCode: string | null | undefined): string | null {
  if (!errorCode) return null;
  const http = errorCode.match(/^VIDAAS_(TOKEN|SIGNATURE)_HTTP_(\d{3})$/);
  if (http) return `${http[1]}_HTTP_${http[2]}`;
  if (errorCode === "VIDAAS_SIGNED_DOCUMENT_MISSING") return "SIGNED_DOCUMENT_MISSING";
  if (errorCode === "VIDAAS_SIGNED_DOCUMENT_INVALID") return "SIGNED_DOCUMENT_INVALID";
  if (errorCode.startsWith("VIDAAS_SIGNED_DOCUMENT_")) return "SIGNED_DOCUMENT_RESPONSE";
  if (errorCode === "VIDAAS_DOCUMENT_TOO_LARGE") return "DOCUMENT_TOO_LARGE";
  if (errorCode === "UNSIGNED_DOCUMENT_INTEGRITY_FAILURE") return "UNSIGNED_DOCUMENT_INTEGRITY";
  if (errorCode.startsWith("VIDAAS_TOKEN_")) return "TOKEN_RESPONSE";
  if (errorCode.startsWith("VIDAAS_SIGNATURE_")) return "SIGNATURE_RESPONSE";
  return "OTHER";
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

  const latestFailure = await prisma.digitalSignature.findFirst({
    where: { provider: "VIDAAS", status: "FAILED" },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { errorCode: true },
  });

  return NextResponse.json({
    ...readiness,
    vidaasFailureClass: classifyVidaasFailure(latestFailure?.errorCode),
  }, {
    status: readiness.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
