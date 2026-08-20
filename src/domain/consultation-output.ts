import type { ClinicalProblem } from "./problems.ts";
import type { LongitudinalAssessment } from "./clinical-change-summary.ts";
import { buildFollowUpContext } from "./follow-up-context.ts";
import {
  buildFamilyReportModel,
  renderFamilyReportText,
  renderSoapText,
  type SoapMedication,
} from "./document-renderers.ts";
import {
  renderMedicationPlanText,
  type MedicationPlanItem,
} from "./medication-plan.ts";
import { buildAgaReportModel, renderAgaReportText } from "./aga-report.ts";
import type { VaccinationReview } from "./vaccination-prevention.ts";

export interface ConsultationOutputInput {
  patientId: string;
  consultationId: string;
  patientName: string;
  consultationStatus?: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  longitudinalAssessments: readonly LongitudinalAssessment[];
  longitudinalProblems: readonly ClinicalProblem[];
  subjective?: string;
  physicalExam?: string;
  vitalSigns?: string;
  anthropometry?: string;
  soapMedications?: SoapMedication[];
  medicationPlan?: MedicationPlanItem[];
  planByProblem?: Readonly<Record<string, readonly string[]>>;
  attentionSigns?: readonly string[];
  contactPhone?: string;
  vaccinationReview?: VaccinationReview;
}

export interface ConsultationOutputs {
  consultationId: string;
  patientId: string;
  followUpContext: ReturnType<typeof buildFollowUpContext>;
  soapText: string;
  familyReportText: string;
  medicationPlanText: string;
  agaReportModel: ReturnType<typeof buildAgaReportModel>;
  agaReportText: string;
}

export function buildConsultationOutputs(
  input: ConsultationOutputInput,
): ConsultationOutputs {
  if (!input.patientId || !input.consultationId) {
    throw new Error("Paciente e consulta são obrigatórios para gerar saídas clínicas.");
  }

  const followUpContext = buildFollowUpContext({
    patientId: input.patientId,
    longitudinalAssessments: input.longitudinalAssessments,
    longitudinalProblems: input.longitudinalProblems,
  });

  // Apenas problemas já confirmados entram automaticamente no SOAP e no
  // relatório. Propostas derivadas de escalas permanecem na fila de revisão.
  const confirmedProblems = followUpContext.inheritedProblems;

  const soapText = renderSoapText({
    patientName: input.patientName,
    subjective: input.subjective,
    physicalExam: input.physicalExam,
    vitalSigns: input.vitalSigns,
    anthropometry: input.anthropometry,
    medications: input.soapMedications,
    problems: confirmedProblems,
    planByProblem: input.planByProblem,
  });

  const familyModel = buildFamilyReportModel({
    patientName: input.patientName,
    problems: confirmedProblems,
    changeSummary: followUpContext.changeSummary,
    plan: followUpContext.changeSummary.combinedPlan,
    attentionSigns: input.attentionSigns,
    contactPhone: input.contactPhone,
    vaccinationReview: input.vaccinationReview,
  });
  const agaReportModel = buildAgaReportModel({
    patientId: input.patientId,
    consultationId: input.consultationId,
    consultationStatus: input.consultationStatus ?? "DRAFT",
    patientName: input.patientName,
    longitudinalAssessments: input.longitudinalAssessments,
    longitudinalProblems: input.longitudinalProblems,
    vaccinationReview: input.vaccinationReview,
  });

  return {
    patientId: input.patientId,
    consultationId: input.consultationId,
    followUpContext,
    soapText,
    familyReportText: renderFamilyReportText(familyModel),
    medicationPlanText: renderMedicationPlanText(
      input.patientName,
      input.medicationPlan ?? [],
    ),
    agaReportModel,
    agaReportText: renderAgaReportText(agaReportModel),
  };
}
