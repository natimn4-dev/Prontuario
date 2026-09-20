import { NextResponse } from "next/server";
import { buildPublicAuthReadiness } from "@/domain/security/auth-readiness";
import { WORKSPACE_ACCESS_CONTRACT_VERSION } from "@/domain/security/route-access";
import { currentVidaasFailureClass } from "@/domain/vidaas-diagnostic";
import { prisma } from "@/server/db";

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

  const latestAttempt = await prisma.digitalSignature.findFirst({
    where: { provider: "VIDAAS" },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { status: true, errorCode: true, updatedAt: true },
  });

  return NextResponse.json({
    ...readiness,
    accessContract: WORKSPACE_ACCESS_CONTRACT_VERSION,
    vidaasFailureClass: currentVidaasFailureClass(latestAttempt),
  }, {
    status: readiness.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
