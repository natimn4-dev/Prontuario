import type { PrismaClient } from "../../generated/prisma/client.ts";
import { normalizePersonName } from "../../domain/patient-identity.ts";

type PatientSearchIndexClient = Pick<PrismaClient, "patient" | "$queryRawUnsafe">;

const AUDIT_PAGE_SIZE = 250;

export interface PatientSearchIndexAudit {
  totalPatients: number;
  nullNormalizedFullName: number;
  emptyNormalizedFullName: number;
  mismatchedNormalizedFullName: number;
  databaseCollation: string | null;
  fullNameCollation: string | null;
  normalizedFullNameCollation: string | null;
}

async function canonicalMismatchCount(client: PatientSearchIndexClient): Promise<number> {
  let cursor: string | undefined;
  let mismatched = 0;

  while (true) {
    const page = await client.patient.findMany({
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: AUDIT_PAGE_SIZE,
      select: { id: true, fullName: true, normalizedFullName: true },
    });
    if (page.length === 0) break;

    for (const patient of page) {
      if (patient.normalizedFullName !== normalizePersonName(patient.fullName)) mismatched += 1;
    }

    cursor = page.at(-1)?.id;
    if (!cursor || page.length < AUDIT_PAGE_SIZE) break;
  }

  return mismatched;
}

export async function auditPatientSearchIndex(
  client: PatientSearchIndexClient,
): Promise<PatientSearchIndexAudit> {
  const counts = await client.$queryRawUnsafe<Array<{
    totalPatients: bigint | number;
    nullNormalizedFullName: bigint | number;
    emptyNormalizedFullName: bigint | number;
  }>>(
    "SELECT COUNT(*) AS totalPatients, SUM(normalizedFullName IS NULL) AS nullNormalizedFullName, SUM(TRIM(COALESCE(normalizedFullName, '')) = '') AS emptyNormalizedFullName FROM Patient",
  );
  const databaseRows = await client.$queryRawUnsafe<Array<{
    databaseCollation: string | null;
  }>>("SELECT @@collation_database AS databaseCollation");
  const columnRows = await client.$queryRawUnsafe<Array<{
    COLUMN_NAME: string;
    COLLATION_NAME: string | null;
  }>>(
    "SELECT COLUMN_NAME, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Patient' AND COLUMN_NAME IN ('fullName', 'normalizedFullName')",
  );
  const columns = new Map(columnRows.map((row) => [row.COLUMN_NAME, row.COLLATION_NAME]));

  return {
    totalPatients: Number(counts[0]?.totalPatients ?? 0),
    nullNormalizedFullName: Number(counts[0]?.nullNormalizedFullName ?? 0),
    emptyNormalizedFullName: Number(counts[0]?.emptyNormalizedFullName ?? 0),
    mismatchedNormalizedFullName: await canonicalMismatchCount(client),
    databaseCollation: databaseRows[0]?.databaseCollation ?? null,
    fullNameCollation: columns.get("fullName") ?? null,
    normalizedFullNameCollation: columns.get("normalizedFullName") ?? null,
  };
}

/**
 * Backfill idempotente: altera exclusivamente normalizedFullName. Não toca em
 * fullName, identityFingerprint, homonymDiscriminator, identificadores ou
 * qualquer dado clínico.
 */
export async function backfillPatientSearchIndex(
  client: PatientSearchIndexClient,
): Promise<number> {
  let cursor: string | undefined;
  let updated = 0;

  while (true) {
    const page = await client.patient.findMany({
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: AUDIT_PAGE_SIZE,
      select: { id: true, fullName: true, normalizedFullName: true },
    });
    if (page.length === 0) break;

    for (const patient of page) {
      const canonical = normalizePersonName(patient.fullName);
      if (patient.normalizedFullName === canonical) continue;
      await client.patient.update({
        where: { id: patient.id },
        data: { normalizedFullName: canonical },
        select: { id: true },
      });
      updated += 1;
    }

    cursor = page.at(-1)?.id;
    if (!cursor || page.length < AUDIT_PAGE_SIZE) break;
  }

  return updated;
}
