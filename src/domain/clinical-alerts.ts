import { numericValue, type ScaleResult } from "./clinical-engine.ts";

export type ClinicalAlertSeverity = "attention" | "urgent";

export interface ClinicalAlert {
  code: string;
  scaleId: string;
  severity: ClinicalAlertSeverity;
  message: string;
  alwaysEvaluate?: boolean;
  audience?: "professional" | "shared";
  familyMessage?: string;
}

export interface ClinicalAlertContext {
  answers?: Record<string, unknown>;
  result?: Pick<ScaleResult, "score" | "scoreText" | "cor" | "classe">;
}

/**
 * Alertas de segurança clínica ficam deliberadamente fora do plano para
 * família/cuidadores. São prompts dirigidos ao profissional e nunca devem
 * ser ocultados apenas porque o escore total da escala ficou baixo.
 */
export function clinicalAlertsFor(
  scaleId: string,
  context: ClinicalAlertContext = {},
): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];

  if (scaleId === "gds15") {
    alerts.push({
      code: "gds15-suicide-screen",
      scaleId,
      severity: "attention",
      alwaysEvaluate: true,
      audience: "professional",
      message:
        "Pesquisar ativamente ideação suicida independentemente do escore total da GDS-15.",
    });
  }

  if (scaleId === "cornell") {
    alerts.push({
      code: "cornell-co16-review",
      scaleId,
      severity: "attention",
      alwaysEvaluate: true,
      audience: "professional",
      message:
        "Revisar explicitamente o item co16 (ideação suicida), mesmo quando o escore total da Cornell for baixo.",
    });

    if (numericValue(context.answers?.co16) > 0) {
      alerts.push({
        code: "cornell-suicidal-ideation-present",
        scaleId,
        severity: "urgent",
        familyMessage:
          "Foi registrado um sinal de que a pessoa pode estar pensando que a vida não vale a pena ou em se machucar. Permaneça com ela, mantenha um ambiente seguro e procure atendimento médico imediatamente.",
        message:
          "Ideação suicida marcada na Cornell: realizar avaliação clínica imediata do risco e definir conduta de segurança.",
      });
    }
  }

  if (
    scaleId === "cam" &&
    (context.result?.scoreText === "Positivo" || context.result?.score === 1)
  ) {
    alerts.push({
      code: "cam-positive-delirium",
      scaleId,
      severity: "urgent",
      message:
        "CAM positivo: delirium provável. Investigar causa aguda imediatamente e priorizar a avaliação clínica.",
    });
  }

  if (scaleId === "esas") {
    const severeSymptoms = Object.entries(context.answers ?? {})
      .filter(([key, value]) => /^es[1-9]$/.test(key) && numericValue(value) >= 7)
      .map(([key]) => key);
    if (severeSymptoms.length > 0) {
      alerts.push({
        code: "esas-severe-symptom",
        scaleId,
        severity: "attention",
        message:
          `ESAS com sintoma(s) >= 7/10 (${severeSymptoms.join(", ")}): revisar individualmente e priorizar controle sintomático.`,
      });
    }
  }

  return alerts;
}
