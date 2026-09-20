import { medicationStatusHttpHandlers } from "@/server/clinical/medication-status-http";
import { recordMedicationStatusChange } from "@/server/clinical/record-medication-status";
import { withClinicalPerformance } from "@/server/observability/clinical-performance";

const handlers = medicationStatusHttpHandlers(recordMedicationStatusChange);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withClinicalPerformance(request, "consultation.medications.status.write", () => handlers.POST(request, id));
}
