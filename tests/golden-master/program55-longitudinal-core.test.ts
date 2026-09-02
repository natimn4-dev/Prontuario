import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildProgram55CheckpointPlan } from "../../src/domain/program55/checkpoints.ts";
import {
  canManageProgram55,
  canReadRestrictedPsychologyNote,
  canWriteProgram55Discipline,
  canWriteProgram55SharedData,
  canWriteRestrictedPsychologyNote,
  type Program55ActorAccess,
} from "../../src/domain/program55/access.ts";

const BASELINE = new Date("2026-09-02T12:00:00.000Z");

test("Programa 55+ cria plano longitudinal baseline/90/180/365 sem alterar consulta", () => {
  const plan = buildProgram55CheckpointPlan(BASELINE);
  assert.deepEqual(plan.map((item) => item.checkpointType), ["BASELINE", "DAY_90", "DAY_180", "YEAR_1"]);
  assert.equal(plan[0].referenceDate.toISOString(), "2026-09-02T12:00:00.000Z");
  assert.equal(plan[1].referenceDate.toISOString(), "2026-12-01T12:00:00.000Z");
  assert.equal(plan[2].referenceDate.toISOString(), "2027-03-01T12:00:00.000Z");
  assert.equal(plan[3].referenceDate.toISOString(), "2027-09-02T12:00:00.000Z");
});

test("READ_ONLY sem participação não escreve no Programa 55+", () => {
  const actor: Program55ActorAccess = { userId: "readonly", role: "READ_ONLY", memberships: [] };
  assert.equal(canManageProgram55(actor), false);
  assert.equal(canWriteProgram55SharedData(actor), false);
  assert.equal(canWriteProgram55Discipline(actor, "NUTRITION"), false);
  assert.equal(canWriteRestrictedPsychologyNote(actor), false);
});

test("participação profissional é limitada ao próprio domínio", () => {
  const actor: Program55ActorAccess = {
    userId: "nutritionist",
    role: "READ_ONLY",
    memberships: [{ discipline: "NUTRITION", active: true }],
  };
  assert.equal(canWriteProgram55SharedData(actor), true);
  assert.equal(canWriteProgram55Discipline(actor, "NUTRITION"), true);
  assert.equal(canWriteProgram55Discipline(actor, "PHYSIOTHERAPY"), false);
  assert.equal(canWriteProgram55Discipline(actor, "PSYCHOLOGY"), false);
  assert.equal(canWriteProgram55Discipline(actor, "PHYSICIAN"), false);
});

test("médico mantém coordenação e escrita do domínio médico sem ganhar domínio aliado", () => {
  const actor: Program55ActorAccess = { userId: "doctor", role: "PHYSICIAN", memberships: [] };
  assert.equal(canManageProgram55(actor), true);
  assert.equal(canWriteProgram55SharedData(actor), true);
  assert.equal(canWriteProgram55Discipline(actor, "PHYSICIAN"), true);
  assert.equal(canWriteProgram55Discipline(actor, "NUTRITION"), false);
  assert.equal(canWriteProgram55Discipline(actor, "PSYCHOLOGY"), false);
});

test("nota restrita de psicologia só é acessível ao autor ou psicologia autorizada", () => {
  const physician: Program55ActorAccess = { userId: "doctor", role: "PHYSICIAN", memberships: [] };
  const psychologist: Program55ActorAccess = { userId: "psych", role: "READ_ONLY", memberships: [{ discipline: "PSYCHOLOGY", active: true }] };
  assert.equal(canReadRestrictedPsychologyNote(physician, "psych"), false);
  assert.equal(canReadRestrictedPsychologyNote(psychologist, "other-psych"), true);
  assert.equal(canWriteRestrictedPsychologyNote(psychologist), true);
});

test("migration do núcleo 55+ é aditiva e não altera tabelas clínicas existentes", () => {
  const migration = readFileSync("prisma/migrations/20260902192000_program55_longitudinal_core/migration.sql", "utf8");
  for (const table of ["User", "Patient", "Consultation", "ScaleAssessment", "Medication", "DocumentSnapshot", "AuditEvent"]) {
    assert.doesNotMatch(migration, new RegExp("ALTER TABLE `" + table + "`"));
    assert.doesNotMatch(migration, new RegExp("DROP TABLE `" + table + "`"));
  }
  assert.match(migration, /CREATE TABLE `Program55Enrollment`/);
  assert.match(migration, /CREATE TABLE `Program55Checkpoint`/);
  assert.match(migration, /CREATE TABLE `Program55BodyComposition`/);
  assert.match(migration, /CREATE TABLE `Program55ProfessionalAssessment`/);
  assert.match(migration, /CREATE TABLE `Program55RestrictedPsychologyNote`/);
  assert.match(migration, /CREATE TABLE `Program55Goal`/);
});
