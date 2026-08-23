import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertPatientSearchQuery,
  PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
  PATIENT_SEARCH_FALLBACK_PAGE_SIZE,
  PATIENT_SEARCH_LIMIT,
  patientNameMatchesSearch,
  patientSearchTerms,
  toPatientSelectionResult,
} from "../../src/domain/patient-search.ts";

test("busca de paciente normaliza acentos, caixa e espaços e exige dois caracteres", () => {
  assert.equal(assertPatientSearchQuery("  MÁria   da SILVA  "), "maria da silva");
  assert.equal(assertPatientSearchQuery("Ál"), "al");
  assert.throws(
    () => assertPatientSearchQuery(" a "),
    /pelo menos 2 caracteres/i,
  );
});

test("busca aceita nome completo, parcial, acentos, caixa e ordem de termos", () => {
  const fullName = "Maria Clara de Ávila Andrade";

  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Maria Clara Andrade")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("maria clara")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("MARIA")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Avila")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("  Andrade   Maria  ")), true);
  assert.equal(patientNameMatchesSearch(fullName, assertPatientSearchQuery("Mariana")), false);
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

test("serviço exige patient.read, tenta índice e possui fallback paginado determinístico", () => {
  const source = readFileSync(
    new URL("../../src/server/patients/search-patients.ts", import.meta.url),
    "utf8",
  );

  assert.equal(PATIENT_SEARCH_LIMIT, 8);
  assert.equal(PATIENT_SEARCH_CANDIDATE_MULTIPLIER, 4);
  assert.equal(PATIENT_SEARCH_FALLBACK_PAGE_SIZE, 100);
  assert.match(source, /requireAuthenticatedUser\("patient\.read"\)/);
  assert.match(source, /normalizedFullName/);
  assert.match(source, /patientNameMatchesSearch/);
  assert.match(source, /PATIENT_SEARCH_FALLBACK_PAGE_SIZE/);
  assert.match(source, /while \(matched\.size < PATIENT_SEARCH_LIMIT\)/);
  assert.match(source, /skip,/);
  assert.match(source, /status:[\s\S]*DRAFT[\s\S]*IN_REVIEW/);
  assert.doesNotMatch(source, /phone:\s*true/);
  assert.doesNotMatch(source, /caregiverPhone:\s*true/);
  assert.doesNotMatch(source, /identifiers:\s*true/);
});

test("fronteira HTTP e UI evitam cache, mostram o nome e usam o destino clínico correto", () => {
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
  assert.match(routeSource, /no-store/);
  assert.match(finderSource, /AbortController/);
  assert.match(finderSource, /activeRequest\.current\?\.abort\(\)/);
  assert.match(finderSource, /cache:\s*"no-store"/);
  assert.match(finderSource, /signal:\s*controller\.signal/);
  assert.match(finderSource, /patient\.fullName/);
  assert.match(finderSource, /href=\{patient\.destinationPath\}/);
  assert.match(finderSource, /Continuar consulta/);
  assert.match(finderSource, /Paciente localizado/);
  assert.match(finderStyles, /\.resultName/);
  assert.match(finderStyles, /font-size:\s*17px/);
  assert.match(finderStyles, /font-weight:\s*850/);
  assert.match(finderStyles, /var\(--primary-soft\)/);
});
