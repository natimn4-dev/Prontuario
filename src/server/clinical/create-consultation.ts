import { prisma } from "../db";
import { requireAuthenticatedUser } from "../auth/require-user";
import {
  ConsultationCreationError,
  createConsultationService,
  type ConsultationCreationTransaction,
} from "./create-consultation-service";

function isRetryableTransactionError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error &&
    (error.code === "P2034" || error.code === "P2028"),
  );
}

export const createConsultationSafely = createConsultationService({
  authenticate: requireAuthenticatedUser,
  transaction: async (operation) => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await prisma.$transaction(async (tx) => operation({
          findPatient: (patientId) => tx.patient.findUnique({
            where: { id: patientId },
            select: { id: true, baselineConsultationId: true },
          }),
          createConsultation: (input) => tx.consultation.create({
            data: input,
            select: { id: true, type: true, status: true },
          }),
          claimBaseline: async (patientId, consultationId) => {
            const result = await tx.patient.updateMany({
              where: { id: patientId, baselineConsultationId: null },
              data: { baselineConsultationId: consultationId },
            });
            return result.count === 1;
          },
          createAuditEvent: async (input) => {
            await tx.auditEvent.create({ data: input });
          },
        } satisfies ConsultationCreationTransaction), {
          isolationLevel: "Serializable",
        });
      } catch (error) {
        if (!isRetryableTransactionError(error) || attempt === 2) throw error;
      }
    }
    throw new ConsultationCreationError(
      "BASELINE_CONCURRENTLY_CREATED",
      "Não foi possível criar a consulta após tentativas concorrentes.",
    );
  },
});
