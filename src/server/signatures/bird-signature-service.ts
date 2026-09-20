import { randomBytes, randomUUID } from "node:crypto";
import { buildProfessionalIdentity } from "@/domain/professional-identity";
import { assertFinalReportSignatureEligibility } from "@/domain/report-signature-eligibility";
import type { AgaAdvanceDirectivesReportSection } from "@/domain/report-overview";
import { prisma } from "@/server/db";
import { buildAdvanceDirectivesPdf } from "./advance-directives-pdf";
import {
  buildBirdAuthorizationUrl,
  createBirdPkcePair,
  exchangeBirdAuthorizationCode,
  getBirdConfig,
  signPdfWithBird,
} from "./bird-client";
import { buildAgaReportPdf, type AgaSignedReportModel } from "./report-pdf";
import { sha256Hex } from "./vidaas-client";

const PENDING_LIFETIME_MS = 5 * 60 * 1000;
export type BirdSignatureDocumentKind = "aga" | "advance-directives";

type SigningUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PHYSICIAN" | "READ_ONLY";
};

type StructuredSignedReport = AgaSignedReportModel & {
  advanceDirectives?: AgaAdvanceDirectivesReportSection;
};

function appUrl(): string {
  const value = process.env.APP_URL?.trim().replace(/\/$/, "");
  if (!value) throw new Error("APP_URL_NOT_CONFIGURED");
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireStructuredReport(
  content: unknown,
  expectedPatientId: string,
  expectedConsultationId: string,
): StructuredSignedReport {
  if (!isRecord(content)) throw new Error("REPORT_SNAPSHOT_INVALID");
  const report = content.report;
  if (!isRecord(report)) throw new Error("REPORT_SNAPSHOT_INVALID");
  if (report.patientId !== expectedPatientId || report.consultationId !== expectedConsultationId) {
    throw new Error("REPORT_SNAPSHOT_CONTEXT_MISMATCH");
  }
  if (typeof report.patientName !== "string" || !report.patientName.trim()) throw new Error("REPORT_SNAPSHOT_INVALID");
  if (!Array.isArray(report.assessedScales) || !Array.isArray(report.clinicalProblems) || !Array.isArray(report.geriatricProblems)) {
    throw new Error("REPORT_SNAPSHOT_INVALID");
  }
  if (!isRecord(report.overview) || !isRecord(report.capacityHistory)) throw new Error("REPORT_SNAPSHOT_INVALID");
  if (!Array.isArray(report.capacityHistory.consultations) || !Array.isArray(report.capacityHistory.dimensions)) {
    throw new Error("REPORT_SNAPSHOT_INVALID");
  }
  if (!isRecord(report.vaccinationPrevention) || !isRecord(report.safetyGuidance) || !isRecord(report.medicationPlan)) {
    throw new Error("REPORT_SNAPSHOT_INVALID");
  }
  return report as unknown as StructuredSignedReport;
}

function requireAdvanceDirectives(report: StructuredSignedReport): AgaAdvanceDirectivesReportSection {
  const section = report.advanceDirectives;
  if (!section || !isRecord(section)) throw new Error("ADVANCE_DIRECTIVES_NOT_AVAILABLE");
  if (
    typeof section.sourceConsultationId !== "string"
    || typeof section.sourceConsultationDate !== "string"
    || typeof section.version !== "number"
    || !Array.isArray(section.priorities)
    || !Array.isArray(section.topics)
    || !Array.isArray(section.history)
    || typeof section.reviewTrigger !== "string"
  ) {
    throw new Error("ADVANCE_DIRECTIVES_SNAPSHOT_INVALID");
  }
  return section as unknown as AgaAdvanceDirectivesReportSection;
}

function signatureState(signatureId: string, documentKind: BirdSignatureDocumentKind): string {
  return `${signatureId}.${documentKind}.${randomBytes(24).toString("base64url")}`;
}

function documentKindFromState(state: string): BirdSignatureDocumentKind {
  return state.split(".")[1] === "advance-directives" ? "advance-directives" : "aga";
}

async function beginBirdSignature(input: {
  consultationId: string;
  snapshotId: string;
  user: SigningUser;
  documentKind: BirdSignatureDocumentKind;
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

  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    select: { status: true },
  });
  if (!consultation) throw new Error("CONSULTATION_NOT_FOUND");

  const config = getBirdConfig();
  const verificationToken = randomBytes(32).toString("base64url");
  const verificationUrl = `${appUrl()}/verificar/${verificationToken}`;
  const id = randomUUID();
  const state = signatureState(id, input.documentKind);
  const pkce = createBirdPkcePair();
  const professionalIdentity = buildProfessionalIdentity({
    name: input.user.name,
    email: input.user.email,
    brandOwnerEmail: process.env.PROFESSIONAL_BRAND_OWNER_EMAIL,
  });
  const report = requireStructuredReport(snapshot.content, snapshot.patientId, snapshot.consultationId);
  assertFinalReportSignatureEligibility({
    consultationStatus: consultation.status,
    report,
  });
  const pdf = input.documentKind === "advance-directives"
    ? buildAdvanceDirectivesPdf({
        section: requireAdvanceDirectives(report),
        patientName: report.patientName,
        professionalIdentity,
        verificationUrl,
      })
    : buildAgaReportPdf({
        report,
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
        provider: "BIRD",
        status: "PENDING",
        unsignedPdfBase64: pdf.toString("base64"),
        unsignedSha256: sha256Hex(pdf),
        verificationTokenHash: sha256Hex(verificationToken),
        oauthStateHash: sha256Hex(state),
        signatureFormat: `PAdEs_${config.signaturePolicy}`,
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
        reasonCode: `bird-single-signature:${input.documentKind}`,
      },
    });
  });

  return {
    signatureId: id,
    authorizationUrl: buildBirdAuthorizationUrl({ config, challenge: pkce.challenge, state }),
    pkceVerifier: pkce.verifier,
    expiresAt,
  };
}

export function beginAgaBirdSignature(input: {
  consultationId: string;
  snapshotId: string;
  user: SigningUser;
}) {
  return beginBirdSignature({ ...input, documentKind: "aga" });
}

export function beginAdvanceDirectivesBirdSignature(input: {
  consultationId: string;
  snapshotId: string;
  user: SigningUser;
}) {
  return beginBirdSignature({ ...input, documentKind: "advance-directives" });
}

export async function completeBirdSignature(input: {
  code: string;
  state: string;
  pkceVerifier: string;
  user: SigningUser;
}) {
  const signatureId = input.state.split(".", 1)[0];
  if (!signatureId) throw new Error("BIRD_STATE_INVALID");
  const documentKind = documentKindFromState(input.state);
  const record = await prisma.digitalSignature.findFirst({
    where: {
      id: signatureId,
      createdById: input.user.id,
      provider: "BIRD",
      status: "PENDING",
    },
  });
  if (!record) throw new Error("BIRD_SIGNATURE_FLOW_NOT_FOUND");
  if (record.expiresAt.getTime() < Date.now()) throw new Error("BIRD_SIGNATURE_FLOW_EXPIRED");
  if (record.oauthStateHash !== sha256Hex(input.state)) throw new Error("BIRD_STATE_INVALID");
  if (!record.unsignedPdfBase64) throw new Error("BIRD_UNSIGNED_DOCUMENT_MISSING");

  try {
    const config = getBirdConfig();
    const accessToken = await exchangeBirdAuthorizationCode({
      config,
      code: input.code,
      verifier: input.pkceVerifier,
    });
    const unsignedPdf = Buffer.from(record.unsignedPdfBase64, "base64");
    if (sha256Hex(unsignedPdf) !== record.unsignedSha256) throw new Error("UNSIGNED_DOCUMENT_INTEGRITY_FAILURE");
    const signed = await signPdfWithBird({
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
          reasonCode: `${record.signatureFormat}:${documentKind}`,
        },
      });
    });
    return { signatureId: record.id, consultationId: record.consultationId, documentKind };
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.slice(0, 180) : "BIRD_SIGNATURE_FAILED";
    await prisma.$transaction(async (tx) => {
      await tx.digitalSignature.update({ where: { id: record.id }, data: { status: "FAILED", errorCode } });
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
