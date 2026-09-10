import { NextResponse } from "next/server";
import type { PatientAccessScope, ProfessionalRole } from "@/domain/security/auth-policy";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { updateClinicalUserAccess } from "@/server/users/manage-user";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      active?: unknown;
      professionalRole?: unknown;
      patientAccessScope?: unknown;
      canManageUsers?: unknown;
    };
    const result = await updateClinicalUserAccess({
      targetUserId: id,
      nextActive: typeof body.active === "boolean" ? body.active : undefined,
      nextProfessionalRole: typeof body.professionalRole === "string" ? body.professionalRole as ProfessionalRole : undefined,
      nextPatientAccessScope: typeof body.patientAccessScope === "string" ? body.patientAccessScope as PatientAccessScope : undefined,
      nextCanManageUsers: typeof body.canManageUsers === "boolean" ? body.canManageUsers : undefined,
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
    return NextResponse.json(result, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ code: "AUTHENTICATION_REQUIRED", message: error.message }, { status: 401, headers: NO_STORE_HEADERS });
    }
    if (error instanceof AccessForbiddenError) {
      return NextResponse.json({ code: "ACCESS_FORBIDDEN", message: error.message }, { status: 403, headers: NO_STORE_HEADERS });
    }
    return NextResponse.json(
      { code: "USER_UPDATE_FAILED", message: error instanceof Error ? error.message : "Não foi possível atualizar o usuário." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
