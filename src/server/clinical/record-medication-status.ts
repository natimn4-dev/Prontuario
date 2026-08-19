import type { Prisma } from "../../generated/prisma/client.ts";
import { consultationHorizon } from "../../domain/as-of-consultation.ts";
import {
  medicationStatusAsOf,
  type MedicationLifecycleStatus,
} from "../../domain/medication-status-history.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import {
  medicationStatusWriteService,
  type MedicationStatusWriteTransaction,
} from "./medication-status-write-service.ts";

async function medicationWriteContext(
  tx: Prisma.TransactionClient,
  input: { consultationId: string; medicationId: string },
) {
  const consultation = await tx.consultation.findUnique({
    where: { id: input.consultationId },
    select: {
      id: true,
      patientId: true,
      status: true,
      occurredAt: true,
      createdAt: true,
    },
  });
  if (!consultation) return null;

  const medication = await tx.medication.findFirst({
    where: {
      id: input.medicationId,
      patientId: consultation.patientId,
    },
    select: { id: true, status: true },
  });

  if (!medication) {
    return {
      consultationId: consultation.id,
      patientId: consultation.patientId,
      consultationStatus: consultation.status,
      isLatestConsultation: false,
      medicationId: null,
      currentStatus: null,
      explicitStatusKnown: false,
      previousExplicitStatus: null,
    };
  }

  const patientConsultations = await tx.consultation.findMany({
    where: { patientId: consultation.patientId },
    select: {
      id: true,
      patientId: true,
      occurredAt: true,
      createdAt: true,
    },
  });
  const horizon = consultationHorizon({
    patientId: consultation.patientId,
    targetConsultationId: consultation.id,
    consultations: patientConsultations,
  });
  const consultationIds = horizon.map((item) => item.id);

  const events = await tx.medicationStatusEvent.findMany({
    where: {
      patientId: consultation.patientId,
      medicationId: medication.id,
    },
    select: {
      id: true,
      medicationId: true,
      patientId: true,
      consultationId: true,
      previousStatus: true,
      newStatus: true,
      createdAt: true,
    },
  });
  const projection = medicationStatusAsOf({
    patientId: consultation.patientId,
    medicationId: medication.id,
    consultationIds,
    events,
  });

  return {
    consultationId: consultation.id,
    patientId: consultation.patientId,
    consultationStatus: consultation.status,
    isLatestConsultation: horizon.length === patientConsultations.length,
    medicationId: medication.id,
    currentStatus: medication.status as MedicationLifecycleStatus,
    explicitStatusKnown: projection.known,
    previousExplicitStatus: projection.status,
  };
}

const service = medicationStatusWriteService({
  authenticate: requireAuthenticatedUser,
  transaction: async (operation) => prisma.$transaction(async (tx) => operation({
    findWriteContext: (input) => medicationWriteContext(tx, input),
    updateCurrentMedicationStatus: async ({
      medicationId,
      patientId,
      expectedCurrentStatus,
      newStatus,
    }) => {
      const updated = await tx.medication.updateMany({
        where: {
          id: medicationId,
          patientId,
          status: expectedCurrentStatus,
        },
        data: { status: newStatus },
      });
      return updated.count === 1;
    },
    createStatusEvent: async (input) => tx.medicationStatusEvent.create({
      data: input,
      select: { id: true },
    }),
    createAuditEvent: async (input) => {
      await tx.auditEvent.create({ data: input });
    },
  } satisfies MedicationStatusWriteTransaction), { isolationLevel: "Serializable" }),
});

export const recordMedicationStatusChange = service.recordStatusChange;
