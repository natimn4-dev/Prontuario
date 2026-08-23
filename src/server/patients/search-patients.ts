import {
  assertPatientSearchQuery,
  PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
  PATIENT_SEARCH_LIMIT,
  patientNameMatchesSearch,
  patientSearchTerms,
  toPatientSelectionResult,
  type PatientSelectionResult,
} from "../../domain/patient-search.ts";
import { requireAuthenticatedUser } from "../auth/require-user";
import { prisma } from "../db";

export async function searchPatientsForSelection(
  query: string,
): Promise<PatientSelectionResult[]> {
  await requireAuthenticatedUser("patient.read");
  const normalizedQuery = assertPatientSearchQuery(query);
  const terms = patientSearchTerms(normalizedQuery);

  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        {
          normalizedFullName: {
            contains: normalizedQuery,
          },
        },
        {
          AND: terms.map((term) => ({
            fullName: {
              contains: term,
            },
          })),
        },
      ],
    },
    orderBy: [
      { normalizedFullName: "asc" },
      { birthDate: "asc" },
      { id: "asc" },
    ],
    take: PATIENT_SEARCH_LIMIT * PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      needsIdentityReview: true,
    },
  });

  return patients
    .filter((patient) => patientNameMatchesSearch(patient.fullName, normalizedQuery))
    .slice(0, PATIENT_SEARCH_LIMIT)
    .map(toPatientSelectionResult);
}
