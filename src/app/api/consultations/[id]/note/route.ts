import {
  getConsultationNote,
  saveConsultationNote,
} from "@/server/clinical/consultation-note";
import { consultationNoteHttpHandlers } from "@/server/clinical/consultation-note-http";
import { withConsultationPatientAccess } from "@/server/auth/consultation-route-guard";

const handlers = consultationNoteHttpHandlers({
  getConsultationNote,
  saveConsultationNote,
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.GET(request, id));
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withConsultationPatientAccess(id, () => handlers.PUT(request, id));
}
