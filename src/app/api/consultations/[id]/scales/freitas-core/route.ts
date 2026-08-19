import { NextResponse } from "next/server";
import { CORE_FREITAS_SCALES, scoreCoreFreitasScale, type CoreFreitasScaleCode } from "@/domain/freitas-core-scales";
import { VALIDATED_FREITAS_SCALES, scoreValidatedFreitasScale, type ValidatedScaleCode } from "@/domain/freitas-validated-scales";
import { COGNITIVE_FREITAS_SCALES, scoreCognitiveFreitasScale, type CognitiveFreitasScaleCode } from "@/domain/freitas-cognitive-scales";
import { PSYCHOSOCIAL_FREITAS_SCALES, scorePsychosocialFreitasScale, type PsychosocialFreitasScaleCode } from "@/domain/freitas-psychosocial-scales";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { saveScaleAssessment } from "@/server/clinical/persistence";
import { prisma } from "@/server/db";

type ScaleCode = CoreFreitasScaleCode | ValidatedScaleCode | CognitiveFreitasScaleCode | PsychosocialFreitasScaleCode;
const CORE = new Set<CoreFreitasScaleCode>(CORE_FREITAS_SCALES.map((item) => item.code));
const VALIDATED = new Set<ValidatedScaleCode>(VALIDATED_FREITAS_SCALES.map((item) => item.code));
const COGNITIVE = new Set<CognitiveFreitasScaleCode>(COGNITIVE_FREITAS_SCALES.map((item) => item.code));
const PSYCHOSOCIAL = new Set<PsychosocialFreitasScaleCode>(PSYCHOSOCIAL_FREITAS_SCALES.map((item) => item.code));
const SUPPORTED = new Set<ScaleCode>([...CORE, ...VALIDATED, ...COGNITIVE, ...PSYCHOSOCIAL]);
const DEFINITIONS = [...CORE_FREITAS_SCALES, ...VALIDATED_FREITAS_SCALES, ...COGNITIVE_FREITAS_SCALES, ...PSYCHOSOCIAL_FREITAS_SCALES];

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

function parseBody(value: unknown): { scaleCode: ScaleCode; answers: Record<string, unknown> } {
  const body = asRecord(value);
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "scaleCode" && key !== "answers")) throw new Error("INVALID_REQUEST");
  if (typeof body.scaleCode !== "string" || !SUPPORTED.has(body.scaleCode as ScaleCode)) throw new Error("UNSUPPORTED_SCALE");
  return { scaleCode: body.scaleCode as ScaleCode, answers: asRecord(body.answers) };
}

function score(scaleCode: ScaleCode, answers: Record<string, unknown>) {
  if (CORE.has(scaleCode as CoreFreitasScaleCode)) return scoreCoreFreitasScale(scaleCode as CoreFreitasScaleCode, answers);
  if (VALIDATED.has(scaleCode as ValidatedScaleCode)) return scoreValidatedFreitasScale(scaleCode as ValidatedScaleCode, answers);
  if (COGNITIVE.has(scaleCode as CognitiveFreitasScaleCode)) return scoreCognitiveFreitasScale(scaleCode as CognitiveFreitasScaleCode, answers);
  return scorePsychosocialFreitasScale(scaleCode as PsychosocialFreitasScaleCode, answers);
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "CONSULTATION_NOT_FOUND") return NextResponse.json({ code, message: "Consulta não encontrada." }, { status: 404 });
  if (code === "INVALID_REQUEST" || code === "UNSUPPORTED_SCALE") return NextResponse.json({ code, message: "Requisição de escala inválida." }, { status: 400 });
  if (error instanceof Error && /Resposta|Escala/.test(error.message)) return NextResponse.json({ code: "INVALID_SCALE_ANSWERS", message: error.message }, { status: 400 });
  return NextResponse.json({ code: "FREITAS_SCALE_FAILED", message: "Não foi possível processar a avaliação geriátrica." }, { status: 500 });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser("patient.read");
    const { id } = await context.params;
    const consultation = await consultationContext(id);
    const codes = [...SUPPORTED];
    const assessments = await prisma.scaleAssessment.findMany({
      where: { patientId: consultation.patientId, scaleCode: { in: codes } },
      orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
      select: { id: true, consultationId: true, scaleCode: true, scaleVersion: true, scoreNumeric: true, scoreText: true, classification: true, interpretation: true, appliedAt: true },
    });
    return NextResponse.json({
      consultationId: id,
      consultationStatus: consultation.status,
      definitions: DEFINITIONS,
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
    if (consultation.status === "FINALIZED") return NextResponse.json({ code: "CONSULTATION_FINALIZED", message: "Consulta finalizada não aceita nova avaliação." }, { status: 409 });
    const { scaleCode, answers } = parseBody(await request.json());
    const scored = score(scaleCode, answers);
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
      assessment: { id: assessment.id, consultationId: assessment.consultationId, scaleCode: assessment.scaleCode, scaleVersion: assessment.scaleVersion, appliedAt: assessment.appliedAt },
      result: scored.result,
    }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
