import type { PatientSelectionResult } from "../../domain/patient-search.ts";
import { assignedPatientIdsForUser } from "../auth/patient-access";
import { requireAuthenticatedUser } from "../auth/require-user";
import { prisma } from "../db";
import { searchPatientsInDatabase } from "./search-patients-database.ts";

export { searchPatientsInDatabase } from "./search-patients-database.ts";

export async function searchPatientsForSelection(
  query: string,
): Promise<PatientSelectionResult[]> {
  const { user } = await requireAuthenticatedUser("patient.read");
  const results = await searchPatientsInDatabase(prisma, query);
  if (user.patientAccessScope === "ALL_PATIENTS") return results;

  const allowedPatientIds = new Set(await assignedPatientIdsForUser(user.id));
  return results.filter((patient) => allowedPatientIds.has(patient.id));
}
