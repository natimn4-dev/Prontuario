import type { Prisma } from "../../generated/prisma/client.ts";
import type { MedicationMoment as DatabaseMedicationMoment } from "../../generated/prisma/enums.ts";
import { consultationHorizon } from "../../domain/as-of-consultation.ts";
import { validateMedicationPlanItem, type MedicationMoment } from "../../domain/medication-plan.ts";
import { medicationStatusAsOf, type MedicationLifecycleStatus } from "../../domain/medication-status-history.ts";
import {
  assertMedicationWorkspaceEditable,
  effectiveMedicationRegimens,
  medicationStatusForWorkspace,
  MedicationWorkspaceError,
  type MedicationWorkspaceRegimenRecord,
  type MedicationWorkspaceView,
} from "../../domain/medication-workspace.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";

const DATABASE_TO_MOMENT: Readonly<Record<DatabaseMedicationMoment, MedicationMoment>> = {
  MORNING: "manha", LUNCH: "almoco", AFTERNOON: "tarde", EVENING: "noite", BEDTIME: "ao_deitar", AS_NEEDED: "se_necessario",
};
const MOMENT_TO_DATABASE: Readonly<Record<MedicationMoment, DatabaseMedicationMoment>> = Object.fromEntries(
  Object.entries(DATABASE_TO_MOMENT).map(([database, moment]) => [moment, database]),
) as Readonly<Record<MedicationMoment, DatabaseMedicationMoment>>;

async function workspaceContext(tx: Prisma.TransactionClient, consultationId: string) {
  const consultation = await tx.consultation.findUnique({ where: { id: consultationId }, select: { id: true, patientId: true, status: true, occurredAt: true, createdAt: true } });
  if (!consultation) throw new MedicationWorkspaceError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
  const consultations = await tx.consultation.findMany({ where: { patientId: consultation.patientId }, select: { id: true, patientId: true, occurredAt: true, createdAt: true } });
  const horizon = consultationHorizon({ patientId: consultation.patientId, targetConsultationId: consultation.id, consultations });
  const consultationIds = horizon.map((item) => item.id);
  const isLatestConsultation = horizon.length === consultations.length;

  const medications = await tx.medication.findMany({
    where: { patientId: consultation.patientId },
    select: {
      id: true, name: true, presentation: true, status: true,
      regimens: { select: { id: true, medicationId: true, patientId: true, consultationId: true, createdAt: true, dose: true, route: true, continuous: true, instructions: true, scheduleSlots: { select: { moment: true } } } },
      statusEvents: { select: { id: true, medicationId: true, patientId: true, consultationId: true, previousStatus: true, newStatus: true, createdAt: true } },
    },
  });

  const regimenRecords: MedicationWorkspaceRegimenRecord[] = medications.flatMap((medication) => medication.regimens.map((regimen) => ({
    id: regimen.id, medicationId: regimen.medicationId, patientId: regimen.patientId, consultationId: regimen.consultationId, createdAt: regimen.createdAt,
    dose: regimen.dose, route: regimen.route, continuous: regimen.continuous, instructions: regimen.instructions,
    moments: regimen.scheduleSlots.map((slot) => DATABASE_TO_MOMENT[slot.moment]),
  })));
  const effective = new Map(effectiveMedicationRegimens({ consultationIds, regimens: regimenRecords }).map((regimen) => [regimen.medicationId, regimen]));
  const items = medications.map((medication) => {
    const regimen = effective.get(medication.id);
    const projection = medicationStatusAsOf({ patientId: consultation.patientId, medicationId: medication.id, consultationIds, events: medication.statusEvents });
    const status = medicationStatusForWorkspace({ isLatestConsultation, explicitStatus: projection.status, currentStatus: medication.status as MedicationLifecycleStatus });
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
  return { consultation, isLatestConsultation, view: { consultationId: consultation.id, consultationStatus: consultation.status, isLatestConsultation, items: items.sort((a, b) => a.medicationText.localeCompare(b.medicationText, "pt-BR")) } satisfies MedicationWorkspaceView };
}

function assertEditable(context: Awaited<ReturnType<typeof workspaceContext>>) {
  assertMedicationWorkspaceEditable({ consultationStatus: context.consultation.status, isLatestConsultation: context.isLatestConsultation });
}

export async function getMedicationWorkspace(consultationId: string): Promise<MedicationWorkspaceView> {
  await requireAuthenticatedUser("patient.read");
  return prisma.$transaction(async (tx) => (await workspaceContext(tx, consultationId)).view);
}

export async function createMedicationWithRegimen(input: { consultationId: string; name: string; presentation?: string; doseInstruction?: string; route?: string; moments: readonly MedicationMoment[]; continuous?: boolean; instructions?: string; requestId?: string }): Promise<MedicationWorkspaceView> {
  const { user } = await requireAuthenticatedUser("consultation.write");
  return prisma.$transaction(async (tx) => {
    const context = await workspaceContext(tx, input.consultationId); assertEditable(context);
    const name = input.name.trim(); const presentation = input.presentation?.trim() || undefined;
    if (!name) throw new Error("Nome do medicamento é obrigatório.");
    const validated = validateMedicationPlanItem({ id: "new-medication", medicationText: [name, presentation].filter(Boolean).join(" "), doseInstruction: input.doseInstruction, route: input.route, moments: input.moments, continuous: input.continuous, instructions: input.instructions });
    const medication = await tx.medication.create({ data: { patientId: context.consultation.patientId, name, presentation, route: validated.route, status: "ACTIVE" }, select: { id: true } });
    await tx.medicationRegimen.create({ data: { medicationId: medication.id, patientId: context.consultation.patientId, consultationId: context.consultation.id, dose: validated.doseInstruction, frequency: null, schedule: undefined, route: validated.route, continuous: validated.continuous ?? false, instructions: validated.instructions, scheduleSlots: { create: validated.moments.map((moment) => ({ moment: MOMENT_TO_DATABASE[moment] })) } } });
    await tx.medicationStatusEvent.create({ data: { medicationId: medication.id, patientId: context.consultation.patientId, consultationId: context.consultation.id, previousStatus: null, newStatus: "ACTIVE" } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "Medication", entityId: medication.id, action: "medication.create", requestId: input.requestId, outcome: "success", reasonCode: "prospective-medication-reconciliation" } });
    return (await workspaceContext(tx, input.consultationId)).view;
  }, { isolationLevel: "Serializable" });
}

export async function addMedicationRegimen(input: { consultationId: string; medicationId: string; doseInstruction?: string; route?: string; moments: readonly MedicationMoment[]; continuous?: boolean; instructions?: string; requestId?: string }): Promise<MedicationWorkspaceView> {
  const { user } = await requireAuthenticatedUser("consultation.write");
  return prisma.$transaction(async (tx) => {
    const context = await workspaceContext(tx, input.consultationId); assertEditable(context);
    const medication = await tx.medication.findFirst({ where: { id: input.medicationId, patientId: context.consultation.patientId }, select: { id: true, name: true, presentation: true } });
    if (!medication) throw new MedicationWorkspaceError("MEDICATION_NOT_FOUND", "Medicamento não encontrado nesta paciente.");
    const validated = validateMedicationPlanItem({ id: medication.id, medicationText: [medication.name, medication.presentation].filter(Boolean).join(" "), doseInstruction: input.doseInstruction, route: input.route, moments: input.moments, continuous: input.continuous, instructions: input.instructions });
    await tx.medicationRegimen.create({ data: { medicationId: medication.id, patientId: context.consultation.patientId, consultationId: context.consultation.id, dose: validated.doseInstruction, frequency: null, schedule: undefined, route: validated.route, continuous: validated.continuous ?? false, instructions: validated.instructions, scheduleSlots: { create: validated.moments.map((moment) => ({ moment: MOMENT_TO_DATABASE[moment] })) } } });
    await tx.auditEvent.create({ data: { userId: user.id, entityType: "Medication", entityId: medication.id, action: "medication.regimen.add", requestId: input.requestId, outcome: "success", reasonCode: "new-regimen-current-consultation" } });
    return (await workspaceContext(tx, input.consultationId)).view;
  }, { isolationLevel: "Serializable" });
}
