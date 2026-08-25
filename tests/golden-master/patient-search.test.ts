import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { patientSearchFailureFeedback } from "../../src/domain/patient-search-http.ts";
import {
  assertPatientSearchQuery,
  PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
  PATIENT_SEARCH_FALLBACK_MAX_PAGES,
  PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
  PATIENT_SEARCH_LIMIT,
  patientNameMatchesSearch,
  patientSearchTerms,
  toPatientSelectionResult,
} from "../../src/domain/patient-search.ts";
import { searchPatientsInDatabase } from "../../src/server/patients/search-patients-database.ts";

test("busca de paciente normaliza acentos, caixa e espaços e exige dois caracteres", () => {
  assert.equal(assertPatientSearchQuery("  MÁria   da SILVA  "), "maria da silva");
  assert.equal(assertPatientSearchQuery("Ál"), "al");
  assert.throws(
    () => assertPatientSearchQuery(" a "),
    /pelo menos 2 caracteres/i,
  );
});

test("busca aceita nome completo, parcial, acentos, caixa e ordem de termos sem falso positivo interno", () => {
  const fullName = "Maria Clara de Ávila Andrade";

  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Maria Clara Andrade")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("maria clara")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("MARIA")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Mari")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Avila")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("  Andrade   Maria  ")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Mariana")), false);
  assert.equal(patientNameMatchesSearch("Mariana Souza", assertPatientSearchQuery("Ana")), false);
});

test("termos da busca preservam apenas tokens significativos após normalização", () => {
  assert.deepEqual(patientSearchTerms(assertPatientSearchQuery("  Maria   Clara Andrade  ")), [
    "maria",
    "clara",
    "andrade",
  ]);
});

test("resultado mostra identidade mínima e retoma consulta ativa no workspace aprovado", () => {
  const result = toPatientSelectionResult({
    id: "patient-synthetic-1",
    fullName: " Paciente   Sintético ",
    birthDate: new Date("1940-01-02T12:00:00.000Z"),
    needsIdentityReview: true,
    activeConsultation: {
      id: "consultation-active-1",
      status: "DRAFT",
      occurredAt: new Date("2026-08-23T12:00:00.000Z"),
    },
  });

  assert.deepEqual(result, {
    id: "patient-synthetic-1",
    fullName: "Paciente Sintético",
    birthDate: "1940-01-02",
    needsIdentityReview: true,
    activeConsultationId: "consultation-active-1",
    activeConsultationStatus: "DRAFT",
    activeConsultationDate: "2026-08-23",
    destinationPath: "/consultations/consultation-active-1",
  });
  assert.doesNotMatch(JSON.stringify(result), /phone|cpf|cns|identifier/i);
});

test("paciente sem consulta ativa continua acessível pelo resumo longitudinal", () => {
  const result = toPatientSelectionResult({
    id: "patient-synthetic-2",
    fullName: "Paciente Sem Consulta",
    birthDate: null,
    needsIdentityReview: false,
  });

  assert.equal(result.destinationPath, "/patients/patient-synthetic-2");
  assert.equal(result.activeConsultationId, null);
  assert.equal(result.activeConsultationStatus, null);
});

test("401, 403, 400 e 500 são mensagens de erro distintas e nunca viram ausência de paciente", () => {
  assert.deepEqual(patientSearchFailureFeedback(401, { code: "AUTHENTICATION_REQUIRED" }), {
    kind: "authentication",
    message: "Sua sessão expirou. Entre novamente para localizar pacientes.",
  });
  assert.equal(patientSearchFailureFeedback(403, { code: "ACCESS_FORBIDDEN" }).kind, "permission");
  assert.equal(patientSearchFailureFeedback(400, {
    code: "INVALID_PATIENT_SEARCH",
    message: "Busca sintética inválida.",
  }).message, "Busca sintética inválida.");
  assert.equal(patientSearchFailureFeedback(500, { code: "PATIENT_SEARCH_FAILED" }).kind, "server");
  assert.doesNotMatch(patientSearchFailureFeedback(500).message, /nenhum paciente encontrado/i);
});

test("serviço exige patient.read, tenta o índice canônico e limita o fallback legado", () => {
  const boundarySource = readFileSync(
    new URL("../../src/server/patients/search-patients.ts", import.meta.url),
    "utf8",
  );
  const databaseSource = readFileSync(
    new URL("../../src/server/patients/search-patients-database.ts", import.meta.url),
    "utf8",
  );

  assert.equal(PATIENT_SEARCH_LIMIT, 8);
  assert.equal(PATIENT_SEARCH_CANDIDATE_MULTIPLIER, 4);
  assert.equal(PATIENT_SEARCH_FALLBACK_PAGE_SIZE, 100);
  assert.equal(PATIENT_SEARCH_FALLBACK_MAX_PAGES, 20);
  assert.match(boundarySource, /requireAuthenticatedUser\("patient\.read"\)/);
  assert.match(boundarySource, /searchPatientsInDatabase\(prisma, query\)/);
  assert.match(databaseSource, /normalizedFullName/);
  assert.match(databaseSource, /sourceNameCandidates/);
  assert.match(databaseSource, /fullName:\s*\{ contains: normalizedQuery \}/);
  assert.match(databaseSource, /patientNameMatchesSearch/);
  assert.match(databaseSource, /PATIENT_SEARCH_FALLBACK_PAGE_SIZE/);
  assert.match(databaseSource, /PATIENT_SEARCH_FALLBACK_MAX_PAGES/);
  assert.match(databaseSource, /cursor:\s*\{ id: cursor \}/);
  assert.match(databaseSource, /orderBy:\s*\{ id: "asc" \}/);
  assert.doesNotMatch(databaseSource, /while \(matched\.size < PATIENT_SEARCH_LIMIT\)/);
  assert.match(databaseSource, /status:[\s\S]*DRAFT[\s\S]*IN_REVIEW/);
  assert.doesNotMatch(databaseSource, /phone:\s*true/);
  assert.doesNotMatch(databaseSource, /caregiverPhone:\s*true/);
  assert.doesNotMatch(databaseSource, /identifiers:\s*true/);
});

test("resultado indexado encerra a busca sem varreduras legadas adicionais", async () => {
  let calls = 0;
  const indexedPatient = {
    id: "patient-indexed",
    fullName: "Maria Clara Andrade",
    birthDate: new Date("1944-03-20T12:00:00.000Z"),
    needsIdentityReview: false,
    consultations: [],
  };
  const client = {
    patient: {
      findMany: async () => {
        calls += 1;
        if (calls <= 2) return [indexedPatient];
        throw new Error("fallback legado não deveria executar após resultado indexado");
      },
    },
  } as unknown as Parameters<typeof searchPatientsInDatabase>[0];

  const results = await searchPatientsInDatabase(client, "Maria Clara");

  assert.equal(calls, 2, "uma consulta localiza e outra hidrata somente os resultados finais");
  assert.deepEqual(results.map((patient) => patient.id), ["patient-indexed"]);
});

test("nome-fonte legado só é consultado quando o índice não encontra paciente", async () => {
  let calls = 0;
  const legacyPatient = {
    id: "patient-legacy",
    fullName: "José Ávila Souza",
    birthDate: new Date("1941-04-12T12:00:00.000Z"),
    needsIdentityReview: false,
    consultations: [],
  };
  const client = {
    patient: {
      findMany: async () => {
        calls += 1;
        if (calls === 1) return [];
        if (calls <= 3) return [legacyPatient];
        throw new Error("scan paginado não deveria executar após resultado no nome-fonte");
      },
    },
  } as unknown as Parameters<typeof searchPatientsInDatabase>[0];

  const results = await searchPatientsInDatabase(client, "Jose Avila");

  assert.equal(calls, 3, "índice, nome-fonte e hidratação final são consultas separadas");
  assert.deepEqual(results.map((patient) => patient.id), ["patient-legacy"]);
});

test("falha do índice no MariaDB não impede a busca pelo nome-fonte", async () => {
  let calls = 0;
  const patient = {
    id: "patient-source-fallback",
    fullName: "Idalia Marques da Silva",
    birthDate: new Date("1940-05-12T12:00:00.000Z"),
    needsIdentityReview: false,
    consultations: [],
  };
  const client = {
    patient: {
      findMany: async () => {
        calls += 1;
        if (calls === 1) throw new Error("índice derivado indisponível");
        return [patient];
      },
    },
  } as unknown as Parameters<typeof searchPatientsInDatabase>[0];

  const results = await searchPatientsInDatabase(client, "Idalia Marques da Silva");

  assert.equal(calls, 3);
  assert.deepEqual(results.map((result) => result.id), [patient.id]);
});

test("falha ao hidratar consulta ativa ainda devolve o paciente localizado", async () => {
  let calls = 0;
  const patient = {
    id: "patient-hydration-fallback",
    fullName: "Paciente Localizado",
    birthDate: null,
    needsIdentityReview: false,
  };
  const client = {
    patient: {
      findMany: async () => {
        calls += 1;
        if (calls === 1) return [patient];
        throw new Error("relação de consultas temporariamente indisponível");
      },
    },
  } as unknown as Parameters<typeof searchPatientsInDatabase>[0];

  const results = await searchPatientsInDatabase(client, "Paciente Localizado");

  assert.equal(calls, 2);
  assert.equal(results[0]?.id, patient.id);
  assert.equal(results[0]?.activeConsultationId, null);
  assert.equal(results[0]?.destinationPath, `/patients/${patient.id}`);
});

test("fronteira HTTP e UI evitam cache, diferenciam falha e usam o destino clínico correto", () => {
  const routeSource = readFileSync(
    new URL("../../src/app/api/patients/search/route.ts", import.meta.url),
    "utf8",
  );
  const finderSource = readFileSync(
    new URL("../../src/components/patients/patient-finder.tsx", import.meta.url),
    "utf8",
  );
  const finderStyles = readFileSync(
    new URL("../../src/components/patients/patient-finder.module.css", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /Cache-Control/);
  assert.match(routeSource, /private, no-store, max-age=0/);
  assert.match(routeSource, /status:\s*401/);
  assert.match(routeSource, /status:\s*403/);
  assert.match(routeSource, /status:\s*400/);
  assert.match(routeSource, /status:\s*500/);
  assert.match(finderSource, /AbortController/);
  assert.match(finderSource, /activeRequest\.current\?\.abort\(\)/);
  assert.match(finderSource, /cache:\s*"no-store"/);
  assert.match(finderSource, /credentials:\s*"same-origin"/);
  assert.match(finderSource, /signal:\s*controller\.signal/);
  assert.match(finderSource, /patientSearchFailureFeedback/);
  assert.match(finderSource, /setResults\(\[\]\)/);
  assert.match(finderSource, /aria-live=\{feedbackIsError \? "assertive" : "polite"\}/);
  assert.match(finderSource, /patient\.fullName/);
  assert.match(finderSource, /href=\{patient\.destinationPath\}/);
  assert.match(finderSource, /Continuar consulta/);
  assert.match(finderSource, /Paciente localizado/);
  assert.match(finderSource, /Nenhum paciente encontrado/);
  assert.match(finderStyles, /\.resultName/);
  assert.match(finderStyles, /font-size:\s*17px/);
  assert.match(finderStyles, /font-weight:\s*850/);
  assert.match(finderStyles, /var\(--primary-soft\)/);
});
