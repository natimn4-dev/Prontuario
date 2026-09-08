import type {
  CapacityDimensionHistory,
  CapacityDimensionStatus,
} from "../capacity-dimension-history.ts";
import {
  intrinsicCapacityGuidanceForDomain,
  type IntrinsicCapacityDomainCode,
  type IntrinsicCapacityEvidenceReference,
} from "../intrinsic-capacity-guidance.ts";
import { ONCOGERIATRIC_DOMAIN_STATUS_LABEL } from "./capacity-history.ts";

export interface OncogeriatricDomainReviewPriority {
  code: string;
  label: string;
  status: Extract<CapacityDimensionStatus, "altered" | "attention" | "indeterminate">;
  statusLabel: string;
  consultationId: string;
  occurredAt: string;
  instruments: Array<{
    code: string;
    name: string;
    version: string;
    result: string;
    selectedForDomainState: boolean;
  }>;
}

export interface OncogeriatricReportGuidance {
  code: string;
  label: string;
  stateLabel: string;
  triggeredBy: string[];
  actions: string[];
  attentionSigns: string[];
  evidenceReferences: IntrinsicCapacityEvidenceReference[];
  requiresClinicalReview: true;
}

const REVIEW_PRIORITY: Readonly<Partial<Record<CapacityDimensionStatus, number>>> = {
  altered: 0,
  attention: 1,
  indeterminate: 2,
};

const FUNCTIONAL_GUIDANCE = {
  actions: [
    "Confirme em quais atividades básicas e instrumentais passou a ser necessária ajuda ou supervisão e preserve a participação que ainda seja segura.",
    "Revise causas clínicas, cognitivas, sensoriais, ambientais e medicamentosas potencialmente relacionadas à perda funcional antes de definir o plano individualizado.",
  ],
  attentionSigns: [
    "Comunique à equipe aumento da necessidade de ajuda, nova queda, dificuldade para transferências ou erro no uso de medicamentos.",
  ],
  evidenceReferences: [{
    label: "Diretriz ASCO de avaliação e manejo geriátrico em oncologia",
    pmid: "37459573",
    url: "https://pubmed.ncbi.nlm.nih.gov/37459573/",
    relevance: "Recomenda manejo guiado pelos déficits identificados na avaliação geriátrica durante a terapia sistêmica.",
  }],
} as const;

function isReviewableStatus(
  value: CapacityDimensionStatus,
): value is OncogeriatricDomainReviewPriority["status"] {
  return value === "altered" || value === "attention" || value === "indeterminate";
}

function resultText(input: {
  scoreText?: string | null;
  scoreNumeric?: number | null;
  classification?: string | null;
}): string {
  const score = input.scoreText
    ?? (input.scoreNumeric === null || input.scoreNumeric === undefined ? null : String(input.scoreNumeric));
  return [score, input.classification].filter(Boolean).join(" · ") || "Resultado registrado";
}

/**
 * Prioriza somente instrumentos da avaliação mais recente que efetivamente
 * registrou aquele domínio. Não seleciona nem preenche escala na consulta atual.
 */
export function buildOncogeriatricDomainReviewPriorities(
  history: CapacityDimensionHistory,
): OncogeriatricDomainReviewPriority[] {
  const dateByConsultation = new Map(
    history.consultations.map((consultation) => [consultation.id, consultation.occurredAt]),
  );

  return history.dimensions.flatMap((dimension) => {
    const latestRecorded = [...dimension.cells].reverse().find((cell) => cell.assessments.length > 0);
    if (!latestRecorded || !isReviewableStatus(latestRecorded.status)) return [];

    const occurredAt = dateByConsultation.get(latestRecorded.consultationId);
    if (!occurredAt) return [];

    return [{
      code: dimension.code,
      label: dimension.label,
      status: latestRecorded.status,
      statusLabel: ONCOGERIATRIC_DOMAIN_STATUS_LABEL[latestRecorded.status],
      consultationId: latestRecorded.consultationId,
      occurredAt,
      instruments: [...latestRecorded.assessments]
        .sort((left, right) => Number(right.selectedForDomainState) - Number(left.selectedForDomainState)
          || left.scaleName.localeCompare(right.scaleName, "pt-BR"))
        .map((assessment) => ({
          code: assessment.scaleCode,
          name: assessment.scaleName,
          version: assessment.scaleVersion,
          result: resultText(assessment),
          selectedForDomainState: assessment.selectedForDomainState,
        })),
    }];
  }).sort((left, right) => (REVIEW_PRIORITY[left.status] ?? 9) - (REVIEW_PRIORITY[right.status] ?? 9));
}

function isIntrinsicDomain(value: string): value is IntrinsicCapacityDomainCode {
  return value === "locomocao"
    || value === "cognicao"
    || value === "psicologico"
    || value === "vitalidade"
    || value === "sensorial";
}

/**
 * Orientações educativas derivadas apenas do estado metodológico persistido.
 * Toda saída continua marcada para revisão clínica antes do compartilhamento.
 */
export function buildOncogeriatricReportGuidance(
  history: CapacityDimensionHistory,
): OncogeriatricReportGuidance[] {
  return buildOncogeriatricDomainReviewPriorities(history).map((priority) => {
    const content = isIntrinsicDomain(priority.code)
      ? intrinsicCapacityGuidanceForDomain(priority.code)
      : FUNCTIONAL_GUIDANCE;

    return {
      code: priority.code,
      label: priority.label,
      stateLabel: priority.statusLabel,
      triggeredBy: priority.instruments.map((instrument) => instrument.name),
      actions: [...content.actions].slice(0, 2),
      attentionSigns: [...content.attentionSigns].slice(0, 1),
      evidenceReferences: content.evidenceReferences.map((reference) => ({ ...reference })),
      requiresClinicalReview: true,
    };
  });
}
