import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import { beginAgaVidaasSignature } from "@/server/signatures/digital-signature-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: consultationId } = await context.params;
    const { user } = await requireAuthenticatedUser("document.generate");
    const body = await request.json().catch(() => ({})) as { snapshotId?: unknown };
    const requestedSnapshotId = typeof body.snapshotId === "string" && body.snapshotId ? body.snapshotId : null;
    const latestSnapshot = requestedSnapshotId ? null : await prisma.documentSnapshot.findFirst({
      where: { consultationId, type: "AGA_REPORT", generatedById: user.id },
      orderBy: [{ createdAt: "desc" }, { version: "desc" }],
      select: { id: true },
    });
    const snapshotId = requestedSnapshotId ?? latestSnapshot?.id;
    if (!snapshotId) {
      return NextResponse.json({
        code: "SNAPSHOT_REQUIRED",
        message: "Gere a prévia do relatório, revise o conteúdo e então inicie a assinatura.",
      }, { status: 400 });
    }

    const result = await beginAgaVidaasSignature({ consultationId, snapshotId, user });
    const response = NextResponse.json({
      signatureId: result.signatureId,
      authorizationUrl: result.authorizationUrl,
      expiresAt: result.expiresAt.toISOString(),
    }, { status: 201 });

    response.cookies.set("vidaas_pkce", `${result.signatureId}.${result.pkceVerifier}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.APP_URL ?? "").startsWith("https://"),
      path: "/api/signatures/vidaas",
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível iniciar a assinatura digital.";
    const notConfigured = message.startsWith("VIDAAS_NOT_CONFIGURED") || message.startsWith("VIDAAS_CONFIGURATION_INVALID");
    return NextResponse.json({
      code: notConfigured ? "VIDAAS_NOT_CONFIGURED" : "VIDAAS_SIGNATURE_START_FAILED",
      message: notConfigured
        ? "A assinatura VIDaaS ainda não está configurada neste ambiente."
        : "Não foi possível iniciar a assinatura digital com o VIDaaS.",
    }, { status: notConfigured ? 503 : 400 });
  }
}
