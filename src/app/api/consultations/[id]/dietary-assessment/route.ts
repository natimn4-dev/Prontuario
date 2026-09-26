import { NextResponse } from "next/server";
import type { DietaryAssessmentInput } from "@/domain/dietary-assessment";
import { AccessForbiddenError, AuthenticationRequiredError } from "@/server/auth/access-errors";
import { withClinicalPerformance } from "@/server/observability/clinical-performance";
import {
  DietaryAssessmentError,
  getDietaryAssessment,
  saveSwallowingSupport,
  saveDietaryAssessment,
} from "@/server/clinical/dietary-assessment";

const status = (error: DietaryAssessmentError) => (
  error.code === "NOT_FOUND"
    ? 404
    : ["CONCURRENT_CHANGE", "FINALIZED"].includes(error.code)
      ? 409
      : ["SOURCE_NOT_AVAILABLE", "FOOD_SOURCE", "FOOD_SOURCE_NOT_CONFIGURED", "FOOD_SOURCE_RATE_LIMIT"].includes(error.code)
        ? 422
        : 400
);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withClinicalPerformance(request, "consultation.dietary.read", async () => {
    try {
      return NextResponse.json(await getDietaryAssessment(id), {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      if (error instanceof DietaryAssessmentError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: status(error) });
      }
      if (error instanceof AuthenticationRequiredError) {
        return NextResponse.json(
          { code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." },
          { status: 401, headers: { "Cache-Control": "private, no-store, max-age=0" } },
        );
      }
      if (error instanceof AccessForbiddenError) {
        return NextResponse.json(
          { code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." },
          { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } },
        );
      }
      throw error;
    }
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withClinicalPerformance(request, "consultation.dietary.write", async () => {
    try {
      const body = await request.json() as {
        expectedUpdatedAt?: string;
        assessment?: DietaryAssessmentInput;
        swallowingSupport?: unknown;
      };
      if (!body.expectedUpdatedAt || (Boolean(body.assessment) === (body.swallowingSupport !== undefined))) {
        return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
      }
      if (body.swallowingSupport !== undefined) {
        return NextResponse.json(await saveSwallowingSupport({
          consultationId: id,
          expectedUpdatedAt: body.expectedUpdatedAt,
          swallowingSupport: body.swallowingSupport,
          requestId: request.headers.get("x-request-id") ?? undefined,
        }), {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
      if (!body.assessment) return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
      return NextResponse.json(await saveDietaryAssessment({
        consultationId: id,
        expectedUpdatedAt: body.expectedUpdatedAt,
        assessment: body.assessment,
        requestId: request.headers.get("x-request-id") ?? undefined,
      }), {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      if (error instanceof DietaryAssessmentError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: status(error) });
      }
      if (error instanceof AuthenticationRequiredError) {
        return NextResponse.json(
          { code: "AUTHENTICATION_REQUIRED", message: "Autenticação obrigatória." },
          { status: 401, headers: { "Cache-Control": "private, no-store, max-age=0" } },
        );
      }
      if (error instanceof AccessForbiddenError) {
        return NextResponse.json(
          { code: "ACCESS_FORBIDDEN", message: "Acesso não autorizado." },
          { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } },
        );
      }
      throw error;
    }
  });
}
