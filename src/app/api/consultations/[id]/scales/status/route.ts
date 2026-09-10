import { NextResponse } from "next/server";
import { consultationHorizon } from "@/domain/as-of-consultation";
import { latestPreviousScaleAssessments } from "@/domain/previous-scale-assessments";
import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import { prisma } from "@/server/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, async () => {
    try {
      const consultation = await prisma.consultation.findUnique({
        where: { id },
        select: { id: true, patientId: true, status: true, occurredAt: true, createdAt: true },
      });
      if (!consultation) {
        return NextResponse.json({ code: "CONSULTATION_NOT_FOUND", message: "Consulta não encontrada." }, { status: 404 });
      }

      const patientConsultations = await prisma.consultation.findMany({
        where: { patientId: consultation.patientId, occurredAt: { lte: consultation.occurredAt } },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
        select: { id: true, patientId: true, occurredAt: true, createdAt: true },
      });
      const horizon = consultationHorizon({
        patientId: consultation.patientId,
        targetConsultationId: consultation.id,
        consultations: patientConsultations,
      });
      const consultationIds = horizon.map((item) => item.id);
      const assessments = await prisma.scaleAssessment.findMany({
        where: { consultationId: { in: consultationIds }, patientId: consultation.patientId },
        orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          patientId: true,
          consultationId: true,
          scaleCode: true,
          scaleVersion: true,
          scoreNumeric: true,
          scoreText: true,
          classification: true,
          interpretation: true,
          clinicalColor: true,
          appliedAt: true,
        },
      });

      const latestByCode = new Map<string, (typeof assessments)[number]>();
      for (const assessment of assessments.filter((item) => item.consultationId === consultation.id)) {
        if (!latestByCode.has(assessment.scaleCode)) latestByCode.set(assessment.scaleCode, assessment);
      }
      const previous = latestPreviousScaleAssessments({
        patientId: consultation.patientId,
        targetConsultationId: consultation.id,
        consultationIds,
        assessments: assessments.map((assessment) => ({
          ...assessment,
          scoreNumeric: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
        })),
      });

      return NextResponse.json({
        consultationId: consultation.id,
        consultationStatus: consultation.status,
        latest: [...latestByCode.values()].map((assessment) => ({
          ...assessment,
          scoreNumeric: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
          appliedAt: assessment.appliedAt.toISOString(),
        })),
        previous: previous.map((assessment) => ({
          assessmentId: assessment.id,
          consultationId: assessment.consultationId,
          scaleCode: assessment.scaleCode,
          scaleVersion: assessment.scaleVersion,
          scoreNumeric: assessment.scoreNumeric,
          scoreText: assessment.scoreText,
          classification: assessment.classification,
          appliedAt: new Date(assessment.appliedAt).toISOString(),
        })),
      });
    } catch {
      return NextResponse.json({
        code: "CLINICAL_SCALE_STATUS_FAILED",
        message: "Não foi possível carregar o estado das escalas desta consulta.",
      }, { status: 500 });
    }
  });
}
