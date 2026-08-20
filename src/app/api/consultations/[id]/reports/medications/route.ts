import { NextResponse } from "next/server";
import { MedicationPlanSnapshotError } from "@/domain/medication-plan-snapshot";
import { generateMedicationPlan } from "@/server/clinical/generate-medication-plan";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const result = await generateMedicationPlan({ consultationId: id, requestId });

    return NextResponse.json({
      plan: result.plan,
      text: result.text,
      excluded: result.excluded,
      snapshot: {
        id: result.snapshot.id,
        version: result.snapshot.version,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof MedicationPlanSnapshotError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        code: "MEDICATION_PLAN_GENERATION_FAILED",
        message: "Não foi possível gerar o plano de medicamentos.",
      },
      { status: 500 },
    );
  }
}
