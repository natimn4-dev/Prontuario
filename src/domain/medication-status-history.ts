export type MedicationLifecycleStatus = "ACTIVE" | "SUSPENDED" | "FINISHED";

export interface MedicationStatusTimelineEvent {
  id: string;
  medicationId: string;
  patientId: string;
  consultationId: string;
  previousStatus: MedicationLifecycleStatus | null;
  newStatus: MedicationLifecycleStatus;
  createdAt: Date | string;
}

export interface MedicationStatusProjection {
  known: boolean;
  status: MedicationLifecycleStatus | null;
  source: "EXPLICIT_STATUS_EVENT" | "NO_EXPLICIT_STATUS_HISTORY";
  lastEventConsultationId?: string;
}

function eventTimestamp(value: Date | string): number {
  const result = new Date(value).getTime();
  if (!Number.isFinite(result)) {
    throw new Error("Data do evento de status do medicamento é inválida.");
  }
  return result;
}

/**
 * Reconstrói o status de um medicamento somente a partir de eventos explícitos
 * pertencentes ao horizonte da consulta. O status atual de Medication não é
 * aceito como entrada para evitar vazamento de estado futuro em documentos
 * históricos.
 */
export function medicationStatusAsOf(input: {
  patientId: string;
  medicationId: string;
  consultationIds: readonly string[];
  events: readonly MedicationStatusTimelineEvent[];
}): MedicationStatusProjection {
  if (input.events.some((event) => event.patientId !== input.patientId)) {
    throw new Error("Eventos de status de pacientes diferentes não podem compor o mesmo histórico de medicamento.");
  }
  if (input.events.some((event) => event.medicationId !== input.medicationId)) {
    throw new Error("Eventos de medicamentos diferentes não podem compor a mesma projeção de status.");
  }

  const consultationOrder = new Map(input.consultationIds.map((id, index) => [id, index]));
  const eligible = input.events
    .filter((event) => consultationOrder.has(event.consultationId))
    .sort((a, b) =>
      consultationOrder.get(a.consultationId)! - consultationOrder.get(b.consultationId)!
      || eventTimestamp(a.createdAt) - eventTimestamp(b.createdAt)
      || a.id.localeCompare(b.id));

  if (eligible.length === 0) {
    return {
      known: false,
      status: null,
      source: "NO_EXPLICIT_STATUS_HISTORY",
    };
  }

  let previousEvent: MedicationStatusTimelineEvent | undefined;
  for (const event of eligible) {
    if (previousEvent && event.previousStatus !== previousEvent.newStatus) {
      throw new Error("Histórico de status do medicamento possui transição inconsistente.");
    }
    previousEvent = event;
  }

  const latest = eligible[eligible.length - 1]!;
  return {
    known: true,
    status: latest.newStatus,
    source: "EXPLICIT_STATUS_EVENT",
    lastEventConsultationId: latest.consultationId,
  };
}
