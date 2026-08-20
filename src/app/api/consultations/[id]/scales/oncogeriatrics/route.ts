import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { saveScaleAssessment } from "@/server/clinical/persistence";
import { scaleConsultationHorizonIds } from "@/domain/scale-consultation-horizon";
import {
  CRASH_MNA_SF_VERSION,
  ECOG_VERSION,
  scoreCrashMnaSf,
  scoreEcog,
  type CrashMnaSfInput,
} from "@/domain/oncogeriatric-scales";

async function consultationPatientId(consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { patientId: true },
  });
  if (!consultation) throw new Error("Consulta não encontrada.");
  return consultation.patientId;
}

async function consultationHorizonIds(patientId: string, targetConsultationId: string) {
  const consultations = await prisma.consultation.findMany({
    where: { patientId },
    select: { id: true, patientId: true, occurredAt: true, createdAt: true },
  });
  return scaleConsultationHorizonIds({ patientId, targetConsultationId, consultations });
}

async function eligiblePrefillAssessments(consultationId: string) {
  const patientId = await consultationPatientId(consultationId);
  const consultationIds = await consultationHorizonIds(patientId, consultationId);
  return prisma.scaleAssessment.findMany({
    where: {
      patientId,
      consultationId: { in: consultationIds },
      scaleCode: { in: ["meem", "mna_sf", "ecog"] },
    },
    orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
    select: { id: true, scaleCode: true, scaleVersion: true, scoreNumeric: true, appliedAt: true, consultationId: true },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser("consultation.write");
    const { id } = await context.params;
    const assessments = await eligiblePrefillAssessments(id);
    const serialize = (code: string) => {
      const assessment = assessments.find((item) => item.scaleCode === code);
      return assessment ? { assessmentId: assessment.id, scaleVersion: assessment.scaleVersion, score: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric), appliedAt: assessment.appliedAt, consultationId: assessment.consultationId } : null;
    };
    return NextResponse.json({ meem: serialize("meem"), mnaSf: serialize("mna_sf"), ecog: serialize("ecog") });
  } catch (error) {
    return NextResponse.json({
      code: "ONCOGERIATRIC_PREFILL_FAILED",
      message: error instanceof Error ? error.message : "Não foi possível carregar as avaliações prévias.",
    }, { status: 400 });
  }
}

function numericField(body: Record<string, unknown>, key: string): number {
  const raw = body[key];
  if (raw === "" || raw === null || raw === undefined) throw new Error(`Campo obrigatório ausente: ${key}.`);
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Valor inválido para ${key}.`);
  return value;
}

function integerChoice(value: number, allowed: readonly number[], label: string) {
  if (!Number.isInteger(value) || !allowed.includes(value)) throw new Error(`${label} inválido.`);
  return value;
}

async function matchingAutofillSources(consultationId: string, input: Pick<CrashMnaSfInput, "ecog" | "mmseScore" | "mnaSfScore">) {
  const assessments = await eligiblePrefillAssessments(consultationId);
  const expected: Record<string, number> = { ecog: input.ecog, meem: input.mmseScore, mna_sf: input.mnaSfScore };
  return ["ecog", "meem", "mna_sf"].flatMap((scaleCode) => {
    const assessment = assessments.find((item) => item.scaleCode === scaleCode);
    if (!assessment || assessment.scoreNumeric === null || Number(assessment.scoreNumeric) !== expected[scaleCode]) return [];
    return [{
      scaleCode,
      assessmentId: assessment.id,
      consultationId: assessment.consultationId,
      scaleVersion: assessment.scaleVersion,
      appliedAt: assessment.appliedAt.toISOString(),
    }];
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;

    if (body.scaleCode === "ecog") {
      const value = integerChoice(numericField(body, "ecog"), [0, 1, 2, 3, 4, 5], "ECOG");
      const result = scoreEcog(value);
      const assessment = await saveScaleAssessment({
        consultationId: id,
        scaleCode: "ecog",
        scaleVersion: ECOG_VERSION,
        answers: { ecog: value },
        scoreNumeric: result.score ?? undefined,
        scoreText: result.scoreText,
        classification: result.classe,
        interpretation: result.texto,
        clinicalColor: result.cor,
      });
      return NextResponse.json({ assessment, result }, { status: 201 });
    }

    if (body.scaleCode === "crash_mna_sf") {
      const input: CrashMnaSfInput = {
        chemotherapyRisk: integerChoice(numericField(body, "chemotherapyRisk"), [0, 1, 2], "Chemotox") as 0 | 1 | 2,
        diastolicBloodPressure: numericField(body, "diastolicBloodPressure"),
        iadlScore: numericField(body, "iadlScore"),
        ldh: numericField(body, "ldh"),
        ecog: integerChoice(numericField(body, "ecog"), [0, 1, 2, 3, 4], "ECOG") as 0 | 1 | 2 | 3 | 4,
        mmseScore: numericField(body, "mmseScore"),
        mnaSfScore: numericField(body, "mnaSfScore"),
      };
      const result = scoreCrashMnaSf(input);
      const autoFilledFrom = await matchingAutofillSources(id, input);
      const assessment = await saveScaleAssessment({
        consultationId: id,
        scaleCode: "crash_mna_sf",
        scaleVersion: CRASH_MNA_SF_VERSION,
        answers: { ...input, hematologicScore: result.hematologicScore, nonHematologicScore: result.nonHematologicScore, localAdaptation: true, autoFilledFrom },
        scoreNumeric: result.combinedScore,
        scoreText: result.scoreText,
        classification: result.classe,
        interpretation: result.texto,
        clinicalColor: result.cor,
      });
      return NextResponse.json({ assessment, result }, { status: 201 });
    }
    throw new Error("Escala oncogeriátrica não suportada.");
  } catch (error) {
    return NextResponse.json({
      code: "ONCOGERIATRIC_SCALE_SAVE_FAILED",
      message: error instanceof Error ? error.message : "Não foi possível salvar a escala.",
    }, { status: 400 });
  }
}
