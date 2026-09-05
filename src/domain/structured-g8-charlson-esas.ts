import { classifyRange, type ScoreRange } from "./clinical-engine.ts";
import { CHARLSON_RANGES, ESAS, G8 } from "./clinical-config/legacy-core.ts";
import {
  calculateG8,
  type G8FoodIntake,
  type G8HealthStatus,
  type G8Mobility,
  type G8Neuropsychological,
  type G8WeightLoss,
} from "./oncogeriatria/calculators.ts";

export const G8_STRUCTURED_CODE = "g8" as const;
export const CHARLSON_STRUCTURED_CODE = "charlson" as const;
export const ESAS_STRUCTURED_CODE = "esas" as const;

const VERSION = "1.0" as const;

const yesNoCheckbox = [
  { value: 0, label: "Ausente" },
  { value: 1, label: "Presente" },
] as const;

export const G8_STRUCTURED_DEFINITION = {
  code: G8_STRUCTURED_CODE,
  version: VERSION,
  name: "G8 — rastreio oncogeriátrico",
  dimension: "oncogeriatria",
  instruction: "Responda os oito itens. As alternativas ficam visíveis para reduzir cliques e a pontuação é calculada automaticamente, sem soma manual.",
  applicationGuide: [
    {
      title: "Como preencher",
      items: [
        "Selecione uma única resposta por item.",
        "Informe IMC e idade como valores numéricos; o sistema aplica as faixas de pontuação já validadas no prontuário.",
        "G8 ≤14 mantém o rastreio positivo para vulnerabilidade; >14 mantém o rastreio negativo.",
      ],
    },
  ],
  sourceNote: "Mesma lógica clínica já validada no projeto; esta alteração modifica somente a entrada para um formulário estruturado e visível.",
  fields: [
    { id: "foodIntake", label: "1. Ingestão alimentar nos últimos 3 meses", choices: [
      { value: "SEVERE_DECREASE", label: "Redução importante" },
      { value: "MODERATE_DECREASE", label: "Redução moderada" },
      { value: "NO_DECREASE", label: "Sem redução" },
    ] },
    { id: "weightLoss", label: "2. Perda de peso nos últimos 3 meses", choices: [
      { value: "GT_3_KG", label: "Mais de 3 kg" },
      { value: "UNKNOWN", label: "Não sabe informar" },
      { value: "BETWEEN_1_AND_3_KG", label: "Entre 1 e 3 kg" },
      { value: "NONE", label: "Sem perda" },
    ] },
    { id: "mobility", label: "3. Mobilidade", choices: [
      { value: "BED_OR_CHAIR", label: "Restrito ao leito ou cadeira" },
      { value: "GETS_UP_DOES_NOT_GO_OUT", label: "Levanta, mas não sai de casa" },
      { value: "GOES_OUT", label: "Sai de casa" },
    ] },
    { id: "neuropsychological", label: "4. Problemas neuropsicológicos", choices: [
      { value: "SEVERE", label: "Graves" },
      { value: "MILD", label: "Leves" },
      { value: "NONE", label: "Ausentes" },
    ] },
    { id: "bmi", label: "5. IMC", number: { min: 0, max: 100, step: 0.1, unit: "kg/m²", help: "Informe o IMC atual; a faixa de pontuação é aplicada automaticamente." } },
    { id: "polypharmacy", label: "6. Mais de 3 medicamentos prescritos por dia?", choices: [
      { value: "YES", label: "Sim" },
      { value: "NO", label: "Não" },
    ] },
    { id: "health", label: "7. Saúde comparada a pessoas da mesma idade", choices: [
      { value: "WORSE", label: "Pior" },
      { value: "UNKNOWN", label: "Não sabe informar" },
      { value: "SAME", label: "Igual" },
      { value: "BETTER", label: "Melhor" },
    ] },
    { id: "ageYears", label: "8. Idade", number: { min: 0, max: 130, step: 1, unit: "anos", help: "Informe a idade atual." } },
  ] as const,
} as const;

const charlsonIndependentFields = [
  { id: "mi", label: "Infarto do miocárdio", points: 1 },
  { id: "heartFailure", label: "Insuficiência cardíaca", points: 1 },
  { id: "peripheralVascular", label: "Doença vascular periférica", points: 1 },
  { id: "cerebrovascular", label: "Doença cerebrovascular", points: 1 },
  { id: "dementia", label: "Demência", points: 1 },
  { id: "chronicPulmonary", label: "Doença pulmonar crônica", points: 1 },
  { id: "connectiveTissue", label: "Doença do tecido conjuntivo", points: 1 },
  { id: "pepticUlcer", label: "Doença ulcerosa péptica", points: 1 },
  { id: "hemiplegia", label: "Hemiplegia", points: 2 },
  { id: "renal", label: "Doença renal moderada/grave", points: 2 },
  { id: "leukemia", label: "Leucemia", points: 2 },
  { id: "lymphoma", label: "Linfoma", points: 2 },
  { id: "aids", label: "AIDS", points: 6 },
] as const;

export const CHARLSON_STRUCTURED_DEFINITION = {
  code: CHARLSON_STRUCTURED_CODE,
  version: VERSION,
  name: "Índice de Charlson",
  dimension: "prognostico",
  instruction: "Marque as comorbidades presentes. Diabetes, doença hepática e tumor sólido usam seleção exclusiva por gravidade para impedir dupla contagem. O ajuste por idade é opcional e explícito.",
  applicationGuide: [
    {
      title: "Regra de preenchimento",
      items: [
        "Marque cada comorbidade independente somente se estiver presente.",
        "Nos grupos de gravidade, escolha somente a maior gravidade aplicável.",
        "Selecione 'sem ajuste por idade' quando o protocolo usado nesta avaliação não incluir idade.",
      ],
    },
    {
      title: "Leitura local preservada",
      items: ["0–2: baixa carga; 3–4: carga moderada; 5 ou mais: alta carga de comorbidades."],
    },
  ],
  sourceNote: "Pesos clássicos e faixas históricas do prontuário preservados; a mudança é de UX e cálculo estruturado, sem alteração dos pesos clínicos.",
  fields: [
    ...charlsonIndependentFields.map((item) => ({
      id: item.id,
      label: `${item.label} (+${item.points})`,
      choices: yesNoCheckbox,
      display: "checkbox" as const,
    })),
    { id: "diabetes", label: "Diabetes — selecione a maior gravidade", choices: [
      { value: 0, label: "Ausente" },
      { value: 1, label: "Sem lesão de órgão-alvo (+1)" },
      { value: 2, label: "Com lesão de órgão-alvo (+2)" },
    ] },
    { id: "liver", label: "Doença hepática — selecione a maior gravidade", choices: [
      { value: 0, label: "Ausente" },
      { value: 1, label: "Leve (+1)" },
      { value: 3, label: "Moderada/grave (+3)" },
    ] },
    { id: "solidTumor", label: "Tumor sólido — não somar doença localizada e metastática", choices: [
      { value: 0, label: "Ausente" },
      { value: 2, label: "Sem metástase (+2)" },
      { value: 6, label: "Metastático (+6)" },
    ] },
    { id: "ageAdjustment", label: "Ajuste etário clássico", choices: [
      { value: 0, label: "Sem ajuste por idade / <50 anos (+0)" },
      { value: 1, label: "50–59 anos (+1)" },
      { value: 2, label: "60–69 anos (+2)" },
      { value: 3, label: "70–79 anos (+3)" },
      { value: 4, label: "80 anos ou mais (+4)" },
    ] },
  ] as const,
} as const;

const esasFields = [
  { id: "pain", label: "Dor" },
  { id: "tiredness", label: "Cansaço" },
  { id: "drowsiness", label: "Sonolência" },
  { id: "nausea", label: "Náusea" },
  { id: "appetite", label: "Falta de apetite" },
  { id: "dyspnea", label: "Falta de ar" },
  { id: "depression", label: "Depressão" },
  { id: "anxiety", label: "Ansiedade" },
  { id: "wellbeing", label: "Bem-estar prejudicado" },
] as const;

export const ESAS_STRUCTURED_DEFINITION = {
  code: ESAS_STRUCTURED_CODE,
  version: VERSION,
  name: "ESAS — Escala de Avaliação de Sintomas de Edmonton",
  dimension: "sintomas",
  instruction: "Pontue cada um dos nove sintomas de 0 a 10. O sistema soma automaticamente o total de 0 a 90 e destaca na interpretação os sintomas com intensidade ≥7.",
  applicationGuide: [
    { title: "Escala de intensidade", items: ["0 = ausência ou melhor situação possível; 10 = pior intensidade possível.", "Registre todos os nove itens para permitir comparação longitudinal segura."] },
    { title: "Regra preservada do prontuário", items: ["Total 0–9: carga leve; 10–29: moderada; 30–90: alta.", "Sintoma individual ≥7 recebe destaque clínico independente do total."] },
  ],
  sourceNote: "Estrutura e regras preservadas do inventário clínico testado do projeto: 9 itens 0–10, total 0–90 e destaque individual ≥7.",
  fields: esasFields.map((item) => ({
    id: item.id,
    label: item.label,
    number: { min: 0, max: 10, step: 1, help: "0 = ausência/melhor; 10 = pior intensidade possível." },
  })),
} as const;

function requiredString(raw: Record<string, unknown>, id: string): string {
  const value = raw[id];
  if (typeof value !== "string" || !value) throw new Error(`Valor inválido para ${id}.`);
  return value;
}

function requiredNumber(raw: Record<string, unknown>, id: string, min: number, max: number): number {
  const value = raw[id];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error(`Valor inválido para ${id}.`);
  return value;
}

function resultFromScore(score: number, ranges: ScoreRange[]) {
  const classification = classifyRange(ranges, score);
  return {
    score,
    scoreText: String(score),
    classification: classification.classe,
    interpretation: classification.texto,
    clinicalColor: classification.cor,
  };
}

export function scoreStructuredG8(raw: Record<string, unknown>) {
  const input = {
    foodIntake: requiredString(raw, "foodIntake") as G8FoodIntake,
    weightLoss: requiredString(raw, "weightLoss") as G8WeightLoss,
    mobility: requiredString(raw, "mobility") as G8Mobility,
    neuropsychological: requiredString(raw, "neuropsychological") as G8Neuropsychological,
    bmi: requiredNumber(raw, "bmi", 0, 100),
    takesMoreThanThreePrescriptionDrugs: requiredString(raw, "polypharmacy") === "YES",
    healthStatusComparedWithPeers: requiredString(raw, "health") as G8HealthStatus,
    ageYears: requiredNumber(raw, "ageYears", 0, 130),
  };
  const calculated = calculateG8(input);
  const classification = classifyRange(G8.ranges, calculated.score);
  return {
    answers: raw as Record<string, number | string>,
    result: {
      score: calculated.score,
      scoreText: `${calculated.score}/17`,
      classification: classification.classe,
      interpretation: classification.texto,
      clinicalColor: classification.cor,
    },
    version: VERSION,
  };
}

export function scoreStructuredCharlson(raw: Record<string, unknown>) {
  let score = 0;
  for (const item of charlsonIndependentFields) {
    const present = requiredNumber(raw, item.id, 0, 1);
    score += present * item.points;
  }
  score += requiredNumber(raw, "diabetes", 0, 2);
  score += requiredNumber(raw, "liver", 0, 3);
  score += requiredNumber(raw, "solidTumor", 0, 6);
  score += requiredNumber(raw, "ageAdjustment", 0, 4);
  return { answers: raw as Record<string, number | string>, result: resultFromScore(score, CHARLSON_RANGES), version: VERSION };
}

export function scoreStructuredEsas(raw: Record<string, unknown>) {
  const values = esasFields.map((item) => ({ label: item.label, value: requiredNumber(raw, item.id, 0, 10) }));
  const score = values.reduce((sum, item) => sum + item.value, 0);
  const classification = classifyRange(ESAS.ranges, score);
  const highSymptoms = values.filter((item) => item.value >= 7).map((item) => `${item.label} ${item.value}/10`);
  const interpretation = highSymptoms.length
    ? `${classification.texto} Sintomas com intensidade elevada (≥7): ${highSymptoms.join(", ")}.`
    : `${classification.texto} Nenhum sintoma individual atingiu intensidade ≥7 nesta aplicação.`;
  return {
    answers: raw as Record<string, number | string>,
    result: {
      score,
      scoreText: `${score}/90`,
      classification: classification.classe,
      interpretation,
      clinicalColor: classification.cor,
    },
    version: VERSION,
  };
}
