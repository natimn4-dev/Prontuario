import {
  SENSORY_OBSERVATION_STATUS,
  type SensoryFunctionalObservationValues,
  type SensoryObservationStatus,
} from "../../domain/sensory-functional-observation.ts";
import { requireAuthenticatedUser } from "../auth/require-user.ts";
import { prisma } from "../db.ts";
import { hasAccessProfilePermission } from "../../domain/security/auth-policy.ts";
import { SensoryObservationError } from "./sensory-functional-observation-errors.ts";

type StoredObservation = {
  id: string;
  assessmentStatus: string;
  multisensoryDysfunction: boolean;
  usesCorrectiveLenses: boolean;
  revision: number;
};

export interface SensoryObservationWorkspace extends SensoryFunctionalObservationValues {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  canWrite: boolean;
  saved: boolean;
  revision: number;
}

function workspace(
  consultationId: string,
  consultationStatus: SensoryObservationWorkspace["consultationStatus"],
  canWrite: boolean,
  observation: StoredObservation | null,
): SensoryObservationWorkspace {
  return {
    consultationId,
    consultationStatus,
    canWrite,
    saved: Boolean(observation),
    revision: observation?.revision ?? 0,
    assessmentStatus: (observation?.assessmentStatus ?? SENSORY_OBSERVATION_STATUS.NOT_ASSESSED) as SensoryObservationStatus,
    multisensoryDysfunction: observation?.multisensoryDysfunction ?? false,
    usesCorrectiveLenses: observation?.usesCorrectiveLenses ?? false,
  };
}

export async function getSensoryObservationWorkspace(consultationId: string): Promise<SensoryObservationWorkspace> {
  const { user } = await requireAuthenticatedUser("patient.read");
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, patientId: true, status: true },
  });
  if (!consultation) {
    throw new SensoryObservationError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
  }
  const observation = await prisma.sensoryFunctionalObservation.findFirst({
    where: { consultationId: consultation.id, patientId: consultation.patientId },
    orderBy: [{ revision: "desc" }, { id: "desc" }],
    select: {
      id: true,
      assessmentStatus: true,
      multisensoryDysfunction: true,
      usesCorrectiveLenses: true,
      revision: true,
    },
  });
  const canWrite = hasAccessProfilePermission({
    role: user.role,
    professionalRole: user.professionalRole,
    canManageUsers: user.canManageUsers,
  }, "consultation.write");
  return workspace(consultation.id, consultation.status, canWrite, observation);
}

export async function saveSensoryObservation(input: {
  consultationId: string;
  expectedRevision: number;
  values: SensoryFunctionalObservationValues;
  requestId?: string;
}): Promise<SensoryObservationWorkspace> {
  const { user } = await requireAuthenticatedUser("consultation.write");
  const normalizedValues = input.values.assessmentStatus === SENSORY_OBSERVATION_STATUS.ASSESSED
    ? input.values
    : {
      assessmentStatus: SENSORY_OBSERVATION_STATUS.NOT_ASSESSED,
      multisensoryDysfunction: false,
      usesCorrectiveLenses: false,
    };

  try {
    return await prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.findUnique({
        where: { id: input.consultationId },
        select: { id: true, patientId: true, status: true },
      });
      if (!consultation) {
        throw new SensoryObservationError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
      }
      if (consultation.status === "FINALIZED") {
        throw new SensoryObservationError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
      }

      const current = await tx.sensoryFunctionalObservation.findFirst({
        where: { consultationId: consultation.id, patientId: consultation.patientId },
        orderBy: [{ revision: "desc" }, { id: "desc" }],
        select: { revision: true },
      });
      const revision = current?.revision ?? 0;
      if (revision !== input.expectedRevision) {
        throw new SensoryObservationError(
          "SENSORY_OBSERVATION_CHANGED",
          "A observação sensorial foi atualizada em outra sessão. Recarregue antes de salvar novamente.",
        );
      }

      const data = {
        assessmentStatus: normalizedValues.assessmentStatus,
        multisensoryDysfunction: normalizedValues.multisensoryDysfunction,
        usesCorrectiveLenses: normalizedValues.usesCorrectiveLenses,
        protocolVersion: "sensory-functional-observation-v1",
        revision: revision + 1,
      };
      const saved: StoredObservation = await tx.sensoryFunctionalObservation.create({
        data: {
          patientId: consultation.patientId,
          consultationId: consultation.id,
          ...data,
        },
        select: {
          id: true,
          assessmentStatus: true,
          multisensoryDysfunction: true,
          usesCorrectiveLenses: true,
          revision: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: user.id,
          entityType: "SensoryFunctionalObservation",
          entityId: saved.id,
          action: "sensory-functional-observation.save",
          requestId: input.requestId,
          outcome: "success",
          reasonCode: normalizedValues.assessmentStatus.toLowerCase(),
        },
      });

      return workspace(consultation.id, consultation.status, true, saved);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof SensoryObservationError) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002" || code === "P2034") {
      throw new SensoryObservationError(
        "SENSORY_OBSERVATION_CHANGED",
        "A observação sensorial foi atualizada em outra sessão. Recarregue antes de salvar novamente.",
      );
    }
    throw error;
  }
}
