import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import {
  finalizeConsultation,
  getConsultationWorkflowState,
  startConsultationReview,
} from "@/server/clinical/finalize-consultation";
import { consultationWorkflowHttpHandlers } from "@/server/clinical/consultation-finalization-http";

const handlers = consultationWorkflowHttpHandlers({
  getWorkflowState: getConsultationWorkflowState,
  startReview: startConsultationReview,
  finalize: finalizeConsultation,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.GET(request, id));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.POST(request, id));
}
