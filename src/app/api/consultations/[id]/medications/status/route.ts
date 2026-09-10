import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import { medicationStatusHttpHandlers } from "@/server/clinical/medication-status-http";
import { recordMedicationStatusChange } from "@/server/clinical/record-medication-status";

const handlers = medicationStatusHttpHandlers(recordMedicationStatusChange);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.POST(request, id));
}
