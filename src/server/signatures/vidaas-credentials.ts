import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import { prisma } from "@/server/db";
import {
  combineVidaasConfig,
  getVidaasEnvironmentCredentials,
  getVidaasStaticConfig,
  registerVidaasApplication,
  type VidaasApplicationCredentials,
  type VidaasConfig,
} from "./vidaas-client";

const PROVIDER = "VIDAAS";
const ENVELOPE_VERSION = 1;
const AAD = Buffer.from("prontuario:integration:vidaas:v1", "utf8");
const HKDF_SALT = Buffer.from("prontuario:integration-secrets:v1", "utf8");
const HKDF_INFO = Buffer.from("VIDAAS", "utf8");

type BootstrapUser = {
  id: string;
  email: string;
  role: "ADMIN" | "PHYSICIAN" | "READ_ONLY";
};

type CredentialEnvelope = {
  version: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
};

function integrationEncryptionKey(): Buffer {
  const rootSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!rootSecret || rootSecret.length < 32) {
    throw new Error("VIDAAS_CREDENTIAL_ENCRYPTION_KEY_INVALID");
  }
  return Buffer.from(hkdfSync("sha256", Buffer.from(rootSecret, "utf8"), HKDF_SALT, HKDF_INFO, 32));
}

function encryptCredentials(credentials: VidaasApplicationCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", integrationEncryptionKey(), iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  const envelope: CredentialEnvelope = {
    version: ENVELOPE_VERSION,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
  return JSON.stringify(envelope);
}

function decryptCredentials(encryptedPayload: string): VidaasApplicationCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encryptedPayload);
  } catch {
    throw new Error("VIDAAS_CREDENTIAL_PAYLOAD_INVALID");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("VIDAAS_CREDENTIAL_PAYLOAD_INVALID");
  const envelope = parsed as Partial<CredentialEnvelope>;
  if (
    envelope.version !== ENVELOPE_VERSION ||
    typeof envelope.iv !== "string" ||
    typeof envelope.authTag !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new Error("VIDAAS_CREDENTIAL_PAYLOAD_INVALID");
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      integrationEncryptionKey(),
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAAD(AAD);
    decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const credentials = JSON.parse(plaintext) as Partial<VidaasApplicationCredentials>;
    if (typeof credentials.clientId !== "string" || !credentials.clientId) {
      throw new Error("VIDAAS_CREDENTIAL_PAYLOAD_INVALID");
    }
    if (typeof credentials.clientSecret !== "string" || !credentials.clientSecret) {
      throw new Error("VIDAAS_CREDENTIAL_PAYLOAD_INVALID");
    }
    return { clientId: credentials.clientId, clientSecret: credentials.clientSecret };
  } catch (error) {
    if (error instanceof Error && error.message === "VIDAAS_CREDENTIAL_PAYLOAD_INVALID") throw error;
    throw new Error("VIDAAS_CREDENTIAL_DECRYPTION_FAILED");
  }
}

async function storedVidaasCredentials(): Promise<VidaasApplicationCredentials | null> {
  const record = await prisma.externalIntegrationCredential.findUnique({
    where: { provider: PROVIDER },
    select: { encryptedPayload: true },
  });
  return record ? decryptCredentials(record.encryptedPayload) : null;
}

async function bootstrapVidaasCredentials(user: BootstrapUser): Promise<VidaasApplicationCredentials> {
  if (user.role !== "ADMIN") throw new Error("VIDAAS_BOOTSTRAP_ADMIN_REQUIRED");

  const staticConfig = getVidaasStaticConfig();
  const registered = await registerVidaasApplication({
    staticConfig,
    supportEmail: user.email,
  });
  const encryptedPayload = encryptCredentials(registered);

  const persisted = await prisma.$transaction(async (tx) => {
    const credential = await tx.externalIntegrationCredential.upsert({
      where: { provider: PROVIDER },
      create: {
        provider: PROVIDER,
        encryptedPayload,
        createdById: user.id,
      },
      update: {},
      select: { id: true, encryptedPayload: true },
    });
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "ExternalIntegrationCredential",
        entityId: credential.id,
        action: "integration.vidaas.bootstrap",
        outcome: "success",
        reasonCode: staticConfig.baseUrl.includes("hml-") ? "homologation" : "production",
      },
    });
    return credential;
  });

  return decryptCredentials(persisted.encryptedPayload);
}

export async function getVidaasConfigForUser(user: BootstrapUser): Promise<VidaasConfig> {
  const staticConfig = getVidaasStaticConfig();
  const environmentCredentials = getVidaasEnvironmentCredentials();
  if (environmentCredentials) return combineVidaasConfig(staticConfig, environmentCredentials);

  const storedCredentials = await storedVidaasCredentials();
  if (storedCredentials) return combineVidaasConfig(staticConfig, storedCredentials);

  const bootstrappedCredentials = await bootstrapVidaasCredentials(user);
  return combineVidaasConfig(staticConfig, bootstrappedCredentials);
}
