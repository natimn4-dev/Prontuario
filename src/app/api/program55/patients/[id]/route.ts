import { NextResponse } from "next/server";
import type { Program55Discipline } from "@/domain/program55/access";
import {
  addProgram55Professional,
  createProgram55Goal,
  Program55Error,
  saveProgram55BodyComposition,
  saveProgram55ProfessionalAssessment,
  saveProgram55RestrictedPsychologyNote,
  startProgram55,
} from "@/server/program55/service";
import { updateProgram55CheckpointStatus, updateProgram55GoalStatus } from "@/server/program55/workflow";

const DISCIPLINES = new Set<Program55Discipline>(["PHYSICIAN", "PHYSIOTHERAPY", "NUTRITION", "PSYCHOLOGY"]);

function discipline(value: unknown): Program55Discipline {
  if (typeof value !== "string" || !DISCIPLINES.has(value as Program55Discipline)) {
    throw new Program55Error("INVALID_DISCIPLINE", "Profissão/domínio inválido.");
  }
  return value as Program55Discipline;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: patientId } = await params;
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "START") {
      const result = await startProgram55(patientId, typeof body.startedAt === "string" ? body.startedAt : null);
      return NextResponse.json(result, { status: result.created ? 201 : 200 });
    }

    if (action === "CHECKPOINT_STATUS") {
      const result = await updateProgram55CheckpointStatus(
        patientId,
        String(body.checkpointId ?? ""),
        String(body.status ?? "") as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED",
      );
      return NextResponse.json(result, { status: 200 });
    }

    if (action === "BODY_COMPOSITION") {
      const result = await saveProgram55BodyComposition(patientId, {
        checkpointId: String(body.checkpointId ?? ""),
        measuredAt: typeof body.measuredAt === "string" ? body.measuredAt : null,
        weightKg: body.weightKg,
        heightCm: body.heightCm,
        bmi: body.bmi,
        waistCm: body.waistCm,
        bodyFatPercent: body.bodyFatPercent,
        fatMassKg: body.fatMassKg,
        fatFreeMassKg: body.fatFreeMassKg,
        muscleMassKg: body.muscleMassKg,
        additionalMetrics: body.additionalMetrics,
        sourceLabel: body.sourceLabel,
        deviceLabel: body.deviceLabel,
        notes: body.notes,
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "ASSESSMENT") {
      const result = await saveProgram55ProfessionalAssessment(patientId, {
        checkpointId: String(body.checkpointId ?? ""),
        discipline: discipline(body.discipline),
        status: typeof body.status === "string" ? body.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED" : undefined,
        structuredData: body.structuredData,
        sharedSummary: body.sharedSummary,
        assessedAt: typeof body.assessedAt === "string" ? body.assessedAt : null,
      });
      return NextResponse.json(result, { status: 200 });
    }

    if (action === "PSYCHOLOGY_NOTE") {
      const result = await saveProgram55RestrictedPsychologyNote(patientId, {
        assessmentId: String(body.assessmentId ?? ""),
        content: body.content,
      });
      return NextResponse.json(result, { status: 200 });
    }

    if (action === "GOAL") {
      const result = await createProgram55Goal(patientId, {
        checkpointId: typeof body.checkpointId === "string" ? body.checkpointId : null,
        domain: body.domain,
        objective: body.objective,
        indicator: body.indicator,
        baselineValue: body.baselineValue,
        targetValue: body.targetValue,
        dueDate: typeof body.dueDate === "string" ? body.dueDate : null,
        responsibleDiscipline: body.responsibleDiscipline ? discipline(body.responsibleDiscipline) : null,
        notes: body.notes,
      });
      return NextResponse.json(result, { status: 201 });
    }

    if (action === "GOAL_STATUS") {
      const result = await updateProgram55GoalStatus(
        patientId,
        String(body.goalId ?? ""),
        String(body.status ?? "") as "ACTIVE" | "ACHIEVED" | "PAUSED" | "CANCELLED",
      );
      return NextResponse.json(result, { status: 200 });
    }

    if (action === "MEMBERSHIP") {
      const result = await addProgram55Professional(patientId, {
        email: body.email,
        discipline: discipline(body.discipline),
      });
      return NextResponse.json(result, { status: 200 });
    }

    return NextResponse.json({ code: "UNKNOWN_PROGRAM55_ACTION", message: "Ação inválida." }, { status: 400 });
  } catch (error) {
    if (error instanceof Program55Error) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: error.httpStatus });
    }
    console.error("PROGRAM55_API_ERROR", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { code: "PROGRAM55_REQUEST_FAILED", message: "Não foi possível salvar o Programa 55+." },
      { status: 500 },
    );
  }
}
