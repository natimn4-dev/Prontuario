import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import { generateDementiaReport } from "@/server/clinical/generate-dementia-report";
import { dementiaErrorResponse } from "@/server/clinical/dementia-assessment-http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, async () => {
    try {
      const snapshot = await generateDementiaReport({
        consultationId: id,
        requestId: request.headers.get("x-request-id") ?? undefined,
      });
      return Response.json({
        snapshotId: snapshot.id,
        version: snapshot.version,
        reportHref: `/consultations/${id}/dementia-report`,
      }, { headers: { "cache-control": "private, no-store" } });
    } catch (error) {
      return dementiaErrorResponse(error);
    }
  });
}
