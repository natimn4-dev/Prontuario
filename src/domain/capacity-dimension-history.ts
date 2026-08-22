import type { ClinicalColor } from "./clinical-engine.ts";
import { scaleCatalogEntry } from "./scale-catalog.ts";

export type CapacityDimensionCode =
  | "funcionalidade"
  | "locomocao"
  | "cognicao"
  | "psicologico"
  | "vitalidade"
  | "sensorial";

export type CapacityDimensionStatus =
  | "not-assessed"
  | "recorded"
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
  patientId: string;
  consultationId: string;
  scaleCode: string;
  clinicalColor?: ClinicalColor | null;
  appliedAt: Date | string;
  consultationOccurredAt?: Date | string;
  consultationCreatedAt?: Date | string;
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
  scaleCode: string;
  scaleName: string;
  clinicalColor: ClinicalColor | null;
}

export interface CapacityDimensionCell {
  consultationId: string;
  status: CapacityDimensionStatus;
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
  milestones: Array<{
    title: string;
    note?: string;
    source: CapacityTimelineMilestone["source"];
  }>;
}

export interface CapacityDimensionHistory {
  patientId: string;
  frameworkLabel: string;
  consultations: Array<{
    id: string;
    occurredAt: string;
    isTarget: boolean;
  }>;
  dimensions: CapacityDimensionRow[];
  inflectionPoints: CapacityInflectionPoint[];
  hasAssessmentData: boolean;
}

export const CAPACITY_DIMENSIONS: readonly {
  code: CapacityDimensionCode;
  label: string;
  framework: CapacityDimensionRow["framework"];
}[] = [
  { code: "funcionalidade", label: "Capacidade funcional", framework: "functional-capacity" },
  { code: "locomocao", label: "Locomoção", framework: "intrinsic-capacity" },
  { code: "cognicao", label: "Cognição", framework: "intrinsic-capacity" },
  { code: "psicologico", label: "Capacidade psicológica", framework: "intrinsic-capacity" },
  { code: "vitalidade", label: "Vitalidade", framework: "intrinsic-capacity" },
  { code: "sensorial", label: "Capacidade sensorial", framework: "intrinsic-capacity" },
] as const;

/**
 * Mapeia instrumentos persistidos para capacidade funcional e para os cinco
 * domínios de capacidade intrínseca. O gráfico nunca soma ou normaliza escores
 * de instrumentos diferentes; ele representa apenas o estado registrado em
 * cada domínio/consulta.
 */
const SCALE_CAPACITY_DOMAINS: Readonly<Record<string, readonly CapacityDimensionCode[]>> = {
  katz: ["funcionalidade"],
  lawton: ["funcionalidade"],
  barthel: ["funcionalidade"],
  pfeffer: ["funcionalidade", "cognicao"],
  pfeffer10: ["funcionalidade", "cognicao"],
  ecog: ["funcionalidade"],
  kps: ["funcionalidade"],

  sppb: ["locomocao"],
  poma: ["locomocao"],
  sarcf: ["locomocao"],
  preensao: ["locomocao"],
  velocidade_marcha: ["locomocao"],
  sentar_levantar_5x: ["locomocao"],
  frail_br: ["locomocao", "vitalidade"],

  moca: ["cognicao"],
  meem: ["cognicao"],
  dez_cs: ["cognicao"],
  cam: ["cognicao"],
  fast: ["cognicao"],
  minicog_freitas: ["cognicao"],
  clock_shulman: ["cognicao"],
  moca_br_freitas: ["cognicao"],
  iqcode_br_26: ["cognicao"],

  gds15: ["psicologico"],
  cornell: ["psicologico"],
  cesd_br_elderly: ["psicologico"],
  isi: ["psicologico"],

  mna_sf: ["vitalidade"],

  audicao: ["sensorial"],
  hearing: ["sensorial"],
  visao: ["sensorial"],
  vision: ["sensorial"],
};

function timestamp(value: Date | string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : fallback;
}

function colorPriority(color: ClinicalColor | null): number {
  if (color === "vermelho") return 4;
  if (color === "amarelo") return 3;
  if (color === "cinza" || color === null) return 2;
  return 1;
}

function statusFromAssessments(assessments: CapacityDimensionCellAssessment[]): CapacityDimensionStatus {
  if (assessments.length === 0) return "not-assessed";
  const worst = assessments.reduce<ClinicalColor | null>((current, item) =>
    colorPriority(item.clinicalColor) > colorPriority(current) ? item.clinicalColor : current, "verde");
  if (worst === "vermelho") return "altered";
  if (worst === "amarelo") return "attention";
  if (worst === "verde") return "preserved";
  return "recorded";
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
    if (!(assessment.scaleCode in SCALE_CAPACITY_DOMAINS)) continue;
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
    let previous: { consultationId: string; status: CapacityComparableStatus } | undefined;
    for (const cell of dimension.cells) {
      if (!isComparableStatus(cell.status)) continue;
      if (previous && previous.status !== cell.status) {
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
            milestones: (milestoneByConsultation.get(cell.consultationId) ?? []).slice(0, 3).map((item) => ({
              title: item.title,
              note: item.note || undefined,
              source: item.source,
            })),
          });
        }
      }
      previous = { consultationId: cell.consultationId, status: cell.status };
    }
  }

  return points.sort((left, right) =>
    timestamp(left.occurredAt) - timestamp(right.occurredAt)
    || CAPACITY_DIMENSIONS.findIndex((item) => item.code === left.dimensionCode)
      - CAPACITY_DIMENSIONS.findIndex((item) => item.code === right.dimensionCode));
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
  const consultationsWithCapacityData = new Set(effective.map((item) => item.consultationId));

  const consultations = consultationSource
    .filter((item) => consultationsWithCapacityData.has(item.id)
      || Boolean(input.includeTargetWhenEmpty && input.targetConsultationId === item.id))
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
        .filter((assessment) => (SCALE_CAPACITY_DOMAINS[assessment.scaleCode] ?? []).includes(dimension.code))
        .map((assessment): CapacityDimensionCellAssessment => ({
          scaleCode: assessment.scaleCode,
          scaleName: scaleCatalogEntry(assessment.scaleCode).name,
          clinicalColor: assessment.clinicalColor ?? null,
        }))
        .sort((left, right) => left.scaleName.localeCompare(right.scaleName, "pt-BR"));
      return {
        consultationId: consultation.id,
        status: statusFromAssessments(assessments),
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
    frameworkLabel: "Capacidade funcional + capacidade intrínseca (OMS: locomoção, cognição, capacidade psicológica, vitalidade e sensorial)",
    consultations,
    dimensions,
    inflectionPoints,
    hasAssessmentData: effective.length > 0,
  };
}
