import {
  addMedicationRegimen,
  createMedicationWithRegimen,
  getMedicationWorkspace,
} from "@/server/clinical/medication-workspace";
import { medicationWorkspaceHttpHandlers } from "@/server/clinical/medication-workspace-http";

const handlers = medicationWorkspaceHttpHandlers({
  getMedicationWorkspace,
  createMedicationWithRegimen,
  addMedicationRegimen,
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handlers.GET(request, id);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handlers.POST(request, id);
}
