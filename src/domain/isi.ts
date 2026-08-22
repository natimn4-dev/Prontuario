import type { ClinicalColor } from "./clinical-engine.ts";

export const ISI_CODE = "isi" as const;
export const ISI_VERSION = "ISI-7-scoring-2001-BR-validation-2011-v1";
export const ISI_MAX_SCORE = 28;

export const ISI_ITEM_IDS = [
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6",
  "item7",
] as const;

export type IsiItemId = (typeof ISI_ITEM_IDS)[number];
export type IsiItemScore = 0 | 1 | 2 | 3 | 4;
export type IsiAnswers = Record<IsiItemId, IsiItemScore>;

export type IsiResult = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor: ClinicalColor;
};

export type ScoredIsi = {
  answers: IsiAnswers;
  result: IsiResult;
  version: typeof ISI_VERSION;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ISI_ANSWERS_REQUIRED");
  }
  return value as Record<string, unknown>;
}

function parseItemScore(value: unknown, itemId: IsiItemId): IsiItemScore {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
    throw new Error(`ISI_INVALID_ANSWER:${itemId}`);
  }
  return value as IsiItemScore;
}

export function parseIsiAnswers(raw: unknown): IsiAnswers {
  const input = asRecord(raw);
  const allowed = new Set<string>(ISI_ITEM_IDS);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) throw new Error(`ISI_UNEXPECTED_ANSWER:${unexpected[0]}`);

  return Object.fromEntries(
    ISI_ITEM_IDS.map((itemId) => {
      if (!(itemId in input)) throw new Error(`ISI_MISSING_ANSWER:${itemId}`);
      return [itemId, parseItemScore(input[itemId], itemId)];
    }),
  ) as IsiAnswers;
}

export function classifyIsi(total: number): Pick<IsiResult, "classification" | "interpretation" | "clinicalColor"> {
  if (!Number.isInteger(total) || total < 0 || total > ISI_MAX_SCORE) {
    throw new Error("ISI_SCORE_OUT_OF_RANGE");
  }

  if (total <= 7) {
    return {
      classification: "Ausência de insônia clinicamente significativa",
      interpretation:
        "ISI sem sintomas clinicamente significativos pela faixa de referência adotada. O instrumento quantifica sintomas e não estabelece diagnóstico isoladamente.",
      clinicalColor: "verde",
    };
  }
  if (total <= 14) {
    return {
      classification: "Sintomas de insônia abaixo do limiar (subclínicos)",
      interpretation:
        "ISI compatível com sintomas de insônia abaixo do limiar. Correlacionar com padrão sono-vigília, impacto diurno, condições clínicas e avaliação profissional; o escore isolado não estabelece diagnóstico.",
      clinicalColor: "amarelo",
    };
  }
  if (total <= 21) {
    return {
      classification: "Sintomas de insônia de intensidade moderada",
      interpretation:
        "ISI compatível com sintomas de insônia de intensidade moderada. Requer contextualização clínica e investigação de fatores associados; o escore isolado não estabelece diagnóstico.",
      clinicalColor: "vermelho",
    };
  }
  return {
    classification: "Sintomas de insônia de intensidade grave",
    interpretation:
      "ISI compatível com sintomas de insônia de intensidade grave. Requer avaliação clínica individualizada e investigação de fatores associados; o escore isolado não estabelece diagnóstico.",
    clinicalColor: "vermelho",
  };
}

export function scoreIsi(raw: unknown): ScoredIsi {
  const answers = parseIsiAnswers(raw);
  const score = ISI_ITEM_IDS.reduce((sum, itemId) => sum + answers[itemId], 0);
  const classification = classifyIsi(score);
  return {
    answers,
    version: ISI_VERSION,
    result: {
      score,
      scoreText: `${score}/${ISI_MAX_SCORE}`,
      ...classification,
    },
  };
}
