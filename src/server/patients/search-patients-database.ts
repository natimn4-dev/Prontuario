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

interface PatientSearchCandidate {
  id: string;
  fullName: string;
  birthDate: Date | null;
  needsIdentityReview: boolean;
}

interface PatientSearchHydratedCandidate extends PatientSearchCandidate {
  consultations: Array<{
    id: string;
    status: "DRAFT" | "IN_REVIEW";
    occurredAt: Date;
  }>;
}

const PATIENT_SEARCH_CANDIDATE_SELECT = {
  id: true,
  fullName: true,
  birthDate: true,
  needsIdentityReview: true,
} as const;

const ACTIVE_CONSULTATION_SELECT = {
  id: true,
  status: true,
  occurredAt: true,
} as const;

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

  let indexedCandidates: PatientSearchCandidate[] = [];
  try {
    indexedCandidates = await client.patient.findMany({
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
      select: PATIENT_SEARCH_CANDIDATE_SELECT,
    });
  } catch {
    // O índice derivado é uma otimização. Um schema legado ou uma divergência
    // transitória no MariaDB não pode impedir a localização pelo nome-fonte.
  }

  const matched = new Map<string, PatientSearchCandidate>();
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
  // O caminho indexado é o fluxo normal e suficiente quando encontra ao menos
  // um candidato. Antes desta guarda, toda busca com menos de oito resultados
  // continuava pelas duas rotas legadas e podia executar até 20 páginas com
  // joins de consulta, fazendo uma busca válida expirar em produção.
  if (matched.size === 0) {
    let sourceNameCandidates: PatientSearchCandidate[] = [];
    try {
      sourceNameCandidates = await client.patient.findMany({
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
        select: PATIENT_SEARCH_CANDIDATE_SELECT,
      });
    } catch {
      // O scan canônico e limitado abaixo continua disponível sem depender de
      // LIKE/collation específicos do provedor.
    }

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
    pageIndex < PATIENT_SEARCH_FALLBACK_MAX_PAGES && matched.size === 0;
    pageIndex += 1
  ) {
    const page = await client.patient.findMany({
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
      select: PATIENT_SEARCH_CANDIDATE_SELECT,
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

  const selectedCandidates = [...matched.values()].slice(0, PATIENT_SEARCH_LIMIT);
  let hydratedById = new Map<string, PatientSearchHydratedCandidate>();

  if (selectedCandidates.length > 0) {
    try {
      const hydrated = await client.patient.findMany({
        where: { id: { in: selectedCandidates.map((patient) => patient.id) } },
        select: {
          ...PATIENT_SEARCH_CANDIDATE_SELECT,
          consultations: {
            where: { status: { in: ["DRAFT", "IN_REVIEW"] } },
            orderBy: [
              { occurredAt: "desc" },
              { createdAt: "desc" },
              { id: "desc" },
            ],
            take: 1,
            select: ACTIVE_CONSULTATION_SELECT,
          },
        },
      });
      hydratedById = new Map(
        (hydrated as PatientSearchHydratedCandidate[]).map((patient) => [patient.id, patient]),
      );
    } catch {
      // Encontrar e abrir o paciente é prioritário. Se a relação de consultas
      // estiver temporariamente indisponível, o resultado continua levando ao
      // resumo longitudinal em vez de transformar um paciente existente em 500.
    }
  }

  return selectedCandidates.map((candidate) => {
    const patient = hydratedById.get(candidate.id) ?? { ...candidate, consultations: [] };
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
