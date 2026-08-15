export type ConsultationType = "AGA_INITIAL" | "FOLLOW_UP";
export type ConsultationStatus = "DRAFT" | "IN_REVIEW" | "FINALIZED";

export interface ConsultationIdentity {
  id: string;
  patientId: string;
  physicianId: string;
  type: ConsultationType;
  status: ConsultationStatus;
  occurredAt: Date;
}

export function canCreateFollowUp(
  baselineConsultationId: string | null | undefined,
): boolean {
  return Boolean(baselineConsultationId);
}

export interface ConsultationCreationPresentation {
  label: "Iniciar AGA inicial" | "Nova consulta subsequente";
  helperText?: string;
}

export function consultationCreationPresentation(
  baselineConsultationId: string | null | undefined,
): ConsultationCreationPresentation {
  return baselineConsultationId
    ? { label: "Nova consulta subsequente" }
    : {
        label: "Iniciar AGA inicial",
        helperText: "Esta será a linha de base longitudinal deste paciente.",
      };
}

export function assertDocumentContext(input: {
  patientId?: string | null;
  consultationId?: string | null;
}) {
  if (!input.patientId || !input.consultationId) {
    throw new Error(
      "Documento não pode ser gerado sem paciente e consulta selecionados.",
    );
  }
}
