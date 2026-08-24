import type { PrismaClient } from "../../generated/prisma/client.ts";
import {
  assertPatientSearchQuery,
  PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
  PATIENT_SEARCH_FALLBACK_MAX_PAGES,
  PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
  PATIENT_SEARCH_LIMIT,
  patientNameMatchesSearch,
  patientSearchTerms,
  toPatientSelectionResult,
  type PatientSelectionResult,
} from "../../domain/patient-search.ts";

type PatientSearchClient = Pick<PrismaClient, "patient">;

/**
 * Núcleo de busca usado pela API e pelos testes de integração MySQL.
 * Não contém sessão, headers ou logging de PHI; a autorização obrigatória fica
 * em `searchPatientsForSelection`, imediatamente antes desta chamada.
 */
export async function searchPatientsInDatabase(
  client: PatientSearchClient,
  query: string,
): Promise<PatientSelectionResult[]> {
  const normalizedQuery = assertPatientSearchQuery(query);
  const terms = patientSearchTerms(normalizedQuery);

  const indexedCandidates = await client.patient.findMany({
    where: {
      OR: [
        {
          normalizedFullName: {
            contains: normalizedQuery,
          },
        },
        {
          AND: terms.map((term) => ({
            normalizedFullName: {
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
    },
  });

  const matched = new Map<string, (typeof indexedCandidates)[number]>();
  for (const patient of indexedCandidates) {
    if (patientNameMatchesSearch(patient.fullName, normalizedQuery)) {
      matched.set(patient.id, patient);
    }
  }

  // Segunda via determinística para registros legados: consulta o nome-fonte
  // diretamente antes do fallback paginado. Em MySQL/MariaDB com a collation
  // validada pelo release gate, isto recupera um paciente mesmo quando o índice
  // derivado ficou desatualizado e o registro estaria além das páginas de
  // segurança do scan. A validação final continua canônica na aplicação.
  if (matched.size < PATIENT_SEARCH_LIMIT) {
    const sourceNameCandidates = await client.patient.findMany({
      where: {
        OR: [
          { fullName: { contains: normalizedQuery } },
          {
            AND: terms.map((term) => ({
              fullName: { contains: term },
            })),
          },
        ],
      },
      orderBy: [
        { fullName: "asc" },
        { birthDate: "asc" },
        { id: "asc" },
      ],
      take: PATIENT_SEARCH_LIMIT * PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        needsIdentityReview: true,
        consultations: {
          where: { status: { in: ["DRAFT", "IN_REVIEW"] } },
          orderBy: [
            { occurredAt: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: 1,
          select: { id: true, status: true, occurredAt: true },
        },
      },
    });

    for (const patient of sourceNameCandidates) {
      if (matched.has(patient.id)) continue;
      if (patientNameMatchesSearch(patient.fullName, normalizedQuery)) matched.set(patient.id, patient);
    }
  }

  // Proteção para dados históricos cujo normalizedFullName não acompanha a
  // função canônica atual. O fallback é deliberadamente limitado e pagina pela
  // chave primária para evitar scan ilimitado/offset crescente. O release gate
  // audita a consistência do índice derivado; portanto, este caminho é apenas
  // uma rede de segurança temporária para legado, nunca o mecanismo principal.
  let cursor: string | undefined;
  for (
    let pageIndex = 0;
    pageIndex < PATIENT_SEARCH_FALLBACK_MAX_PAGES && matched.size < PATIENT_SEARCH_LIMIT;
    pageIndex += 1
  ) {
    const page = await client.patient.findMany({
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
      select: {
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
      },
    });

    if (page.length === 0) break;
    for (const patient of page) {
      if (matched.has(patient.id)) continue;
      if (patientNameMatchesSearch(patient.fullName, normalizedQuery)) {
        matched.set(patient.id, patient);
        if (matched.size >= PATIENT_SEARCH_LIMIT) break;
      }
    }

    cursor = page.at(-1)?.id;
    if (!cursor || page.length < PATIENT_SEARCH_FALLBACK_PAGE_SIZE) break;
  }

  return [...matched.values()]
    .slice(0, PATIENT_SEARCH_LIMIT)
    .map((patient) => {
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
    });
}
