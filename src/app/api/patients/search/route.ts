import { NextResponse } from "next/server";
import { PatientSearchValidationError } from "@/domain/patient-search";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { searchPatientsForSelection } from "@/server/patients/search-patients";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { query?: unknown };
    const query = typeof body.query === "string" ? body.query : "";
    const results = await searchPatientsForSelection(query);
    return NextResponse.json({ results }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json(
        { code: "AUTHENTICATION_REQUIRED", message: error.message },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }
    if (error instanceof AccessForbiddenError) {
      return NextResponse.json(
        { code: "ACCESS_FORBIDDEN", message: error.message },
        { status: 403, headers: NO_STORE_HEADERS },
      );
    }
    if (error instanceof PatientSearchValidationError) {
      return NextResponse.json(
        { code: "INVALID_PATIENT_SEARCH", message: error.message },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      { code: "PATIENT_SEARCH_FAILED", message: "Não foi possível localizar pacientes." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
