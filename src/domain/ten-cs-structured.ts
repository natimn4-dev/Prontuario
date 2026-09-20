import { scoreNumeric } from "./clinical-engine.ts";
import { TEN_CS } from "./clinical-config/legacy-core.ts";

export const TEN_CS_STRUCTURED_CODE = "dez_cs" as const;
export const TEN_CS_STRUCTURED_VERSION = "10cs-apolinario-item-entry-2015-v1" as const;

const binaryChoices = [
  { value: 0, label: "Não / incorreto" },
  { value: 1, label: "Sim / correto" },
] as const;

export const TEN_CS_STRUCTURED_DEFINITION = {
  code: TEN_CS_STRUCTURED_CODE,
  version: TEN_CS_STRUCTURED_VERSION,
  name: "10-CS — 10-Point Cognitive Screener",
  dimension: "cognicao",
  instruction:
    "Preencha orientação temporal, fluência verbal e evocação. A etapa de aprendizado das três palavras não pontua e não deve ser registrada aqui. O servidor soma os componentes, aplica automaticamente o ajuste educacional do 10-CS-Edu e limita o resultado a 10 pontos.",
  sourceNote:
    "Apolinario D et al. Int J Geriatr Psychiatry. 2016;31:4-12. DOI 10.1002/gps.4282. Ajuste educacional da versão 10-CS-Edu: sem escolaridade formal +2; 1 a 3 anos +1; 4 anos ou mais +0, com máximo de 10 pontos. O resultado é rastreio cognitivo e não estabelece diagnóstico isoladamente.",
  fields: [
    { id: "orientationYear", label: "Orientação — ano atual", choices: binaryChoices },
    { id: "orientationMonth", label: "Orientação — mês atual", choices: binaryChoices },
    { id: "orientationDate", label: "Orientação — dia do mês", choices: binaryChoices },
    {
      id: "animalFluency",
      label: "Fluência verbal — animais em 60 segundos",
      choices: [
        { value: 0, label: "0 a 5 animais — 0 ponto" },
        { value: 1, label: "6 a 8 animais — 1 ponto" },
        { value: 2, label: "9 a 11 animais — 2 pontos" },
        { value: 3, label: "12 a 14 animais — 3 pontos" },
        { value: 4, label: "15 ou mais animais — 4 pontos" },
      ],
    },
    { id: "recall1", label: "Evocação — 1ª palavra lembrada sem pista", choices: binaryChoices },
    { id: "recall2", label: "Evocação — 2ª palavra lembrada sem pista", choices: binaryChoices },
    { id: "recall3", label: "Evocação — 3ª palavra lembrada sem pista", choices: binaryChoices },
    {
      id: "educationAdjustment",
      label: "Escolaridade para ajuste 10-CS-Edu",
      choices: [
        { value: 2, label: "Sem escolaridade formal — adicionar 2 pontos" },
        { value: 1, label: "1 a 3 anos — adicionar 1 ponto" },
        { value: 0, label: "4 anos ou mais — sem ajuste" },
      ],
    },
  ],
} as const;

type TenCsAnswerId = (typeof TEN_CS_STRUCTURED_DEFINITION.fields)[number]["id"];

function requiredChoice(raw: Record<string, unknown>, id: TenCsAnswerId, allowed: readonly number[]): number {
  const value = raw[id];
  if (typeof value !== "number" || !allowed.includes(value)) throw new Error(`Valor inválido para ${id}.`);
  return value;
}

export function scoreTenCsStructured(raw: Record<string, unknown>) {
  const allowedIds = new Set(TEN_CS_STRUCTURED_DEFINITION.fields.map((field) => field.id));
  if (Object.keys(raw).some((key) => !allowedIds.has(key as TenCsAnswerId))) {
    throw new Error("Valor inválido: campo não permitido no 10-CS.");
  }

  const answers = {
    orientationYear: requiredChoice(raw, "orientationYear", [0, 1]),
    orientationMonth: requiredChoice(raw, "orientationMonth", [0, 1]),
    orientationDate: requiredChoice(raw, "orientationDate", [0, 1]),
    animalFluency: requiredChoice(raw, "animalFluency", [0, 1, 2, 3, 4]),
    recall1: requiredChoice(raw, "recall1", [0, 1]),
    recall2: requiredChoice(raw, "recall2", [0, 1]),
    recall3: requiredChoice(raw, "recall3", [0, 1]),
    educationAdjustment: requiredChoice(raw, "educationAdjustment", [0, 1, 2]),
  };

  const rawScore =
    answers.orientationYear
    + answers.orientationMonth
    + answers.orientationDate
    + answers.animalFluency
    + answers.recall1
    + answers.recall2
    + answers.recall3;
  const adjustedScore = Math.min(10, rawScore + answers.educationAdjustment);
  const scored = scoreNumeric({ raw: adjustedScore, ranges: TEN_CS.ranges });
  if (scored.score === null) throw new Error("Não foi possível interpretar o 10-CS.");

  return {
    answers,
    version: TEN_CS_STRUCTURED_VERSION,
    result: {
      score: scored.score,
      scoreText: scored.scoreText,
      classification: scored.classe,
      interpretation: scored.texto,
      clinicalColor: scored.cor,
    },
  };
}
