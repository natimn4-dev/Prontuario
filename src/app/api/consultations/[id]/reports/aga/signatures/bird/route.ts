import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { beginAgaBirdSignature } from "@/server/signatures/bird-signature-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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

    const result = await beginAgaBirdSignature({ consultationId, snapshotId, user });
    const response = NextResponse.json({
      signatureId: result.signatureId,
      authorizationUrl: result.authorizationUrl,
      expiresAt: result.expiresAt.toISOString(),
    }, { status: 201 });
    response.cookies.set("bird_pkce", `${result.signatureId}.${result.pkceVerifier}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.APP_URL ?? "").startsWith("https://"),
      path: "/api/signatures/bird",
      expires: result.expiresAt,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "BIRD_SIGNATURE_START_FAILED";
    const consultationNotFinalized = message === "CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE";
    const finalizedSnapshotRequired = message === "FINALIZED_REPORT_SNAPSHOT_REQUIRED";
    const notConfigured = message.startsWith("BIRD_NOT_CONFIGURED") || message.startsWith("BIRD_CONFIGURATION_INVALID");
    return NextResponse.json({
      code: consultationNotFinalized
        ? "CONSULTATION_NOT_FINALIZED_FOR_SIGNATURE"
        : finalizedSnapshotRequired
          ? "FINALIZED_REPORT_SNAPSHOT_REQUIRED"
          : notConfigured
            ? "BIRD_NOT_CONFIGURED"
            : "BIRD_SIGNATURE_START_FAILED",
      message: consultationNotFinalized
        ? "Finalize a consulta antes de assinar o relatório final."
        : finalizedSnapshotRequired
          ? "A prévia selecionada foi gerada antes da finalização. Gere uma nova prévia após finalizar a consulta e assine essa nova versão."
          : notConfigured
            ? "A assinatura Bird ID ainda não está configurada neste ambiente. O VIDaaS permanece disponível."
            : "Não foi possível iniciar a assinatura digital com o Bird ID.",
    }, { status: notConfigured ? 503 : consultationNotFinalized || finalizedSnapshotRequired ? 409 : 400 });
  }
}
