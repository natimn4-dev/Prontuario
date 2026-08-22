import type { ClinicalColor } from "./clinical-engine.ts";

export const ISI_CODE = "isi" as const;
export const ISI_VERSION = "ISI-total-score-entry-BR-validation-2011-v2";
export const ISI_MAX_SCORE = 28;

export type IsiQuickDefinition = {
  code: typeof ISI_CODE;
  version: typeof ISI_VERSION;
  name: string;
  dimension: "sono";
  instruction: string;
  sourceNote: string;
  fields: readonly [{
    id: "score";
    label: string;
    number: { min: 0; max: 28; step: 1; help: string };
  }];
};

export const ISI_QUICK_DEFINITION: IsiQuickDefinition = {
  code: ISI_CODE,
  version: ISI_VERSION,
  name: "ISI — registro rápido de pontuação",
  dimension: "sono",
  instruction:
    "Registre somente o escore total de uma ISI/IGI já aplicada por meio autorizado. Este campo não reproduz os sete itens, alternativas ou instruções do instrumento.",
  sourceNote:
    "Bastien et al., 2001 (PMID 11438246) e Castro, UNIFESP 2011 (validação brasileira em adultos da cidade de São Paulo). O registro de escore não substitui a aplicação do instrumento nem estabelece diagnóstico isoladamente.",
  fields: [{
    id: "score",
    label: "Pontuação total da ISI/IGI",
    number: {
      min: 0,
      max: 28,
      step: 1,
      help: "Informe apenas o total de 0 a 28 obtido em uma ISI/IGI já aplicada. Os itens do questionário não são reproduzidos neste prontuário.",
    },
  }],
};

export type IsiResult = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor: ClinicalColor;
};

export type ScoredIsi = {
  answers: { score: number };
  result: IsiResult;
  version: typeof ISI_VERSION;
};

function totalScore(raw: Record<string, unknown>): number {
  const allowed = new Set(["score"]);
  const unexpected = Object.keys(raw).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) throw new Error(`ISI_UNEXPECTED_FIELD:${unexpected[0]}`);
  const score = raw.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > ISI_MAX_SCORE) {
    throw new Error("ISI_SCORE_OUT_OF_RANGE");
  }
  return score;
}

export function classifyIsi(total: number): Pick<IsiResult, "classification" | "interpretation" | "clinicalColor"> {
  if (!Number.isInteger(total) || total < 0 || total > ISI_MAX_SCORE) {
    throw new Error("ISI_SCORE_OUT_OF_RANGE");
  }

  if (total <= 7) {
    return {
      classification: "Sem sintomas clinicamente significativos pela faixa de referência",
      interpretation:
        "Escore ISI/IGI entre 0 e 7. O instrumento quantifica gravidade de sintomas e não estabelece diagnóstico isoladamente; interpretar no contexto clínico e longitudinal.",
      clinicalColor: "verde",
    };
  }
  if (total <= 14) {
    return {
      classification: "Sintomas de insônia abaixo do limiar",
      interpretation:
        "Escore ISI/IGI entre 8 e 14, compatível com sintomas abaixo do limiar de maior gravidade. Correlacionar com padrão sono-vigília, impacto diurno e condições associadas; o escore isolado não estabelece diagnóstico.",
      clinicalColor: "amarelo",
    };
  }
  if (total <= 21) {
    return {
      classification: "Sintomas de insônia de intensidade moderada",
      interpretation:
        "Escore ISI/IGI entre 15 e 21, compatível com sintomas de intensidade moderada. Requer contextualização clínica e investigação de fatores associados; o escore isolado não estabelece diagnóstico.",
      clinicalColor: "vermelho",
    };
  }
  return {
    classification: "Sintomas de insônia de intensidade grave",
    interpretation:
      "Escore ISI/IGI entre 22 e 28, compatível com sintomas de intensidade grave. Requer avaliação clínica individualizada e investigação de fatores associados; o escore isolado não estabelece diagnóstico.",
    clinicalColor: "vermelho",
  };
}

export function scoreIsi(raw: Record<string, unknown>): ScoredIsi {
  const score = totalScore(raw);
  return {
    answers: { score },
    version: ISI_VERSION,
    result: {
      score,
      scoreText: `${score}/${ISI_MAX_SCORE}`,
      ...classifyIsi(score),
    },
  };
}
