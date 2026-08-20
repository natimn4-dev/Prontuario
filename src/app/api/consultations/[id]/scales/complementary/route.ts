import { NextResponse } from "next/server";
import {
  COMPLEMENTARY_SCORE_SCALES,
  scoreComplementaryScale,
  type ComplementaryScoreScaleCode,
} from "@/domain/complementary-score-scales";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { saveScaleAssessment } from "@/server/clinical/persistence";
import { prisma } from "@/server/db";

const SUPPORTED = new Set<ComplementaryScoreScaleCode>(COMPLEMENTARY_SCORE_SCALES.map((item) => item.code));

async function consultationContext(consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: { id: true, patientId: true, status: true },
  });
  if (!consultation) throw new Error("CONSULTATION_NOT_FOUND");
  return consultation;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_REQUEST");
  return value as Record<string, unknown>;
}

function parseBody(value: unknown): { scaleCode: ComplementaryScoreScaleCode; answers: Record<string, unknown> } {
  const body = asRecord(value);
  if (Object.keys(body).some((key) => key !== "scaleCode" && key !== "answers")) throw new Error("INVALID_REQUEST");
  if (typeof body.scaleCode !== "string" || !SUPPORTED.has(body.scaleCode as ComplementaryScoreScaleCode)) {
    throw new Error("UNSUPPORTED_SCALE");
  }
  return { scaleCode: body.scaleCode as ComplementaryScoreScaleCode, answers: asRecord(body.answers) };
}

function validateAgainstDefinition(scaleCode: ComplementaryScoreScaleCode, answers: Record<string, unknown>) {
  const definition = COMPLEMENTARY_SCORE_SCALES.find((item) => item.code === scaleCode);
  if (!definition) throw new Error("UNSUPPORTED_SCALE");
  const allowedIds = new Set(definition.fields.map((field) => field.id));
  if (Object.keys(answers).some((key) => !allowedIds.has(key))) throw new Error("Valor inválido: campo não permitido.");

  for (const field of definition.fields) {
    const value = answers[field.id];
    if (field.number) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < field.number.min || value > field.number.max) {
        throw new Error(`Valor inválido para ${field.id}.`);
      }
    }
    if (field.choices) {
      if (!field.choices.some((choice) => choice.value === value)) throw new Error(`Valor inválido para ${field.id}.`);
    }
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "CONSULTATION_NOT_FOUND") return NextResponse.json({ code, message: "Consulta não encontrada." }, { status: 404 });
  if (code === "INVALID_REQUEST" || code === "UNSUPPORTED_SCALE") return NextResponse.json({ code, message: "Requisição de escala complementar inválida." }, { status: 400 });
  if (error instanceof Error && /Valor inválido|Escala complementar|interpretar|Escolaridade/.test(error.message)) {
    return NextResponse.json({ code: "INVALID_SCALE_ANSWERS", message: error.message }, { status: 400 });
  }
  return NextResponse.json({ code: "COMPLEMENTARY_SCALE_FAILED", message: "Não foi possível processar a escala complementar." }, { status: 500 });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser("patient.read");
    const { id } = await context.params;
    const consultation = await consultationContext(id);
    const codes = COMPLEMENTARY_SCORE_SCALES.map((definition) => definition.code);
    const assessments = await prisma.scaleAssessment.findMany({
      where: { patientId: consultation.patientId, scaleCode: { in: codes } },
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        consultationId: true,
        scaleCode: true,
        scaleVersion: true,
        scoreNumeric: true,
        scoreText: true,
        classification: true,
        interpretation: true,
        appliedAt: true,
      },
    });

    return NextResponse.json({
      consultationId: id,
      consultationStatus: consultation.status,
      definitions: COMPLEMENTARY_SCORE_SCALES,
      latest: codes.map((scaleCode) => {
        const item = assessments.find((assessment) => assessment.scaleCode === scaleCode);
        return item ? { ...item, scoreNumeric: item.scoreNumeric === null ? null : Number(item.scoreNumeric) } : null;
      }).filter(Boolean),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser("consultation.write");
    const { id } = await context.params;
    const consultation = await consultationContext(id);
    if (consultation.status === "FINALIZED") {
      return NextResponse.json({ code: "CONSULTATION_FINALIZED", message: "Consulta finalizada não aceita nova avaliação." }, { status: 409 });
    }

    const { scaleCode, answers } = parseBody(await request.json());
    validateAgainstDefinition(scaleCode, answers);
    const scored = scoreComplementaryScale(scaleCode, answers);
    const assessment = await saveScaleAssessment({
      consultationId: id,
      scaleCode,
      scaleVersion: scored.version,
      answers: scored.answers,
      scoreNumeric: scored.result.score,
      scoreText: scored.result.scoreText,
      classification: scored.result.classification,
      interpretation: scored.result.interpretation,
      clinicalColor: scored.result.clinicalColor,
    });

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        consultationId: assessment.consultationId,
        scaleCode: assessment.scaleCode,
        scaleVersion: assessment.scaleVersion,
        appliedAt: assessment.appliedAt,
      },
      result: scored.result,
    }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
