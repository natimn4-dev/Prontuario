import type { Prisma } from "../../generated/prisma/client";
import { buildMedicationPlanSnapshotModel } from "../../domain/medication-plan-snapshot";
import { prisma } from "../db";
import { createDocumentSnapshot } from "./persistence";
import { getMedicationWorkspace } from "./medication-workspace";

export async function generateMedicationPlan(input: {
  consultationId: string;
  requestId?: string;
}) {
  const workspace = await getMedicationWorkspace(input.consultationId);

  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    select: {
      id: true,
      patientId: true,
      patient: {
        select: { fullName: true },
      },
    },
  });

  if (!consultation) {
    throw new Error("Consulta não encontrada.");
  }

  const model = buildMedicationPlanSnapshotModel({
    consultationId: consultation.id,
    patientName: consultation.patient.fullName,
    workspace,
  });

  const snapshot = await createDocumentSnapshot({
    consultationId: consultation.id,
    type: "MEDICATION_PLAN",
    contentSchemaVersion: model.schemaVersion,
    content: model as unknown as Prisma.InputJsonValue,
    requestId: input.requestId,
  });

  return {
    model,
    plan: model.plan,
    text: model.text,
    excluded: model.excluded,
    snapshot,
  };
}
