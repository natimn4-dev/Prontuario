import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";
import {
  getAdvanceDirectiveWorkspace,
  saveAdvanceDirectiveRecord,
} from "@/server/clinical/advance-directives";
import { advanceDirectiveHttpHandlers } from "@/server/clinical/advance-directives-http";

const handlers = advanceDirectiveHttpHandlers({
  getAdvanceDirectiveWorkspace,
  saveAdvanceDirectiveRecord,
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
