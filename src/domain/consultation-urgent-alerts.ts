import { clinicalAlertsFor } from "./clinical-alerts.ts";
import type { ClinicalColor } from "./clinical-engine.ts";

export interface ConsultationAlertAssessment {
  id: string;
  scaleCode: string;
  answers?: Record<string, unknown>;
  score: number | null;
  scoreText?: string;
  classification?: string;
  color?: ClinicalColor;
  appliedAt: Date | string;
}

export interface ConsultationUrgentAlert {
  code: string;
  message: string;
}

function timestamp(value: Date | string): number {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) throw new Error("Data de aplicação inválida ao derivar alertas da consulta.");
  return time;
}

/**
 * Deriva alertas urgentes exclusivamente dos registros efetivos mais recentes
 * de cada instrumento dentro da consulta informada pelo servidor.
 *
 * Não recebe patientId/consultationId e não decide resolução clínica. Seu papel
 * é impedir que uma reaplicação anterior da mesma escala continue bloqueando a
 * consulta depois que um registro mais recente passou a ser o vigente.
 */
export function urgentAlertsForCurrentConsultation(
  assessments: readonly ConsultationAlertAssessment[],
): ConsultationUrgentAlert[] {
  const ordered = [...assessments].sort((a, b) => {
    const timeDiff = timestamp(a.appliedAt) - timestamp(b.appliedAt);
    return timeDiff || a.id.localeCompare(b.id);
  });
  const latestByScale = new Map<string, ConsultationAlertAssessment>();
  for (const assessment of ordered) latestByScale.set(assessment.scaleCode, assessment);

  return [...latestByScale.values()]
    .flatMap((assessment) => clinicalAlertsFor(assessment.scaleCode, {
      answers: assessment.answers,
      result: {
        score: assessment.score,
        scoreText: assessment.scoreText ?? (assessment.score === null ? "—" : String(assessment.score)),
        cor: assessment.color ?? "cinza",
        classe: assessment.classification ?? "Sem classificação registrada",
      },
    }))
    .filter((alert) => alert.severity === "urgent")
    .map((alert) => ({ code: alert.code, message: alert.message }));
}
