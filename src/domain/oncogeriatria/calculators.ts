export const G8_SCALE_CODE = "G8" as const;
export const G8_SCALE_VERSION = "ORIGINAL_2012" as const;
export const CARG_SCALE_CODE = "CARG" as const;
export const CARG_SCALE_VERSION = "HURRIA_2011" as const;
export const CARG_IMPLEMENTATION_STATUS = "AVAILABLE" as const;

export type G8FoodIntake = "SEVERE_DECREASE" | "MODERATE_DECREASE" | "NO_DECREASE";
export type G8WeightLoss = "GT_3_KG" | "UNKNOWN" | "BETWEEN_1_AND_3_KG" | "NONE";
export type G8Mobility = "BED_OR_CHAIR" | "GETS_UP_DOES_NOT_GO_OUT" | "GOES_OUT";
export type G8Neuropsychological = "SEVERE" | "MILD" | "NONE";
export type G8HealthStatus = "WORSE" | "UNKNOWN" | "SAME" | "BETTER";

export interface G8Input {
  foodIntake: G8FoodIntake;
  weightLoss: G8WeightLoss;
  mobility: G8Mobility;
  neuropsychological: G8Neuropsychological;
  bmi: number;
  takesMoreThanThreePrescriptionDrugs: boolean;
  healthStatusComparedWithPeers: G8HealthStatus;
  ageYears: number;
}

export interface G8Result {
  score: number;
  classification: "VULNERABLE_SCREEN" | "NOT_VULNERABLE_SCREEN";
  cutoff: number;
  scaleCode: typeof G8_SCALE_CODE;
  scaleVersion: typeof G8_SCALE_VERSION;
}

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${field} inválido.`);
}

export function calculateG8(input: G8Input): G8Result {
  assertFiniteNonNegative(input.bmi, "IMC");
  assertFiniteNonNegative(input.ageYears, "Idade");
  const foodScore: Record<G8FoodIntake, number> = { SEVERE_DECREASE: 0, MODERATE_DECREASE: 1, NO_DECREASE: 2 };
  const weightScore: Record<G8WeightLoss, number> = { GT_3_KG: 0, UNKNOWN: 1, BETWEEN_1_AND_3_KG: 2, NONE: 3 };
  const mobilityScore: Record<G8Mobility, number> = { BED_OR_CHAIR: 0, GETS_UP_DOES_NOT_GO_OUT: 1, GOES_OUT: 2 };
  const neuroScore: Record<G8Neuropsychological, number> = { SEVERE: 0, MILD: 1, NONE: 2 };
  const healthScore: Record<G8HealthStatus, number> = { WORSE: 0, UNKNOWN: 0.5, SAME: 1, BETTER: 2 };
  const bmiScore = input.bmi < 19 ? 0 : input.bmi < 21 ? 1 : input.bmi < 23 ? 2 : 3;
  const medicationScore = input.takesMoreThanThreePrescriptionDrugs ? 0 : 1;
  const ageScore = input.ageYears > 85 ? 0 : input.ageYears >= 80 ? 1 : 2;
  const score = foodScore[input.foodIntake] + weightScore[input.weightLoss] + mobilityScore[input.mobility] + neuroScore[input.neuropsychological] + bmiScore + medicationScore + healthScore[input.healthStatusComparedWithPeers] + ageScore;
  return { score, classification: score <= 14 ? "VULNERABLE_SCREEN" : "NOT_VULNERABLE_SCREEN", cutoff: 14, scaleCode: G8_SCALE_CODE, scaleVersion: G8_SCALE_VERSION };
}

export type CargCancerType = "GI_GU" | "OTHER";
export type CargBiologicalSex = "FEMALE" | "MALE";
export type CargHearing = "EXCELLENT_GOOD" | "FAIR_OR_WORSE";

export interface CargInput {
  ageYears: number;
  cancerType: CargCancerType;
  standardDose: boolean;
  multipleChemotherapyAgents: boolean;
  biologicalSex: CargBiologicalSex;
  hemoglobinGdl: number;
  creatinineClearanceMlMin: number;
  hearing: CargHearing;
  oneOrMoreFallsLastSixMonths: boolean;
  needsHelpTakingMedications: boolean;
  limitedWalkingOneBlock: boolean;
  decreasedSocialActivity: boolean;
}

export interface CargScoreComponent {
  key: keyof CargInput;
  label: string;
  points: number;
}

export interface CargResult {
  score: number;
  category: "LOW" | "INTERMEDIATE" | "HIGH";
  observedGradeThreeToFiveToxicityPercent: 30 | 52 | 83;
  theoreticalMaximum: 23;
  observedOriginalRangeMaximum: 19;
  components: CargScoreComponent[];
  scaleCode: typeof CARG_SCALE_CODE;
  scaleVersion: typeof CARG_SCALE_VERSION;
  decisionSupportMessage: string;
  populationNote?: string;
}

function assertChoice<T extends string>(value: unknown, allowed: readonly T[], field: string): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new Error(`${field} inválido.`);
}

function assertBoolean(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new Error(`${field} inválido.`);
}

export function calculateCarg(input: CargInput): CargResult {
  assertFiniteNonNegative(input.ageYears, "Idade");
  assertFiniteNonNegative(input.hemoglobinGdl, "Hemoglobina");
  assertFiniteNonNegative(input.creatinineClearanceMlMin, "Depuração de creatinina");
  assertChoice(input.cancerType, ["GI_GU", "OTHER"] as const, "Tipo de câncer");
  assertChoice(input.biologicalSex, ["FEMALE", "MALE"] as const, "Sexo de referência laboratorial");
  assertChoice(input.hearing, ["EXCELLENT_GOOD", "FAIR_OR_WORSE"] as const, "Audição");
  assertBoolean(input.standardDose, "Dose planejada");
  assertBoolean(input.multipleChemotherapyAgents, "Número de quimioterápicos");
  assertBoolean(input.oneOrMoreFallsLastSixMonths, "Quedas");
  assertBoolean(input.needsHelpTakingMedications, "Ajuda para medicamentos");
  assertBoolean(input.limitedWalkingOneBlock, "Limitação para caminhar um quarteirão");
  assertBoolean(input.decreasedSocialActivity, "Interferência nas atividades sociais");

  const lowHemoglobin = input.biologicalSex === "MALE" ? input.hemoglobinGdl < 11 : input.hemoglobinGdl < 10;
  const components: CargScoreComponent[] = [
    { key: "ageYears", label: "Idade de 72 anos ou mais", points: input.ageYears >= 72 ? 2 : 0 },
    { key: "cancerType", label: "Câncer gastrointestinal ou geniturinário", points: input.cancerType === "GI_GU" ? 2 : 0 },
    { key: "standardDose", label: "Dose inicial padrão", points: input.standardDose ? 2 : 0 },
    { key: "multipleChemotherapyAgents", label: "Mais de um quimioterápico", points: input.multipleChemotherapyAgents ? 2 : 0 },
    { key: "hemoglobinGdl", label: "Hemoglobina abaixo do limite do modelo", points: lowHemoglobin ? 3 : 0 },
    { key: "creatinineClearanceMlMin", label: "Depuração de creatinina abaixo de 34 mL/min", points: input.creatinineClearanceMlMin < 34 ? 3 : 0 },
    { key: "hearing", label: "Audição regular ou pior", points: input.hearing === "FAIR_OR_WORSE" ? 2 : 0 },
    { key: "oneOrMoreFallsLastSixMonths", label: "Uma ou mais quedas nos últimos 6 meses", points: input.oneOrMoreFallsLastSixMonths ? 3 : 0 },
    { key: "needsHelpTakingMedications", label: "Necessita ajuda para tomar medicamentos", points: input.needsHelpTakingMedications ? 1 : 0 },
    { key: "limitedWalkingOneBlock", label: "Limitação para caminhar um quarteirão", points: input.limitedWalkingOneBlock ? 2 : 0 },
    { key: "decreasedSocialActivity", label: "Atividade social reduzida por saúde física ou emocional", points: input.decreasedSocialActivity ? 1 : 0 },
  ];
  const score = components.reduce((total, component) => total + component.points, 0);
  const category = score <= 5 ? "LOW" : score <= 9 ? "INTERMEDIATE" : "HIGH";
  const observedGradeThreeToFiveToxicityPercent = category === "LOW" ? 30 : category === "INTERMEDIATE" ? 52 : 83;
  const categoryLabel = category === "LOW" ? "baixo" : category === "INTERMEDIATE" ? "intermediário" : "alto";

  return {
    score,
    category,
    observedGradeThreeToFiveToxicityPercent,
    theoreticalMaximum: 23,
    observedOriginalRangeMaximum: 19,
    components,
    scaleCode: CARG_SCALE_CODE,
    scaleVersion: CARG_SCALE_VERSION,
    decisionSupportMessage: `CARG: grupo de risco ${categoryLabel}; no estudo de derivação, esta faixa apresentou ${observedGradeThreeToFiveToxicityPercent}% de toxicidade grau 3 a 5. Trata-se de uma frequência observada no grupo, não de probabilidade individual.`,
    populationNote: input.ageYears < 65
      ? "Paciente fora da faixa etária da população original de desenvolvimento do CARG (65 anos ou mais); interpretar com cautela clínica."
      : undefined,
  };
}

export function cargAvailability() {
  return {
    scaleCode: CARG_SCALE_CODE,
    scaleVersion: CARG_SCALE_VERSION,
    status: CARG_IMPLEMENTATION_STATUS,
    message: "CARG disponível para registro clínico no módulo de Oncogeriatria, com cálculo local versionado e sem envio de dados a serviços externos.",
  } as const;
}
