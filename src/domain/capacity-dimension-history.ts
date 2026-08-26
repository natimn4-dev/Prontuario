import type { ClinicalColor } from "./clinical-engine.ts";
import {
  INTRINSIC_CAPACITY_MODEL_VERSION,
  evidenceRolePriority,
  isCapacityScale,
  methodologyForScaleInDomain,
  scaleDomains,
  type CapacityDimensionCode,
  type CapacityEvidenceRole,
  type ConstructMappingStrength,
  type DomainEvidenceBasis,
} from "./intrinsic-capacity-methodology.ts";
import { scaleCatalogEntry } from "./scale-catalog.ts";

export type { CapacityDimensionCode } from "./intrinsic-capacity-methodology.ts";

export type CapacityDimensionStatus =
  | "not-assessed"
  | "recorded"
  | "indeterminate"
  | "preserved"
  | "attention"
  | "altered";

export type CapacityComparableStatus = Extract<
  CapacityDimensionStatus,
  "preserved" | "attention" | "altered"
>;

export interface CapacityTimelineConsultation {
  id: string;
  patientId: string;
  occurredAt: Date | string;
  createdAt?: Date | string;
}

export interface CapacityTimelineAssessment {
  id?: string;
  patientId: string;
  consultationId: string;
  scaleCode: string;
  scaleVersion?: string | null;
  scoreNumeric?: number | null;
  scoreText?: string | null;
  classification?: string | null;
  interpretation?: string | null;
  clinicalColor?: ClinicalColor | null;
  appliedAt: Date | string;
  consultationOccurredAt?: Date | string;
  consultationCreatedAt?: Date | string;
  sourceCitation?: string | null;
  definitionHash?: string | null;
}

/**
 * Marco clínico explicitamente documentado. O gráfico pode associá-lo
 * temporalmente a uma inflexão, mas nunca o transforma automaticamente em
 * causa da mudança funcional/intrínseca.
 */
export interface CapacityTimelineMilestone {
  patientId: string;
  consultationId: string;
  title: string;
  note?: string | null;
  recordedAt: Date | string;
  source: "problem-origin" | "problem-event";
}

export interface CapacityDimensionCellAssessment {
  assessmentId?: string;
  scaleCode: string;
  scaleName: string;
  scaleVersion: string;
  scoreNumeric?: number | null;
  scoreText?: string | null;
  classification?: string | null;
  interpretation?: string | null;
  clinicalColor: ClinicalColor | null;
  role: CapacityEvidenceRole;
  mappingStrength: ConstructMappingStrength;
  basis: DomainEvidenceBasis;
  canClassifyDomain: boolean;
  selectedForDomainState: boolean;
  rationale: string;
  sourceCitation?: string | null;
  definitionHash?: string | null;
}

export interface CapacityDimensionCell {
  consultationId: string;
  status: CapacityDimensionStatus;
  statusReason: string;
  evidenceBasis?: DomainEvidenceBasis;
  comparabilityKey?: string;
  assessments: CapacityDimensionCellAssessment[];
}

export interface CapacityDimensionRow {
  code: CapacityDimensionCode;
  label: string;
  framework: "functional-capacity" | "intrinsic-capacity";
  cells: CapacityDimensionCell[];
}

export interface CapacityInflectionPoint {
  consultationId: string;
  occurredAt: string;
  dimensionCode: CapacityDimensionCode;
  dimensionLabel: string;
  previousConsultationId: string;
  fromStatus: CapacityComparableStatus;
  toStatus: CapacityComparableStatus;
  direction: "worsened" | "improved";
  comparabilityKey: string;
  milestones: Array<{
    title: string;
    note?: string;
    source: CapacityTimelineMilestone["source"];
  }>;
}

export interface CapacityDimensionHistory {
  patientId: string;
  methodologyVersion: typeof INTRINSIC_CAPACITY_MODEL_VERSION;
  frameworkLabel: string;
  methodologyNote: string;
  consultations: Array<{
    id: string;
    occurredAt: string;
    isTarget: boolean;
  }>;
  dimensions: CapacityDimensionRow[];
  inflectionPoints: CapacityInflectionPoint[];
  hasAssessmentData: boolean;
  hasLongitudinalHistoryData?: boolean;
  hasLongitudinalTrendData: boolean;
}

export const CAPACITY_DIMENSIONS: readonly {
  code: CapacityDimensionCode;
  label: string;
  framework: CapacityDimensionRow["framework"];
}[] = [
  { code: "funcionalidade", label: "Independência funcional", framework: "functional-capacity" },
  { code: "locomocao", label: "Locomoção", framework: "intrinsic-capacity" },
  { code: "cognicao", label: "Cognição", framework: "intrinsic-capacity" },
  { code: "psicologico", label: "Capacidade psicológica", framework: "intrinsic-capacity" },
  { code: "vitalidade", label: "Vitalidade", framework: "intrinsic-capacity" },
  { code: "sensorial", label: "Capacidade sensorial", framework: "intrinsic-capacity" },
] as const;

function timestamp(value: Date | string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : fallback;
}

function mappedColorStatus(color: ClinicalColor | null): CapacityComparableStatus | "recorded" {
  if (color === "vermelho") return "altered";
  if (color === "amarelo") return "attention";
  if (color === "verde") return "preserved";
  return "recorded";
}

function statusFromAssessments(assessments: CapacityDimensionCellAssessment[]): {
  status: CapacityDimensionStatus;
  statusReason: string;
  evidenceBasis?: DomainEvidenceBasis;
  comparabilityKey?: string;
  selectedScaleCodes: Set<string>;
} {
  if (assessments.length === 0) {
    return {
      status: "not-assessed",
      statusReason: "Nenhum instrumento metodologicamente mapeado foi registrado nesta consulta.",
      selectedScaleCodes: new Set<string>(),
    };
  }

  const eligible = assessments.filter((item) => item.canClassifyDomain);
  if (eligible.length === 0) {
    return {
      status: "recorded",
      statusReason: "Há informação clínica relacionada, mas nenhum instrumento desta consulta possui regra v1 para definir o estado do domínio.",
      evidenceBasis: "context",
      selectedScaleCodes: new Set<string>(),
    };
  }

  const highestPriority = Math.max(...eligible.map((item) => evidenceRolePriority(item.role)));
  const selected = eligible.filter((item) => evidenceRolePriority(item.role) === highestPriority);
  const selectedScaleCodes = new Set(selected.map((item) => item.scaleCode));
  const selectedStatuses = new Set(selected.map((item) => mappedColorStatus(item.clinicalColor)));
  const evidenceBasis = selected[0]?.basis;

  if (selectedStatuses.size > 1) {
    return {
      status: "indeterminate",
      statusReason: `Instrumentos de mesma prioridade metodológica apresentaram resultados discordantes: ${selected.map((item) => item.scaleName).join(", ")}.`,
      evidenceBasis,
      selectedScaleCodes,
    };
  }

  const onlyStatus = [...selectedStatuses][0] ?? "recorded";
  if (onlyStatus === "recorded") {
    return {
      status: "recorded",
      statusReason: "O instrumento foi registrado, mas sua classificação persistida não permite estado categórico comparável.",
      evidenceBasis,
      selectedScaleCodes,
    };
  }

  const allScreening = selected.every((item) => item.role === "screening");
  if (allScreening) {
    if (onlyStatus === "preserved") {
      return {
        status: "recorded",
        statusReason: "Rastreio sem sinal de redução; resultado negativo não é usado para afirmar preservação de todo o domínio.",
        evidenceBasis: "screening",
        selectedScaleCodes,
      };
    }
    return {
      status: "attention",
      statusReason: "Rastreio positivo: sinal de atenção que requer avaliação complementar; não confirma redução do domínio.",
      evidenceBasis: "screening",
      comparabilityKey: selected.length === 1
        ? `${selected[0]!.scaleCode}@${selected[0]!.scaleVersion}`
        : undefined,
      selectedScaleCodes,
    };
  }

  const comparabilityKey = selected.length === 1
    ? `${selected[0]!.scaleCode}@${selected[0]!.scaleVersion}`
    : undefined;
  const basisLabel = evidenceBasis === "proxy"
    ? "indicador proxy operacional"
    : "instrumento com regra metodológica aplicável";

  return {
    status: onlyStatus,
    statusReason: selected.length === 1
      ? `Estado derivado de ${selected[0]!.scaleName} (${basisLabel}), preservando resultado, versão e regra de origem.`
      : `Estado convergente entre instrumentos de mesma prioridade (${selected.map((item) => item.scaleName).join(", ")}); sem chave única de comparabilidade longitudinal.`,
    evidenceBasis,
    comparabilityKey,
    selectedScaleCodes,
  };
}

function isComparableStatus(status: CapacityDimensionStatus): status is CapacityComparableStatus {
  return status === "preserved" || status === "attention" || status === "altered";
}

function comparableRank(status: CapacityComparableStatus): number {
  if (status === "preserved") return 3;
  if (status === "attention") return 2;
  return 1;
}

function effectiveAssessments(assessments: readonly CapacityTimelineAssessment[]): CapacityTimelineAssessment[] {
  const latest = new Map<string, CapacityTimelineAssessment>();
  for (const assessment of assessments) {
    if (!isCapacityScale(assessment.scaleCode)) continue;
    const key = `${assessment.consultationId}:${assessment.scaleCode}`;
    const previous = latest.get(key);
    if (!previous || timestamp(assessment.appliedAt) >= timestamp(previous.appliedAt)) latest.set(key, assessment);
  }
  return [...latest.values()];
}

function derivedConsultations(
  patientId: string,
  assessments: readonly CapacityTimelineAssessment[],
): CapacityTimelineConsultation[] {
  const byId = new Map<string, CapacityTimelineConsultation>();
  for (const assessment of assessments) {
    if (assessment.patientId !== patientId) continue;
    const occurredAt = assessment.consultationOccurredAt ?? assessment.appliedAt;
    const createdAt = assessment.consultationCreatedAt ?? assessment.appliedAt;
    const previous = byId.get(assessment.consultationId);
    if (!previous || timestamp(occurredAt) < timestamp(previous.occurredAt)) {
      byId.set(assessment.consultationId, {
        id: assessment.consultationId,
        patientId,
        occurredAt,
        createdAt,
      });
    }
  }
  return [...byId.values()];
}

function normalizedMilestones(
  milestones: readonly CapacityTimelineMilestone[],
): Map<string, CapacityTimelineMilestone[]> {
  const byConsultation = new Map<string, CapacityTimelineMilestone[]>();
  const seen = new Set<string>();
  for (const milestone of [...milestones].sort((left, right) => timestamp(left.recordedAt) - timestamp(right.recordedAt))) {
    const title = milestone.title.trim();
    const note = milestone.note?.trim() || undefined;
    if (!title) continue;
    const key = `${milestone.consultationId}:${title.toLocaleLowerCase("pt-BR")}:${note?.toLocaleLowerCase("pt-BR") ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const current = byConsultation.get(milestone.consultationId) ?? [];
    current.push({ ...milestone, title, note });
    byConsultation.set(milestone.consultationId, current);
  }
  return byConsultation;
}

function buildInflectionPoints(
  consultations: CapacityDimensionHistory["consultations"],
  dimensions: CapacityDimensionRow[],
  milestones: readonly CapacityTimelineMilestone[],
): CapacityInflectionPoint[] {
  const milestoneByConsultation = normalizedMilestones(milestones);
  const consultationById = new Map(consultations.map((item) => [item.id, item]));
  const points: CapacityInflectionPoint[] = [];

  for (const dimension of dimensions) {
    let previous: {
      consultationId: string;
      status: CapacityComparableStatus;
      comparabilityKey: string;
    } | undefined;

    for (const cell of dimension.cells) {
      if (!isComparableStatus(cell.status) || !cell.comparabilityKey) {
        previous = undefined;
        continue;
      }

      if (previous && previous.comparabilityKey === cell.comparabilityKey && previous.status !== cell.status) {
        const currentRank = comparableRank(cell.status);
        const previousRank = comparableRank(previous.status);
        const consultation = consultationById.get(cell.consultationId);
        if (consultation) {
          points.push({
            consultationId: cell.consultationId,
            occurredAt: consultation.occurredAt,
            dimensionCode: dimension.code,
            dimensionLabel: dimension.label,
            previousConsultationId: previous.consultationId,
            fromStatus: previous.status,
            toStatus: cell.status,
            direction: currentRank < previousRank ? "worsened" : "improved",
            comparabilityKey: cell.comparabilityKey,
            milestones: (milestoneByConsultation.get(cell.consultationId) ?? []).slice(0, 3).map((item) => ({
              title: item.title,
              note: item.note || undefined,
              source: item.source,
            })),
          });
        }
      }

      previous = {
        consultationId: cell.consultationId,
        status: cell.status,
        comparabilityKey: cell.comparabilityKey,
      };
    }
  }

  return points.sort((left, right) =>
    timestamp(left.occurredAt) - timestamp(right.occurredAt)
    || CAPACITY_DIMENSIONS.findIndex((item) => item.code === left.dimensionCode)
      - CAPACITY_DIMENSIONS.findIndex((item) => item.code === right.dimensionCode));
}

function hasDrawableLongitudinalTrend(dimensions: readonly CapacityDimensionRow[]): boolean {
  return dimensions.some((dimension) => {
    let previousKey: string | undefined;
    for (const cell of dimension.cells) {
      if (!isComparableStatus(cell.status) || !cell.comparabilityKey) {
        previousKey = undefined;
        continue;
      }
      if (previousKey === cell.comparabilityKey) return true;
      previousKey = cell.comparabilityKey;
    }
    return false;
  });
}

function hasRepeatedDimensionHistory(dimensions: readonly CapacityDimensionRow[]): boolean {
  return dimensions.some(
    (dimension) => dimension.cells.filter((cell) => cell.assessments.length > 0).length >= 2,
  );
}

/**
 * Decide se o gráfico deve permanecer visível depois que um domínio recebeu
 * resultados em pelo menos duas consultas.
 *
 * A propriedade é opcional para manter compatibilidade com snapshots gerados
 * antes desta regra. Nesses snapshots, o estado é reconstruído a partir das
 * células persistidas, sem criar comparabilidade nem conectar pontos.
 */
export function hasDisplayableLongitudinalHistory(
  history: Pick<CapacityDimensionHistory, "dimensions" | "hasLongitudinalHistoryData">,
): boolean {
  return history.hasLongitudinalHistoryData
    ?? hasRepeatedDimensionHistory(history.dimensions);
}

export function buildCapacityDimensionHistory(input: {
  patientId: string;
  assessments: readonly CapacityTimelineAssessment[];
  consultations?: readonly CapacityTimelineConsultation[];
  milestones?: readonly CapacityTimelineMilestone[];
  targetConsultationId?: string;
  includeTargetWhenEmpty?: boolean;
}): CapacityDimensionHistory {
  if (input.assessments.some((item) => item.patientId !== input.patientId)) {
    throw new Error("Gráfico de capacidade não pode misturar avaliações de pacientes diferentes.");
  }
  if (input.consultations?.some((item) => item.patientId !== input.patientId)) {
    throw new Error("Gráfico de capacidade não pode misturar consultas de pacientes diferentes.");
  }
  if (input.milestones?.some((item) => item.patientId !== input.patientId)) {
    throw new Error("Gráfico de capacidade não pode misturar marcos clínicos de pacientes diferentes.");
  }

  const effective = effectiveAssessments(input.assessments);
  const consultationSource = input.consultations
    ? [...input.consultations]
    : derivedConsultations(input.patientId, effective);

  // Quando o chamador fornece o horizonte de consultas, todas as visitas são
  // preservadas no eixo. Uma consulta sem instrumento pertinente é missing
  // explícito, não ausência de visita e nunca estabilidade implícita.
  const consultations = consultationSource
    .sort((left, right) =>
      timestamp(left.occurredAt) - timestamp(right.occurredAt)
      || timestamp(left.createdAt) - timestamp(right.createdAt)
      || left.id.localeCompare(right.id))
    .map((item) => ({
      id: item.id,
      occurredAt: new Date(item.occurredAt).toISOString(),
      isTarget: item.id === input.targetConsultationId,
    }));

  const byConsultation = new Map<string, CapacityTimelineAssessment[]>();
  for (const assessment of effective) {
    const items = byConsultation.get(assessment.consultationId) ?? [];
    items.push(assessment);
    byConsultation.set(assessment.consultationId, items);
  }

  const dimensions: CapacityDimensionRow[] = CAPACITY_DIMENSIONS.map((dimension) => ({
    ...dimension,
    cells: consultations.map((consultation) => {
      const assessments = (byConsultation.get(consultation.id) ?? [])
        .filter((assessment) => scaleDomains(assessment.scaleCode).includes(dimension.code))
        .map((assessment): CapacityDimensionCellAssessment => {
          const catalog = scaleCatalogEntry(assessment.scaleCode);
          const methodology = methodologyForScaleInDomain(assessment.scaleCode, dimension.code);
          if (!methodology) {
            throw new Error(`Instrumento ${assessment.scaleCode} sem regra metodológica para ${dimension.code}.`);
          }
          return {
            assessmentId: assessment.id,
            scaleCode: assessment.scaleCode,
            scaleName: catalog.name,
            scaleVersion: assessment.scaleVersion ?? catalog.version,
            scoreNumeric: assessment.scoreNumeric,
            scoreText: assessment.scoreText,
            classification: assessment.classification,
            interpretation: assessment.interpretation,
            clinicalColor: assessment.clinicalColor ?? null,
            role: methodology.role,
            mappingStrength: methodology.mappingStrength,
            basis: methodology.basis,
            canClassifyDomain: methodology.canClassifyDomain,
            selectedForDomainState: false,
            rationale: methodology.rationale,
            sourceCitation: assessment.sourceCitation ?? catalog.source,
            definitionHash: assessment.definitionHash,
          };
        })
        .sort((left, right) => left.scaleName.localeCompare(right.scaleName, "pt-BR"));

      const derived = statusFromAssessments(assessments);
      for (const assessment of assessments) {
        assessment.selectedForDomainState = derived.selectedScaleCodes.has(assessment.scaleCode)
          && assessment.canClassifyDomain;
      }

      return {
        consultationId: consultation.id,
        status: derived.status,
        statusReason: derived.statusReason,
        evidenceBasis: derived.evidenceBasis,
        comparabilityKey: derived.comparabilityKey,
        assessments,
      };
    }),
  }));

  const inflectionPoints = buildInflectionPoints(
    consultations,
    dimensions,
    input.milestones ?? [],
  );

  return {
    patientId: input.patientId,
    methodologyVersion: INTRINSIC_CAPACITY_MODEL_VERSION,
    frameworkLabel: "Independência funcional + capacidade intrínseca (OMS: locomoção, cognição, capacidade psicológica, vitalidade e sensorial)",
    methodologyNote: "Representação categórica auditável; não é escore composto. Linhas só conectam avaliações comparáveis do mesmo instrumento e versão. Vitalidade v1 usa MNA-SF como indicador nutricional proxy, não como equivalente ao construto fisiológico completo.",
    consultations,
    dimensions,
    inflectionPoints,
    hasAssessmentData: effective.length > 0,
    hasLongitudinalHistoryData: hasRepeatedDimensionHistory(dimensions),
    hasLongitudinalTrendData: hasDrawableLongitudinalTrend(dimensions),
  };
}
