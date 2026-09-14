import { NextResponse } from "next/server";
import {
  buildCognitiveDomainSnapshot,
  synthesizeCognitiveEtiology,
  type CognitiveScaleInput,
  type DementiaInterpretationForProfile,
} from "@/domain/cognitive-domain-profile";
import { scaleConsultationHorizonIds } from "@/domain/scale-consultation-horizon";
import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import { prisma } from "@/server/db";

const COGNITIVE_SCALE_CODES = [
  "meem",
  "moca",
  "meem_freitas",
  "moca_br_freitas",
  "clock_shulman",
  "clock",
  "relogio",
  "verbal_fluency_animals",
] as const;

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function asDementiaInterpretation(value: unknown): DementiaInterpretationForProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const pathway = typeof record.pathway === "string" ? record.pathway : undefined;
  const rawHypotheses = Array.isArray(record.hypotheses) ? record.hypotheses : [];
  const hypotheses = rawHypotheses.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const hypothesis = item as Record<string, unknown>;
    const support = hypothesis.support;
    const supportLevel: "LOW" | "MODERATE" | "HIGH" | null =
      support === "LOW"
        ? "LOW"
        : support === "MODERATE"
          ? "MODERATE"
          : support === "HIGH"
            ? "HIGH"
            : null;
    if (
      typeof hypothesis.etiology !== "string"
      || typeof hypothesis.label !== "string"
      || supportLevel === null
    ) return [];
    return [{
      etiology: hypothesis.etiology,
      label: hypothesis.label,
      support: supportLevel,
      supporting: Array.isArray(hypothesis.supporting) ? hypothesis.supporting.filter((entry): entry is string => typeof entry === "string") : [],
      limiting: Array.isArray(hypothesis.limiting) ? hypothesis.limiting.filter((entry): entry is string => typeof entry === "string") : [],
    }];
  });
  return { ...(pathway ? { pathway } : {}), hypotheses };
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "CONSULTATION_NOT_FOUND") {
    return json({ code, message: "Consulta não encontrada." }, 404);
  }
  return json(
    { code: "COGNITIVE_PROFILE_FAILED", message: "Não foi possível consolidar o perfil cognitivo." },
    500,
  );
}

async function buildProfileResponse(id: string) {
  try {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        occurredAt: true,
        createdAt: true,
        patient: { select: { baselineConsultationId: true } },
      },
    });
    if (!consultation) throw new Error("CONSULTATION_NOT_FOUND");

    const consultations = await prisma.consultation.findMany({
      where: { patientId: consultation.patientId },
      select: { id: true, patientId: true, occurredAt: true, createdAt: true },
    });
    const horizonIds = scaleConsultationHorizonIds({
      patientId: consultation.patientId,
      targetConsultationId: id,
      consultations,
    });
    const horizon = new Set(horizonIds);

    const assessments = await prisma.scaleAssessment.findMany({
      where: {
        patientId: consultation.patientId,
        consultationId: { in: horizonIds },
        scaleCode: { in: [...COGNITIVE_SCALE_CODES] },
      },
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
      select: {
        consultationId: true,
        scaleCode: true,
        scaleVersion: true,
        answers: true,
        scoreNumeric: true,
        scoreText: true,
        classification: true,
        interpretation: true,
        appliedAt: true,
      },
    });

    const byConsultation = new Map<string, CognitiveScaleInput[]>();
    for (const item of assessments) {
      const current = byConsultation.get(item.consultationId) ?? [];
      current.push({
        scaleCode: item.scaleCode,
        scaleVersion: item.scaleVersion,
        answers: item.answers,
        scoreNumeric: item.scoreNumeric === null ? null : Number(item.scoreNumeric),
        scoreText: item.scoreText,
        classification: item.classification,
        interpretation: item.interpretation,
        appliedAt: item.appliedAt.toISOString(),
      });
      byConsultation.set(item.consultationId, current);
    }

    const sortedConsultations = consultations
      .filter((item) => horizon.has(item.id))
      .sort((a, b) => {
        const byOccurredAt = b.occurredAt.getTime() - a.occurredAt.getTime();
        return byOccurredAt !== 0 ? byOccurredAt : b.createdAt.getTime() - a.createdAt.getTime();
      });
    const currentIndex = sortedConsultations.findIndex((item) => item.id === id);
    const previousConsultation = currentIndex >= 0
      ? sortedConsultations.slice(currentIndex + 1).find((item) => (byConsultation.get(item.id)?.length ?? 0) > 0)
      : undefined;
    const baselineId = consultation.patient.baselineConsultationId;

    const snapshotFor = (consultationId: string | null | undefined) => {
      if (!consultationId || !horizon.has(consultationId)) return null;
      const scaleInputs = byConsultation.get(consultationId) ?? [];
      if (scaleInputs.length === 0) return null;
      const consultationMeta = consultations.find((item) => item.id === consultationId);
      return {
        consultationId,
        occurredAt: consultationMeta?.occurredAt.toISOString() ?? null,
        snapshot: buildCognitiveDomainSnapshot(scaleInputs),
      };
    };

    const current = snapshotFor(id);
    const previous = snapshotFor(previousConsultation?.id);
    const baseline = snapshotFor(baselineId);

    const dementiaAssessment = await prisma.cognitiveDiagnosticAssessment.findFirst({
      where: { patientId: consultation.patientId, consultationId: id },
      orderBy: { version: "desc" },
      select: { interpretation: true },
    });
    const dementiaInterpretation = asDementiaInterpretation(dementiaAssessment?.interpretation);
    const etiology = current
      ? synthesizeCognitiveEtiology(current.snapshot, dementiaInterpretation)
      : synthesizeCognitiveEtiology(buildCognitiveDomainSnapshot([]), dementiaInterpretation);

    return json({
      consultationId: id,
      current,
      previous,
      baseline,
      etiology,
      sourceNote: "Perfil cognitivo descritivo derivado dos dados estruturados já registrados. Subtotais ausentes nunca são inferidos a partir do escore global.",
    });
  } catch (error) {
    return failure(error);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => buildProfileResponse(id));
}
