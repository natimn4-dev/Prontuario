import {
  assertConsultationCanFinalize,
  assertConsultationTransition,
  type ConsultationStatus,
} from "../../domain/security/consultation-workflow.ts";

export type ConsultationWorkflowErrorCode =
  | "CONSULTATION_NOT_FOUND"
  | "CONSULTATION_FINALIZED"
  | "REVIEW_REQUIRED"
  | "CLINICAL_REVIEW_REQUIRED"
  | "URGENT_ALERTS_UNRESOLVED"
  | "CONSULTATION_CHANGED";

export class ConsultationWorkflowError extends Error {
  readonly code: ConsultationWorkflowErrorCode;

  constructor(code: ConsultationWorkflowErrorCode, message: string) {
    super(message);
    this.name = "ConsultationWorkflowError";
    this.code = code;
  }
}

export interface ServerDerivedUrgentAlert {
  code: string;
  message: string;
}

export interface ConsultationWorkflowContext {
  id: string;
  patientId: string;
  status: ConsultationStatus;
  urgentAlerts: readonly ServerDerivedUrgentAlert[];
}

export interface ConsultationWorkflowView {
  consultationId: string;
  status: ConsultationStatus;
  urgentAlerts: readonly ServerDerivedUrgentAlert[];
}

export interface ConsultationFinalizationTransaction {
  findWorkflowContext(consultationId: string): Promise<ConsultationWorkflowContext | null>;
  transitionStatus(input: {
    consultationId: string;
    patientId: string;
    from: ConsultationStatus;
    to: ConsultationStatus;
  }): Promise<boolean>;
  createAuditEvent(input: {
    userId: string;
    entityType: "Consultation";
    entityId: string;
    action: "consultation.review.start" | "consultation.finalize";
    requestId?: string;
    outcome: "success";
    reasonCode?: string;
  }): Promise<void>;
}

export interface ConsultationFinalizationDependencies {
  authenticate(permission: "patient.read" | "consultation.finalize"): Promise<{ user: { id: string } }>;
  transaction<T>(operation: (tx: ConsultationFinalizationTransaction) => Promise<T>): Promise<T>;
}

function publicView(context: ConsultationWorkflowContext): ConsultationWorkflowView {
  return {
    consultationId: context.id,
    status: context.status,
    urgentAlerts: context.urgentAlerts.map((alert) => ({ ...alert })),
  };
}

export function consultationFinalizationService(
  dependencies: ConsultationFinalizationDependencies,
) {
  async function getWorkflowState(consultationId: string): Promise<ConsultationWorkflowView> {
    await dependencies.authenticate("patient.read");
    return dependencies.transaction(async (tx) => {
      const context = await tx.findWorkflowContext(consultationId);
      if (!context) {
        throw new ConsultationWorkflowError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
      }
      return publicView(context);
    });
  }

  async function startReview(input: {
    consultationId: string;
    requestId?: string;
  }): Promise<ConsultationWorkflowView> {
    const { user } = await dependencies.authenticate("consultation.finalize");
    return dependencies.transaction(async (tx) => {
      const context = await tx.findWorkflowContext(input.consultationId);
      if (!context) {
        throw new ConsultationWorkflowError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
      }
      if (context.status === "FINALIZED") {
        throw new ConsultationWorkflowError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
      }
      if (context.status === "IN_REVIEW") return publicView(context);

      assertConsultationTransition(context.status, "IN_REVIEW");
      const changed = await tx.transitionStatus({
        consultationId: context.id,
        patientId: context.patientId,
        from: "DRAFT",
        to: "IN_REVIEW",
      });
      if (!changed) {
        throw new ConsultationWorkflowError(
          "CONSULTATION_CHANGED",
          "A consulta mudou durante o início da revisão; recarregue antes de tentar novamente.",
        );
      }

      await tx.createAuditEvent({
        userId: user.id,
        entityType: "Consultation",
        entityId: context.id,
        action: "consultation.review.start",
        requestId: input.requestId,
        outcome: "success",
      });

      return { ...publicView(context), status: "IN_REVIEW" };
    });
  }

  async function finalize(input: {
    consultationId: string;
    clinicalReviewConfirmed: boolean;
    acknowledgedUrgentAlertCodes: readonly string[];
    requestId?: string;
  }): Promise<ConsultationWorkflowView> {
    const { user } = await dependencies.authenticate("consultation.finalize");
    return dependencies.transaction(async (tx) => {
      const context = await tx.findWorkflowContext(input.consultationId);
      if (!context) {
        throw new ConsultationWorkflowError("CONSULTATION_NOT_FOUND", "Consulta não encontrada.");
      }
      if (context.status === "FINALIZED") {
        throw new ConsultationWorkflowError("CONSULTATION_FINALIZED", "Consulta finalizada é imutável.");
      }
      if (context.status !== "IN_REVIEW") {
        throw new ConsultationWorkflowError(
          "REVIEW_REQUIRED",
          "A consulta precisa estar em revisão antes da finalização.",
        );
      }
      if (!input.clinicalReviewConfirmed) {
        throw new ConsultationWorkflowError(
          "CLINICAL_REVIEW_REQUIRED",
          "Revisão clínica final não confirmada.",
        );
      }

      const acknowledged = new Set(input.acknowledgedUrgentAlertCodes);
      const unresolved = context.urgentAlerts.filter((alert) => !acknowledged.has(alert.code));
      if (unresolved.length > 0) {
        throw new ConsultationWorkflowError(
          "URGENT_ALERTS_UNRESOLVED",
          "Existem alertas clínicos urgentes ainda não revisados.",
        );
      }

      // Mantém a regra de domínio como segunda barreira. Paciente, consulta e
      // alertas são todos derivados no servidor; o cliente fornece apenas a
      // confirmação de revisão e os códigos que explicitamente reconheceu.
      assertConsultationCanFinalize({
        selectedPatientId: context.patientId,
        consultationPatientId: context.patientId,
        selectedConsultationId: context.id,
        consultationId: context.id,
        status: context.status,
        clinicalReviewConfirmed: input.clinicalReviewConfirmed,
        unresolvedUrgentAlerts: unresolved.map((alert) => alert.message),
      });

      const changed = await tx.transitionStatus({
        consultationId: context.id,
        patientId: context.patientId,
        from: "IN_REVIEW",
        to: "FINALIZED",
      });
      if (!changed) {
        throw new ConsultationWorkflowError(
          "CONSULTATION_CHANGED",
          "A consulta mudou durante a finalização; recarregue antes de tentar novamente.",
        );
      }

      await tx.createAuditEvent({
        userId: user.id,
        entityType: "Consultation",
        entityId: context.id,
        action: "consultation.finalize",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: context.urgentAlerts.length > 0
          ? "current-urgent-alerts-reviewed"
          : "no-current-urgent-alerts",
      });

      return { ...publicView(context), status: "FINALIZED" };
    });
  }

  return { getWorkflowState, startReview, finalize };
}
