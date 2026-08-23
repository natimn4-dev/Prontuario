import type { Prisma } from "@/generated/prisma/client";
import {
  assertPatientSearchQuery,
  PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
  PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
  PATIENT_SEARCH_LIMIT,
  patientNameMatchesSearch,
  patientSearchTerms,
  toPatientSelectionResult,
  type PatientSelectionResult,
} from "../../domain/patient-search.ts";
import { requireAuthenticatedUser } from "../auth/require-user";
import { prisma } from "../db";

const selection = {
  id: true,
  fullName: true,
  birthDate: true,
  needsIdentityReview: true,
  consultations: {
    where: {
      status: {
        in: ["DRAFT", "IN_REVIEW"],
      },
    },
    orderBy: [
      { occurredAt: "desc" },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 1,
    select: {
      id: true,
      status: true,
      occurredAt: true,
    },
  },
} satisfies Prisma.PatientSelect;

type PatientSelectionRow = Prisma.PatientGetPayload<{ select: typeof selection }>;

function toSelection(patient: PatientSelectionRow): PatientSelectionResult {
  const consultation = patient.consultations[0];
  const activeConsultation = consultation
    && (consultation.status === "DRAFT" || consultation.status === "IN_REVIEW")
    ? {
        id: consultation.id,
        status: consultation.status,
        occurredAt: consultation.occurredAt,
      }
    : null;

  return toPatientSelectionResult({
    id: patient.id,
    fullName: patient.fullName,
    birthDate: patient.birthDate,
    needsIdentityReview: patient.needsIdentityReview,
    activeConsultation,
  });
}

/**
 * Lista inicial segura para a home.
 *
 * O nome do paciente precisa aparecer antes mesmo de uma busca manual. Isso
 * também cria um caminho independente do índice textual para acessar pacientes
 * já cadastrados, sem expor CPF, telefone, CNS ou outros identificadores.
 */
export async function listRecentPatientsForSelection(): Promise<PatientSelectionResult[]> {
  await requireAuthenticatedUser("patient.read");

  const patients = await prisma.patient.findMany({
    orderBy: [
      { updatedAt: "desc" },
      { fullName: "asc" },
      { id: "asc" },
    ],
    take: PATIENT_SEARCH_LIMIT,
    select: selection,
  });

  return patients.map((patient) => toSelection(patient));
}

export async function searchPatientsForSelection(
  query: string,
): Promise<PatientSelectionResult[]> {
  await requireAuthenticatedUser("patient.read");
  const normalizedQuery = assertPatientSearchQuery(query);
  const terms = patientSearchTerms(normalizedQuery);

  const indexedCandidates = await prisma.patient.findMany({
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
    select: selection,
  });

  const matched = new Map<string, PatientSelectionRow>();
  for (const patient of indexedCandidates) {
    if (patientNameMatchesSearch(patient.fullName, normalizedQuery)) {
      matched.set(patient.id, patient);
    }
  }

  // Fallback determinístico para registros históricos cujo campo normalizado ou
  // collation do banco não acompanhe a regra atual de acentos/caixa. O scan é
  // paginado, lê somente os dados mínimos de seleção e só roda quando a busca
  // indexada não preencheu o limite final.
  let skip = 0;
  while (matched.size < PATIENT_SEARCH_LIMIT) {
    const page = await prisma.patient.findMany({
      orderBy: [
        { normalizedFullName: "asc" },
        { birthDate: "asc" },
        { id: "asc" },
      ],
      skip,
      take: PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
      select: selection,
    });

    if (page.length === 0) break;
    for (const patient of page) {
      if (matched.has(patient.id)) continue;
      if (patientNameMatchesSearch(patient.fullName, normalizedQuery)) {
        matched.set(patient.id, patient);
        if (matched.size >= PATIENT_SEARCH_LIMIT) break;
      }
    }

    skip += page.length;
    if (page.length < PATIENT_SEARCH_FALLBACK_PAGE_SIZE) break;
  }

  return [...matched.values()]
    .slice(0, PATIENT_SEARCH_LIMIT)
    .map((patient) => toSelection(patient));
}
