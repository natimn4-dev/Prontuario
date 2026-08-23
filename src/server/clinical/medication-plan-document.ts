import type { MedicationPlanViewModel } from "../../domain/medication-plan.ts";
import {
  buildMedicationPlanSnapshotModel,
  MedicationPlanSnapshotError,
} from "../../domain/medication-plan-snapshot.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import { medicationDocumentWorkspaceContext } from "./medication-document-workspace.ts";

export interface MedicationPlanDocument {
  consultationId: string;
  patientId: string;
  patientName: string;
  patientBirthDate: string | null;
  consultationDate: string;
  needsIdentityReview: boolean;
  status: "READY" | "REQUIRES_REVIEW";
  message: string;
  plan?: MedicationPlanViewModel;
}

export async function getMedicationPlanDocument(consultationId: string): Promise<MedicationPlanDocument | null> {
  await requireAuthenticatedUser("document.generate");

  return prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        patientId: true,
        occurredAt: true,
        patient: {
          select: {
            id: true,
            fullName: true,
            birthDate: true,
            needsIdentityReview: true,
          },
        },
      },
    });

    if (!consultation) return null;
    if (consultation.patient.id !== consultation.patientId) {
      throw new Error("Contexto paciente-consulta divergente no plano de medicamentos.");
    }

    const workspace = (await medicationDocumentWorkspaceContext(tx, consultation.id)).view;
    if (workspace.consultationId !== consultation.id) {
      throw new Error("Contexto de consulta divergente no plano de medicamentos.");
    }

    const patientBirthDate = consultation.patient.birthDate?.toISOString() ?? null;

    try {
      const snapshot = buildMedicationPlanSnapshotModel({
        consultationId: consultation.id,
        patientName: consultation.patient.fullName,
        workspace,
      });

      return {
        consultationId: consultation.id,
        patientId: consultation.patientId,
        patientName: consultation.patient.fullName,
        patientBirthDate,
        consultationDate: consultation.occurredAt.toISOString(),
        needsIdentityReview: consultation.patient.needsIdentityReview,
        status: "READY" as const,
        message: "Plano de medicamentos pronto para revisão e impressão.",
        plan: snapshot.plan,
      };
    } catch (error) {
      if (error instanceof MedicationPlanSnapshotError && error.code === "HISTORICAL_STATUS_NOT_REVIEWED") {
        return {
          consultationId: consultation.id,
          patientId: consultation.patientId,
          patientName: consultation.patient.fullName,
          patientBirthDate,
          consultationDate: consultation.occurredAt.toISOString(),
          needsIdentityReview: consultation.patient.needsIdentityReview,
          status: "REQUIRES_REVIEW" as const,
          message: "Plano não liberado: conclua a reconciliação e confirme o status histórico e os horários dos medicamentos antes de compartilhar.",
        };
      }
      throw error;
    }
  });
}
