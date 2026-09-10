import { NextResponse } from "next/server";
import type { PatientAccessScope, ProfessionalRole } from "@/domain/security/auth-policy";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { listClinicalUsers, preauthorizeClinicalUser } from "@/server/users/manage-user";

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

export async function GET() {
  try {
    return NextResponse.json(await listClinicalUsers(), { headers: NO_STORE_HEADERS });
  } catch (error) {
    return accessError(error) ?? NextResponse.json(
      { code: "USER_LIST_FAILED", message: "Não foi possível carregar os usuários." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      email?: unknown;
      name?: unknown;
      professionalRole?: unknown;
      patientAccessScope?: unknown;
      canManageUsers?: unknown;
    };
    if (typeof body.email !== "string" || typeof body.professionalRole !== "string" || typeof body.patientAccessScope !== "string") {
      throw new Error("Dados obrigatórios não informados.");
    }
    const result = await preauthorizeClinicalUser({
      email: body.email,
      name: typeof body.name === "string" ? body.name : undefined,
      professionalRole: body.professionalRole as ProfessionalRole,
      patientAccessScope: body.patientAccessScope as PatientAccessScope,
      canManageUsers: body.canManageUsers === true,
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
    return NextResponse.json(result, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    return accessError(error) ?? NextResponse.json(
      { code: "USER_PREAUTHORIZE_FAILED", message: error instanceof Error ? error.message : "Não foi possível pré-autorizar o profissional." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
}
