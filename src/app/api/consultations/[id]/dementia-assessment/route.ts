import { withClinicalPerformance } from "@/server/observability/clinical-performance";
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
  return withClinicalPerformance(request, "consultation.dementia.read", () => handlers.GET(request, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withClinicalPerformance(request, "consultation.dementia.write", () => handlers.POST(request, id));
}
