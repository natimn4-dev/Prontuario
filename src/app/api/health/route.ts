import { NextResponse } from "next/server";
import { CLINICAL_RELEASE_ID } from "@/domain/clinical-release";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "ok", releaseId: CLINICAL_RELEASE_ID }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "degraded", database: "unavailable", releaseId: CLINICAL_RELEASE_ID }, { status: 503 });
  }
}
