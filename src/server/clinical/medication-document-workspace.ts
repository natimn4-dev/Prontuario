import type { Prisma } from "../../generated/prisma/client.ts";
import type { MedicationMoment as DatabaseMedicationMoment } from "../../generated/prisma/enums.ts";
import { consultationHorizon } from "../../domain/as-of-consultation.ts";
import type { MedicationMoment } from "../../domain/medication-plan.ts";
import { medicationStatusAsOf, type MedicationLifecycleStatus } from "../../domain/medication-status-history.ts";
import {
  effectiveMedicationRegimens,
  medicationStatusForWorkspace,
  MedicationWorkspaceError,
  type MedicationWorkspaceRegimenRecord,
  type MedicationWorkspaceView,
} from "../../domain/medication-workspace.ts";

const DATABASE_TO_MOMENT: Readonly<Record<DatabaseMedicationMoment, MedicationMoment>> = {
  MORNING: "manha",
  LUNCH: "almoco",
  AFTERNOON: "tarde",
  EVENING: "noite",
  BEDTIME: "ao_deitar",
  AS_NEEDED: "se_necessario",
};

/**
 * Núcleo de leitura do documento de medicamentos.
 *
 * Não autentica e não autoriza por conta própria. A fronteira chamadora deve
 * executar essas verificações antes de abrir a transação. Manter este núcleo
 * sem dependências de Next permite executar o mesmo caminho de leitura contra
 * o MySQL efêmero do CI.
 */
export async function medicationDocumentWorkspaceContext(
  tx: Prisma.TransactionClient,
  consultationId: string,
) {
  const consultation = await tx.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id: true,
      patientId: true,
      status: true,
      occurredAt: true,
      createdAt: true,
    },
  });
  if (!consultation) {
    throw new MedicationWorkspaceError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
  }

  const consultations = await tx.consultation.findMany({
    where: { patientId: consultation.patientId },
    select: { id: true, patientId: true, occurredAt: true, createdAt: true },
  });
  const horizon = consultationHorizon({
    patientId: consultation.patientId,
    targetConsultationId: consultation.id,
    consultations,
  });
  const consultationIds = horizon.map((item) => item.id);
  const isLatestConsultation = horizon.length === consultations.length;

  const medications = await tx.medication.findMany({
    where: { patientId: consultation.patientId },
    select: {
      id: true,
      name: true,
      presentation: true,
      status: true,
      regimens: {
        select: {
          id: true,
          medicationId: true,
          patientId: true,
          consultationId: true,
          createdAt: true,
          dose: true,
          route: true,
          continuous: true,
          instructions: true,
          scheduleSlots: { select: { moment: true } },
        },
      },
      statusEvents: {
        select: {
          id: true,
          medicationId: true,
          patientId: true,
          consultationId: true,
          previousStatus: true,
          newStatus: true,
          createdAt: true,
        },
      },
    },
  });

  const regimenRecords: MedicationWorkspaceRegimenRecord[] = medications.flatMap((medication) =>
    medication.regimens.map((regimen) => ({
      id: regimen.id,
      medicationId: regimen.medicationId,
      patientId: regimen.patientId,
      consultationId: regimen.consultationId,
      createdAt: regimen.createdAt,
      dose: regimen.dose,
      route: regimen.route,
      continuous: regimen.continuous,
      instructions: regimen.instructions,
      moments: regimen.scheduleSlots.map((slot) => DATABASE_TO_MOMENT[slot.moment]),
    })),
  );

  const effective = new Map(
    effectiveMedicationRegimens({ consultationIds, regimens: regimenRecords }).map((regimen) => [
      regimen.medicationId,
      regimen,
    ]),
  );

  const items = medications.map((medication) => {
    const regimen = effective.get(medication.id);
    const projection = medicationStatusAsOf({
      patientId: consultation.patientId,
      medicationId: medication.id,
      consultationIds,
      events: medication.statusEvents,
    });
    const status = medicationStatusForWorkspace({
      isLatestConsultation,
      explicitStatus: projection.status,
      currentStatus: medication.status as MedicationLifecycleStatus,
    });

    return {
      medicationId: medication.id,
      name: medication.name,
      presentation: medication.presentation ?? undefined,
      medicationText: [medication.name, medication.presentation].filter(Boolean).join(" "),
      doseInstruction: regimen?.dose ?? undefined,
      route: regimen?.route ?? undefined,
      moments: regimen ? [...regimen.moments] : [],
      continuous: regimen?.continuous ?? false,
      instructions: regimen?.instructions ?? undefined,
      status: status.status,
      statusSource: status.source,
      regimenId: regimen?.id,
    };
  });

  return {
    consultation,
    isLatestConsultation,
    view: {
      consultationId: consultation.id,
      consultationStatus: consultation.status,
      isLatestConsultation,
      items: items.sort((a, b) => a.medicationText.localeCompare(b.medicationText, "pt-BR")),
    } satisfies MedicationWorkspaceView,
  };
}
