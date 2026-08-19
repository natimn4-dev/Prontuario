import { randomUUID } from "node:crypto";
import { prisma } from "../db";
import { requireAuthenticatedUser } from "../auth/require-user";
import {
  findDuplicateCandidates,
  assertPatientIdentifierFormat,
  normalizePatientIdentifier,
  normalizePersonName,
  patientIdentityFingerprint,
  preferredDuplicateCandidate,
  type DuplicateCandidateReason,
  type PatientIdentifierInput,
} from "../../domain/patient-identity";

export interface CreatePatientInput {
  fullName: string;
  birthDate?: Date | null;
  sex?: string;
  education?: string;
  phone?: string;
  caregiverName?: string;
  caregiverPhone?: string;
  identifiers?: readonly PatientIdentifierInput[];
  confirmTrueHomonym?: boolean;
  requestId?: string;
}

export type CreatePatientResult =
  | { created: true; patientId: string }
  | {
      created: false;
      existingPatientId: string;
      reason: DuplicateCandidateReason;
    };

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function createPatientSafely(
  input: CreatePatientInput,
): Promise<CreatePatientResult> {
  const { user } = await requireAuthenticatedUser("patient.write");
  const normalizedFullName = normalizePersonName(input.fullName);
  const identityFingerprint = patientIdentityFingerprint(input);
  for (const identifier of input.identifiers ?? []) assertPatientIdentifierFormat(identifier);
  const identifiers = (input.identifiers ?? [])
    .map((identifier) => ({
      ...identifier,
      value: identifier.value.trim(),
      normalizedValue: normalizePatientIdentifier(identifier.type, identifier.value),
    }))
    .filter((identifier) => identifier.normalizedValue.length > 0);

  try {
    return await prisma.$transaction(async (tx) => {
      const candidates = await tx.patient.findMany({
        where: {
          OR: [
            { normalizedFullName },
            ...(identifiers.length > 0
              ? [{
                  identifiers: {
                    some: {
                      OR: identifiers.map(({ type, normalizedValue }) => ({ type, normalizedValue })),
                    },
                  },
                }]
              : []),
          ],
        },
        select: {
          id: true,
          fullName: true,
          birthDate: true,
          identifiers: { select: { type: true, value: true } },
        },
      });

      const duplicate = preferredDuplicateCandidate(
        findDuplicateCandidates({ incoming: input, existing: candidates }),
      );

      if (duplicate && (!input.confirmTrueHomonym || duplicate.reason === "strong-identifier")) {
        await tx.auditEvent.create({
          data: {
            userId: user.id,
            entityType: "Patient",
            entityId: duplicate.patientId,
            action: "patient.create.blocked_duplicate",
            requestId: input.requestId,
            outcome: "denied",
            reasonCode: duplicate.reason,
          },
        });
        return {
          created: false as const,
          existingPatientId: duplicate.patientId,
          reason: duplicate.reason,
        };
      }

      const patient = await tx.patient.create({
        data: {
          fullName: input.fullName.trim().replace(/\s+/g, " "),
          normalizedFullName,
          identityFingerprint,
          homonymDiscriminator: input.confirmTrueHomonym ? randomUUID() : "primary",
          needsIdentityReview: Boolean(input.confirmTrueHomonym),
          birthDate: input.birthDate,
          sex: input.sex,
          education: input.education,
          phone: input.phone,
          caregiverName: input.caregiverName,
          caregiverPhone: input.caregiverPhone,
          identifiers: identifiers.length > 0
            ? {
                create: identifiers.map(({ type, value, normalizedValue }) => ({
                  type,
                  value,
                  normalizedValue,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });

      await tx.auditEvent.create({
        data: {
          userId: user.id,
          entityType: "Patient",
          entityId: patient.id,
          action: input.confirmTrueHomonym ? "patient.create.confirmed_homonym" : "patient.create",
          requestId: input.requestId,
          outcome: "success",
          reasonCode: input.confirmTrueHomonym ? "true-homonym-confirmed" : undefined,
        },
      });

      return { created: true as const, patientId: patient.id };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existingCandidates = await prisma.patient.findMany({
      where: {
        OR: [
          { identityFingerprint, homonymDiscriminator: "primary" },
          ...(identifiers.length > 0
            ? [{
                identifiers: {
                  some: {
                    OR: identifiers.map(({ type, normalizedValue }) => ({ type, normalizedValue })),
                  },
                },
              }]
            : []),
        ],
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        identifiers: { select: { type: true, value: true } },
      },
    });
    const duplicate = preferredDuplicateCandidate(
      findDuplicateCandidates({ incoming: input, existing: existingCandidates }),
    );
    if (!duplicate) throw error;

    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        entityType: "Patient",
        entityId: duplicate.patientId,
        action: "patient.create.blocked_duplicate",
        requestId: input.requestId,
        outcome: "denied",
        reasonCode: duplicate.reason,
      },
    });

    return {
      created: false,
      existingPatientId: duplicate.patientId,
      reason: duplicate.reason,
    };
  }
}
