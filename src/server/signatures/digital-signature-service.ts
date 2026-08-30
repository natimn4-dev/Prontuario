import { randomBytes, randomUUID } from "node:crypto";
import { buildProfessionalIdentity } from "@/domain/professional-identity";
import { prisma } from "@/server/db";
import { buildAgaReportPdf } from "./report-pdf";
import {
  buildVidaasAuthorizationUrl,
  createPkcePair,
  exchangeVidaasAuthorizationCode,
  sha256Hex,
  signPdfWithVidaas,
} from "./vidaas-client";
import { getVidaasConfigForUser } from "./vidaas-credentials";

const PENDING_LIFETIME_MS = 5 * 60 * 1000;

type SigningUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PHYSICIAN" | "READ_ONLY";
};

type SnapshotContent = {
  text?: unknown;
  report?: unknown;
};

function appUrl(): string {
  const value = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (!value) throw new Error("APP_URL_NOT_CONFIGURED");
  return value;
}

function requireReportText(content: unknown): string {
  if (!content || typeof content !== "object") throw new Error("REPORT_SNAPSHOT_INVALID");
  const text = (content as SnapshotContent).text;
  if (typeof text !== "string" || !text.trim()) throw new Error("REPORT_SNAPSHOT_INVALID");
  return text;
}

function signatureState(signatureId: string): string {
  return `${signatureId}.${randomBytes(24).toString("base64url")}`;
}

export async function beginAgaVidaasSignature(input: {
  consultationId: string;
  snapshotId: string;
  user: SigningUser;
}) {
  const snapshot = await prisma.documentSnapshot.findFirst({
    where: {
      id: input.snapshotId,
      consultationId: input.consultationId,
      type: "AGA_REPORT",
      generatedById: input.user.id,
    },
    select: {
      id: true,
      patientId: true,
      consultationId: true,
      version: true,
      content: true,
    },
  });
  if (!snapshot) throw new Error("REPORT_SNAPSHOT_NOT_FOUND");

  const config = await getVidaasConfigForUser(input.user);
  const verificationToken = randomBytes(32).toString("base64url");
  const verificationUrl = `${appUrl()}/verificar/${verificationToken}`;
  const id = randomUUID();
  const state = signatureState(id);
  const pkce = createPkcePair();
  const professionalIdentity = buildProfessionalIdentity({
    name: input.user.name,
    email: input.user.email,
    brandOwnerEmail: process.env.PROFESSIONAL_BRAND_OWNER_EMAIL,
  });
  const pdf = buildAgaReportPdf({
    reportText: requireReportText(snapshot.content),
    professionalIdentity,
    verificationUrl,
    snapshotVersion: snapshot.version,
  });
  const expiresAt = new Date(Date.now() + PENDING_LIFETIME_MS);

  await prisma.$transaction(async (tx) => {
    await tx.digitalSignature.create({
      data: {
        id,
        patientId: snapshot.patientId,
        consultationId: snapshot.consultationId,
        sourceSnapshotId: snapshot.id,
        createdById: input.user.id,
        provider: "VIDAAS",
        status: "PENDING",
        unsignedPdfBase64: pdf.toString("base64"),
        unsignedSha256: sha256Hex(pdf),
        verificationTokenHash: sha256Hex(verificationToken),
        oauthStateHash: sha256Hex(state),
        signatureFormat: config.signatureFormat,
        expiresAt,
      },
    });
    await tx.auditEvent.create({
      data: {
        userId: input.user.id,
        entityType: "DigitalSignature",
        entityId: id,
        action: "digital_signature.start",
        outcome: "success",
        reasonCode: "vidaas-single-signature",
      },
    });
  });

  return {
    signatureId: id,
    authorizationUrl: buildVidaasAuthorizationUrl({ config, challenge: pkce.challenge, state }),
    pkceVerifier: pkce.verifier,
    expiresAt,
  };
}

export async function completeAgaVidaasSignature(input: {
  code: string;
  state: string;
  pkceVerifier: string;
  user: SigningUser;
}) {
  const signatureId = input.state.split(".", 1)[0];
  if (!signatureId) throw new Error("VIDAAS_STATE_INVALID");

  const record = await prisma.digitalSignature.findFirst({
    where: {
      id: signatureId,
      createdById: input.user.id,
      provider: "VIDAAS",
      status: "PENDING",
    },
  });
  if (!record) throw new Error("VIDAAS_SIGNATURE_FLOW_NOT_FOUND");
  if (record.expiresAt.getTime() < Date.now()) throw new Error("VIDAAS_SIGNATURE_FLOW_EXPIRED");
  if (record.oauthStateHash !== sha256Hex(input.state)) throw new Error("VIDAAS_STATE_INVALID");
  if (!record.unsignedPdfBase64) throw new Error("VIDAAS_UNSIGNED_DOCUMENT_MISSING");

  try {
    const config = await getVidaasConfigForUser(input.user);
    const accessToken = await exchangeVidaasAuthorizationCode({
      config,
      code: input.code,
      verifier: input.pkceVerifier,
    });
    const unsignedPdf = Buffer.from(record.unsignedPdfBase64, "base64");
    if (sha256Hex(unsignedPdf) !== record.unsignedSha256) throw new Error("UNSIGNED_DOCUMENT_INTEGRITY_FAILURE");

    const signed = await signPdfWithVidaas({
      config,
      accessToken,
      documentId: record.id,
      pdf: unsignedPdf,
    });
    const signedSha256 = sha256Hex(signed.signedPdf);
    const signedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.digitalSignature.update({
        where: { id: record.id },
        data: {
          status: "SIGNED",
          signedPdfBase64: signed.signedPdf.toString("base64"),
          signedSha256,
          certificateAlias: signed.certificateAlias,
          signedAt,
          unsignedPdfBase64: null,
          errorCode: null,
        },
      });
      await tx.auditEvent.create({
        data: {
          userId: input.user.id,
          entityType: "DigitalSignature",
          entityId: record.id,
          action: "digital_signature.complete",
          outcome: "success",
          reasonCode: record.signatureFormat,
        },
      });
    });

    return { signatureId: record.id, consultationId: record.consultationId };
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 180) : "VIDAAS_SIGNATURE_FAILED";
    await prisma.$transaction(async (tx) => {
      await tx.digitalSignature.update({
        where: { id: record.id },
        data: { status: "FAILED", errorCode },
      });
      await tx.auditEvent.create({
        data: {
          userId: input.user.id,
          entityType: "DigitalSignature",
          entityId: record.id,
          action: "digital_signature.complete",
          outcome: "failure",
          reasonCode: errorCode,
        },
      });
    });
    throw error;
  }
}

export async function getSignedPdf(signatureId: string) {
  const record = await prisma.digitalSignature.findFirst({
    where: { id: signatureId, status: "SIGNED" },
    select: { id: true, signedPdfBase64: true, signedSha256: true },
  });
  if (!record?.signedPdfBase64 || !record.signedSha256) return null;
  const pdf = Buffer.from(record.signedPdfBase64, "base64");
  if (sha256Hex(pdf) !== record.signedSha256) throw new Error("SIGNED_DOCUMENT_INTEGRITY_FAILURE");
  return { id: record.id, pdf, sha256: record.signedSha256 };
}

export async function getPublicSignatureVerification(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const record = await prisma.digitalSignature.findUnique({
    where: { verificationTokenHash: sha256Hex(token) },
    select: {
      id: true,
      provider: true,
      status: true,
      signatureFormat: true,
      signedSha256: true,
      signedAt: true,
      createdAt: true,
    },
  });
  if (!record) return null;
  return {
    documentReference: record.id.slice(0, 8).toUpperCase(),
    provider: record.provider,
    status: record.status,
    signatureFormat: record.signatureFormat,
    signedSha256: record.signedSha256,
    signedAt: record.signedAt,
    createdAt: record.createdAt,
  };
}
