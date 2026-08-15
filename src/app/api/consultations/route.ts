import { NextResponse } from "next/server";
import {
  ConsultationCreationError,
  ConsultationCreationRequestError,
  parseConsultationCreationRequest,
} from "@/server/clinical/create-consultation-service";
import { createConsultationSafely } from "@/server/clinical/create-consultation";

const OPERATIONAL_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const command = parseConsultationCreationRequest(body);

    const requestIdHeader = request.headers.get("x-request-id");
    const consultation = await createConsultationSafely({
      ...command,
      requestId: requestIdHeader && OPERATIONAL_REQUEST_ID.test(requestIdHeader)
        ? requestIdHeader
        : undefined,
    });
    return NextResponse.json({ consultationId: consultation.id }, { status: 201 });
  } catch (error) {
    if (error instanceof ConsultationCreationRequestError) {
      return NextResponse.json(
        { code: "INVALID_REQUEST", message: error.message },
        { status: 400 },
      );
    }
    if (error instanceof ConsultationCreationError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.code === "PATIENT_NOT_FOUND" ? 404 : 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Não foi possível criar a consulta.";
    return NextResponse.json(
      { code: "CONSULTATION_CREATE_FAILED", message },
      { status: message.startsWith("Permissão negada:") ? 403 : 400 },
    );
  }
}
