import { NextResponse } from "next/server";
import { CORE_FREITAS_SCALES, scoreCoreFreitasScale, type CoreFreitasScaleCode } from "@/domain/freitas-core-scales";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { saveScaleAssessment } from "@/server/clinical/persistence";
import { prisma } from "@/server/db";

const SUPPORTED = new Set<CoreFreitasScaleCode>(["katz", "lawton", "gds15"]);

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

function parseBody(value: unknown): { scaleCode: CoreFreitasScaleCode; answers: Record<string, unknown> } {
  const body = asRecord(value);
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "scaleCode" && key !== "answers")) throw new Error("INVALID_REQUEST");
  if (typeof body.scaleCode !== "string" || !SUPPORTED.has(body.scaleCode as CoreFreitasScaleCode)) throw new Error("UNSUPPORTED_SCALE");
  return { scaleCode: body.scaleCode as CoreFreitasScaleCode, answers: asRecord(body.answers) };
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
      definitions: CORE_FREITAS_SCALES,
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
    const scored = scoreCoreFreitasScale(scaleCode, answers);
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
