import { prisma } from "../db";
import { requireAuthenticatedUser } from "../auth/require-user";
import type { Prisma } from "../../generated/prisma/client";
import type { MedicationMoment as DatabaseMedicationMoment } from "../../generated/prisma/enums";
import { validateMedicationPlanItem, type MedicationMoment } from "../../domain/medication-plan";
import { withDocumentSnapshotWriteRetry } from "../../domain/document-snapshot-versioning";

const MOMENT_TO_DATABASE: Readonly<Record<MedicationMoment, DatabaseMedicationMoment>> = {
  manha: "MORNING",
  almoco: "LUNCH",
  tarde: "AFTERNOON",
  noite: "EVENING",
  ao_deitar: "BEDTIME",
  se_necessario: "AS_NEEDED",
};

async function consultationContext(consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, patientId: true, status: true },
  });

  if (!consultation) {
    throw new Error("Consulta não encontrada.");
  }

  return consultation;
}

export async function saveScaleAssessment(input: {
  consultationId: string;
  scaleDefinitionId?: string;
  scaleCode: string;
  scaleVersion: string;
  answers: Prisma.InputJsonValue;
  scoreNumeric?: number;
  scoreText?: string;
  classification?: string;
  interpretation?: string;
  clinicalColor?: string;
}) {
  await requireAuthenticatedUser("consultation.write");

  const consultation = await consultationContext(input.consultationId);

  if (consultation.status === "FINALIZED") {
    throw new Error("Consulta finalizada não aceita alteração de escala.");
  }

  return prisma.scaleAssessment.create({
    data: {
      consultationId: consultation.id,
      patientId: consultation.patientId,
      scaleDefinitionId: input.scaleDefinitionId,
      scaleCode: input.scaleCode,
      scaleVersion: input.scaleVersion,
      answers: input.answers,
      scoreNumeric: input.scoreNumeric,
      scoreText: input.scoreText,
      classification: input.classification,
      interpretation: input.interpretation,
      clinicalColor: input.clinicalColor,
    },
  });
}

export async function createMedicationRegimen(input: {
  consultationId: string;
  medicationId: string;
  doseInstruction?: string;
  route?: string;
  moments: readonly MedicationMoment[];
  continuous?: boolean;
  instructions?: string;
  startsAt?: Date;
  endsAt?: Date;
}) {
  await requireAuthenticatedUser("consultation.write");

  const consultation = await consultationContext(input.consultationId);

  if (consultation.status === "FINALIZED") {
    throw new Error("Consulta finalizada não aceita alteração medicamentosa.");
  }

  const medication = await prisma.medication.findUnique({
    where: { id: input.medicationId },
    select: { id: true, patientId: true, name: true, presentation: true },
  });

  if (!medication) {
    throw new Error("Medicamento não encontrado.");
  }

  if (medication.patientId !== consultation.patientId) {
    throw new Error(
      "Medicamento pertence a paciente diferente da consulta.",
    );
  }

  const validated = validateMedicationPlanItem({
    id: medication.id,
    medicationText: [medication.name, medication.presentation].filter(Boolean).join(" "),
    doseInstruction: input.doseInstruction,
    route: input.route,
    moments: input.moments,
    continuous: input.continuous,
    instructions: input.instructions,
  });

  return prisma.medicationRegimen.create({
    data: {
      medicationId: medication.id,
      patientId: consultation.patientId,
      consultationId: consultation.id,
      dose: validated.doseInstruction,
      frequency: null,
      schedule: undefined,
      route: validated.route,
      continuous: validated.continuous ?? false,
      instructions: validated.instructions,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      scheduleSlots: {
        create: validated.moments.map((moment) => ({
          moment: MOMENT_TO_DATABASE[moment],
        })),
      },
    },
  });
}

export async function createDocumentSnapshot(input: {
  consultationId: string;
  type: "SOAP" | "FAMILY_REPORT" | "MEDICATION_PLAN" | "AGA_REPORT";
  content: Prisma.InputJsonValue;
  contentSchemaVersion?: string;
  requestId?: string;
}) {
  const { user } = await requireAuthenticatedUser("document.generate");

  return withDocumentSnapshotWriteRetry(() =>
    prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.findUnique({
        where: { id: input.consultationId },
        select: { id: true, patientId: true, status: true },
      });

      if (!consultation) {
        throw new Error("Consulta não encontrada.");
      }

      const latest = await tx.documentSnapshot.findFirst({
        where: {
          consultationId: consultation.id,
          patientId: consultation.patientId,
          type: input.type,
        },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const snapshot = await tx.documentSnapshot.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          type: input.type,
          version: (latest?.version ?? 0) + 1,
          content: input.content,
          contentSchemaVersion: input.contentSchemaVersion ?? "1.0",
          sourceConsultationStatus: consultation.status,
          generatedById: user.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: user.id,
          entityType: "DocumentSnapshot",
          entityId: snapshot.id,
          action: "document.generate",
          requestId: input.requestId,
          outcome: "success",
          reasonCode: consultation.status === "FINALIZED" ? "finalized-context" : "draft-context",
        },
      });
      return snapshot;
    }, { isolationLevel: "Serializable" }),
  );
}
