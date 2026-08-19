import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPatientIdentifierFormat,
  findDuplicateCandidates,
  normalizePatientIdentifier,
  normalizePersonName,
  patientIdentityFingerprint,
  preferredDuplicateCandidate,
} from "../../src/domain/patient-identity.ts";

test("nome é normalizado por espaços, caixa e acentuação", () => {
  assert.equal(normalizePersonName("  MARIA   José  DA Silva "), "maria jose da silva");
});

test("identificadores fortes inválidos não participam da deduplicação", () => {
  assert.throws(() => assertPatientIdentifierFormat({ type: "CPF", value: "123" }), /11 dígitos/);
  assert.throws(() => assertPatientIdentifierFormat({ type: "CNS", value: "123" }), /15 dígitos/);
});

test("mesmo nome normalizado e nascimento bloqueiam novo cadastro", () => {
  const candidates = findDuplicateCandidates({
    incoming: { fullName: "Maria José", birthDate: "1940-05-02" },
    existing: [{ id: "p1", fullName: " maria jose ", birthDate: "1940-05-02" }],
  });
  assert.deepEqual(candidates, [{ patientId: "p1", reason: "same-name-and-birth-date", blocksAutomaticCreation: true }]);
});

test("mesmo nome com nascimento diferente preserva homônimos", () => {
  const candidates = findDuplicateCandidates({
    incoming: { fullName: "Maria José", birthDate: "1940-05-02" },
    existing: [{ id: "p1", fullName: "Maria Jose", birthDate: "1942-05-02" }],
  });
  assert.deepEqual(candidates, []);
});

test("identificador forte igual bloqueia mesmo com nome diferente", () => {
  const candidates = findDuplicateCandidates({
    incoming: { fullName: "Maria A", identifiers: [{ type: "CPF", value: "123.456.789-00" }] },
    existing: [{ id: "p1", fullName: "Maria B", identifiers: [{ type: "CPF", value: "12345678900" }] }],
  });
  assert.equal(candidates[0]?.reason, "strong-identifier");
  assert.equal(normalizePatientIdentifier("CPF", "123.456.789-00"), "12345678900");
});

test("identificador forte prevalece quando existem múltiplos candidatos de duplicidade", () => {
  const preferred = preferredDuplicateCandidate([
    { patientId: "nome-data", reason: "same-name-and-birth-date", blocksAutomaticCreation: true },
    { patientId: "identificador", reason: "strong-identifier", blocksAutomaticCreation: true },
  ]);
  assert.deepEqual(preferred, {
    patientId: "identificador",
    reason: "strong-identifier",
    blocksAutomaticCreation: true,
  });
});

test("fingerprint é determinístico e não confunde datas diferentes", () => {
  assert.equal(patientIdentityFingerprint({ fullName: "João Silva", birthDate: "1930-01-01" }), "joao silva::1930-01-01");
  assert.notEqual(
    patientIdentityFingerprint({ fullName: "João Silva", birthDate: "1930-01-01" }),
    patientIdentityFingerprint({ fullName: "João Silva", birthDate: "1931-01-01" }),
  );
});
