import { notFound } from "next/navigation";
import { buildProblemCapacityMilestones } from "@/domain/capacity-timeline-milestones";
import type { CapacityTimelineMilestone } from "@/domain/capacity-dimension-history";
import { buildOncogeriatricCapacityHistory } from "@/domain/oncogeriatria/capacity-history";
import { isOncogeriatriaEnabled } from "@/domain/oncogeriatria/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

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
  });
}

export async function resolveOncogeriatricEpisode(patientId: string, requestedEpisodeId?: string | null) {
  const episode = requestedEpisodeId
    ? await prisma.oncogeriatricEpisode.findFirst({ where: { id: requestedEpisodeId, patientId } })
    : await prisma.oncogeriatricEpisode.findFirst({ where: { patientId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
  return episode;
}

export async function loadEpisodeWorkspace(patientId: string, episodeId: string) {
  const [courses, checkpoints, interventions, toxicities, recovery, consultations, scaleAssessments, problems] = await Promise.all([
    prisma.oncogeriatricTreatmentCourse.findMany({ where: { patientId, episodeId }, orderBy: [{ actualStartAt: "desc" }, { createdAt: "desc" }] }),
    prisma.oncogeriatricCheckpoint.findMany({ where: { patientId, episodeId }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] }),
    prisma.oncogeriatricIntervention.findMany({ where: { patientId, episodeId }, orderBy: { createdAt: "desc" } }),
    prisma.oncogeriatricToxicityEvent.findMany({ where: { patientId, episodeId }, orderBy: { occurredAt: "desc" } }),
    prisma.oncogeriatricRecoveryAssessment.findMany({ where: { patientId, episodeId }, orderBy: { assessedAt: "desc" } }),
    prisma.consultation.findMany({
      where: { patientId },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { id: true, patientId: true, occurredAt: true, createdAt: true, status: true },
    }),
    prisma.scaleAssessment.findMany({
      where: { patientId },
      orderBy: { appliedAt: "asc" },
      select: {
        id: true,
        patientId: true,
        scaleCode: true,
        scaleVersion: true,
        scoreNumeric: true,
        scoreText: true,
        classification: true,
        interpretation: true,
        answers: true,
        clinicalColor: true,
        appliedAt: true,
        consultationId: true,
        scaleDefinition: {
          select: {
            sourceCitation: true,
            definitionHash: true,
          },
        },
      },
    }),
    prisma.clinicalProblem.findMany({
      where: { patientId },
      select: {
        patientId: true,
        originConsultationId: true,
        title: true,
        description: true,
        createdAt: true,
        events: {
          orderBy: { createdAt: "asc" },
          select: { patientId: true, consultationId: true, note: true, createdAt: true },
        },
      },
    }),
  ]);
  const linkedConsultationIds = checkpoints.flatMap((checkpoint) => checkpoint.consultationId ? [checkpoint.consultationId] : []);
  const problemMilestones = buildProblemCapacityMilestones({ patientId, problems, consultationIds: linkedConsultationIds });
  const checkpointById = new Map(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
  const oncologyMilestones: CapacityTimelineMilestone[] = toxicities.flatMap((toxicity) => {
    const consultationId = toxicity.checkpointId ? checkpointById.get(toxicity.checkpointId)?.consultationId : null;
    if (!consultationId) return [];
    const details = [toxicity.grade ? `grau ${toxicity.grade}` : null, toxicity.consequences].filter(Boolean).join(" · ");
    return [{
      patientId,
      consultationId,
      title: toxicity.hospitalizationAssociated ? "Hospitalização associada a toxicidade" : `Toxicidade: ${toxicity.toxicityType}`,
      note: details || undefined,
      recordedAt: toxicity.occurredAt,
      source: "oncology-event" as const,
    }];
  });
  return { courses, checkpoints, interventions, toxicities, recovery, consultations, scaleAssessments, problemMilestones: [...problemMilestones, ...oncologyMilestones] };
}

export type OncogeriatricEpisodeWorkspace = Awaited<ReturnType<typeof loadEpisodeWorkspace>>;

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
