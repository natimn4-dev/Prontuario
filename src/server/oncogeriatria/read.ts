import { notFound } from "next/navigation";
import { buildProblemCapacityMilestones } from "@/domain/capacity-timeline-milestones";
import type { CapacityTimelineMilestone } from "@/domain/capacity-dimension-history";
import { buildOncogeriatricCapacityHistory } from "@/domain/oncogeriatria/capacity-history";
import { isOncogeriatriaEnabled } from "@/domain/oncogeriatria/feature";
import { buildOncogeriatricTemporalMarkers } from "@/domain/oncogeriatria/temporal-markers";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

export type OncogeriatricWorkspaceProjection =
  | "overview"
  | "baseline"
  | "check"
  | "scales"
  | "treatment"
  | "post-treatment"
  | "longitudinal"
  | "report";

interface ProjectionNeeds {
  checkpoints: boolean;
  courses: boolean;
  interventions: boolean;
  toxicities: boolean;
  recovery: boolean;
  consultations: "none" | "linked" | "all";
  scales: boolean;
  problems: boolean;
}

const PROJECTION_NEEDS: Record<OncogeriatricWorkspaceProjection, ProjectionNeeds> = {
  overview: { checkpoints: true, courses: true, interventions: false, toxicities: true, recovery: false, consultations: "linked", scales: true, problems: true },
  baseline: { checkpoints: true, courses: true, interventions: false, toxicities: false, recovery: false, consultations: "all", scales: true, problems: true },
  check: { checkpoints: true, courses: true, interventions: false, toxicities: true, recovery: false, consultations: "all", scales: true, problems: true },
  scales: { checkpoints: true, courses: false, interventions: false, toxicities: false, recovery: false, consultations: "all", scales: false, problems: false },
  treatment: { checkpoints: false, courses: true, interventions: false, toxicities: false, recovery: false, consultations: "all", scales: false, problems: false },
  "post-treatment": { checkpoints: true, courses: false, interventions: false, toxicities: false, recovery: true, consultations: "all", scales: true, problems: true },
  longitudinal: { checkpoints: true, courses: true, interventions: true, toxicities: true, recovery: true, consultations: "linked", scales: true, problems: true },
  report: { checkpoints: true, courses: true, interventions: true, toxicities: true, recovery: true, consultations: "linked", scales: true, problems: true },
};

export const ONCOGERIATRIC_WORKSPACE_QUERY_BUDGET: Record<OncogeriatricWorkspaceProjection, number> = {
  overview: 6,
  baseline: 5,
  check: 6,
  scales: 2,
  treatment: 2,
  "post-treatment": 5,
  longitudinal: 8,
  report: 8,
};

export async function requireOncogeriatricReadAccess() {
  const auth = await requireAuthenticatedUser("patient.read");
  if (!isOncogeriatriaEnabled(process.env.ONCOGERIATRIA_EMERGENCY_DISABLED)) notFound();
  return auth;
}

export async function loadOncogeriatricPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, fullName: true, birthDate: true, sex: true },
  });
  if (!patient) notFound();
  return patient;
}

export async function loadOncogeriatricEpisodes(patientId: string) {
  return prisma.oncogeriatricEpisode.findMany({
    where: { patientId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, patientId: true, status: true, diagnosis: true, primarySite: true, histology: true, stage: true, diagnosedAt: true, diseaseStatus: true, notes: true, createdAt: true, updatedAt: true },
  });
}

export async function resolveOncogeriatricEpisode(patientId: string, requestedEpisodeId?: string | null) {
  const select = { id: true, patientId: true, status: true, diagnosis: true, primarySite: true, histology: true, stage: true, diagnosedAt: true, diseaseStatus: true, notes: true, createdAt: true, updatedAt: true } as const;
  return requestedEpisodeId
    ? prisma.oncogeriatricEpisode.findFirst({ where: { id: requestedEpisodeId, patientId }, select })
    : prisma.oncogeriatricEpisode.findFirst({ where: { patientId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], select });
}

export async function loadEpisodeWorkspace(
  patientId: string,
  episodeId: string,
  projection: OncogeriatricWorkspaceProjection,
) {
  const needs = PROJECTION_NEEDS[projection];

  const checkpoints = needs.checkpoints ? await prisma.oncogeriatricCheckpoint.findMany({
    where: { patientId, episodeId },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true, patientId: true, episodeId: true, treatmentCourseId: true, consultationId: true,
      type: true, cycleNumber: true, occurredAt: true, scheduledAt: true, status: true,
      structuredData: true, g8AssessmentId: true, cargAssessmentId: true, revision: true,
      cargDraft: true, cargCompletionCount: true, cargPendingFields: true, cargLabProvenance: true,
      cargSavedById: true, cargSavedAt: true, createdAt: true, updatedAt: true,
    },
  }) : [];

  const linkedConsultationIds = [...new Set(checkpoints.flatMap((checkpoint) => checkpoint.consultationId ? [checkpoint.consultationId] : []))];
  const consultationWhere = needs.consultations === "all"
    ? { patientId }
    : { patientId, id: { in: linkedConsultationIds } };

  const [courses, interventions, toxicities, recovery, consultations, scaleAssessments, problems] = await Promise.all([
    needs.courses ? prisma.oncogeriatricTreatmentCourse.findMany({
      where: { patientId, episodeId }, orderBy: [{ actualStartAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, episodeId: true, patientId: true, modality: true, intent: true, therapyLine: true, regimenName: true, plannedCycles: true, plannedStartAt: true, actualStartAt: true, endedAt: true, status: true, riskFlags: true, notes: true, createdAt: true, updatedAt: true },
    }) : Promise.resolve([]),
    needs.interventions ? prisma.oncogeriatricIntervention.findMany({
      where: { patientId, episodeId }, orderBy: { createdAt: "desc" },
      select: { id: true, patientId: true, episodeId: true, checkpointId: true, consultationId: true, startedAt: true, domain: true, description: true, intervention: true, responsibleProfessional: true, dueAt: true, status: true, result: true, createdAt: true, updatedAt: true },
    }) : Promise.resolve([]),
    needs.toxicities ? prisma.oncogeriatricToxicityEvent.findMany({
      where: { patientId, episodeId }, orderBy: { occurredAt: "desc" },
      select: { id: true, patientId: true, episodeId: true, treatmentCourseId: true, checkpointId: true, consultationId: true, occurredAt: true, toxicityType: true, grade: true, consequences: true, hospitalizationAssociated: true, cycleDelayAssociated: true, treatmentModificationRecorded: true, createdAt: true, updatedAt: true },
    }) : Promise.resolve([]),
    needs.recovery ? prisma.oncogeriatricRecoveryAssessment.findMany({
      where: { patientId, episodeId }, orderBy: { assessedAt: "desc" },
      select: { id: true, patientId: true, episodeId: true, checkpointId: true, consultationId: true, domain: true, status: true, notes: true, assessedAt: true, createdAt: true, updatedAt: true },
    }) : Promise.resolve([]),
    needs.consultations !== "none" ? prisma.consultation.findMany({
      where: consultationWhere,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { id: true, patientId: true, occurredAt: true, createdAt: true, status: true },
    }) : Promise.resolve([]),
    needs.scales && linkedConsultationIds.length ? prisma.scaleAssessment.findMany({
      where: { patientId, consultationId: { in: linkedConsultationIds } },
      orderBy: { appliedAt: "asc" },
      select: {
        id: true, patientId: true, scaleCode: true, scaleVersion: true, scoreNumeric: true, scoreText: true,
        classification: true, interpretation: true, answers: true, clinicalColor: true, appliedAt: true, consultationId: true,
        scaleDefinition: { select: { sourceCitation: true, definitionHash: true } },
      },
    }) : Promise.resolve([]),
    needs.problems && linkedConsultationIds.length ? prisma.clinicalProblem.findMany({
      where: {
        patientId,
        OR: [
          { originConsultationId: { in: linkedConsultationIds } },
          { events: { some: { patientId, consultationId: { in: linkedConsultationIds } } } },
        ],
      },
      select: {
        patientId: true, originConsultationId: true, title: true, description: true, createdAt: true,
        events: {
          where: { patientId, consultationId: { in: linkedConsultationIds } },
          orderBy: { createdAt: "asc" },
          select: { patientId: true, consultationId: true, note: true, createdAt: true },
        },
      },
    }) : Promise.resolve([]),
  ]);

  const problemMilestones = needs.problems
    ? buildProblemCapacityMilestones({ patientId, problems, consultationIds: linkedConsultationIds })
    : [];

  const temporalMarkers = buildOncogeriatricTemporalMarkers({
    patientId,
    episodeId,
    courses,
    checkpoints,
    toxicities,
    interventions,
    recovery,
    problemMilestones,
  });

  const oncologyMilestones: CapacityTimelineMilestone[] = temporalMarkers.flatMap((marker) => marker.source !== "problem" && marker.consultationId ? [{
    patientId,
    consultationId: marker.consultationId,
    title: marker.title,
    note: marker.detail ?? undefined,
    recordedAt: new Date(marker.occurredAt),
    source: "oncology-event" as const,
  }] : []);

  return {
    projection,
    queryBudget: ONCOGERIATRIC_WORKSPACE_QUERY_BUDGET[projection],
    courses,
    checkpoints,
    interventions,
    toxicities,
    recovery,
    consultations,
    scaleAssessments,
    problemMilestones: [...problemMilestones, ...oncologyMilestones],
    temporalMarkers,
  };
}

export async function loadOncogeriatricAuthorNames(userIds: readonly string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true } });
  return new Map(users.map((user) => [user.id, user.name]));
}

export type OncogeriatricEpisodeWorkspace = Awaited<ReturnType<typeof loadEpisodeWorkspace>>;

export function selectOncogeriatricWorkingConsultation(
  workspace: OncogeriatricEpisodeWorkspace,
  preferredConsultationId?: string | null,
) {
  const preferred = preferredConsultationId
    ? workspace.consultations.find((consultation) => consultation.id === preferredConsultationId)
    : undefined;
  return (preferred?.status !== "FINALIZED" ? preferred : undefined)
    ?? workspace.consultations.find((consultation) => consultation.status !== "FINALIZED")
    ?? preferred
    ?? workspace.consultations[0]
    ?? null;
}

export function capacityHistoryForOncogeriatricEpisode(
  patientId: string,
  workspace: OncogeriatricEpisodeWorkspace,
) {
  return buildOncogeriatricCapacityHistory({
    patientId,
    checkpoints: workspace.checkpoints,
    consultations: workspace.consultations,
    assessments: workspace.scaleAssessments.map((assessment) => ({
      ...assessment,
      sourceCitation: assessment.scaleDefinition?.sourceCitation,
      definitionHash: assessment.scaleDefinition?.definitionHash,
    })),
    milestones: workspace.problemMilestones,
  });
}

export function formatClinicalDate(value: Date | null | undefined): string {
  return value ? new Intl.DateTimeFormat("pt-BR").format(value) : "Sem dados registrados";
}

export function readStructuredRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function hasRelevantCheckpointAlert(structuredData: unknown): boolean {
  const data = readStructuredRecord(structuredData);
  for (const sectionName of ["functional", "mobility", "nutrition", "cognition", "careEvents"]) {
    const section = readStructuredRecord(data[sectionName]);
    if (Object.values(section).some((value) => value === true)) return true;
  }
  return false;
}
