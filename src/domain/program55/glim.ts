export const GLIM_IMPLEMENTATION_VERSION = "2025-5-year-update-v1" as const;
export const GLIM_SOURCE_CITATION = "Jensen GL et al. JPEN. 2025;49(4):414-427. doi:10.1002/jpen.2756" as const;

export type GlimTriState = "YES" | "NO" | "NOT_ASSESSED";
export type GlimWeightLossPeriod = "WITHIN_6_MONTHS" | "BEYOND_6_MONTHS" | "NOT_ASSESSED";
export type GlimSeverity = "STAGE_1" | "STAGE_2" | "NOT_GRADABLE";
export type GlimClinicianDecision = "PENDING" | "CONFIRMED" | "NOT_CONFIRMED";
export type GlimSeverityBasis = "WEIGHT_LOSS" | "BMI";

export interface GlimEvaluationInput {
  ageYears: number;
  weightLossPercent: number | null;
  weightLossPeriod: GlimWeightLossPeriod;
  bmi: number | null;
  reducedMuscleMass: GlimTriState;
  reducedFoodIntakeOrAssimilation: GlimTriState;
  inflammationOrDiseaseBurden: GlimTriState;
}

export interface GlimPhenotypicCriterion {
  assessed: boolean;
  present: boolean;
  severity: "STAGE_1" | "STAGE_2" | null;
  boundaryReviewRequired?: boolean;
}

export interface GlimEvaluationResult {
  phenotypeCount: number;
  etiologicCount: number;
  diagnosticCriteriaMet: boolean;
  severity: GlimSeverity | null;
  severityBasis: GlimSeverityBasis[];
  boundaryReviewRequired: boolean;
  phenotypic: {
    weightLoss: GlimPhenotypicCriterion;
    lowBmi: GlimPhenotypicCriterion;
    reducedMuscleMass: GlimPhenotypicCriterion;
  };
  etiologic: {
    reducedFoodIntakeOrAssimilation: boolean;
    inflammationOrDiseaseBurden: boolean;
  };
  decisionSupportLabel: string;
}

export interface StoredGlimRecord {
  implementationVersion: typeof GLIM_IMPLEMENTATION_VERSION;
  ageYears: number;
  screeningRisk: GlimTriState;
  weightLossPercent: number | null;
  weightLossPeriod: GlimWeightLossPeriod;
  bmi: number | null;
  reducedMuscleMass: GlimTriState;
  muscleMassMethod: string | null;
  reducedFoodIntakeOrAssimilation: GlimTriState;
  inflammationOrDiseaseBurden: GlimTriState;
  etiologicNotes: string | null;
  result: GlimEvaluationResult;
  clinicianDecision: GlimClinicianDecision;
  clinicianNote: string | null;
}

function assertFiniteNonNegative(value: number | null, label: string): void {
  if (value === null) return;
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`GLIM_INVALID_${label}`);
}

function weightLossCriterion(percent: number | null, period: GlimWeightLossPeriod): GlimPhenotypicCriterion {
  if (percent === null || period === "NOT_ASSESSED") return { assessed: false, present: false, severity: null };
  assertFiniteNonNegative(percent, "WEIGHT_LOSS");

  if (period === "WITHIN_6_MONTHS") {
    const boundary = percent === 5;
    return {
      assessed: true,
      present: percent > 5,
      severity: percent > 10 ? "STAGE_2" : percent >= 5 ? "STAGE_1" : null,
      boundaryReviewRequired: boundary,
    };
  }

  const boundary = percent === 10;
  return {
    assessed: true,
    present: percent > 10,
    severity: percent > 20 ? "STAGE_2" : percent >= 10 ? "STAGE_1" : null,
    boundaryReviewRequired: boundary,
  };
}

function bmiCriterion(ageYears: number, bmi: number | null): GlimPhenotypicCriterion {
  if (!Number.isFinite(ageYears) || ageYears < 0) throw new RangeError("GLIM_INVALID_AGE");
  if (bmi === null) return { assessed: false, present: false, severity: null };
  if (!Number.isFinite(bmi) || bmi <= 0) throw new RangeError("GLIM_INVALID_BMI");

  const moderateCutoff = ageYears >= 70 ? 22 : 20;
  const severeCutoff = ageYears >= 70 ? 20 : 18.5;
  const present = bmi < moderateCutoff;
  return {
    assessed: true,
    present,
    severity: bmi < severeCutoff ? "STAGE_2" : present ? "STAGE_1" : null,
  };
}

function muscleCriterion(value: GlimTriState): GlimPhenotypicCriterion {
  return {
    assessed: value !== "NOT_ASSESSED",
    present: value === "YES",
    severity: null,
  };
}

function decisionSupportLabel(diagnosticCriteriaMet: boolean, severity: GlimSeverity | null): string {
  if (!diagnosticCriteriaMet) return "Critérios GLIM para desnutrição não preenchidos com os dados registrados.";
  if (severity === "STAGE_2") return "Critérios GLIM preenchidos; classificação sugerida: desnutrição grave (Estágio 2).";
  if (severity === "STAGE_1") return "Critérios GLIM preenchidos; classificação sugerida: desnutrição moderada (Estágio 1).";
  return "Critérios GLIM preenchidos; gravidade não classificável automaticamente pelos critérios disponíveis.";
}

export function evaluateGlim(input: GlimEvaluationInput): GlimEvaluationResult {
  assertFiniteNonNegative(input.weightLossPercent, "WEIGHT_LOSS");
  const weightLoss = weightLossCriterion(input.weightLossPercent, input.weightLossPeriod);
  const lowBmi = bmiCriterion(input.ageYears, input.bmi);
  const reducedMuscleMass = muscleCriterion(input.reducedMuscleMass);

  const phenotypic = [weightLoss, lowBmi, reducedMuscleMass];
  const phenotypeCount = phenotypic.filter((criterion) => criterion.present).length;
  const reducedFoodIntakeOrAssimilation = input.reducedFoodIntakeOrAssimilation === "YES";
  const inflammationOrDiseaseBurden = input.inflammationOrDiseaseBurden === "YES";
  const etiologicCount = Number(reducedFoodIntakeOrAssimilation) + Number(inflammationOrDiseaseBurden);
  const diagnosticCriteriaMet = phenotypeCount >= 1 && etiologicCount >= 1;

  const severityBasis: GlimSeverityBasis[] = [];
  if (weightLoss.present && weightLoss.severity) severityBasis.push("WEIGHT_LOSS");
  if (lowBmi.present && lowBmi.severity) severityBasis.push("BMI");

  let severity: GlimSeverity | null = null;
  if (diagnosticCriteriaMet) {
    if (phenotypic.some((criterion) => criterion.present && criterion.severity === "STAGE_2")) severity = "STAGE_2";
    else if (phenotypic.some((criterion) => criterion.present && criterion.severity === "STAGE_1")) severity = "STAGE_1";
    else severity = "NOT_GRADABLE";
  }

  const boundaryReviewRequired = phenotypic.some((criterion) => criterion.boundaryReviewRequired === true);

  return {
    phenotypeCount,
    etiologicCount,
    diagnosticCriteriaMet,
    severity,
    severityBasis,
    boundaryReviewRequired,
    phenotypic: { weightLoss, lowBmi, reducedMuscleMass },
    etiologic: { reducedFoodIntakeOrAssimilation, inflammationOrDiseaseBurden },
    decisionSupportLabel: decisionSupportLabel(diagnosticCriteriaMet, severity),
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function triStateOrUndefined(value: unknown): GlimTriState | undefined {
  return value === "YES" || value === "NO" || value === "NOT_ASSESSED" ? value : undefined;
}

function weightLossPeriodOrUndefined(value: unknown): GlimWeightLossPeriod | undefined {
  return value === "WITHIN_6_MONTHS" || value === "BEYOND_6_MONTHS" || value === "NOT_ASSESSED" ? value : undefined;
}

function clinicianDecisionOrUndefined(value: unknown): GlimClinicianDecision | undefined {
  return value === "PENDING" || value === "CONFIRMED" || value === "NOT_CONFIRMED" ? value : undefined;
}

function finiteNumberOrNull(value: unknown, options: { positive?: boolean } = {}): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (options.positive ? value <= 0 : value < 0) return undefined;
  return value;
}

function stringOrNull(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === "string" ? value : undefined;
}

export function storedGlimRecordFromStructuredData(structuredData: unknown): StoredGlimRecord | null {
  const root = asObject(structuredData);
  const glim = asObject(root?.glim);
  if (!glim || glim.implementationVersion !== GLIM_IMPLEMENTATION_VERSION) return null;

  const ageYears = finiteNumberOrNull(glim.ageYears);
  const weightLossPercent = finiteNumberOrNull(glim.weightLossPercent);
  const bmi = finiteNumberOrNull(glim.bmi, { positive: true });
  const muscleMassMethod = stringOrNull(glim.muscleMassMethod);
  const etiologicNotes = stringOrNull(glim.etiologicNotes);
  const clinicianNote = stringOrNull(glim.clinicianNote);
  const screeningRisk = triStateOrUndefined(glim.screeningRisk);
  const weightLossPeriod = weightLossPeriodOrUndefined(glim.weightLossPeriod);
  const reducedMuscleMass = triStateOrUndefined(glim.reducedMuscleMass);
  const reducedFoodIntakeOrAssimilation = triStateOrUndefined(glim.reducedFoodIntakeOrAssimilation);
  const inflammationOrDiseaseBurden = triStateOrUndefined(glim.inflammationOrDiseaseBurden);
  const clinicianDecision = clinicianDecisionOrUndefined(glim.clinicianDecision);

  if (
    ageYears === null || ageYears === undefined ||
    weightLossPercent === undefined ||
    bmi === undefined ||
    muscleMassMethod === undefined ||
    etiologicNotes === undefined ||
    clinicianNote === undefined ||
    screeningRisk === undefined ||
    weightLossPeriod === undefined ||
    reducedMuscleMass === undefined ||
    reducedFoodIntakeOrAssimilation === undefined ||
    inflammationOrDiseaseBurden === undefined ||
    clinicianDecision === undefined
  ) return null;

  let result: GlimEvaluationResult;
  try {
    result = evaluateGlim({
      ageYears,
      weightLossPercent,
      weightLossPeriod,
      bmi,
      reducedMuscleMass,
      reducedFoodIntakeOrAssimilation,
      inflammationOrDiseaseBurden,
    });
  } catch {
    return null;
  }

  return {
    implementationVersion: GLIM_IMPLEMENTATION_VERSION,
    ageYears,
    screeningRisk,
    weightLossPercent,
    weightLossPeriod,
    bmi,
    reducedMuscleMass,
    muscleMassMethod,
    reducedFoodIntakeOrAssimilation,
    inflammationOrDiseaseBurden,
    etiologicNotes,
    result,
    clinicianDecision,
    clinicianNote,
  };
}

export function confirmedGlimSummaryFromStructuredData(structuredData: unknown): string | null {
  const record = storedGlimRecordFromStructuredData(structuredData);
  if (!record || record.clinicianDecision !== "CONFIRMED") return null;
  return record.result.decisionSupportLabel;
}
