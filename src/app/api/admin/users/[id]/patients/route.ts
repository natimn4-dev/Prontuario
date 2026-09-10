import { NextResponse } from "next/server";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { listPatientAssignments } from "@/server/users/list-assignments";
import { setPatientAssignment } from "@/server/users/manage-user";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function accessError(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json({ code: "AUTHENTICATION_REQUIRED", message: error.message }, { status: 401, headers: NO_STORE_HEADERS });
  }
  if (error instanceof AccessForbiddenError) {
    return NextResponse.json({ code: "ACCESS_FORBIDDEN", message: error.message }, { status: 403, headers: NO_STORE_HEADERS });
  }
  return null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return NextResponse.json({ assignments: await listPatientAssignments(id) }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return accessError(error) ?? NextResponse.json(
      { code: "PATIENT_ASSIGNMENT_LIST_FAILED", message: error instanceof Error ? error.message : "Não foi possível carregar os pacientes vinculados." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}

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
    return accessError(error) ?? NextResponse.json(
      { code: "PATIENT_ASSIGNMENT_FAILED", message: error instanceof Error ? error.message : "Não foi possível atualizar o vínculo com o paciente." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
