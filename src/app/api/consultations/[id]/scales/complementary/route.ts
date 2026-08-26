import { NextResponse } from "next/server";
import {
  COMPLEMENTARY_SCORE_SCALES,
  scoreComplementaryScale,
  type ComplementaryScoreScaleCode,
} from "@/domain/complementary-score-scales";
import {
  COGNITIVE_QUICK_DEFINITIONS,
  scoreCognitiveQuickEntry,
  type CognitiveQuickCode,
} from "@/domain/cognitive-quick-entry";
import { complementaryScaleConsultationHorizonIds } from "@/domain/complementary-scale-timeline";
import {
  CORNELL_STRUCTURED_CODE,
  CORNELL_STRUCTURED_DEFINITION,
  scoreCornellStructured,
} from "@/domain/cornell-structured";
import {
  ISI_CODE,
  ISI_QUICK_DEFINITION,
  scoreIsi,
} from "@/domain/isi";
import {
  SARCF_STRUCTURED_CODE,
  SARCF_STRUCTURED_DEFINITION,
  scoreSarcfStructured,
} from "@/domain/sarcf-structured";
import {
  STOPPFALL_STRUCTURED_CODE,
  STOPPFALL_STRUCTURED_DEFINITION,
  scoreStoppfallStructured,
} from "@/domain/stoppfall-structured";
import {
  BARTHEL_STRUCTURED_CODE,
  BARTHEL_STRUCTURED_DEFINITION,
  FRAIL_BR_STRUCTURED_CODE,
  FRAIL_BR_STRUCTURED_DEFINITION,
  MNA_SF_STRUCTURED_CODE,
  MNA_SF_STRUCTURED_DEFINITION,
  scoreBarthelStructured,
  scoreFrailBrStructured,
  scoreMnaSfStructured,
} from "@/domain/structured-geriatric-scales";
import { withStructuredScaleEntry } from "@/domain/structured-scale-entry";
import {
  TEN_CS_STRUCTURED_CODE,
  TEN_CS_STRUCTURED_DEFINITION,
  scoreTenCsStructured,
} from "@/domain/ten-cs-structured";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { saveScaleAssessment } from "@/server/clinical/persistence";
import { prisma } from "@/server/db";

const QUICK_CODES = new Set<CognitiveQuickCode>(COGNITIVE_QUICK_DEFINITIONS.map((item) => item.code));
type RequestScaleCode = ComplementaryScoreScaleCode | typeof ISI_CODE;
const DEFINITIONS = [
  ...COMPLEMENTARY_SCORE_SCALES
    .filter((item) => !QUICK_CODES.has(item.code as CognitiveQuickCode))
    .map((item) => {
      if (item.code === BARTHEL_STRUCTURED_CODE) return BARTHEL_STRUCTURED_DEFINITION;
      if (item.code === FRAIL_BR_STRUCTURED_CODE) return FRAIL_BR_STRUCTURED_DEFINITION;
      if (item.code === MNA_SF_STRUCTURED_CODE) return MNA_SF_STRUCTURED_DEFINITION;
      if (item.code === TEN_CS_STRUCTURED_CODE) return TEN_CS_STRUCTURED_DEFINITION;
      if (item.code === SARCF_STRUCTURED_CODE) return SARCF_STRUCTURED_DEFINITION;
      if (item.code === CORNELL_STRUCTURED_CODE) return CORNELL_STRUCTURED_DEFINITION;
      if (item.code === STOPPFALL_STRUCTURED_CODE) return STOPPFALL_STRUCTURED_DEFINITION;
      return item;
    })
    .map((item) => withStructuredScaleEntry(item)),
  ...COGNITIVE_QUICK_DEFINITIONS,
  ISI_QUICK_DEFINITION,
];
const SUPPORTED = new Set<string>(DEFINITIONS.map((item) => item.code));

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

function parseBody(value: unknown): { scaleCode: RequestScaleCode; answers: Record<string, unknown> } {
  const body = asRecord(value);
  if (Object.keys(body).some((key) => key !== "scaleCode" && key !== "answers")) throw new Error("INVALID_REQUEST");
  if (typeof body.scaleCode !== "string" || !SUPPORTED.has(body.scaleCode)) throw new Error("UNSUPPORTED_SCALE");
  return { scaleCode: body.scaleCode as RequestScaleCode, answers: asRecord(body.answers) };
}

function validateAgainstDefinition(scaleCode: RequestScaleCode, answers: Record<string, unknown>) {
  const definition = DEFINITIONS.find((item) => item.code === scaleCode);
  if (!definition) throw new Error("UNSUPPORTED_SCALE");
  const fields = definition.fields;
  const allowedIds = new Set(fields.map((field) => field.id));
  if (Object.keys(answers).some((key) => !allowedIds.has(key))) throw new Error("Valor inválido: campo não permitido.");

  for (const field of fields) {
    const value = answers[field.id];
    if ("number" in field && field.number) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < field.number.min || value > field.number.max) {
        throw new Error(`Valor inválido para ${field.id}.`);
      }
    }
    if ("choices" in field && field.choices) {
      if (!field.choices.some((choice) => choice.value === value)) throw new Error(`Valor inválido para ${field.id}.`);
    }
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "CONSULTATION_NOT_FOUND") return NextResponse.json({ code, message: "Consulta não encontrada." }, { status: 404 });
  if (code === "INVALID_REQUEST" || code === "UNSUPPORTED_SCALE") return NextResponse.json({ code, message: "Requisição de escala complementar inválida." }, { status: 400 });
  if (error instanceof Error && /Valor inválido|Escala complementar|interpretar|Escolaridade|Pontuação|campo não permitido|ISI_|10-CS|SARC-F|STOPPFall|Cornell/i.test(error.message)) {
    return NextResponse.json({ code: "INVALID_SCALE_ANSWERS", message: error.message }, { status: 400 });
  }
  return NextResponse.json({ code: "COMPLEMENTARY_SCALE_FAILED", message: "Não foi possível processar a escala complementar." }, { status: 500 });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthenticatedUser("patient.read");
    const { id } = await context.params;
    const consultation = await consultationContext(id);
    const codes = DEFINITIONS.map((definition) => definition.code);
    const consultations = await prisma.consultation.findMany({
      where: { patientId: consultation.patientId },
      select: { id: true, patientId: true, occurredAt: true, createdAt: true },
    });
    const consultationIds = complementaryScaleConsultationHorizonIds({
      patientId: consultation.patientId,
      targetConsultationId: id,
      consultations,
    });
    const assessments = await prisma.scaleAssessment.findMany({
      where: {
        patientId: consultation.patientId,
        consultationId: { in: consultationIds },
        scaleCode: { in: codes },
      },
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
    if (consultation.status === "FINALIZED") {
      return NextResponse.json({ code: "CONSULTATION_FINALIZED", message: "Consulta finalizada não aceita nova avaliação." }, { status: 409 });
    }

    const { scaleCode, answers } = parseBody(await request.json());
    validateAgainstDefinition(scaleCode, answers);
    const scored = scaleCode === BARTHEL_STRUCTURED_CODE
      ? scoreBarthelStructured(answers)
      : scaleCode === FRAIL_BR_STRUCTURED_CODE
        ? scoreFrailBrStructured(answers)
        : scaleCode === MNA_SF_STRUCTURED_CODE
          ? scoreMnaSfStructured(answers)
          : scaleCode === TEN_CS_STRUCTURED_CODE
            ? scoreTenCsStructured(answers)
            : scaleCode === SARCF_STRUCTURED_CODE
              ? scoreSarcfStructured(answers)
              : scaleCode === CORNELL_STRUCTURED_CODE
                ? scoreCornellStructured(answers)
              : scaleCode === STOPPFALL_STRUCTURED_CODE
                ? scoreStoppfallStructured(answers)
                : scaleCode === ISI_CODE
                  ? scoreIsi(answers)
                  : QUICK_CODES.has(scaleCode as CognitiveQuickCode)
                    ? scoreCognitiveQuickEntry(scaleCode as CognitiveQuickCode, answers)
                    : scoreComplementaryScale(scaleCode as ComplementaryScoreScaleCode, answers);
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
