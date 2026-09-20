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
import {
  COGNITIVE_DOMAIN_OBSERVATION_CODE,
  COGNITIVE_DOMAIN_OBSERVATION_DEFINITION,
  scoreCognitiveDomainObservation,
} from "@/domain/cognitive-domain-observation";
import {
  CAM_STRUCTURED_CODE,
  CAM_STRUCTURED_DEFINITION,
  LACE_STRUCTURED_CODE,
  LACE_STRUCTURED_DEFINITION,
  scoreCamStructured,
  scoreLaceStructured,
} from "@/domain/cam-lace-structured";
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
  EAT10_CODE,
  EAT10_DEFINITION,
  scoreEat10,
} from "@/domain/eat10";
import {
  WALKING_AID_CONTEXT_CODE,
  WALKING_AID_CONTEXT_DEFINITION,
  scoreWalkingAidContext,
} from "@/domain/walking-aid-context";
import {
  NPI_STRUCTURED_CODE,
  NPI_STRUCTURED_DEFINITION,
  scoreNpiStructured,
} from "@/domain/npi-structured";
import {
  SARC_CALF_STRUCTURED_CODE,
  SARC_CALF_STRUCTURED_DEFINITION,
  SARCF_STRUCTURED_CODE,
  SARCF_STRUCTURED_DEFINITION,
  scoreSarcCalfStructured,
  scoreSarcfStructured,
} from "@/domain/sarcf-structured";
import {
  CHARLSON_STRUCTURED_CODE,
  CHARLSON_STRUCTURED_DEFINITION,
  ESAS_STRUCTURED_CODE,
  ESAS_STRUCTURED_DEFINITION,
  G8_STRUCTURED_CODE,
  G8_STRUCTURED_DEFINITION,
  scoreStructuredCharlson,
  scoreStructuredEsas,
  scoreStructuredG8,
} from "@/domain/structured-g8-charlson-esas";
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
import { requireConsultationAccess } from "@/server/auth/patient-access";
import { saveScaleAssessment } from "@/server/clinical/persistence";
import { prisma } from "@/server/db";
import { withClinicalPerformance } from "@/server/observability/clinical-performance";

const QUICK_CODES = new Set<CognitiveQuickCode>(COGNITIVE_QUICK_DEFINITIONS.map((item) => item.code));
type RequestScaleCode = ComplementaryScoreScaleCode
  | typeof ISI_CODE
  | typeof SARC_CALF_STRUCTURED_CODE
  | typeof COGNITIVE_DOMAIN_OBSERVATION_CODE
  | typeof NPI_STRUCTURED_CODE
  | typeof EAT10_CODE
  | typeof WALKING_AID_CONTEXT_CODE;
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
      if (item.code === CAM_STRUCTURED_CODE) return CAM_STRUCTURED_DEFINITION;
      if (item.code === LACE_STRUCTURED_CODE) return LACE_STRUCTURED_DEFINITION;
      if (item.code === G8_STRUCTURED_CODE) return G8_STRUCTURED_DEFINITION;
      if (item.code === CHARLSON_STRUCTURED_CODE) return CHARLSON_STRUCTURED_DEFINITION;
      if (item.code === ESAS_STRUCTURED_CODE) return ESAS_STRUCTURED_DEFINITION;
      return item;
    })
    .map((item) => withStructuredScaleEntry(item)),
  withStructuredScaleEntry(SARC_CALF_STRUCTURED_DEFINITION),
  ...COGNITIVE_QUICK_DEFINITIONS,
  COGNITIVE_DOMAIN_OBSERVATION_DEFINITION,
  NPI_STRUCTURED_DEFINITION,
  ISI_QUICK_DEFINITION,
  withStructuredScaleEntry(EAT10_DEFINITION),
  withStructuredScaleEntry(WALKING_AID_CONTEXT_DEFINITION),
];
export const COMPLEMENTARY_SCALE_DEFINITIONS = DEFINITIONS;
const SUPPORTED = new Set<string>(COMPLEMENTARY_SCALE_DEFINITIONS.map((item) => item.code));

async function consultationContext(consultationId: string) {
  return (await requireConsultationAccess(consultationId, "patient.read")).consultation;
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
  const definition = COMPLEMENTARY_SCALE_DEFINITIONS.find((item) => item.code === scaleCode);
  if (!definition) throw new Error("UNSUPPORTED_SCALE");
  const fields = definition.fields;
  const allowedIds = new Set<string>(fields.map((field) => field.id));
  if (Object.keys(answers).some((key) => !allowedIds.has(key))) throw new Error("Valor inválido: campo não permitido.");

  for (const field of fields) {
    const value = answers[field.id];
    if ((value === undefined || value === null || value === "") && (field as { optional?: boolean }).optional) continue;
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
  if (error instanceof Error && /Valor inválido|Escala complementar|interpretar|Escolaridade|Pontuação|campo não permitido|Perfil cognitivo|NPI|ISI_|10-CS|SARC-F|SARC-CalF|STOPPFall|Cornell|CAM|LACE|G8|Charlson|ESAS|EAT-10|dispositivo de locomoção/i.test(error.message)) {
    return NextResponse.json({ code: "INVALID_SCALE_ANSWERS", message: error.message }, { status: 400 });
  }
  return NextResponse.json({ code: "COMPLEMENTARY_SCALE_FAILED", message: "Não foi possível processar a escala complementar." }, { status: 500 });
}

async function getComplementary(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const consultation = await consultationContext(id);
    const codes = COMPLEMENTARY_SCALE_DEFINITIONS.map((definition) => definition.code);
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
        answers: true,
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

async function postComplementary(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireConsultationAccess(id, "consultation.write");
    const consultation = access.consultation;
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
            : scaleCode === SARC_CALF_STRUCTURED_CODE
              ? scoreSarcCalfStructured(answers)
              : scaleCode === SARCF_STRUCTURED_CODE
                ? scoreSarcfStructured(answers)
                : scaleCode === CORNELL_STRUCTURED_CODE
                  ? scoreCornellStructured(answers)
                  : scaleCode === STOPPFALL_STRUCTURED_CODE
                    ? scoreStoppfallStructured(answers)
                    : scaleCode === CAM_STRUCTURED_CODE
                      ? scoreCamStructured(answers)
                      : scaleCode === LACE_STRUCTURED_CODE
                        ? scoreLaceStructured(answers)
                        : scaleCode === G8_STRUCTURED_CODE
                          ? scoreStructuredG8(answers)
                          : scaleCode === CHARLSON_STRUCTURED_CODE
                            ? scoreStructuredCharlson(answers)
                            : scaleCode === ESAS_STRUCTURED_CODE
                              ? scoreStructuredEsas(answers)
                              : scaleCode === ISI_CODE
                                ? scoreIsi(answers)
                                : scaleCode === EAT10_CODE
                                  ? scoreEat10(answers)
                                  : scaleCode === WALKING_AID_CONTEXT_CODE
                                    ? scoreWalkingAidContext(answers)
                                : scaleCode === COGNITIVE_DOMAIN_OBSERVATION_CODE
                                  ? scoreCognitiveDomainObservation(answers)
                                  : scaleCode === NPI_STRUCTURED_CODE
                                    ? scoreNpiStructured(answers)
                                : QUICK_CODES.has(scaleCode as CognitiveQuickCode)
                                  ? scoreCognitiveQuickEntry(scaleCode as CognitiveQuickCode, answers)
                                  : scoreComplementaryScale(scaleCode as ComplementaryScoreScaleCode, answers);
    const assessment = await saveScaleAssessment({
      consultationId: id,
      scaleCode,
      scaleVersion: scored.version,
      answers: scored.answers,
      scoreNumeric: scored.result.score ?? undefined,
      scoreText: scored.result.scoreText,
      classification: scored.result.classification,
      interpretation: scored.result.interpretation,
      clinicalColor: scored.result.clinicalColor,
      authorization: { user: access.user, consultation },
    });

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        consultationId: assessment.consultationId,
        scaleCode: assessment.scaleCode,
        scaleVersion: assessment.scaleVersion,
        scoreNumeric: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
        scoreText: assessment.scoreText,
        classification: assessment.classification,
        interpretation: assessment.interpretation,
        clinicalColor: assessment.clinicalColor,
        appliedAt: assessment.appliedAt.toISOString(),
      },
      result: scored.result,
    }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withClinicalPerformance(request, "consultation.scales.complementary.read", () => getComplementary(request, context));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withClinicalPerformance(request, "consultation.scales.complementary.write", () => postComplementary(request, context));
}
