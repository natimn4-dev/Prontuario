export const DEMENTIA_ASSESSMENT_PROTOCOL_VERSION = "dementia-diagnostic-support-2026-09-v1" as const;

export const TRI_STATE_VALUES = ["NOT_ASSESSED", "NO", "YES"] as const;
export type TriState = (typeof TRI_STATE_VALUES)[number];

export const COMPLAINT_SOURCES = ["PATIENT", "INFORMANT", "CLINICIAN"] as const;
export type ComplaintSource = (typeof COMPLAINT_SOURCES)[number];

export const COGNITIVE_COURSES = ["UNCLEAR", "INSIDIOUS", "STEPWISE", "FLUCTUATING", "RAPID"] as const;
export type CognitiveCourse = (typeof COGNITIVE_COURSES)[number];

export const COGNITIVE_PROFILES = [
  "UNCLEAR",
  "AMNESTIC",
  "EXECUTIVE_VISUOSPATIAL",
  "LANGUAGE",
  "BEHAVIORAL",
  "MULTIDOMAIN",
] as const;
export type CognitiveProfile = (typeof COGNITIVE_PROFILES)[number];

export const FUNCTIONAL_IMPACTS = ["NOT_ASSESSED", "NONE", "IADL", "ADL", "BOTH"] as const;
export type FunctionalImpact = (typeof FUNCTIONAL_IMPACTS)[number];

export const FUNCTIONAL_ATTRIBUTIONS = ["NOT_ASSESSED", "COGNITIVE", "MIXED", "NON_COGNITIVE"] as const;
export type FunctionalAttribution = (typeof FUNCTIONAL_ATTRIBUTIONS)[number];

export const CLOCK_RESULTS = ["NOT_APPLIED", "WITHOUT_RELEVANT_CHANGE", "ALTERED", "UNINTERPRETABLE"] as const;
export type ClockResult = (typeof CLOCK_RESULTS)[number];

export const LAB_CODES = ["TSH", "B12", "FOLATE", "RENAL", "HEPATIC", "CALCIUM", "HIV", "SYPHILIS"] as const;
export type LabCode = (typeof LAB_CODES)[number];
export const LAB_STATUSES = ["NOT_REQUESTED", "PENDING", "WITHOUT_RELEVANT_CHANGE", "ALTERED"] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];
export type LabReview = Record<LabCode, LabStatus>;

export const IMAGING_MODALITIES = ["NOT_PERFORMED", "MRI", "CT"] as const;
export type ImagingModality = (typeof IMAGING_MODALITIES)[number];
export const IMAGING_LEVELS = ["NOT_ASSESSED", "ABSENT", "MILD", "MODERATE", "MARKED"] as const;
export type ImagingLevel = (typeof IMAGING_LEVELS)[number];

export const BIOMARKER_RESULTS = ["NOT_PERFORMED", "INDETERMINATE", "NEGATIVE", "POSITIVE"] as const;
export type BiomarkerResult = (typeof BIOMARKER_RESULTS)[number];
export const DATSCAN_RESULTS = ["NOT_PERFORMED", "INDETERMINATE", "NORMAL", "REDUCED"] as const;
export type DatScanResult = (typeof DATSCAN_RESULTS)[number];

export const AGE_BANDS = ["UNDER_65", "65_TO_79", "80_TO_84", "85_OR_MORE", "NOT_RECORDED"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export interface DementiaSafetyDraft {
  acuteOnset: TriState;
  acuteFluctuation: TriState;
  newFocalDeficit: TriState;
  rapidlyProgressive: TriState;
}

export interface DementiaClinicalDraft {
  complaintSources: ComplaintSource[];
  complaintSummary?: string;
  onsetAndProgression?: string;
  course: CognitiveCourse;
  profile: CognitiveProfile;
  ageBand: AgeBand;
  functionalImpact: FunctionalImpact;
  functionalAttribution: FunctionalAttribution;
  clockResult: ClockResult;
  alcoholOrSubstanceConcern: TriState;
  medicationConcern: TriState;
  moodSleepSensoryConcern: TriState;
}

export interface DementiaKeyFeaturesDraft {
  cognitiveFluctuations: TriState;
  visualHallucinations: TriState;
  spontaneousParkinsonism: TriState;
  remSleepBehavior: TriState;
  previousStroke: TriState;
  vascularRisk: TriState;
}

export interface DementiaImagingDraft {
  modality: ImagingModality;
  medialTemporalAtrophy: ImagingLevel;
  temporoparietalAtrophy: ImagingLevel;
  hippocampalDisproportion: ImagingLevel;
  vascularBurden: ImagingLevel;
  strategicInfarcts: TriState;
  microbleeds: TriState;
  otherFinding?: string;
}

export interface DementiaBiomarkerDraft {
  amyloid: BiomarkerResult;
  tau: BiomarkerResult;
  csfAdProfile: BiomarkerResult;
  datScan: DatScanResult;
  fdgPetSummary?: string;
  otherBiomarker?: string;
}

export interface DementiaAssessmentDraft {
  safety: DementiaSafetyDraft;
  clinical: DementiaClinicalDraft;
  keyFeatures: DementiaKeyFeaturesDraft;
  labs: LabReview;
  imaging: DementiaImagingDraft;
  biomarkers: DementiaBiomarkerDraft;
  neuropsychologySummary?: string;
  clinicianSyndrome?: string;
  clinicianPrimaryHypothesis?: string;
  clinicianDifferentials?: string;
  reportText?: string;
  clinicianReviewed: boolean;
}

export type DementiaPathway = "URGENT_ACUTE" | "URGENT_RAPID" | "CONTINUE_ELECTIVE" | "INCOMPLETE";
export type DementiaEtiology = "ALZHEIMER" | "LEWY_BODY" | "VASCULAR" | "LATE";

export interface DementiaHypothesisSupport {
  etiology: DementiaEtiology;
  label: string;
  support: "LOW" | "MODERATE" | "HIGH";
  supporting: string[];
  limiting: string[];
}

export interface DementiaInterpretation {
  pathway: DementiaPathway;
  pathwayLabel: string;
  alerts: string[];
  missing: string[];
  hypotheses: DementiaHypothesisSupport[];
  screeningSummary: string;
  disclaimer: string;
}

export interface CognitiveScaleSummary {
  scaleCode: string;
  name: string;
  score?: number;
  scoreText?: string;
  classification?: string;
  interpretation?: string;
  appliedAt: string;
}

export function cognitiveScaleFamily(scaleCode: string): "MEEM" | "MOCA" | "CLOCK" {
  const normalized = scaleCode.toLowerCase();
  if (normalized.includes("meem")) return "MEEM";
  if (normalized.includes("moca")) return "MOCA";
  return "CLOCK";
}

export function cognitiveScaleName(scaleCode: string): string {
  const family = cognitiveScaleFamily(scaleCode);
  return family === "MOCA" ? "MoCA" : family === "CLOCK" ? "Teste do Relógio" : "MEEM";
}

export interface DementiaAssessmentRecordView extends DementiaAssessmentDraft {
  id: string;
  patientId: string;
  consultationId: string;
  consultationOccurredAt: string;
  recordedByName: string;
  version: number;
  protocolVersion: string;
  interpretation: DementiaInterpretation;
  createdAt: string;
}

export interface DementiaAssessmentWorkspaceView {
  consultationId: string;
  patientId: string;
  patientName: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  latestVersion: number;
  current?: DementiaAssessmentRecordView;
  history: DementiaAssessmentRecordView[];
  currentCognitiveScales: CognitiveScaleSummary[];
  latestReportSnapshotVersion: number;
}

export const TRI_STATE_LABELS: Readonly<Record<TriState, string>> = {
  NOT_ASSESSED: "Não avaliado",
  NO: "Não",
  YES: "Sim",
};

export const COURSE_LABELS: Readonly<Record<CognitiveCourse, string>> = {
  UNCLEAR: "Curso ainda não definido",
  INSIDIOUS: "Início insidioso e progressivo",
  STEPWISE: "Evolução em degraus",
  FLUCTUATING: "Flutuação cognitiva persistente",
  RAPID: "Progressão rápida em semanas ou poucos meses",
};

export const PROFILE_LABELS: Readonly<Record<CognitiveProfile, string>> = {
  UNCLEAR: "Perfil ainda não definido",
  AMNESTIC: "Predomínio amnéstico",
  EXECUTIVE_VISUOSPATIAL: "Predomínio executivo ou visuoespacial",
  LANGUAGE: "Predomínio de linguagem",
  BEHAVIORAL: "Predomínio comportamental",
  MULTIDOMAIN: "Comprometimento multidomínio",
};

export const FUNCTIONAL_IMPACT_LABELS: Readonly<Record<FunctionalImpact, string>> = {
  NOT_ASSESSED: "Não avaliado",
  NONE: "Sem perda funcional atribuível à cognição",
  IADL: "Repercussão em atividades instrumentais",
  ADL: "Repercussão em atividades básicas",
  BOTH: "Repercussão em atividades instrumentais e básicas",
};

export const LAB_LABELS: Readonly<Record<LabCode, string>> = {
  TSH: "TSH",
  B12: "Vitamina B12",
  FOLATE: "Ácido fólico quando indicado",
  RENAL: "Função renal",
  HEPATIC: "Função hepática",
  CALCIUM: "Cálcio",
  HIV: "HIV quando indicado",
  SYPHILIS: "Sífilis quando indicada",
};

export const LAB_STATUS_LABELS: Readonly<Record<LabStatus, string>> = {
  NOT_REQUESTED: "Não solicitado",
  PENDING: "Pendente",
  WITHOUT_RELEVANT_CHANGE: "Sem alteração relevante registrada",
  ALTERED: "Alterado ou requer revisão",
};

export function emptyLabReview(): LabReview {
  return Object.fromEntries(LAB_CODES.map((code) => [code, "NOT_REQUESTED"])) as LabReview;
}

export function emptyDementiaAssessmentDraft(): DementiaAssessmentDraft {
  return {
    safety: {
      acuteOnset: "NOT_ASSESSED",
      acuteFluctuation: "NOT_ASSESSED",
      newFocalDeficit: "NOT_ASSESSED",
      rapidlyProgressive: "NOT_ASSESSED",
    },
    clinical: {
      complaintSources: [],
      course: "UNCLEAR",
      profile: "UNCLEAR",
      ageBand: "NOT_RECORDED",
      functionalImpact: "NOT_ASSESSED",
      functionalAttribution: "NOT_ASSESSED",
      clockResult: "NOT_APPLIED",
      alcoholOrSubstanceConcern: "NOT_ASSESSED",
      medicationConcern: "NOT_ASSESSED",
      moodSleepSensoryConcern: "NOT_ASSESSED",
    },
    keyFeatures: {
      cognitiveFluctuations: "NOT_ASSESSED",
      visualHallucinations: "NOT_ASSESSED",
      spontaneousParkinsonism: "NOT_ASSESSED",
      remSleepBehavior: "NOT_ASSESSED",
      previousStroke: "NOT_ASSESSED",
      vascularRisk: "NOT_ASSESSED",
    },
    labs: emptyLabReview(),
    imaging: {
      modality: "NOT_PERFORMED",
      medialTemporalAtrophy: "NOT_ASSESSED",
      temporoparietalAtrophy: "NOT_ASSESSED",
      hippocampalDisproportion: "NOT_ASSESSED",
      vascularBurden: "NOT_ASSESSED",
      strategicInfarcts: "NOT_ASSESSED",
      microbleeds: "NOT_ASSESSED",
    },
    biomarkers: {
      amyloid: "NOT_PERFORMED",
      tau: "NOT_PERFORMED",
      csfAdProfile: "NOT_PERFORMED",
      datScan: "NOT_PERFORMED",
    },
    clinicianReviewed: false,
  };
}

function yes(value: TriState): boolean {
  return value === "YES";
}

function countYes(values: TriState[]): number {
  return values.filter(yes).length;
}

function levelAtLeast(value: ImagingLevel, threshold: "MODERATE" | "MARKED"): boolean {
  const order: ImagingLevel[] = ["NOT_ASSESSED", "ABSENT", "MILD", "MODERATE", "MARKED"];
  return order.indexOf(value) >= order.indexOf(threshold);
}

function supportLevel(score: number): DementiaHypothesisSupport["support"] {
  if (score >= 4) return "HIGH";
  if (score >= 2) return "MODERATE";
  return "LOW";
}

function hypothesis(
  etiology: DementiaEtiology,
  label: string,
  supporting: string[],
  limiting: string[],
): DementiaHypothesisSupport {
  return { etiology, label, support: supportLevel(supporting.length), supporting, limiting };
}

export function interpretDementiaAssessment(draft: DementiaAssessmentDraft): DementiaInterpretation {
  const acuteSignals = [draft.safety.acuteOnset, draft.safety.acuteFluctuation, draft.safety.newFocalDeficit];
  const alerts: string[] = [];
  let pathway: DementiaPathway = "CONTINUE_ELECTIVE";
  let pathwayLabel = "Prosseguir com avaliação clínica e etiológica";

  if (acuteSignals.some(yes)) {
    pathway = "URGENT_ACUTE";
    pathwayLabel = "Interromper o fluxo eletivo e avaliar condição aguda";
    alerts.push("Há marcador de instalação aguda, flutuação aguda ou déficit focal novo. Avaliar delirium, AVC, crise, infecção, toxicidade ou outra causa aguda.");
  } else if (yes(draft.safety.rapidlyProgressive) || draft.clinical.course === "RAPID") {
    pathway = "URGENT_RAPID";
    pathwayLabel = "Priorizar investigação especializada de declínio rapidamente progressivo";
    alerts.push("Progressão em semanas ou poucos meses exige investigação acelerada e um diferencial além das causas neurodegenerativas usuais.");
  }

  const missing: string[] = [];
  if (!draft.clinical.complaintSources.length) missing.push("Fonte da queixa cognitiva");
  if (draft.clinical.course === "UNCLEAR") missing.push("Curso temporal");
  if (draft.clinical.profile === "UNCLEAR") missing.push("Perfil cognitivo predominante");
  if (draft.clinical.functionalImpact === "NOT_ASSESSED") missing.push("Impacto funcional");
  if (draft.clinical.functionalAttribution === "NOT_ASSESSED") missing.push("Atribuição da perda funcional");
  if (draft.safety.acuteOnset === "NOT_ASSESSED" || draft.safety.newFocalDeficit === "NOT_ASSESSED") missing.push("Triagem de segurança completa");
  if (missing.length >= 5 && pathway === "CONTINUE_ELECTIVE") {
    pathway = "INCOMPLETE";
    pathwayLabel = "Completar avaliação clínica antes da integração etiológica";
  }

  const adSupporting: string[] = [];
  const adLimiting: string[] = [];
  if (draft.clinical.course === "INSIDIOUS") adSupporting.push("Curso insidioso e progressivo");
  if (["AMNESTIC", "MULTIDOMAIN"].includes(draft.clinical.profile)) adSupporting.push("Perfil amnéstico ou multidomínio compatível");
  if (levelAtLeast(draft.imaging.medialTemporalAtrophy, "MODERATE")) adSupporting.push("Atrofia temporal medial registrada");
  if (levelAtLeast(draft.imaging.temporoparietalAtrophy, "MODERATE")) adSupporting.push("Atrofia têmporo-parietal registrada");
  if (draft.biomarkers.amyloid === "POSITIVE" || draft.biomarkers.csfAdProfile === "POSITIVE") adSupporting.push("Biomarcador de patologia de Alzheimer positivo");
  if (draft.biomarkers.tau === "POSITIVE") adSupporting.push("Biomarcador tau positivo aumenta a confiança de contribuição para os sintomas");
  if (draft.biomarkers.amyloid === "NEGATIVE" || draft.biomarkers.csfAdProfile === "NEGATIVE") adLimiting.push("Biomarcador amiloide ou perfil liquórico negativo torna Alzheimer menos provável como etiologia principal");

  const lewySupporting: string[] = [];
  const lewyCoreCount = countYes([
    draft.keyFeatures.cognitiveFluctuations,
    draft.keyFeatures.visualHallucinations,
    draft.keyFeatures.spontaneousParkinsonism,
    draft.keyFeatures.remSleepBehavior,
  ]);
  if (yes(draft.keyFeatures.cognitiveFluctuations)) lewySupporting.push("Flutuações cognitivas persistentes registradas");
  if (yes(draft.keyFeatures.visualHallucinations)) lewySupporting.push("Alucinações visuais recorrentes");
  if (yes(draft.keyFeatures.spontaneousParkinsonism)) lewySupporting.push("Parkinsonismo espontâneo");
  if (yes(draft.keyFeatures.remSleepBehavior)) lewySupporting.push("Transtorno comportamental do sono REM suspeito ou documentado");
  if (draft.biomarkers.datScan === "REDUCED") lewySupporting.push("Redução de captação dopaminérgica no DAT-SPECT");
  const lewyLimiting = lewyCoreCount === 0 ? ["Nenhuma característica clínica central foi registrada"] : [];

  const vascularSupporting: string[] = [];
  if (draft.clinical.course === "STEPWISE") vascularSupporting.push("Evolução em degraus");
  if (yes(draft.keyFeatures.previousStroke)) vascularSupporting.push("AVC prévio registrado");
  if (yes(draft.safety.newFocalDeficit)) vascularSupporting.push("Sinal focal novo ou recente");
  if (yes(draft.keyFeatures.vascularRisk)) vascularSupporting.push("Carga relevante de fatores de risco vascular");
  if (levelAtLeast(draft.imaging.vascularBurden, "MODERATE")) vascularSupporting.push("Carga vascular moderada ou acentuada na neuroimagem");
  if (yes(draft.imaging.strategicInfarcts)) vascularSupporting.push("Infarto estratégico ou múltiplos infartos registrados");
  const vascularLimiting = !levelAtLeast(draft.imaging.vascularBurden, "MODERATE") && !yes(draft.imaging.strategicInfarcts)
    ? ["Não foi registrada carga de lesão vascular suficiente para sustentar causalidade"]
    : [];

  const lateSupporting: string[] = [];
  if (draft.clinical.ageBand === "85_OR_MORE") lateSupporting.push("Idade de 85 anos ou mais");
  if (draft.clinical.profile === "AMNESTIC") lateSupporting.push("Síndrome predominantemente amnésica");
  if (draft.clinical.course === "INSIDIOUS") lateSupporting.push("Progressão lenta e insidiosa");
  if (levelAtLeast(draft.imaging.hippocampalDisproportion, "MARKED")) lateSupporting.push("Atrofia hipocampal desproporcional registrada");
  if (draft.biomarkers.amyloid === "NEGATIVE" || draft.biomarkers.csfAdProfile === "NEGATIVE") lateSupporting.push("Biomarcador de amiloide negativo favorece LATE como provável causa primária");
  const lateLimiting: string[] = [];
  if (draft.biomarkers.amyloid === "POSITIVE" && draft.biomarkers.tau === "POSITIVE") lateLimiting.push("Biomarcadores de Alzheimer positivos exigem considerar copatologia e contribuição relativa");
  if (draft.clinical.ageBand !== "85_OR_MORE") lateLimiting.push("Faixa etária é menos típica para LATE clínico");

  const hypotheses = [
    hypothesis("ALZHEIMER", "Doença de Alzheimer", adSupporting, adLimiting),
    hypothesis("LEWY_BODY", "Demência com corpos de Lewy", lewySupporting, lewyLimiting),
    hypothesis("VASCULAR", "Comprometimento cognitivo vascular", vascularSupporting, vascularLimiting),
    hypothesis("LATE", "LATE", lateSupporting, lateLimiting),
  ].sort((a, b) => ({ HIGH: 3, MODERATE: 2, LOW: 1 }[b.support] - { HIGH: 3, MODERATE: 2, LOW: 1 }[a.support]));

  const alteredLabs = LAB_CODES.filter((code) => draft.labs[code] === "ALTERED");
  if (alteredLabs.length) alerts.push(`Há exames que requerem revisão clínica: ${alteredLabs.map((code) => LAB_LABELS[code]).join(", ")}.`);
  if (yes(draft.clinical.medicationConcern)) alerts.push("Há medicação potencialmente contribuidora; revisar indicação, carga anticolinérgica, sedação e temporalidade.");
  if (yes(draft.clinical.moodSleepSensoryConcern)) alerts.push("Humor, sono ou déficits sensoriais podem modificar o desempenho e devem ser integrados à interpretação.");

  return {
    pathway,
    pathwayLabel,
    alerts,
    missing,
    hypotheses,
    screeningSummary: "MEEM, MoCA e Teste do Relógio são instrumentos de rastreio e não estabelecem etiologia isoladamente. Interpretar resultados no contexto de escolaridade, idioma, cultura e déficits sensoriais.",
    disclaimer: "Apoio à decisão clínica. As hipóteses são probabilísticas, admitem etiologias mistas e exigem revisão médica explícita antes de qualquer conclusão ou documento compartilhável.",
  };
}

export function buildDementiaReportDraft(
  draft: DementiaAssessmentDraft,
  interpretation: DementiaInterpretation = interpretDementiaAssessment(draft),
  scales: CognitiveScaleSummary[] = [],
): string {
  const lines: string[] = [];
  lines.push("AVALIAÇÃO COGNITIVA E INVESTIGAÇÃO ETIOLÓGICA");
  lines.push("");
  lines.push(`Síndrome clínico-funcional: ${draft.clinicianSyndrome?.trim() || "Ainda não definida pelo médico."}`);
  lines.push(`Curso e perfil: ${COURSE_LABELS[draft.clinical.course]}; ${PROFILE_LABELS[draft.clinical.profile]}.`);
  lines.push(`Impacto funcional: ${FUNCTIONAL_IMPACT_LABELS[draft.clinical.functionalImpact]}.`);
  if (draft.clinical.complaintSummary?.trim()) lines.push(`Queixa e contexto: ${draft.clinical.complaintSummary.trim()}`);
  if (scales.length) {
    lines.push(`Rastreio registrado nesta consulta: ${scales.map((scale) => `${scale.name}: ${scale.scoreText ?? scale.score ?? "resultado registrado"}${scale.classification ? ` (${scale.classification})` : ""}`).join("; ")}.`);
  } else {
    lines.push("Rastreio cognitivo: sem MEEM ou MoCA registrado nesta consulta.");
  }
  lines.push("");
  lines.push(`Fluxo de segurança: ${interpretation.pathwayLabel}.`);
  if (interpretation.alerts.length) lines.push(`Pontos de atenção: ${interpretation.alerts.join(" ")}`);
  lines.push("");
  lines.push(`Hipótese etiológica principal registrada pelo médico: ${draft.clinicianPrimaryHypothesis?.trim() || "Ainda não definida."}`);
  lines.push(`Diagnósticos diferenciais e possíveis copatologias: ${draft.clinicianDifferentials?.trim() || "Ainda não registrados."}`);
  lines.push("");
  lines.push("Elementos de apoio organizados pelo sistema:");
  for (const item of interpretation.hypotheses) {
    const evidence = item.supporting.length ? item.supporting.join("; ") : "sem elementos de apoio suficientes registrados";
    const limits = item.limiting.length ? ` Limitações: ${item.limiting.join("; ")}.` : "";
    lines.push(`- ${item.label}: apoio ${item.support === "HIGH" ? "alto" : item.support === "MODERATE" ? "moderado" : "baixo"}; ${evidence}.${limits}`);
  }
  if (interpretation.missing.length) {
    lines.push("");
    lines.push(`Dados pendentes para integração: ${interpretation.missing.join("; ")}.`);
  }
  lines.push("");
  lines.push("Conclusão clínica e plano: revisar e editar este texto antes de finalizar ou compartilhar.");
  lines.push("");
  lines.push(interpretation.disclaimer);
  return lines.join("\n");
}
