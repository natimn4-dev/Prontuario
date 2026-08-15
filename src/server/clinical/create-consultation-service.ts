import type { ConsultationStatus, ConsultationType } from "../../domain/consultation";

export type ConsultationCreationErrorCode =
  | "PATIENT_NOT_FOUND"
  | "INITIAL_ALREADY_EXISTS"
  | "FOLLOW_UP_REQUIRES_BASELINE"
  | "BASELINE_CONCURRENTLY_CREATED"
  | "PATIENT_STATE_CHANGED";

export class ConsultationCreationError extends Error {
  readonly code: ConsultationCreationErrorCode;

  constructor(
    code: ConsultationCreationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ConsultationCreationError";
    this.code = code;
  }
}

export class ConsultationCreationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsultationCreationRequestError";
  }
}

export interface ConsultationCreationRequest {
  patientId: string;
  expectedBaselineConsultationId: string | null;
}

export function parseConsultationCreationRequest(body: unknown): ConsultationCreationRequest {
  if (
    !body
    || typeof body !== "object"
    || !("patientId" in body)
    || typeof body.patientId !== "string"
    || !body.patientId.trim()
    || !("expectedBaselineConsultationId" in body)
    || (body.expectedBaselineConsultationId !== null && typeof body.expectedBaselineConsultationId !== "string")
  ) {
    throw new ConsultationCreationRequestError("Informe o paciente da consulta.");
  }
  if ("type" in body || "physicianId" in body) {
    throw new ConsultationCreationRequestError(
      "O tipo da consulta e o médico responsável são definidos pelo servidor.",
    );
  }
  return {
    patientId: body.patientId,
    expectedBaselineConsultationId: body.expectedBaselineConsultationId,
  };
}

export interface CreateConsultationInput {
  patientId: string;
  expectedBaselineConsultationId: string | null;
  requestId?: string;
}

export interface ConsultationCreationTransaction {
  findPatient(patientId: string): Promise<{ id: string; baselineConsultationId: string | null } | null>;
  createConsultation(input: {
    patientId: string;
    physicianId: string;
    type: ConsultationType;
    status: ConsultationStatus;
    occurredAt: Date;
  }): Promise<{ id: string; type: ConsultationType; status: ConsultationStatus }>;
  claimBaseline(patientId: string, consultationId: string): Promise<boolean>;
  createAuditEvent(input: {
    userId: string;
    entityType: "Consultation";
    entityId: string;
    action: "consultation.create";
    requestId?: string;
    outcome: "success";
    reasonCode: "aga-initial" | "follow-up";
  }): Promise<void>;
}

export interface ConsultationCreationDependencies {
  authenticate(permission: "consultation.write"): Promise<{ user: { id: string } }>;
  transaction<T>(operation: (tx: ConsultationCreationTransaction) => Promise<T>): Promise<T>;
  now?: () => Date;
}

export function assertConsultationTypeAllowed(
  baselineConsultationId: string | null,
  requestedType: ConsultationType,
): void {
  if (requestedType === "AGA_INITIAL" && baselineConsultationId) {
    throw new ConsultationCreationError(
      "INITIAL_ALREADY_EXISTS",
      "Este paciente já possui uma AGA inicial.",
    );
  }
  if (requestedType === "FOLLOW_UP" && !baselineConsultationId) {
    throw new ConsultationCreationError(
      "FOLLOW_UP_REQUIRES_BASELINE",
      "Não é possível iniciar consulta subsequente sem AGA inicial.",
    );
  }
}

export function createConsultationService(dependencies: ConsultationCreationDependencies) {
  return async function createConsultationSafely(input: CreateConsultationInput) {
    const { user } = await dependencies.authenticate("consultation.write");

    return dependencies.transaction(async (tx) => {
      const patient = await tx.findPatient(input.patientId);
      if (!patient) {
        throw new ConsultationCreationError(
          "PATIENT_NOT_FOUND",
          "Paciente não encontrado.",
        );
      }

      if (patient.baselineConsultationId !== input.expectedBaselineConsultationId) {
        throw new ConsultationCreationError(
          "PATIENT_STATE_CHANGED",
          "O estado longitudinal do paciente mudou. Recarregue a página antes de criar outra consulta.",
        );
      }

      const type: ConsultationType = patient.baselineConsultationId
        ? "FOLLOW_UP"
        : "AGA_INITIAL";
      assertConsultationTypeAllowed(patient.baselineConsultationId, type);

      const consultation = await tx.createConsultation({
        patientId: patient.id,
        physicianId: user.id,
        type,
        status: "DRAFT",
        occurredAt: (dependencies.now ?? (() => new Date()))(),
      });

      if (type === "AGA_INITIAL") {
        const claimed = await tx.claimBaseline(patient.id, consultation.id);
        if (!claimed) {
          throw new ConsultationCreationError(
            "BASELINE_CONCURRENTLY_CREATED",
            "A AGA inicial deste paciente acabou de ser criada em outra solicitação.",
          );
        }
      }

      await tx.createAuditEvent({
        userId: user.id,
        entityType: "Consultation",
        entityId: consultation.id,
        action: "consultation.create",
        requestId: input.requestId,
        outcome: "success",
        reasonCode: type === "AGA_INITIAL" ? "aga-initial" : "follow-up",
      });

      return consultation;
    });
  };
}
