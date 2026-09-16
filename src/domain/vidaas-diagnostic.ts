export const VIDAAS_FAILURE_VISIBILITY_MS = 24 * 60 * 60 * 1000;

export type VidaasSignatureAttempt = {
  status: "PENDING" | "SIGNED" | "FAILED";
  errorCode: string | null;
  updatedAt: Date;
};

export type VidaasFailureClass =
  | `TOKEN_HTTP_${number}`
  | `SIGNATURE_HTTP_${number}`
  | "SIGNED_DOCUMENT_MISSING"
  | "SIGNED_DOCUMENT_INVALID"
  | "SIGNED_DOCUMENT_RESPONSE"
  | "DOCUMENT_TOO_LARGE"
  | "UNSIGNED_DOCUMENT_INTEGRITY"
  | "TOKEN_RESPONSE"
  | "SIGNATURE_RESPONSE"
  | "OTHER";

export function classifyVidaasFailure(errorCode: string | null | undefined): VidaasFailureClass | null {
  if (!errorCode) return null;
  const http = errorCode.match(/^VIDAAS_(TOKEN|SIGNATURE)_HTTP_(\d{3})$/);
  if (http) return `${http[1]}_HTTP_${Number(http[2])}` as VidaasFailureClass;
  if (errorCode === "VIDAAS_SIGNED_DOCUMENT_MISSING") return "SIGNED_DOCUMENT_MISSING";
  if (errorCode === "VIDAAS_SIGNED_DOCUMENT_INVALID") return "SIGNED_DOCUMENT_INVALID";
  if (errorCode.startsWith("VIDAAS_SIGNED_DOCUMENT_")) return "SIGNED_DOCUMENT_RESPONSE";
  if (errorCode === "VIDAAS_DOCUMENT_TOO_LARGE") return "DOCUMENT_TOO_LARGE";
  if (errorCode === "UNSIGNED_DOCUMENT_INTEGRITY_FAILURE") return "UNSIGNED_DOCUMENT_INTEGRITY";
  if (errorCode.startsWith("VIDAAS_TOKEN_")) return "TOKEN_RESPONSE";
  if (errorCode.startsWith("VIDAAS_SIGNATURE_")) return "SIGNATURE_RESPONSE";
  return "OTHER";
}

export function currentVidaasFailureClass(
  latestAttempt: VidaasSignatureAttempt | null | undefined,
  now: Date = new Date(),
): VidaasFailureClass | null {
  if (!latestAttempt || latestAttempt.status !== "FAILED") return null;
  const ageMs = now.getTime() - latestAttempt.updatedAt.getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > VIDAAS_FAILURE_VISIBILITY_MS) return null;
  return classifyVidaasFailure(latestAttempt.errorCode);
}
