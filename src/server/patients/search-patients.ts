import type { PatientSelectionResult } from "../../domain/patient-search.ts";
import { requireAuthenticatedUser } from "../auth/require-user";
import { prisma } from "../db";
import { searchPatientsInDatabase } from "./search-patients-database.ts";

export { searchPatientsInDatabase } from "./search-patients-database.ts";

export async function searchPatientsForSelection(
  query: string,
): Promise<PatientSelectionResult[]> {
  await requireAuthenticatedUser("patient.read");
  return searchPatientsInDatabase(prisma, query);
}
