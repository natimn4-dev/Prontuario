import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { completeAgaVidaasSignature } from "@/server/signatures/digital-signature-service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json({ code: "VIDAAS_CALLBACK_INVALID", message: "Retorno do VIDaaS incompleto." }, { status: 400 });
  }

  try {
    const { user } = await requireAuthenticatedUser("document.generate");
    const signatureId = state.split(".", 1)[0];
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookieValue = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("vidaas_pkce="))
      ?.slice("vidaas_pkce=".length);
    if (!cookieValue || !cookieValue.startsWith(`${signatureId}.`)) {
      return NextResponse.json({ code: "VIDAAS_PKCE_MISSING", message: "A autorização expirou. Inicie a assinatura novamente." }, { status: 400 });
    }
    const verifier = decodeURIComponent(cookieValue).slice(signatureId.length + 1);
    const result = await completeAgaVidaasSignature({ code, state, pkceVerifier: verifier, user });
    const appUrl = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const params = new URLSearchParams({
      signedDocument: result.signatureId,
      signedDocumentKind: result.documentKind,
    });
    const redirect = NextResponse.redirect(`${appUrl}/consultations/${result.consultationId}?${params.toString()}#relatorio`);
    redirect.cookies.set("vidaas_pkce", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: appUrl.startsWith("https://"),
      path: "/api/signatures/vidaas",
      maxAge: 0,
    });
    return redirect;
  } catch {
    return NextResponse.json({
      code: "VIDAAS_SIGNATURE_FAILED",
      message: "A assinatura não foi concluída. O documento original permaneceu inalterado; inicie uma nova tentativa.",
    }, { status: 400 });
  }
}
