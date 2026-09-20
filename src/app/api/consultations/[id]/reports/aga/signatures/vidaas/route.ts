import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { beginAgaVidaasSignature } from "@/server/signatures/digital-signature-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: consultationId } = await context.params;
    const { user } = await requireAuthenticatedUser("document.generate");
    const body = await request.json().catch(() => ({})) as { snapshotId?: unknown };
    const snapshotId = typeof body.snapshotId === "string" && body.snapshotId.trim()
      ? body.snapshotId.trim()
      : null;
    if (!snapshotId) {
      return NextResponse.json({
        code: "SNAPSHOT_REQUIRED",
        message: "Finalize a consulta e gere uma nova prévia após a finalização. Revise essa prévia e use a mesma versão para assinar.",
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
    const consultationNotFinalized = message === "CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE";
    const finalizedSnapshotRequired = message === "FINALIZED_REPORT_SNAPSHOT_REQUIRED";
    const adminBootstrapRequired = message === "VIDAAS_BOOTSTRAP_ADMIN_REQUIRED";
    const notConfigured =
      message.startsWith("VIDAAS_NOT_CONFIGURED") ||
      message.startsWith("VIDAAS_CONFIGURATION_INVALID") ||
      message.startsWith("VIDAAS_CREDENTIAL_") ||
      adminBootstrapRequired;
    return NextResponse.json({
      code: consultationNotFinalized
        ? "CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE"
        : finalizedSnapshotRequired
          ? "FINALIZED_REPORT_SNAPSHOT_REQUIRED"
          : adminBootstrapRequired
            ? "VIDAAS_BOOTSTRAP_ADMIN_REQUIRED"
            : notConfigured
              ? "VIDAAS_NOT_CONFIGURED"
              : "VIDAAS_SIGNATURE_START_FAILED",
      message: consultationNotFinalized
        ? "Finalize a consulta antes de assinar o relatório final."
        : finalizedSnapshotRequired
          ? "A prévia selecionada foi gerada antes da finalização. Gere uma nova prévia após finalizar a consulta e assine essa nova versão."
          : adminBootstrapRequired
            ? "A integração VIDaaS precisa ser inicializada uma vez por um administrador autorizado."
            : notConfigured
              ? "A assinatura VIDaaS ainda não está configurada corretamente neste ambiente."
              : "Não foi possível iniciar a assinatura digital com o VIDaaS.",
    }, { status: notConfigured ? 503 : consultationNotFinalized || finalizedSnapshotRequired ? 409 : 400 });
  }
}
