import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertPatientSearchQuery,
  PATIENT_SEARCH_CANDIDATE_MULTIPLIER,
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

test("resultado de seleção expõe somente dados mínimos para diferenciar o paciente", () => {
  const result = toPatientSelectionResult({
    id: "patient-synthetic-1",
    fullName: " Paciente   Sintético ",
    birthDate: new Date("1940-01-02T12:00:00.000Z"),
    needsIdentityReview: true,
  });

  assert.deepEqual(result, {
    id: "patient-synthetic-1",
    fullName: "Paciente Sintético",
    birthDate: "1940-01-02",
    needsIdentityReview: true,
  });
  assert.deepEqual(Object.keys(result).sort(), ["birthDate", "fullName", "id", "needsIdentityReview"]);
});

test("serviço exige patient.read, combina índice normalizado com fallback e mantém limite final", () => {
  const source = readFileSync(
    new URL("../../src/server/patients/search-patients.ts", import.meta.url),
    "utf8",
  );

  assert.equal(PATIENT_SEARCH_LIMIT, 8);
  assert.equal(PATIENT_SEARCH_CANDIDATE_MULTIPLIER, 4);
  assert.match(source, /requireAuthenticatedUser\("patient\.read"\)/);
  assert.match(source, /normalizedFullName/);
  assert.match(source, /fullName/);
  assert.match(source, /patientNameMatchesSearch/);
  assert.match(source, /slice\(0, PATIENT_SEARCH_LIMIT\)/);
  assert.doesNotMatch(source, /phone:\s*true/);
  assert.doesNotMatch(source, /caregiverPhone:\s*true/);
  assert.doesNotMatch(source, /identifiers:\s*true/);
});

test("fronteira HTTP e UI evitam cache e resultado obsoleto de requisição anterior", () => {
  const routeSource = readFileSync(
    new URL("../../src/app/api/patients/search/route.ts", import.meta.url),
    "utf8",
  );
  const finderSource = readFileSync(
    new URL("../../src/components/patients/patient-finder.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /Cache-Control/);
  assert.match(routeSource, /no-store/);
  assert.match(finderSource, /AbortController/);
  assert.match(finderSource, /activeRequest\.current\?\.abort\(\)/);
  assert.match(finderSource, /cache:\s*"no-store"/);
  assert.match(finderSource, /signal:\s*controller\.signal/);
});
