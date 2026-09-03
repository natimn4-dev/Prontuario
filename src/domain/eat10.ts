import type { ClinicalColor } from "./clinical-engine.ts";

export const EAT10_CODE = "eat10" as const;
export const EAT10_VERSION = "EAT-10-total-score-BR-2014-2023-v1";
export const EAT10_MAX_SCORE = 40;
export const EAT10_POSITIVE_CUTOFF = 3;

export type Eat10QuickDefinition = {
  code: typeof EAT10_CODE;
  version: typeof EAT10_VERSION;
  name: string;
  dimension: "disfagia";
  instruction: string;
  sourceNote: string;
  fields: readonly [{
    id: "score";
    label: string;
    number: { min: 0; max: 40; step: 1; help: string };
  }];
};

/**
 * O formulário literal do EAT-10 não é reproduzido neste módulo.
 * O instrumento é protegido por copyright e distribuído pela Mapi Research Trust
 * em nome da Société des Produits Nestlé S.A. A incorporação eletrônica completa
 * depende de confirmação documental das condições de uso e da versão brasileira
 * autorizada. Até lá, o prontuário aceita somente o escore total previamente obtido.
 */
export const EAT10_QUICK_DEFINITION: Eat10QuickDefinition = {
  code: EAT10_CODE,
  version: EAT10_VERSION,
  name: "EAT-10 — rastreio de disfagia (registro de pontuação)",
  dimension: "disfagia",
  instruction:
    "Registre somente o escore total de 0 a 40 de um EAT-10 já aplicado por meio autorizado. O prontuário não reproduz os dez itens enquanto a permissão aplicável à implementação eletrônica não estiver documentada.",
  sourceNote:
    "Belafsky et al., 2008 (PMID 19140539); Gonçalves et al., 2014, adaptação cultural brasileira (PMID 24626972); Dantas et al., 2023 (PMID 37272949). Escore ≥3 indica rastreio positivo para risco/sintomas de disfagia na versão brasileira e requer correlação clínica; não estabelece diagnóstico isoladamente.",
  fields: [{
    id: "score",
    label: "Pontuação total do EAT-10",
    number: {
      min: 0,
      max: 40,
      step: 1,
      help: "Informe o total de 0 a 40 obtido no EAT-10 previamente aplicado. Pontuação ≥3 é considerada rastreio positivo e deve motivar avaliação clínica/fonoaudiológica conforme o contexto.",
    },
  }],
};

export type Eat10Result = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor: ClinicalColor;
};

export type ScoredEat10 = {
  answers: { score: number };
  result: Eat10Result;
  version: typeof EAT10_VERSION;
};

function totalScore(raw: Record<string, unknown>): number {
  const allowed = new Set(["score"]);
  const unexpected = Object.keys(raw).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) throw new Error(`EAT10_UNEXPECTED_FIELD:${unexpected[0]}`);
  const score = raw.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > EAT10_MAX_SCORE) {
    throw new Error("EAT10_SCORE_OUT_OF_RANGE");
  }
  return score;
}

export function classifyEat10(total: number): Pick<Eat10Result, "classification" | "interpretation" | "clinicalColor"> {
  if (!Number.isInteger(total) || total < 0 || total > EAT10_MAX_SCORE) {
    throw new Error("EAT10_SCORE_OUT_OF_RANGE");
  }

  if (total >= EAT10_POSITIVE_CUTOFF) {
    return {
      classification: "Rastreio positivo para disfagia",
      interpretation:
        "EAT-10 com 3 pontos ou mais: rastreio positivo para risco/sintomas de disfagia. Considerar avaliação clínica e fonoaudiológica da deglutição. O resultado não confirma diagnóstico nem define sozinho dieta, consistência de líquidos ou tratamento.",
      clinicalColor: "vermelho",
    };
  }

  return {
    classification: "Rastreio não positivo pelo ponto de corte",
    interpretation:
      "EAT-10 abaixo de 3 pontos. O rastreio não está positivo pelo ponto de corte validado, mas sintomas ou sinais de dificuldade para engolir ainda devem ser avaliados clinicamente quando presentes.",
    clinicalColor: "verde",
  };
}

export function scoreEat10(raw: Record<string, unknown>): ScoredEat10 {
  const score = totalScore(raw);
  return {
    answers: { score },
    version: EAT10_VERSION,
    result: {
      score,
      scoreText: `${score}/${EAT10_MAX_SCORE}`,
      ...classifyEat10(score),
    },
  };
}
