import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import { beginAdvanceDirectivesVidaasSignature } from "@/server/signatures/digital-signature-service";

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
        message: "Gere a prévia do relatório, revise a aba de diretivas antecipadas e então inicie a assinatura.",
      }, { status: 400 });
    }

    const result = await beginAdvanceDirectivesVidaasSignature({ consultationId, snapshotId, user });
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
    const adminBootstrapRequired = message === "VIDAAS_BOOTSTRAP_ADMIN_REQUIRED";
    const notConfigured =
      message.startsWith("VIDAAS_NOT_CONFIGURED")
      || message.startsWith("VIDAAS_CONFIGURATION_INVALID")
      || message.startsWith("VIDAAS_CREDENTIAL_")
      || adminBootstrapRequired;
    const directivesUnavailable = message === "ADVANCE_DIRECTIVES_NOT_AVAILABLE";
    return NextResponse.json({
      code: adminBootstrapRequired
        ? "VIDAAS_BOOTSTRAP_ADMIN_REQUIRED"
        : notConfigured
          ? "VIDAAS_NOT_CONFIGURED"
          : directivesUnavailable
            ? "ADVANCE_DIRECTIVES_NOT_AVAILABLE"
            : "VIDAAS_SIGNATURE_START_FAILED",
      message: adminBootstrapRequired
        ? "A integração VIDaaS precisa ser inicializada uma vez por um administrador autorizado."
        : notConfigured
          ? "A assinatura VIDaaS ainda não está configurada corretamente neste ambiente."
          : directivesUnavailable
            ? "Não há diretivas antecipadas disponíveis na prévia mais recente. Atualize a prévia e revise a aba de diretivas antes de assinar."
            : "Não foi possível iniciar a assinatura digital das diretivas antecipadas com o VIDaaS.",
    }, { status: notConfigured ? 503 : 400 });
  }
}
