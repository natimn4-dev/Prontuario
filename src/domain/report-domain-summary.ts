import type { AgaScaleReportSection } from "./aga-report.ts";
import type {
  IntrinsicCapacityDomainCode,
  IntrinsicCapacityEvidenceReference,
  IntrinsicCapacityGuidance,
} from "./intrinsic-capacity-guidance.ts";

export type ReportDomainState = "altered" | "attention" | "preserved" | "not-assessed";

export interface ReportDomainSummary {
  code: string;
  label: string;
  state: ReportDomainState;
  stateLabel: string;
  guidance: string[];
  evidenceReferences: IntrinsicCapacityEvidenceReference[];
  requiresMedicalGuidance: boolean;
}

const DIMENSION_LABELS: Readonly<Record<string, string>> = {
  funcionalidade: "Funcionalidade",
  cognicao: "Cognição",
  humor: "Humor e saúde mental",
  fragilidade: "Fragilidade",
  mobilidade: "Locomoção e equilíbrio",
  nutricao: "Nutrição e vitalidade",
  medicamentos: "Medicamentos",
  "suporte-social": "Família e rede de apoio",
  oncogeriatria: "Oncogeriatria",
  prognostico: "Prognóstico e cuidados paliativos",
  sintomas: "Sintomas",
  outros: "Outras avaliações",
};

const DIMENSION_ORDER = [
  "funcionalidade",
  "cognicao",
  "humor",
  "fragilidade",
  "mobilidade",
  "nutricao",
  "medicamentos",
  "suporte-social",
  "oncogeriatria",
  "prognostico",
  "sintomas",
  "outros",
] as const;

const INTRINSIC_DOMAIN_FOR_DIMENSION: Readonly<Partial<Record<string, IntrinsicCapacityDomainCode>>> = {
  mobilidade: "locomocao",
  cognicao: "cognicao",
  humor: "psicologico",
  nutricao: "vitalidade",
};

function unique(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function stateFor(scales: readonly AgaScaleReportSection[]): ReportDomainState {
  const current = scales.filter((scale) => scale.assessedInTargetConsultation);
  if (current.length === 0) return "not-assessed";
  if (current.some((scale) => scale.clinicalColor === "vermelho")) return "altered";
  if (current.some((scale) => scale.clinicalColor === "amarelo")) return "attention";
  return "preserved";
}

function stateLabelFor(state: ReportDomainState): string {
  if (state === "altered") return "Alteração identificada — requer atenção";
  if (state === "attention") return "Sinal de atenção";
  if (state === "preserved") return "Sem alteração sinalizada nesta consulta";
  return "Não avaliado nesta consulta";
}

function defaultGuidanceFor(state: ReportDomainState): string[] {
  if (state === "preserved") {
    return ["Manter o plano de cuidado já acordado e observar mudanças funcionais até a próxima consulta."];
  }
  if (state === "not-assessed") {
    return ["Não inferir mudança sem nova avaliação; reavaliar conforme o contexto clínico e o plano definido pela equipe."];
  }
  return [];
}

export function buildReportDomainSummaries(
  scales: readonly AgaScaleReportSection[],
  intrinsicCapacity: IntrinsicCapacityGuidance,
): ReportDomainSummary[] {
  const grouped = new Map<string, AgaScaleReportSection[]>();
  for (const scale of scales) {
    const items = grouped.get(scale.dimension) ?? [];
    items.push(scale);
    grouped.set(scale.dimension, items);
  }

  return DIMENSION_ORDER.flatMap((dimension): ReportDomainSummary[] => {
    const dimensionScales = grouped.get(dimension);
    if (!dimensionScales?.length) return [];

    const state = stateFor(dimensionScales);
    const intrinsicCode = INTRINSIC_DOMAIN_FOR_DIMENSION[dimension];
    const intrinsicGuidance = intrinsicCode
      ? intrinsicCapacity.alteredDomains.find((domain) => domain.code === intrinsicCode)
      : undefined;
    const scaleGuidance = dimensionScales
      .filter((scale) => scale.assessedInTargetConsultation)
      .flatMap((scale) => scale.interventionSuggestions.map((suggestion) => suggestion.text));
    const guidance = unique([
      ...(intrinsicGuidance?.actions ?? []),
      ...scaleGuidance,
      ...defaultGuidanceFor(state),
    ]).slice(0, 5);
    const requiresMedicalGuidance = (state === "altered" || state === "attention") && guidance.length === 0;

    return [{
      code: dimension,
      label: DIMENSION_LABELS[dimension] ?? dimension,
      state,
      stateLabel: stateLabelFor(state),
      guidance,
      evidenceReferences: intrinsicGuidance?.evidenceReferences.map((reference) => ({ ...reference })) ?? [],
      requiresMedicalGuidance,
    }];
  });
}
