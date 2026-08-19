export type DocumentContextScaleAssessment = {
  patientId: string;
  consultationId: string;
};

export type DocumentContextProblemEvent = {
  problemId: string;
  patientId: string;
  consultationId: string;
};

export type DocumentContextProblem = {
  id: string;
  patientId: string;
  originConsultationId: string;
  events: readonly DocumentContextProblemEvent[];
};

export function assertDocumentContextIntegrity(input: {
  patientId: string;
  consultationId: string;
  consultationIds: readonly string[];
  scaleAssessments: readonly DocumentContextScaleAssessment[];
  problems: readonly DocumentContextProblem[];
}): void {
  const consultationIds = new Set(input.consultationIds);

  if (!consultationIds.has(input.consultationId)) {
    throw new Error("Contexto documental inválido: consulta-alvo fora do horizonte longitudinal.");
  }

  for (const assessment of input.scaleAssessments) {
    if (assessment.patientId !== input.patientId) {
      throw new Error("Contexto documental inválido: escala pertence a paciente diferente.");
    }
    if (!consultationIds.has(assessment.consultationId)) {
      throw new Error("Contexto documental inválido: escala pertence a consulta fora do horizonte.");
    }
  }

  for (const problem of input.problems) {
    if (problem.patientId !== input.patientId) {
      throw new Error("Contexto documental inválido: problema pertence a paciente diferente.");
    }
    if (!consultationIds.has(problem.originConsultationId)) {
      throw new Error("Contexto documental inválido: problema nasceu fora do horizonte da consulta.");
    }

    for (const event of problem.events) {
      if (event.problemId !== problem.id) {
        throw new Error("Contexto documental inválido: evento pertence a problema diferente.");
      }
      if (event.patientId !== input.patientId) {
        throw new Error("Contexto documental inválido: evento de problema pertence a paciente diferente.");
      }
      if (!consultationIds.has(event.consultationId)) {
        throw new Error("Contexto documental inválido: evento de problema pertence a consulta fora do horizonte.");
      }
    }
  }
}
