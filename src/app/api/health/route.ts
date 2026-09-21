import { NextResponse } from "next/server";
import { CLINICAL_RELEASE_ID } from "@/domain/clinical-release";
import { isOncogeriatriaEnabled, ONCOGERIATRIA_VERSION } from "@/domain/oncogeriatria/feature";
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

function oncogeriatriaStatus(schemaReady: boolean, safePersistenceReady: boolean) {
  return {
    enabled: isOncogeriatriaEnabled(process.env.ONCOGERIATRIA_EMERGENCY_DISABLED),
    schemaReady,
    safePersistenceReady,
    version: ONCOGERIATRIA_VERSION,
  };
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unavailable",
        releaseId: CLINICAL_RELEASE_ID,
        program55: program55Status(false),
        oncogeriatria: oncogeriatriaStatus(false, false),
      },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const [program55Schema, oncogeriatriaSchema, oncogeriatriaCheckpointSchema, oncogeriatriaReceiptSchema] = await Promise.allSettled([
    prisma.program55Enrollment.findFirst({ select: { id: true } }),
    prisma.oncogeriatricEpisode.findFirst({ select: { id: true } }),
    prisma.oncogeriatricCheckpoint.findFirst({
      select: {
        id: true,
        revision: true,
        cargCompletionCount: true,
        cargPendingFields: true,
        cargSavedAt: true,
      },
    }),
    prisma.oncogeriatricOperationReceipt.findFirst({
      select: {
        id: true,
        operationId: true,
        entityType: true,
        entityId: true,
      },
    }),
  ]);

  const program55Ready = program55Schema.status === "fulfilled";
  const oncogeriatriaReady = oncogeriatriaSchema.status === "fulfilled";
  const oncogeriatriaSafePersistenceReady =
    oncogeriatriaCheckpointSchema.status === "fulfilled" &&
    oncogeriatriaReceiptSchema.status === "fulfilled";

  const program55Required = isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED);
  const oncogeriatriaRequired = isOncogeriatriaEnabled(process.env.ONCOGERIATRIA_EMERGENCY_DISABLED);
  const ready =
    (!program55Required || program55Ready) &&
    (!oncogeriatriaRequired || (oncogeriatriaReady && oncogeriatriaSafePersistenceReady));

  return NextResponse.json(
    {
      status: ready ? "ok" : "degraded",
      database: "ok",
      releaseId: CLINICAL_RELEASE_ID,
      program55: program55Status(program55Ready),
      oncogeriatria: oncogeriatriaStatus(oncogeriatriaReady, oncogeriatriaSafePersistenceReady),
    },
    { status: ready ? 200 : 503, headers: NO_STORE_HEADERS },
  );
}
