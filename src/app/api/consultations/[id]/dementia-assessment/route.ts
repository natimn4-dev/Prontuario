import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import {
  getDementiaAssessmentWorkspace,
  saveDementiaAssessmentRecord,
} from "@/server/clinical/dementia-assessment";
import { dementiaAssessmentHttpHandlers } from "@/server/clinical/dementia-assessment-http";

const handlers = dementiaAssessmentHttpHandlers({
  getWorkspace: getDementiaAssessmentWorkspace,
  saveRecord: saveDementiaAssessmentRecord,
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.GET(request, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.POST(request, id));
}
