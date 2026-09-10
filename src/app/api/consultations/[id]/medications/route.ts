import {
  addMedicationRegimen,
  createMedicationWithRegimen,
  getMedicationWorkspace,
} from "@/server/clinical/medication-workspace";
import { medicationWorkspaceHttpHandlers } from "@/server/clinical/medication-workspace-http";
import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";

const handlers = medicationWorkspaceHttpHandlers({
  getMedicationWorkspace,
  createMedicationWithRegimen,
  addMedicationRegimen,
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.GET(request, id));
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.POST(request, id));
}
