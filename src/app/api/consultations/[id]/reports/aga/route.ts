import { NextResponse } from "next/server";
import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import { generateAgaReport } from "@/server/clinical/generate-aga-report";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, async () => {
    try {
      const requestId = request.headers.get("x-request-id") ?? undefined;
      const result = await generateAgaReport({ consultationId: id, requestId });
      return NextResponse.json({
        report: result.report,
        text: result.text,
        snapshot: { id: result.snapshot.id, version: result.snapshot.version },
      }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          code: "AGA_REPORT_GENERATION_FAILED",
          message: error instanceof Error ? error.message : "Não foi possível gerar o relatório AGA.",
        },
        { status: 400 },
      );
    }
  });
}
