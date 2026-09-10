import { NextResponse } from "next/server";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { setPatientAssignment } from "@/server/users/manage-user";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as { patientId?: unknown; active?: unknown };
    if (typeof body.patientId !== "string" || typeof body.active !== "boolean") {
      throw new Error("Paciente e estado do vínculo são obrigatórios.");
    }
    const assignment = await setPatientAssignment({
      targetUserId: id,
      patientId: body.patientId,
      active: body.active,
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
    return NextResponse.json(assignment, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ code: "AUTHENTICATION_REQUIRED", message: error.message }, { status: 401, headers: NO_STORE_HEADERS });
    }
    if (error instanceof AccessForbiddenError) {
      return NextResponse.json({ code: "ACCESS_FORBIDDEN", message: error.message }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(
      { code: "PATIENT_ASSIGNMENT_FAILED", message: error instanceof Error ? error.message : "Não foi possível atualizar o vínculo com o paciente." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
