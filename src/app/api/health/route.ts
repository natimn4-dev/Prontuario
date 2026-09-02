import { NextResponse } from "next/server";
import { CLINICAL_RELEASE_ID } from "@/domain/clinical-release";
import { PROGRAM55_MAX_AGE, PROGRAM55_MIN_AGE } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { prisma } from "@/server/db";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

function program55Status(schemaReady: boolean) {
  return {
    enabled: isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED),
    minAge: PROGRAM55_MIN_AGE,
    maxAge: PROGRAM55_MAX_AGE,
    schemaReady,
  };
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    // A leitura não retorna nenhum dado clínico; apenas garante que a migration aditiva do Programa 55+ existe.
    await prisma.program55Enrollment.findFirst({ select: { id: true } });
    return NextResponse.json(
      { status: "ok", database: "ok", releaseId: CLINICAL_RELEASE_ID, program55: program55Status(true) },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "unavailable", releaseId: CLINICAL_RELEASE_ID, program55: program55Status(false) },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
