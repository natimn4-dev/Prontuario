import {
  AGE_BANDS,
  BIOMARKER_RESULTS,
  CLOCK_RESULTS,
  COGNITIVE_COURSES,
  COGNITIVE_PROFILES,
  COMPLAINT_SOURCES,
  DATSCAN_RESULTS,
  FUNCTIONAL_ATTRIBUTIONS,
  FUNCTIONAL_IMPACTS,
  IMAGING_LEVELS,
  IMAGING_MODALITIES,
  LAB_CODES,
  LAB_STATUSES,
  TRI_STATE_VALUES,
  type DementiaAssessmentDraft,
} from "../../domain/dementia-assessment.ts";
import { DementiaAssessmentError } from "./dementia-assessment-errors.ts";

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DementiaAssessmentError("INVALID_PAYLOAD", `${label} inválido.`);
  }
  return value as JsonObject;
}

function knownKeys(value: JsonObject, keys: readonly string[], label: string) {
  const unexpected = Object.keys(value).filter((key) => !keys.includes(key));
  if (unexpected.length) throw new DementiaAssessmentError("UNEXPECTED_FIELDS", `${label}: campos não permitidos: ${unexpected.join(", ")}.`);
}

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new DementiaAssessmentError("INVALID_VALUE", `${label} inválido.`);
  }
  return value as T;
}

function text(value: unknown, label: string, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new DementiaAssessmentError("INVALID_VALUE", `${label} inválido.`);
  const normalized = value.trim();
  if (normalized.length > max) throw new DementiaAssessmentError("FIELD_TOO_LONG", `${label} excede ${max} caracteres.`);
  return normalized || undefined;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new DementiaAssessmentError("INVALID_VALUE", `${label} inválido.`);
  return value;
}

export function parseDementiaAssessmentSave(value: unknown): { expectedLatestVersion: number; draft: DementiaAssessmentDraft } {
  const root = object(value, "Registro");
  knownKeys(root, [
    "expectedLatestVersion", "safety", "clinical", "keyFeatures", "labs", "imaging", "biomarkers",
    "neuropsychologySummary", "clinicianSyndrome", "clinicianPrimaryHypothesis", "clinicianDifferentials",
    "reportText", "clinicianReviewed",
  ], "Registro");
  if (!Number.isInteger(root.expectedLatestVersion) || Number(root.expectedLatestVersion) < 0) {
    throw new DementiaAssessmentError("INVALID_VERSION", "Versão esperada inválida.");
  }

  const safety = object(root.safety, "Triagem de segurança");
  knownKeys(safety, ["acuteOnset", "acuteFluctuation", "newFocalDeficit", "rapidlyProgressive"], "Triagem de segurança");
  const clinical = object(root.clinical, "Avaliação clínica");
  knownKeys(clinical, [
    "complaintSources", "complaintSummary", "onsetAndProgression", "course", "profile", "ageBand",
    "functionalImpact", "functionalAttribution", "clockResult", "alcoholOrSubstanceConcern",
    "medicationConcern", "moodSleepSensoryConcern",
  ], "Avaliação clínica");
  const sources = clinical.complaintSources;
  if (!Array.isArray(sources) || sources.some((item) => typeof item !== "string" || !COMPLAINT_SOURCES.includes(item as never))) {
    throw new DementiaAssessmentError("INVALID_VALUE", "Fontes da queixa inválidas.");
  }
  const complaintSources = [...new Set(sources)] as DementiaAssessmentDraft["clinical"]["complaintSources"];

  const keyFeatures = object(root.keyFeatures, "Características clínicas");
  knownKeys(keyFeatures, ["cognitiveFluctuations", "visualHallucinations", "spontaneousParkinsonism", "remSleepBehavior", "previousStroke", "vascularRisk"], "Características clínicas");
  const labs = object(root.labs, "Exames laboratoriais");
  knownKeys(labs, LAB_CODES, "Exames laboratoriais");
  const imaging = object(root.imaging, "Neuroimagem");
  knownKeys(imaging, ["modality", "medialTemporalAtrophy", "temporoparietalAtrophy", "hippocampalDisproportion", "vascularBurden", "strategicInfarcts", "microbleeds", "otherFinding"], "Neuroimagem");
  const biomarkers = object(root.biomarkers, "Biomarcadores");
  knownKeys(biomarkers, ["amyloid", "tau", "csfAdProfile", "datScan", "fdgPetSummary", "otherBiomarker"], "Biomarcadores");

  const reportText = text(root.reportText, "Relatório editável", 16000);
  if (!reportText) throw new DementiaAssessmentError("REPORT_REQUIRED", "Revise ou gere o texto do relatório antes de salvar.");

  return {
    expectedLatestVersion: Number(root.expectedLatestVersion),
    draft: {
      safety: {
        acuteOnset: enumValue(safety.acuteOnset, TRI_STATE_VALUES, "Instalação aguda"),
        acuteFluctuation: enumValue(safety.acuteFluctuation, TRI_STATE_VALUES, "Flutuação aguda"),
        newFocalDeficit: enumValue(safety.newFocalDeficit, TRI_STATE_VALUES, "Déficit focal"),
        rapidlyProgressive: enumValue(safety.rapidlyProgressive, TRI_STATE_VALUES, "Progressão rápida"),
      },
      clinical: {
        complaintSources,
        complaintSummary: text(clinical.complaintSummary, "Queixa e contexto", 4000),
        onsetAndProgression: text(clinical.onsetAndProgression, "Início e progressão", 4000),
        course: enumValue(clinical.course, COGNITIVE_COURSES, "Curso"),
        profile: enumValue(clinical.profile, COGNITIVE_PROFILES, "Perfil cognitivo"),
        ageBand: enumValue(clinical.ageBand, AGE_BANDS, "Faixa etária"),
        functionalImpact: enumValue(clinical.functionalImpact, FUNCTIONAL_IMPACTS, "Impacto funcional"),
        functionalAttribution: enumValue(clinical.functionalAttribution, FUNCTIONAL_ATTRIBUTIONS, "Atribuição funcional"),
        clockResult: enumValue(clinical.clockResult, CLOCK_RESULTS, "Teste do Relógio"),
        alcoholOrSubstanceConcern: enumValue(clinical.alcoholOrSubstanceConcern, TRI_STATE_VALUES, "Álcool e substâncias"),
        medicationConcern: enumValue(clinical.medicationConcern, TRI_STATE_VALUES, "Medicações"),
        moodSleepSensoryConcern: enumValue(clinical.moodSleepSensoryConcern, TRI_STATE_VALUES, "Humor, sono e sentidos"),
      },
      keyFeatures: {
        cognitiveFluctuations: enumValue(keyFeatures.cognitiveFluctuations, TRI_STATE_VALUES, "Flutuações cognitivas persistentes"),
        visualHallucinations: enumValue(keyFeatures.visualHallucinations, TRI_STATE_VALUES, "Alucinações visuais"),
        spontaneousParkinsonism: enumValue(keyFeatures.spontaneousParkinsonism, TRI_STATE_VALUES, "Parkinsonismo"),
        remSleepBehavior: enumValue(keyFeatures.remSleepBehavior, TRI_STATE_VALUES, "Sono REM"),
        previousStroke: enumValue(keyFeatures.previousStroke, TRI_STATE_VALUES, "AVC prévio"),
        vascularRisk: enumValue(keyFeatures.vascularRisk, TRI_STATE_VALUES, "Risco vascular"),
      },
      labs: Object.fromEntries(LAB_CODES.map((code) => [code, enumValue(labs[code], LAB_STATUSES, code)])) as DementiaAssessmentDraft["labs"],
      imaging: {
        modality: enumValue(imaging.modality, IMAGING_MODALITIES, "Modalidade de imagem"),
        medialTemporalAtrophy: enumValue(imaging.medialTemporalAtrophy, IMAGING_LEVELS, "Atrofia temporal medial"),
        temporoparietalAtrophy: enumValue(imaging.temporoparietalAtrophy, IMAGING_LEVELS, "Atrofia têmporo-parietal"),
        hippocampalDisproportion: enumValue(imaging.hippocampalDisproportion, IMAGING_LEVELS, "Atrofia hipocampal desproporcional"),
        vascularBurden: enumValue(imaging.vascularBurden, IMAGING_LEVELS, "Carga vascular"),
        strategicInfarcts: enumValue(imaging.strategicInfarcts, TRI_STATE_VALUES, "Infartos estratégicos"),
        microbleeds: enumValue(imaging.microbleeds, TRI_STATE_VALUES, "Microssangramentos"),
        otherFinding: text(imaging.otherFinding, "Outros achados", 4000),
      },
      biomarkers: {
        amyloid: enumValue(biomarkers.amyloid, BIOMARKER_RESULTS, "Amiloide"),
        tau: enumValue(biomarkers.tau, BIOMARKER_RESULTS, "Tau"),
        csfAdProfile: enumValue(biomarkers.csfAdProfile, BIOMARKER_RESULTS, "Perfil liquórico de Alzheimer"),
        datScan: enumValue(biomarkers.datScan, DATSCAN_RESULTS, "DAT-SPECT"),
        fdgPetSummary: text(biomarkers.fdgPetSummary, "FDG-PET", 4000),
        otherBiomarker: text(biomarkers.otherBiomarker, "Outro biomarcador", 4000),
      },
      neuropsychologySummary: text(root.neuropsychologySummary, "Avaliação neuropsicológica", 6000),
      clinicianSyndrome: text(root.clinicianSyndrome, "Síndrome clínica", 4000),
      clinicianPrimaryHypothesis: text(root.clinicianPrimaryHypothesis, "Hipótese principal", 4000),
      clinicianDifferentials: text(root.clinicianDifferentials, "Diagnósticos diferenciais", 6000),
      reportText,
      clinicianReviewed: boolean(root.clinicianReviewed, "Revisão clínica"),
    },
  };
}

export function dementiaAssessmentHttpHandlers(deps: {
  getWorkspace: (consultationId: string) => Promise<unknown>;
  saveRecord: (input: { consultationId: string; expectedLatestVersion: number; draft: DementiaAssessmentDraft; requestId?: string }) => Promise<unknown>;
}) {
  return {
    async GET(_request: Request, consultationId: string) {
      try {
        return Response.json(await deps.getWorkspace(consultationId), { headers: { "cache-control": "private, no-store" } });
      } catch (error) {
        return dementiaErrorResponse(error);
      }
    },
    async POST(request: Request, consultationId: string) {
      try {
        const parsed = parseDementiaAssessmentSave(await request.json());
        return Response.json(await deps.saveRecord({
          consultationId,
          expectedLatestVersion: parsed.expectedLatestVersion,
          draft: parsed.draft,
          requestId: request.headers.get("x-request-id") ?? undefined,
        }), { headers: { "cache-control": "private, no-store" } });
      } catch (error) {
        return dementiaErrorResponse(error);
      }
    },
  };
}

export function dementiaErrorResponse(error: unknown): Response {
  if (error instanceof DementiaAssessmentError) {
    return Response.json({ code: error.code, message: error.message }, { status: error.status });
  }
  return Response.json({ code: "INTERNAL_ERROR", message: "Não foi possível processar a avaliação cognitiva." }, { status: 500 });
}
