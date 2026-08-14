import type { ClinicalProblem, ProblemStatus } from "./problems.ts";

export interface ConsultationTimelinePoint {
  id: string;
  patientId: string;
  occurredAt: Date | string;
  createdAt: Date | string;
}

export interface AssessmentTimelineRecord {
  patientId: string;
  consultationId: string;
}

export interface ProblemStatusTimelineEvent {
  problemId: string;
  patientId: string;
  consultationId: string;
  previousStatus: ProblemStatus | null;
  newStatus: ProblemStatus;
  createdAt: Date | string;
}

export interface ProblemTimelineRecord extends ClinicalProblem {
  originConsultationId: string;
  events: readonly ProblemStatusTimelineEvent[];
}

function timestamp(value: Date | string, label: string): number {
  const result = new Date(value).getTime();
  if (!Number.isFinite(result)) throw new Error(`${label} inválida na linha temporal da consulta.`);
  return result;
}

function compareConsultations(a: ConsultationTimelinePoint, b: ConsultationTimelinePoint): number {
  return timestamp(a.occurredAt, "Data da consulta") - timestamp(b.occurredAt, "Data da consulta")
    || timestamp(a.createdAt, "Data de criação da consulta") - timestamp(b.createdAt, "Data de criação da consulta")
    || a.id.localeCompare(b.id);
}

export function consultationHorizon(input: {
  patientId: string;
  targetConsultationId: string;
  consultations: readonly ConsultationTimelinePoint[];
}): ConsultationTimelinePoint[] {
  const target = input.consultations.find((item) => item.id === input.targetConsultationId);
  if (!target || target.patientId !== input.patientId) {
    throw new Error("Consulta alvo não pertence ao paciente do relatório.");
  }
  if (input.consultations.some((item) => item.patientId !== input.patientId)) {
    throw new Error("Linha temporal não pode misturar pacientes diferentes.");
  }

  return [...input.consultations]
    .filter((item) => compareConsultations(item, target) <= 0)
    .sort(compareConsultations);
}

export function assessmentsAsOf<T extends AssessmentTimelineRecord>(input: {
  patientId: string;
  consultationIds: readonly string[];
  assessments: readonly T[];
}): T[] {
  if (input.assessments.some((item) => item.patientId !== input.patientId)) {
    throw new Error("Avaliações de pacientes diferentes não podem compor o mesmo relatório.");
  }
  const eligible = new Set(input.consultationIds);
  return input.assessments.filter((item) => eligible.has(item.consultationId));
}

export function problemsAsOf(input: {
  patientId: string;
  consultationIds: readonly string[];
  problems: readonly ProblemTimelineRecord[];
}): ClinicalProblem[] {
  const consultationOrder = new Map(input.consultationIds.map((id, index) => [id, index]));

  return input.problems
    .filter((problem) => consultationOrder.has(problem.originConsultationId))
    .map((problem) => {
      if (problem.patientId !== input.patientId) {
        throw new Error("Problemas de pacientes diferentes não podem compor o mesmo relatório.");
      }
      if (problem.events.some((event) => event.patientId !== input.patientId || event.problemId !== problem.id)) {
        throw new Error("Evento de problema não pertence ao paciente e problema esperados.");
      }

      const events = problem.events
        .filter((event) => consultationOrder.has(event.consultationId))
        .sort((a, b) => (consultationOrder.get(a.consultationId)! - consultationOrder.get(b.consultationId)!)
          || timestamp(a.createdAt, "Data do evento") - timestamp(b.createdAt, "Data do evento"));
      let status: ProblemStatus = events[0]?.previousStatus ?? "ACTIVE";
      for (const event of events) status = event.newStatus;

      return {
        id: problem.id,
        patientId: problem.patientId,
        type: problem.type,
        status,
        title: problem.title,
        description: problem.description,
        priority: problem.priority,
      };
    });
}
