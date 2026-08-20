import {
  scoreByEducation,
  scoreBySex,
  scoreDiscreteNumeric,
  scoreNumeric,
  type ScaleResult,
} from "./clinical-engine.ts";
import {
  BARTHEL,
  CHARLSON_RANGES,
  CHAIR_STAND_5X_RANGES,
  CORNELL,
  ESAS,
  FAST_ALLOWED_VALUES,
  FAST_RANGES,
  FRAIL_BR,
  G8,
  GRIP_ALTERED,
  GRIP_PRESERVED,
  GRIP_SEX_CUTOFFS,
  KPS,
  LACE,
  MEEM_ALTERED,
  MEEM_EDUCATION_CUTOFFS,
  MEEM_PRESERVED,
  MNA_SF,
  POLYPHARMACY,
  PPS_ALLOWED_VALUES,
  PPS_RANGES,
  SARCF,
  STOPP_FALL,
  TEN_CS,
  VES13,
} from "./clinical-config/legacy-core.ts";

export type ComplementaryScoreScaleCode =
  | "moca"
  | "meem"
  | "barthel"
  | "cornell"
  | "cam"
  | "dez_cs"
  | "frail_br"
  | "sarcf"
  | "preensao"
  | "velocidade_marcha"
  | "sentar_levantar_5x"
  | "polifarmacia"
  | "stoppfall"
  | "kps"
  | "lace"
  | "g8"
  | "ves13"
  | "mna_sf"
  | "charlson"
  | "fast"
  | "pps"
  | "esas";

export type ComplementaryChoice = { value: number | string; label: string };
export type ComplementaryField = {
  id: string;
  label: string;
  number?: { min: number; max: number; step: number; unit?: string; help?: string };
  choices?: readonly ComplementaryChoice[];
};

export type ComplementaryScoreScaleDefinition = {
  code: ComplementaryScoreScaleCode;
  version: string;
  name: string;
  dimension: string;
  instruction: string;
  sourceNote: string;
  fields: readonly ComplementaryField[];
};

export type ComplementaryStoredResult = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor?: string;
};

const LEGACY_SCORE_VERSION = "1.0" as const;
const MANUAL_CAM_VERSION = "legacy-cam-status-entry-2026-08-v1" as const;
const scoreField = (max: number, help: string, step = 1, unit?: string): ComplementaryField => ({
  id: "score",
  label: "Pontuação / resultado",
  number: { min: 0, max, step, unit, help },
});

const educationChoices: readonly ComplementaryChoice[] = [
  { value: "Analfabeto", label: "Analfabeto" },
  { value: "1 a 4 anos", label: "1 a 4 anos" },
  { value: "5 a 8 anos", label: "5 a 8 anos" },
  { value: "9 a 11 anos", label: "9 a 11 anos" },
  { value: "Mais de 11 anos", label: "Mais de 11 anos" },
];

export const COMPLEMENTARY_SCORE_SCALES: readonly ComplementaryScoreScaleDefinition[] = [
  {
    code: "moca",
    version: LEGACY_SCORE_VERSION,
    name: "MoCA — registro rápido de pontuação",
    dimension: "cognicao",
    instruction: "Registre apenas a pontuação total de um MoCA já aplicado. Este campo não reproduz o formulário do instrumento.",
    sourceNote: "Registro de escore compatível com o protocolo histórico do aplicativo. Resultado é rastreio e não estabelece diagnóstico isoladamente.",
    fields: [scoreField(30, "Informe o total de 0 a 30 obtido no instrumento aplicado.")],
  },
  {
    code: "meem",
    version: LEGACY_SCORE_VERSION,
    name: "MEEM — registro rápido de pontuação",
    dimension: "cognicao",
    instruction: "Registre a pontuação total do MEEM já aplicado e a escolaridade usada para contextualizar o resultado. Este campo não reproduz os itens do MMSE/MEEM.",
    sourceNote: "Interpretação contextual por escolaridade preservada do protocolo histórico brasileiro; não equivale a diagnóstico de demência.",
    fields: [
      scoreField(30, "Informe o total de 0 a 30."),
      { id: "education", label: "Escolaridade para interpretação", choices: educationChoices },
    ],
  },
  { code: "barthel", version: LEGACY_SCORE_VERSION, name: "Índice de Barthel", dimension: "funcionalidade", instruction: "Registro rápido do escore total previamente aplicado.", sourceNote: "Faixas preservadas do golden master clínico do aplicativo.", fields: [scoreField(100, "Informe o escore total de 0 a 100.")] },
  { code: "cornell", version: LEGACY_SCORE_VERSION, name: "Cornell — depressão na demência", dimension: "humor", instruction: "Registro rápido do escore total previamente aplicado.", sourceNote: "Faixas preservadas do golden master; resultado é rastreio clínico e não diagnóstico isolado.", fields: [scoreField(38, "Informe o total de 0 a 38.")] },
  {
    code: "cam",
    version: MANUAL_CAM_VERSION,
    name: "CAM — Confusion Assessment Method",
    dimension: "cognicao",
    instruction: "Registre somente a conclusão de um CAM já aplicado segundo o algoritmo apropriado.",
    sourceNote: "O formulário/algoritmo não é reproduzido neste registro rápido. CAM positivo exige avaliação clínica imediata de possível delirium.",
    fields: [{ id: "status", label: "Resultado do CAM aplicado", choices: [{ value: 0, label: "CAM negativo" }, { value: 1, label: "CAM positivo" }] }],
  },
  { code: "dez_cs", version: LEGACY_SCORE_VERSION, name: "10-CS — 10-Point Cognitive Screener", dimension: "cognicao", instruction: "Registre o escore final já corrigido conforme a versão aplicada.", sourceNote: "Faixas preservadas do protocolo histórico. Não usar isoladamente como diagnóstico.", fields: [scoreField(10, "Informe o escore final de 0 a 10, após eventual ajuste educacional da versão aplicada.")] },
  { code: "frail_br", version: LEGACY_SCORE_VERSION, name: "FRAIL-BR", dimension: "fragilidade", instruction: "Registro rápido do escore total previamente aplicado.", sourceNote: "Faixas 0 / 1–2 / 3–5 preservadas do golden master.", fields: [scoreField(5, "Informe o total de 0 a 5.")] },
  { code: "sarcf", version: LEGACY_SCORE_VERSION, name: "SARC-F", dimension: "mobilidade", instruction: "Registro rápido do escore total previamente aplicado.", sourceNote: "Corte de rastreio preservado do golden master.", fields: [scoreField(10, "Informe o total de 0 a 10.")] },
  {
    code: "preensao",
    version: LEGACY_SCORE_VERSION,
    name: "Força de preensão palmar",
    dimension: "mobilidade",
    instruction: "Registre a melhor medida válida e o sexo usado para a referência do protocolo.",
    sourceNote: "Referências históricas do aplicativo: feminino 16 kgF; masculino 27 kgF.",
    fields: [
      { id: "score", label: "Força de preensão", number: { min: 0, max: 100, step: 0.1, unit: "kgF", help: "Informe a força em kgF." } },
      { id: "sex", label: "Sexo para referência", choices: [{ value: "Feminino", label: "Feminino" }, { value: "Masculino", label: "Masculino" }] },
    ],
  },
  { code: "velocidade_marcha", version: LEGACY_SCORE_VERSION, name: "Velocidade de marcha", dimension: "mobilidade", instruction: "Registre a velocidade de marcha calculada em m/s.", sourceNote: "Protocolo histórico considera ≤0,8 m/s como desempenho reduzido.", fields: [{ id: "score", label: "Velocidade de marcha", number: { min: 0, max: 4, step: 0.01, unit: "m/s", help: "Informe a velocidade já calculada." } }] },
  { code: "sentar_levantar_5x", version: LEGACY_SCORE_VERSION, name: "Sentar-levantar 5 vezes", dimension: "mobilidade", instruction: "Registre o tempo total do teste em segundos.", sourceNote: "Referência histórica do aplicativo: até 15 s preservado; acima de 15 s reduzido.", fields: [{ id: "score", label: "Tempo", number: { min: 0, max: 180, step: 0.1, unit: "s", help: "Informe o tempo em segundos." } }] },
  { code: "polifarmacia", version: LEGACY_SCORE_VERSION, name: "Polifarmácia / medicamentos potencialmente inapropriados", dimension: "medicamentos", instruction: "Registre o escore agregado da avaliação previamente realizada.", sourceNote: "Faixas 0–1 / 2–3 / 4–7 preservadas do golden master; não inicia, suspende ou ajusta medicamentos automaticamente.", fields: [scoreField(7, "Informe o escore agregado de 0 a 7.")] },
  { code: "stoppfall", version: LEGACY_SCORE_VERSION, name: "STOPPFall — classes de risco de queda", dimension: "medicamentos", instruction: "Registre a quantidade de classes de risco identificadas na revisão previamente realizada.", sourceNote: "Faixas 0 / 1–2 / 3–14 preservadas do golden master; qualquer mudança medicamentosa depende de decisão médica.", fields: [scoreField(14, "Informe o número de classes de risco identificadas.")] },
  { code: "kps", version: LEGACY_SCORE_VERSION, name: "Karnofsky Performance Status", dimension: "prognostico", instruction: "Registre o KPS previamente avaliado.", sourceNote: "Faixas históricas do aplicativo preservadas.", fields: [{ id: "score", label: "KPS", number: { min: 10, max: 100, step: 10, unit: "%", help: "Informe um valor entre 10 e 100%." } }] },
  { code: "lace", version: LEGACY_SCORE_VERSION, name: "LACE — risco de reinternação", dimension: "prognostico", instruction: "Registre o escore final do LACE previamente calculado.", sourceNote: "Faixas 0–4 / 5–9 / 10–19 preservadas do golden master.", fields: [scoreField(19, "Informe o escore final de 0 a 19.")] },
  { code: "g8", version: LEGACY_SCORE_VERSION, name: "G8 — rastreio oncogeriátrico", dimension: "oncogeriatria", instruction: "Registre o escore total do G8 previamente aplicado.", sourceNote: "Corte histórico do aplicativo: ≤14 rastreio positivo; >14 rastreio negativo.", fields: [{ id: "score", label: "Pontuação G8", number: { min: 0, max: 17, step: 0.5, help: "Informe o escore de 0 a 17." } }] },
  { code: "ves13", version: LEGACY_SCORE_VERSION, name: "VES-13", dimension: "fragilidade", instruction: "Registre o escore total do VES-13 previamente aplicado.", sourceNote: "Corte ≥3 preservado do golden master.", fields: [scoreField(10, "Informe o total de 0 a 10.")] },
  { code: "mna_sf", version: LEGACY_SCORE_VERSION, name: "MNA-SF — registro de pontuação", dimension: "nutricao", instruction: "Registre o total de uma MNA-SF já aplicada. Não confundir com a MNA completa do apêndice Freitas/Py.", sourceNote: "Faixas 0–7 / 8–11 / 12–14 preservadas do golden master.", fields: [scoreField(14, "Informe o total de 0 a 14.")] },
  { code: "charlson", version: LEGACY_SCORE_VERSION, name: "Índice de Charlson", dimension: "prognostico", instruction: "Registre o índice final já calculado conforme o protocolo utilizado, incluindo o ajuste etário quando aplicável.", sourceNote: "As faixas de interpretação são regras locais históricas e devem ser integradas à funcionalidade, fragilidade e metas de cuidado.", fields: [scoreField(40, "Informe o índice final já calculado.")] },
  { code: "fast", version: LEGACY_SCORE_VERSION, name: "FAST — Functional Assessment Staging", dimension: "cognicao", instruction: "Registre o estágio FAST previamente definido clinicamente.", sourceNote: "Estágios discretos 1–7f preservados do golden master.", fields: [{ id: "score", label: "Estágio FAST", choices: FAST_ALLOWED_VALUES.map((value) => ({ value, label: String(value).replace("6.1", "6a").replace("6.2", "6b").replace("6.3", "6c").replace("6.4", "6d").replace("6.5", "6e").replace("7.1", "7a").replace("7.2", "7b").replace("7.3", "7c").replace("7.4", "7d").replace("7.5", "7e").replace("7.6", "7f") })) }] },
  { code: "pps", version: LEGACY_SCORE_VERSION, name: "Palliative Performance Scale — PPS", dimension: "prognostico", instruction: "Registre o PPS previamente avaliado.", sourceNote: "Níveis discretos de 10 a 100 preservados do golden master.", fields: [{ id: "score", label: "PPS", choices: PPS_ALLOWED_VALUES.map((value) => ({ value, label: `${value}%` })) }] },
  { code: "esas", version: LEGACY_SCORE_VERSION, name: "ESAS — carga global de sintomas", dimension: "sintomas", instruction: "Registro rápido somente do total da ESAS já aplicada. Para decisões sobre sintomas específicos, revisar os nove itens originais da avaliação.", sourceNote: "Este modo rápido preserva somente a classificação global; não substitui os alertas por sintoma individual do formulário completo.", fields: [scoreField(90, "Informe o total de 0 a 90.")] },
] as const;

function requiredNumber(raw: Record<string, unknown>, id: string, min: number, max: number): number {
  const value = raw[id];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Valor inválido para ${id}.`);
  }
  return value;
}

function requiredString(raw: Record<string, unknown>, id: string): string {
  const value = raw[id];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Valor inválido para ${id}.`);
  return value;
}

function fromLegacy(result: ScaleResult): ComplementaryStoredResult {
  if (result.score === null) throw new Error("Não foi possível interpretar o escore informado.");
  return {
    score: result.score,
    scoreText: result.scoreText,
    classification: result.classe,
    interpretation: result.texto,
    clinicalColor: result.cor,
  };
}

function numeric(raw: Record<string, unknown>, max: number, ranges: Parameters<typeof scoreNumeric>[0]["ranges"], unit?: string) {
  const value = requiredNumber(raw, "score", 0, max);
  return fromLegacy(scoreNumeric({ raw: value, ranges, unit }));
}

export function scoreComplementaryScale(
  code: ComplementaryScoreScaleCode,
  raw: Record<string, unknown>,
): { answers: Record<string, number | string>; result: ComplementaryStoredResult; version: string } {
  const definition = COMPLEMENTARY_SCORE_SCALES.find((item) => item.code === code);
  if (!definition) throw new Error("Escala complementar não disponível.");

  let result: ComplementaryStoredResult;
  if (code === "moca") {
    const score = requiredNumber(raw, "score", 0, 30);
    if (score >= 26) result = { score, scoreText: `${score}/30`, classification: "Faixa de referência histórica preservada", interpretation: "Pontuação na faixa historicamente considerada preservada pelo protocolo legado. O MoCA é instrumento de rastreio; queixa cognitiva persistente ainda exige correlação clínica e educacional.", clinicalColor: "verde" };
    else if (score >= 18) result = { score, scoreText: `${score}/30`, classification: "Abaixo da faixa de referência histórica", interpretation: "Pontuação abaixo da referência histórica do aplicativo. Interpretar em conjunto com escolaridade, funcionalidade, humor, sono, déficits sensoriais e demais dados clínicos; o resultado isolado não estabelece diagnóstico.", clinicalColor: "amarelo" };
    else result = { score, scoreText: `${score}/30`, classification: "Desempenho bastante reduzido no rastreio", interpretation: "Pontuação bastante reduzida no rastreio cognitivo. Requer avaliação clínica contextualizada; o escore isolado não define etiologia nem diagnóstico.", clinicalColor: "vermelho" };
  } else if (code === "meem") {
    const score = requiredNumber(raw, "score", 0, 30);
    const education = requiredString(raw, "education");
    if (!(education in MEEM_EDUCATION_CUTOFFS)) throw new Error("Escolaridade inválida para interpretação do MEEM.");
    result = fromLegacy(scoreByEducation({ value: score, education, cutoffs: MEEM_EDUCATION_CUTOFFS, preserved: MEEM_PRESERVED, altered: MEEM_ALTERED }));
  } else if (code === "barthel") result = numeric(raw, 100, BARTHEL.ranges);
  else if (code === "cornell") result = numeric(raw, 38, CORNELL.ranges);
  else if (code === "cam") {
    const status = requiredNumber(raw, "status", 0, 1);
    result = status === 1
      ? { score: 1, scoreText: "CAM positivo", classification: "Delirium provável no rastreio", interpretation: "CAM positivo requer avaliação clínica imediata da causa, gravidade e segurança. O registro não substitui o algoritmo completo nem determina etiologia.", clinicalColor: "vermelho" }
      : { score: 0, scoreText: "CAM negativo", classification: "CAM não positivo", interpretation: "CAM registrado como negativo na avaliação aplicada. Reavaliar se houver mudança aguda ou flutuação do estado mental.", clinicalColor: "verde" };
  } else if (code === "dez_cs") result = numeric(raw, 10, TEN_CS.ranges);
  else if (code === "frail_br") result = numeric(raw, 5, FRAIL_BR.ranges);
  else if (code === "sarcf") result = numeric(raw, 10, SARCF.ranges);
  else if (code === "preensao") {
    const score = requiredNumber(raw, "score", 0, 100);
    const sex = requiredString(raw, "sex");
    result = fromLegacy(scoreBySex({ value: score, sex, cutoffs: GRIP_SEX_CUTOFFS, preserved: GRIP_PRESERVED, altered: GRIP_ALTERED, unit: "kgF" }));
  } else if (code === "velocidade_marcha") {
    const score = requiredNumber(raw, "score", 0, 4);
    result = score <= 0.8
      ? { score, scoreText: `${score.toFixed(2)} m/s`, classification: "Velocidade de marcha reduzida", interpretation: "Velocidade ≤0,8 m/s no protocolo histórico sugere baixo desempenho físico e maior vulnerabilidade funcional. Correlacionar com quedas, força, equilíbrio e condição clínica.", clinicalColor: "vermelho" }
      : { score, scoreText: `${score.toFixed(2)} m/s`, classification: "Velocidade de marcha preservada", interpretation: "Velocidade acima de 0,8 m/s no protocolo histórico. Manter interpretação longitudinal e em conjunto com outros testes físicos.", clinicalColor: "verde" };
  } else if (code === "sentar_levantar_5x") result = numeric(raw, 180, CHAIR_STAND_5X_RANGES, "s");
  else if (code === "polifarmacia") result = numeric(raw, 7, POLYPHARMACY.ranges);
  else if (code === "stoppfall") result = numeric(raw, 14, STOPP_FALL.ranges);
  else if (code === "kps") result = numeric(raw, 100, KPS.ranges, "%");
  else if (code === "lace") result = numeric(raw, 19, LACE.ranges);
  else if (code === "g8") result = numeric(raw, 17, G8.ranges);
  else if (code === "ves13") result = numeric(raw, 10, VES13.ranges);
  else if (code === "mna_sf") result = numeric(raw, 14, MNA_SF.ranges);
  else if (code === "charlson") result = numeric(raw, 40, CHARLSON_RANGES);
  else if (code === "fast") {
    const score = requiredNumber(raw, "score", 1, 7.6);
    result = fromLegacy(scoreDiscreteNumeric({ raw: score, allowedValues: FAST_ALLOWED_VALUES, ranges: FAST_RANGES }));
  } else if (code === "pps") {
    const score = requiredNumber(raw, "score", 10, 100);
    result = fromLegacy(scoreDiscreteNumeric({ raw: score, allowedValues: PPS_ALLOWED_VALUES, ranges: PPS_RANGES, unit: "%" }));
  } else result = numeric(raw, 90, ESAS.ranges);

  const answers = Object.fromEntries(
    definition.fields.map((field) => {
      const value = raw[field.id];
      if (typeof value !== "number" && typeof value !== "string") throw new Error(`Valor inválido para ${field.id}.`);
      return [field.id, value];
    }),
  );
  return { answers, result, version: definition.version };
}
