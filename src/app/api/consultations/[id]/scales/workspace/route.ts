import { NextResponse } from "next/server";
import {
  electronicScaleLicenseFlagsFromEnvironment,
  isElectronicScaleLicensed,
  unconfirmedElectronicScaleRestrictions,
} from "@/domain/clinical-config/electronic-scale-license-policy";
import { latestPreviousScaleAssessments } from "@/domain/previous-scale-assessments";
import { scaleConsultationHorizonIds } from "@/domain/scale-consultation-horizon";
import { hasAccessProfilePermission } from "@/domain/security/auth-policy";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { requireConsultationAccess } from "@/server/auth/patient-access";
import { prisma } from "@/server/db";
import { withClinicalPerformance } from "@/server/observability/clinical-performance";
import { FREITAS_CORE_DEFINITIONS } from "../freitas-core/route";
import { COMPLEMENTARY_SCALE_DEFINITIONS } from "../complementary/route";

type AssessmentRow = {
  id: string;
  patientId: string;
  consultationId: string;
  scaleCode: string;
  scaleVersion: string;
  answers: unknown;
  scoreNumeric: unknown;
  scoreText: string | null;
  classification: string | null;
  interpretation: string | null;
  clinicalColor: string | null;
  appliedAt: Date;
};

function serialized(row: AssessmentRow) {
  return {
    ...row,
    scoreNumeric: row.scoreNumeric === null ? null : Number(row.scoreNumeric),
    appliedAt: row.appliedAt.toISOString(),
  };
}

function latestByCode(rows: readonly AssessmentRow[]): Map<string, AssessmentRow> {
  const latest = new Map<string, AssessmentRow>();
  for (const row of rows) {
    if (!latest.has(row.scaleCode)) latest.set(row.scaleCode, row);
  }
  return latest;
}

function prefill(latest: Map<string, AssessmentRow>, code: string) {
  const row = latest.get(code);
  return row
    ? {
      assessmentId: row.id,
      scaleVersion: row.scaleVersion,
      score: row.scoreNumeric === null ? null : Number(row.scoreNumeric),
      appliedAt: row.appliedAt.toISOString(),
      consultationId: row.consultationId,
    }
    : null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withClinicalPerformance(request, "consultation.scales.workspace.read", async () => {
    try {
      const { id } = await context.params;
      const access = await requireConsultationAccess(id, "patient.read");
      const consultation = access.consultation;

      const consultations = await prisma.consultation.findMany({
        where: { patientId: consultation.patientId },
        select: { id: true, patientId: true, occurredAt: true, createdAt: true },
      });
      const consultationIds = scaleConsultationHorizonIds({
        patientId: consultation.patientId,
        targetConsultationId: consultation.id,
        consultations,
      });
      const coreDefinitions = FREITAS_CORE_DEFINITIONS.filter((definition) =>
        isElectronicScaleLicensed(definition.code, electronicScaleLicenseFlagsFromEnvironment(process.env)),
      );
      const complementaryDefinitions = COMPLEMENTARY_SCALE_DEFINITIONS;
      const codes = [
        ...coreDefinitions.map((definition) => definition.code),
        ...complementaryDefinitions.map((definition) => definition.code),
        "ecog",
        "crash_mna_sf",
      ];
      const assessments = await prisma.scaleAssessment.findMany({
        where: {
          patientId: consultation.patientId,
          consultationId: { in: consultationIds },
          scaleCode: { in: codes },
        },
        orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          patientId: true,
          consultationId: true,
          scaleCode: true,
          scaleVersion: true,
          answers: true,
          scoreNumeric: true,
          scoreText: true,
          classification: true,
          interpretation: true,
          clinicalColor: true,
          appliedAt: true,
        },
      }) as unknown as AssessmentRow[];
      const latest = latestByCode(assessments);
      const current = assessments.filter((assessment) => assessment.consultationId === consultation.id);
      const currentLatest = latestByCode(current);
      const previous = latestPreviousScaleAssessments({
        patientId: consultation.patientId,
        targetConsultationId: consultation.id,
        consultationIds,
        assessments: assessments.map((assessment) => ({
          ...assessment,
          scoreNumeric: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
        })),
      });
      const canWrite = hasAccessProfilePermission({
        role: access.user.role,
        professionalRole: access.user.professionalRole,
        canManageUsers: access.user.canManageUsers,
      }, "consultation.write");

      return NextResponse.json({
        consultationId: consultation.id,
        consultationStatus: consultation.status,
        core: {
          definitions: coreDefinitions,
          licensingRestrictions: unconfirmedElectronicScaleRestrictions(electronicScaleLicenseFlagsFromEnvironment(process.env)).map(({ code, name, reason }) => ({ code, name, reason })),
          latest: coreDefinitions.flatMap((definition) => {
            const row = latest.get(definition.code);
            return row ? [serialized(row)] : [];
          }),
        },
        complementary: {
          definitions: complementaryDefinitions,
          latest: complementaryDefinitions.flatMap((definition) => {
            const row = latest.get(definition.code);
            return row ? [serialized(row)] : [];
          }),
        },
        status: {
          latest: [...currentLatest.values()].map(serialized),
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
        },
        oncogeriatricPrefills: canWrite
          ? { meem: prefill(latest, "meem"), mnaSf: prefill(latest, "mna_sf"), ecog: prefill(latest, "ecog") }
          : { meem: null, mnaSf: null, ecog: null },
      }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
    } catch (error) {
      if (error instanceof AuthenticationRequiredError) {
        return NextResponse.json({ code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." }, { status: 401 });
      }
      if (error instanceof AccessForbiddenError) {
        return NextResponse.json({ code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." }, { status: 403 });
      }
      return NextResponse.json({
        code: "CLINICAL_SCALE_WORKSPACE_FAILED",
        message: error instanceof Error ? error.message : "Não foi possível carregar o workspace de escalas.",
      }, { status: 400 });
    }
  });
}
