import {
  calculateCarg,
  CARG_SCALE_CODE,
  CARG_SCALE_VERSION,
  type CargInput,
  type CargResult,
} from "./calculators.ts";
import {
  summarizeCargCompleteness,
  type PartialCargInput,
} from "./carg-audit.ts";

type JsonRecord = Record<string, unknown>;

export interface CargReportAssessmentLike {
  scaleCode: string;
  scaleVersion: string;
  answers: unknown;
  scoreNumeric: number | null;
  scoreText: string | null;
  classification: string | null;
  interpretation: string | null;
}

export interface CargReportModel {
  source: "registered" | "draft";
  sourceLabel: string;
  score: number | null;
  scoreText: string | null;
  category: "LOW" | "INTERMEDIATE" | "HIGH" | null;
  categoryLabel: string | null;
  observedGradeThreeToFiveToxicityPercent: 30 | 52 | 83 | null;
  interpretation: string | null;
  populationNote: string | null;
  pendingLabels: string[];
  attentionFactors: Array<{ label: string; points: number }>;
  clinicianGuidance: string;
  scaleCode: typeof CARG_SCALE_CODE;
  scaleVersion: typeof CARG_SCALE_VERSION;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function categoryLabel(category: CargResult["category"]): string {
  return category === "LOW" ? "Baixo risco" : category === "INTERMEDIATE" ? "Risco intermediário" : "Alto risco";
}

function observedToxicity(category: CargResult["category"]): 30 | 52 | 83 {
  return category === "LOW" ? 30 : category === "INTERMEDIATE" ? 52 : 83;
}

function resultFromCalculation(
  result: CargResult,
  source: CargReportModel["source"],
  interpretation?: string | null,
): CargReportModel {
  const attentionFactors = result.components
    .filter((component) => component.points > 0)
    .map((component) => ({ label: component.label, points: component.points }));
  const observed = result.observedGradeThreeToFiveToxicityPercent;
  const sourceLabel = source === "registered"
    ? "CARG registrado"
    : "Prévia do CARG — rascunho completo, ainda não registrado como avaliação final";
  const factorSummary = attentionFactors.length
    ? attentionFactors.map((item) => `${item.label} (+${item.points})`).join("; ")
    : "nenhum fator pontuado";

  return {
    source,
    sourceLabel,
    score: result.score,
    scoreText: `${result.score}/23`,
    category: result.category,
    categoryLabel: categoryLabel(result.category),
    observedGradeThreeToFiveToxicityPercent: observed,
    interpretation: interpretation?.trim() || result.decisionSupportMessage,
    populationNote: result.populationNote ?? null,
    pendingLabels: [],
    attentionFactors,
    clinicianGuidance: `Orientação ao oncologista: o CARG identifica ${categoryLabel(result.category).toLocaleLowerCase("pt-BR")} e uma frequência observada de ${observed}% de toxicidade grau 3 a 5 na coorte de derivação; isso não é uma probabilidade individual. Revise os fatores pontuados (${factorSummary}), os domínios geriátricos alterados e as toxicidades registradas, integrando-os ao julgamento clínico e ao seguimento. O CARG não indica isoladamente redução de dose, mudança, adiamento ou suspensão do tratamento.`,
    scaleCode: CARG_SCALE_CODE,
    scaleVersion: CARG_SCALE_VERSION,
  };
}

function calculationFromAnswers(answers: unknown): CargResult | null {
  const input = record(answers) as PartialCargInput;
  const completion = summarizeCargCompleteness(input);
  if (!completion.complete) return null;
  try {
    return calculateCarg(input as CargInput);
  } catch {
    return null;
  }
}

/**
 * Produces the report-safe CARG view. A complete draft is intentionally
 * visible as a preview so a filled instrument cannot disappear from the
 * report, while its non-final status remains explicit until CARG_SAVE runs.
 */
export function buildCargReportModel(input: {
  assessment?: CargReportAssessmentLike | null;
  draft?: unknown;
}): CargReportModel | null {
  const assessment = input.assessment;
  if (assessment?.scaleCode === CARG_SCALE_CODE && assessment.scaleVersion === CARG_SCALE_VERSION) {
    const calculated = calculationFromAnswers(assessment.answers);
    if (calculated) return resultFromCalculation(calculated, "registered", assessment.interpretation);

    const classification = assessment.classification === "Baixo risco"
      ? "LOW"
      : assessment.classification === "Risco intermediário"
        ? "INTERMEDIATE"
        : assessment.classification === "Alto risco" ? "HIGH" : null;
    if (assessment.scoreNumeric !== null && classification) {
      return {
        source: "registered",
        sourceLabel: "CARG registrado",
        score: assessment.scoreNumeric,
        scoreText: assessment.scoreText ?? `${assessment.scoreNumeric}/23`,
        category: classification,
        categoryLabel: categoryLabel(classification),
        observedGradeThreeToFiveToxicityPercent: observedToxicity(classification),
        interpretation: assessment.interpretation,
        populationNote: null,
        pendingLabels: [],
        attentionFactors: [],
        clinicianGuidance: `Orientação ao oncologista: o CARG identifica ${categoryLabel(classification).toLocaleLowerCase("pt-BR")} e uma frequência observada de ${observedToxicity(classification)}% de toxicidade grau 3 a 5 na coorte de derivação; isso não é uma probabilidade individual. Revise os fatores pontuados e os domínios geriátricos alterados, integrando-os ao julgamento clínico e ao seguimento. O CARG não indica isoladamente redução de dose, mudança, adiamento ou suspensão do tratamento.`,
        scaleCode: CARG_SCALE_CODE,
        scaleVersion: CARG_SCALE_VERSION,
      };
    }
  }

  const draftAnswers = record(input.draft) as PartialCargInput;
  const completion = summarizeCargCompleteness(draftAnswers);
  if (completion.completedCount === 0) return null;
  const calculated = completion.complete ? calculationFromAnswers(draftAnswers) : null;
  if (calculated) return resultFromCalculation(calculated, "draft");

  return {
    source: "draft",
    sourceLabel: `Rascunho do CARG — ${completion.completedCount}/${completion.totalFactors} fatores preenchidos`,
    score: null,
    scoreText: null,
    category: null,
    categoryLabel: null,
    observedGradeThreeToFiveToxicityPercent: null,
    interpretation: null,
    populationNote: null,
    pendingLabels: [...completion.pendingLabels],
    attentionFactors: [],
    clinicianGuidance: "O CARG foi iniciado, mas ainda não há dados suficientes para estimar o grupo de risco. Complete os fatores pendentes e registre o resultado antes de usar a escala na discussão oncológica.",
    scaleCode: CARG_SCALE_CODE,
    scaleVersion: CARG_SCALE_VERSION,
  };
}
