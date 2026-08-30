import { createHash, randomBytes } from "node:crypto";

const SHA256_OID = "2.16.840.1.101.3.4.2.1";
const MAX_DOCUMENT_BYTES = 7 * 1024 * 1024;
const ALLOWED_PADES_FORMATS = new Set(["PAdES_AD_RB", "PAdES_AD_RT"]);
const VIDAAS_HML_BASE_URL = "https://hml-certificado.vidaas.com.br";
const VIDAAS_PRODUCTION_BASE_URL = "https://certificado.vidaas.com.br";
const ALLOWED_VIDAAS_BASE_URLS = new Set([VIDAAS_HML_BASE_URL, VIDAAS_PRODUCTION_BASE_URL]);

export type VidaasConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  signatureFormat: "PAdES_AD_RB" | "PAdES_AD_RT";
};

export type VidaasStaticConfig = Omit<VidaasConfig, "clientId" | "clientSecret">;
export type VidaasApplicationCredentials = Pick<VidaasConfig, "clientId" | "clientSecret">;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`VIDAAS_NOT_CONFIGURED:${name}`);
  return value;
}

export function getVidaasStaticConfig(): VidaasStaticConfig {
  const appUrl = required("APP_URL").replace(/\/$/, "");
  const configuredBaseUrl = process.env.VIDAAS_BASE_URL?.trim().replace(/\/$/, "");
  const baseUrl = configuredBaseUrl || (process.env.NODE_ENV === "production"
    ? VIDAAS_PRODUCTION_BASE_URL
    : VIDAAS_HML_BASE_URL);
  const redirectUri = process.env.VIDAAS_REDIRECT_URI?.trim() || `${appUrl}/api/signatures/vidaas/callback`;
  const signatureFormat = process.env.VIDAAS_SIGNATURE_FORMAT?.trim() || "PAdES_AD_RB";

  if (!ALLOWED_VIDAAS_BASE_URLS.has(baseUrl)) {
    throw new Error("VIDAAS_CONFIGURATION_INVALID:BASE_URL");
  }
  if (!redirectUri.startsWith("https://") && !redirectUri.startsWith("http://localhost")) {
    throw new Error("VIDAAS_CONFIGURATION_INVALID:REDIRECT_URI");
  }
  if (!ALLOWED_PADES_FORMATS.has(signatureFormat)) {
    throw new Error("VIDAAS_CONFIGURATION_INVALID:SIGNATURE_FORMAT");
  }

  return {
    baseUrl,
    redirectUri,
    signatureFormat: signatureFormat as VidaasStaticConfig["signatureFormat"],
  };
}

export function getVidaasEnvironmentCredentials(): VidaasApplicationCredentials | null {
  const clientId = process.env.VIDAAS_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.VIDAAS_CLIENT_SECRET?.trim() || "";
  if (!clientId && !clientSecret) return null;
  if (!clientId) throw new Error("VIDAAS_CONFIGURATION_INVALID:CLIENT_ID");
  if (!clientSecret) throw new Error("VIDAAS_CONFIGURATION_INVALID:CLIENT_SECRET");
  return { clientId, clientSecret };
}

export function combineVidaasConfig(
  staticConfig: VidaasStaticConfig,
  credentials: VidaasApplicationCredentials,
): VidaasConfig {
  return { ...staticConfig, ...credentials };
}

export async function registerVidaasApplication(input: {
  staticConfig: VidaasStaticConfig;
  supportEmail: string;
}): Promise<VidaasApplicationCredentials> {
  const supportEmail = input.supportEmail.trim().toLowerCase();
  if (!supportEmail || !supportEmail.includes("@")) {
    throw new Error("VIDAAS_APPLICATION_EMAIL_INVALID");
  }

  const response = await fetch(`${input.staticConfig.baseUrl}/v0/oauth/application`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: "Prontuário Aprimorado",
      comments: "Assinatura digital PAdES de relatórios clínicos AGA com autorização do profissional.",
      redirect_uris: [input.staticConfig.redirectUri],
      email: supportEmail,
    }),
    cache: "no-store",
  });
  const payload = await parseJsonResponse(response, "APPLICATION");
  const clientId = payload.client_id;
  const clientSecret = payload.client_secret;
  if (typeof clientId !== "string" || !clientId || typeof clientSecret !== "string" || !clientSecret) {
    throw new Error("VIDAAS_APPLICATION_CREDENTIALS_MISSING");
  }
  return { clientId, clientSecret };
}

export function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Base64(value: Buffer): string {
  return createHash("sha256").update(value).digest("base64");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildVidaasAuthorizationUrl(input: {
  config: VidaasConfig;
  challenge: string;
  state: string;
}): string {
  const url = new URL(`${input.config.baseUrl}/v0/oauth/authorize`);
  url.searchParams.set("client_id", input.config.clientId);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "single_signature");
  url.searchParams.set("login_hint", "");
  url.searchParams.set("redirect_uri", input.config.redirectUri);
  url.searchParams.set("state", input.state);
  return url.toString();
}

async function parseJsonResponse(response: Response, operation: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`VIDAAS_${operation}_INVALID_RESPONSE`);
  }
  if (!response.ok) throw new Error(`VIDAAS_${operation}_HTTP_${response.status}`);
  if (!payload || typeof payload !== "object") throw new Error(`VIDAAS_${operation}_INVALID_RESPONSE`);
  return payload as Record<string, unknown>;
}

export async function exchangeVidaasAuthorizationCode(input: {
  config: VidaasConfig;
  code: string;
  verifier: string;
}): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: input.config.clientId,
    client_secret: input.config.clientSecret,
    code: input.code,
    code_verifier: input.verifier,
  });
  const response = await fetch(`${input.config.baseUrl}/v0/oauth/token`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const payload = await parseJsonResponse(response, "TOKEN");
  const accessToken = payload.access_token;
  if (typeof accessToken !== "string" || !accessToken) throw new Error("VIDAAS_TOKEN_MISSING");
  return accessToken;
}

export async function signPdfWithVidaas(input: {
  config: VidaasConfig;
  accessToken: string;
  documentId: string;
  pdf: Buffer;
}): Promise<{ signedPdf: Buffer; certificateAlias?: string }> {
  if (input.pdf.length > MAX_DOCUMENT_BYTES) throw new Error("VIDAAS_DOCUMENT_TOO_LARGE");

  const response = await fetch(`${input.config.baseUrl}/v0/oauth/signature`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${input.accessToken}`,
    },
    body: JSON.stringify({
      hashes: [{
        id: input.documentId,
        alias: `relatorio-aga-${input.documentId}.pdf`,
        hash: sha256Base64(input.pdf),
        hash_algorithm: SHA256_OID,
        signature_format: input.config.signatureFormat,
        padding_method: "PKCS1V1_5",
        pdf_signature_page: false,
        base64_content: input.pdf.toString("base64"),
      }],
    }),
    cache: "no-store",
  });
  const payload = await parseJsonResponse(response, "SIGNATURE");
  const signatures = payload.signatures;
  if (!Array.isArray(signatures) || !signatures[0] || typeof signatures[0] !== "object") {
    throw new Error("VIDAAS_SIGNED_DOCUMENT_MISSING");
  }
  const rawSignature = (signatures[0] as Record<string, unknown>).raw_signature;
  if (typeof rawSignature !== "string" || !rawSignature) throw new Error("VIDAAS_SIGNED_DOCUMENT_MISSING");

  const signedPdf = Buffer.from(rawSignature.replace(/\r?\n/g, ""), "base64");
  if (signedPdf.length < 5 || signedPdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("VIDAAS_SIGNED_DOCUMENT_INVALID");
  }
  const certificateAlias = typeof payload.certificate_alias === "string" ? payload.certificate_alias : undefined;
  return { signedPdf, certificateAlias };
}

export const vidaasLimits = Object.freeze({ maxDocumentBytes: MAX_DOCUMENT_BYTES });
export const vidaasEndpoints = Object.freeze({
  homologation: VIDAAS_HML_BASE_URL,
  production: VIDAAS_PRODUCTION_BASE_URL,
});
