import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertAccessProfilePermission,
  assertActiveAllowedUser,
  assertCanChangeAdminState,
  assertCanChangeUserManagerState,
  assertPermission,
  assertRecentAuthentication,
  isEmailAllowed,
  parseEmailSet,
  roleForFirstLogin,
  roleForProfessional,
} from "../../src/domain/security/auth-policy.ts";

const allowed = parseEmailSet("medica@example.com; admin@example.com");
const authServer = readFileSync("src/server/auth/auth.ts", "utf8");
const requireUserServer = readFileSync("src/server/auth/require-user.ts", "utf8");
const loginPage = readFileSync("src/app/login/page.tsx", "utf8");
const approvedProductionPrincipalFingerprints = [
  "f3edb3d5dbf548434e230325bc7835275146d04fcc65dcf55d83385956691210",
  "b233416c9c9fecdd75ad43613d16cb2515c19c2ff302e56842dbcd64a876de02",
  "7adbe1e0c628a064adf67f5241674295f6fdb6b4f2c09734532121e6db5e35f4",
  "13e72ccddb396665ef006f83eda5bb0d95d093050923a1ba8ca3c5ebde767840",
] as const;

test("allowlist normaliza email e falha fechada fora da lista", () => {
  assert.equal(isEmailAllowed(" MEDICA@example.com ", allowed), true);
  assert.equal(isEmailAllowed("intruso@example.com", allowed), false);
  assert.throws(() => assertActiveAllowedUser({ user: { id: "u", email: "intruso@example.com", role: "PHYSICIAN", active: true }, allowedEmails: allowed }));
});

test("bootstrap define ADMIN somente para email explicitamente configurado", () => {
  const bootstrap = parseEmailSet("admin@example.com");
  assert.equal(roleForFirstLogin({ email: "admin@example.com", bootstrapAdmins: bootstrap }), "ADMIN");
  assert.equal(roleForFirstLogin({ email: "medica@example.com", bootstrapAdmins: bootstrap }), "PHYSICIAN");
});

test("RBAC legado impede usuário somente leitura de alterar prontuário", () => {
  assert.doesNotThrow(() => assertPermission("READ_ONLY", "patient.read"));
  assert.throws(() => assertPermission("READ_ONLY", "consultation.write"));
  assert.doesNotThrow(() => assertPermission("PHYSICIAN", "document.generate"));
  assert.throws(() => assertPermission("PHYSICIAN", "user.manage"));
});

test("perfis multiprofissionais não herdam escrita médica", () => {
  for (const professionalRole of ["FISIOTERAPEUTA", "NUTRICIONISTA", "PSICOLOGO", "FONOAUDIOLOGO"] as const) {
    assert.equal(roleForProfessional(professionalRole), "READ_ONLY");
    assert.doesNotThrow(() => assertAccessProfilePermission({ role: "READ_ONLY", professionalRole, canManageUsers: false }, "patient.read"));
    assert.doesNotThrow(() => assertAccessProfilePermission({ role: "READ_ONLY", professionalRole, canManageUsers: false }, "professional.evolution.write"));
    assert.throws(() => assertAccessProfilePermission({ role: "READ_ONLY", professionalRole, canManageUsers: false }, "consultation.write"));
    assert.throws(() => assertAccessProfilePermission({ role: "READ_ONLY", professionalRole, canManageUsers: false }, "consultation.finalize"));
    assert.throws(() => assertAccessProfilePermission({ role: "READ_ONLY", professionalRole, canManageUsers: false }, "document.generate"));
  }
  assert.equal(roleForProfessional("MEDICO"), "PHYSICIAN");
  assert.doesNotThrow(() => assertAccessProfilePermission({ role: "PHYSICIAN", professionalRole: "MEDICO", canManageUsers: false }, "consultation.write"));
});

test("gestão de usuários é permissão independente da profissão", () => {
  assert.doesNotThrow(() => assertAccessProfilePermission({ role: "READ_ONLY", professionalRole: "NUTRICIONISTA", canManageUsers: true }, "user.manage"));
  assert.throws(() => assertAccessProfilePermission({ role: "PHYSICIAN", professionalRole: "MEDICO", canManageUsers: false }, "user.manage"));
});

test("ações administrativas exigem autenticação recente", () => {
  const now = new Date("2026-08-13T12:00:00Z");
  assert.doesNotThrow(() => assertRecentAuthentication({ authenticatedAt: new Date("2026-08-13T11:55:00Z"), now, maxAgeSeconds: 600 }));
  assert.throws(() => assertRecentAuthentication({ authenticatedAt: new Date("2026-08-13T11:40:00Z"), now, maxAgeSeconds: 600 }));
});

test("último administrador ativo não pode ser removido", () => {
  assert.throws(() => assertCanChangeAdminState({
    targetUserId: "a1", targetRole: "ADMIN", targetActive: true,
    nextRole: "PHYSICIAN", activeAdminIds: ["a1"],
  }));
  assert.doesNotThrow(() => assertCanChangeAdminState({
    targetUserId: "a1", targetRole: "ADMIN", targetActive: true,
    nextActive: false, activeAdminIds: ["a1", "a2"],
  }));
});

test("último gestor de usuários ativo não pode ser removido", () => {
  assert.throws(() => assertCanChangeUserManagerState({
    targetUserId: "m1", targetCanManageUsers: true, targetActive: true,
    nextCanManageUsers: false, activeManagerIds: ["m1"],
  }));
  assert.doesNotThrow(() => assertCanChangeUserManagerState({
    targetUserId: "m1", targetCanManageUsers: true, targetActive: true,
    nextActive: false, activeManagerIds: ["m1", "m2"],
  }));
});

test("regressão: produção mantém exatamente quatro identidades médicas aprovadas sem expor os emails no login", () => {
  assert.equal(approvedProductionPrincipalFingerprints.length, 4);
  for (const fingerprint of approvedProductionPrincipalFingerprints) {
    assert.ok(authServer.includes(fingerprint), `fingerprint de acesso ausente: ${fingerprint.slice(0, 8)}`);
  }
  assert.match(authServer, /isApprovedProductionEmail/);
  assert.doesNotMatch(loginPage, /@gmail\.com/i);
  assert.doesNotMatch(authServer, /natimn4@gmail\.com|draanameliacoutinho@gmail\.com|paulalimaf20@gmail\.com|griloguedes@gmail\.com/i);
});

test("regressão: as quatro identidades aprovadas continuam independentes da allowlist externa", () => {
  const authorizationFunction = authServer.match(/(?:export )?function isAuthorizedEmail\(email: string\): boolean \{[\s\S]*?\n\}/)?.[0] ?? "";
  const productionContractFunction = authServer.match(/function usesApprovedProductionAccessContract\(\): boolean \{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(authorizationFunction, /if \(isApprovedProductionEmail\(email\)\) return true;/);
  assert.match(authorizationFunction, /usesApprovedProductionAccessContract\(\)/);
  assert.match(productionContractFunction, /process\.env\.NODE_ENV === "production"[\s\S]*\|\|[\s\S]*canonicalProductionAppUrl/);
});

test("novos logins dependem de pré-autorização persistida e rotas protegidas reconhecem acesso gerenciado", () => {
  assert.match(authServer, /prisma\.userAccessGrant\.findFirst/);
  assert.match(authServer, /accessManaged: Boolean\(grant\)/);
  assert.match(authServer, /!user\.accessManaged && !isAuthorizedEmail\(user\.email\)/);
  assert.match(requireUserServer, /assertAccessProfilePermission/);
  assert.match(requireUserServer, /!user\.accessManaged && !isAuthorizedEmail\(user\.email\)/);
  assert.doesNotMatch(requireUserServer, /AUTH_ALLOWED_EMAILS/);
});
