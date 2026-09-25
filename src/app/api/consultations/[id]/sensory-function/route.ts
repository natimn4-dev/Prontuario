import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import {
  getSensoryObservationWorkspace,
  saveSensoryObservation,
} from "@/server/clinical/sensory-functional-observation";
import { sensoryObservationHttpHandlers } from "@/server/clinical/sensory-functional-observation-http";
import { withClinicalPerformance } from "@/server/observability/clinical-performance";

const handlers = sensoryObservationHttpHandlers({
  getSensoryObservationWorkspace,
  saveSensoryObservation,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withClinicalPerformance(request, "consultation.sensory-function.read", () =>
    withConsultationPatientAccess(id, () => handlers.GET(id)));
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withClinicalPerformance(request, "consultation.sensory-function.write", () =>
    withConsultationPatientAccess(id, () => handlers.PUT(request, id)));
}
