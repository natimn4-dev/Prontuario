import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { chromium } from "playwright";
import { isCiE2EAuthEnvironment } from "../src/domain/security/ci-e2e-auth-policy.ts";

function databaseConfig() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL não configurada.");
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname,
    connectionLimit: 2,
  };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseConfig()) });
const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const secret = process.env.E2E_AUTH_SECRET ?? "";
const email = "ci-e2e-dietary@example.com";
const userId = "ci-e2e-user-dietary";
const assignedPatientId = "ci-e2e-patient-assigned";
const unassignedPatientId = "ci-e2e-patient-unassigned";
const assignedConsultationId = "ci-e2e-consultation-assigned";
const unlinkedOncoConsultationId = "ci-e2e-consultation-onco-unlinked";
const unassignedConsultationId = "ci-e2e-consultation-unassigned";
const oncogeriatricEpisodeId = "ci-e2e-onco-episode";
const oncogeriatricCourseId = "ci-e2e-onco-course";
const oncogeriatricCheckpointId = "ci-e2e-onco-checkpoint";

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function cleanup() {
  await prisma.clinicalExamRecord.deleteMany({ where: { consultationId: assignedConsultationId } });
  await prisma.problemEvent.deleteMany({ where: { consultationId: assignedConsultationId } });
  await prisma.clinicalProblem.deleteMany({ where: { originConsultationId: assignedConsultationId } });
  await prisma.oncogeriatricOperationReceipt.deleteMany({ where: { patientId: assignedPatientId } });
  await prisma.oncogeriatricCheckpoint.deleteMany({ where: { id: oncogeriatricCheckpointId } });
  await prisma.oncogeriatricTreatmentCourse.deleteMany({ where: { id: oncogeriatricCourseId } });
  await prisma.oncogeriatricEpisode.deleteMany({ where: { id: oncogeriatricEpisodeId } });
  await prisma.auditEvent.deleteMany({ where: { userId } });
  await prisma.patientUserAssignment.deleteMany({
    where: { OR: [{ userId }, { assignedByUserId: userId }] },
  });
  await prisma.consultation.deleteMany({
    where: { id: { in: [assignedConsultationId, unlinkedOncoConsultationId, unassignedConsultationId] } },
  });
  await prisma.patient.deleteMany({
    where: { id: { in: [assignedPatientId, unassignedPatientId] } },
  });
  await prisma.user.deleteMany({ where: { id: userId } });
}

async function seed() {
  await cleanup();

  await prisma.user.create({
    data: {
      id: userId,
      email,
      emailVerified: true,
      name: "Usuária Sintética E2E",
      role: "PHYSICIAN",
      active: true,
      professionalRole: "MEDICO",
      patientAccessScope: "ASSIGNED_PATIENTS",
      canManageUsers: false,
      accessManaged: true,
    },
  });

  await prisma.patient.createMany({
    data: [
      {
        id: assignedPatientId,
        fullName: "Paciente Sintético E2E A",
        normalizedFullName: "paciente sintetico e2e a",
        identityFingerprint: fingerprint("ci-e2e-patient-a"),
      },
      {
        id: unassignedPatientId,
        fullName: "Paciente Sintético E2E B",
        normalizedFullName: "paciente sintetico e2e b",
        identityFingerprint: fingerprint("ci-e2e-patient-b"),
      },
    ],
  });

  await prisma.consultation.createMany({
    data: [
      {
        id: assignedConsultationId,
        patientId: assignedPatientId,
        physicianId: userId,
        type: "FOLLOW_UP",
        status: "DRAFT",
        occurredAt: new Date("2026-01-15T12:00:00.000Z"),
      },
      {
        id: unlinkedOncoConsultationId,
        patientId: assignedPatientId,
        physicianId: userId,
        type: "FOLLOW_UP",
        status: "DRAFT",
        occurredAt: new Date("2026-02-15T12:00:00.000Z"),
      },
      {
        id: unassignedConsultationId,
        patientId: unassignedPatientId,
        physicianId: userId,
        type: "FOLLOW_UP",
        status: "DRAFT",
        occurredAt: new Date("2026-01-15T12:30:00.000Z"),
      },
    ],
  });

  await prisma.patientUserAssignment.create({
    data: {
      userId,
      patientId: assignedPatientId,
      assignedByUserId: userId,
      active: true,
    },
  });
  await prisma.oncogeriatricEpisode.create({ data: { id: oncogeriatricEpisodeId, patientId: assignedPatientId, diagnosis: "Neoplasia sintética E2E", createdById: userId } });
  await prisma.oncogeriatricTreatmentCourse.create({ data: { id: oncogeriatricCourseId, patientId: assignedPatientId, episodeId: oncogeriatricEpisodeId, modality: "SYSTEMIC", intent: "CURATIVE", regimenName: "Esquema sintético", status: "ACTIVE", createdById: userId } });
  await prisma.oncogeriatricCheckpoint.create({ data: { id: oncogeriatricCheckpointId, patientId: assignedPatientId, episodeId: oncogeriatricEpisodeId, treatmentCourseId: oncogeriatricCourseId, consultationId: assignedConsultationId, type: "PRE_TREATMENT", occurredAt: new Date("2026-01-15T12:00:00.000Z"), createdById: userId } });
}

async function request(path: string, authenticated: boolean, body?: Record<string, unknown>) {
  const headers = new Headers({ "cache-control": "no-cache" });
  if (body) headers.set("content-type", "application/json");
  if (authenticated) {
    headers.set("x-prontuario-e2e-user", email);
    headers.set("x-prontuario-e2e-secret", secret);
  }
  return fetch(new URL(path, baseUrl), {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers,
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
}

async function verifyScalesInBrowser() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    await page.setExtraHTTPHeaders({ "x-prontuario-e2e-user": email, "x-prontuario-e2e-secret": secret });
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    const treatmentUrl = `${baseUrl}/patients/${assignedPatientId}/oncogeriatria/tratamento?episode=${oncogeriatricEpisodeId}`;
    await page.goto(treatmentUrl, { waitUntil: "domcontentloaded" });
    await page.getByRole("navigation", { name: "Campos clínicos da consulta de trabalho" }).getByRole("link", { name: /Escalas clínicas/ }).click();
    await page.waitForURL(/\/oncogeriatria\/escalas\?episode=/);
    await page.getByRole("heading", { name: "Escalas clínicas", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
    assert.ok(await page.locator("#escalas fieldset").count(), "A tela deve mostrar o catálogo preenchível, não apenas um painel vazio.");
    assert.match(await page.locator("main").innerText(), /Esta consulta ainda não está vinculada a um momento oncogeriátrico/);
    await page.screenshot({ path: "/tmp/prontuario-onco-escalas-sinteticas.png", fullPage: true });
    await page.locator('#escalas fieldset input[type="checkbox"]:not([disabled])').first().check();
    await page.locator("#escalas article").waitFor({ state: "visible" });
    assert.ok(await page.getByRole("button", { name: "Salvar avaliação" }).isVisible(), "Selecionar uma escala deve abrir o seu formulário preenchível.");
    await page.screenshot({ path: "/tmp/prontuario-onco-escala-preenchivel-sintetica.png", fullPage: true });

    await page.getByRole("link", { name: /Iniciar momento clínico e preencher CARG/ }).click();
    await page.getByRole("heading", { name: "Iniciar momento clínico" }).waitFor({ state: "visible" });
    assert.equal(await page.locator('select[name="consultationId"]').inputValue(), unlinkedOncoConsultationId);
    await page.screenshot({ path: "/tmp/prontuario-onco-carg-inicial-sintetico.png", fullPage: true });
    await page.goto(`${baseUrl}/patients/${assignedPatientId}/oncogeriatria/avaliacao?episode=${oncogeriatricEpisodeId}&checkpoint=${oncogeriatricCheckpointId}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Continuar para as demais escalas desta consulta/ }).click();
    await page.locator("#escalas fieldset").first().waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({ path: "/tmp/prontuario-onco-carg-para-escalas-sinteticas.png", fullPage: true });
    assert.deepEqual(failures, [], "O navegador não pode apresentar erro de execução durante a passagem das escalas ao CARG.");
  } finally {
    await browser.close();
  }
}


async function verifySoapPersistence() {
  const headers = { "x-prontuario-e2e-user": email, "x-prontuario-e2e-secret": secret, "content-type": "application/json" };
  const path = `/api/consultations/${assignedConsultationId}/note`;
  type Note = { updatedAt: string; noteVersion: string; fields: { subjective?: string; physicalExam?: string; vitalSigns?: string; anthropometry?: string; vaccinationReview?: { status: string; pendingVaccines?: string[] }; preventiveExamOrders?: string[]; planByProblem?: Record<string, string[]> }; exams: { current: string } };
  async function read(): Promise<Note> {
    const response = await request(path, true);
    assert.equal(response.status, 200);
    return response.json() as Promise<Note>;
  }
  async function put(note: Note, fields: Record<string, unknown>, expectedStatus = 200) {
    const response = await fetch(new URL(path, baseUrl), { method: "PUT", headers, body: JSON.stringify({ expectedUpdatedAt: note.updatedAt, expectedNoteVersion: note.noteVersion, ...fields }) });
    assert.equal(response.status, expectedStatus, `SOAP PUT deve retornar ${expectedStatus}`);
    return response.json() as Promise<Note>;
  }
  const problemId = "ci-e2e-soap-resolved";
  await prisma.clinicalProblem.create({ data: { id: problemId, patientId: assignedPatientId, originConsultationId: assignedConsultationId, type: "CLINICAL", status: "RESOLVED", title: "Problema sintético resolvido" } });
  const initial = await read();
  const saved = await put(initial, { subjective: "  Evolução sintética inicial  ", physicalExam: "Exame sintético", vitalSigns: "PA sintética", anthropometry: "", vaccinationReview: { status: "PENDING", pendingVaccines: ["Influenza"] }, examsText: "Exames sintéticos", planByProblem: { [problemId]: ["Conduta histórica sintética"] }, preventiveExamOrders: ["LABORATORY_TESTS", "MAMMOGRAPHY"] });
  const reread = await read();
  assert.equal(saved.noteVersion, reread.noteVersion, "PUT e GET devem devolver a mesma versão normalizada");
  assert.equal(saved.fields.subjective, "Evolução sintética inicial");
  const second = await put(saved, { subjective: "Segunda evolução sintética" });
  assert.equal(second.fields.physicalExam, "Exame sintético", "Campo omitido permanece salvo");
  assert.deepEqual(second.fields.planByProblem?.[problemId], ["Conduta histórica sintética"]);
  assert.equal(second.exams.current, "Exames sintéticos");
  assert.equal(second.fields.vitalSigns, "PA sintética");
  assert.deepEqual(second.fields.vaccinationReview, { status: "PENDING", pendingVaccines: ["Influenza"] });
  assert.deepEqual(second.fields.preventiveExamOrders, ["LABORATORY_TESTS", "MAMMOGRAPHY"]);
  await put(saved, { subjective: "Versão desatualizada" }, 409);
  const denied = await fetch(new URL(`/api/consultations/${unassignedConsultationId}/note`, baseUrl), { method: "PUT", headers, body: JSON.stringify({ expectedUpdatedAt: second.updatedAt, expectedNoteVersion: second.noteVersion, subjective: "Isolamento sintético" }) });
  assert.equal(denied.status, 403);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
    await page.setExtraHTTPHeaders(headers);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${baseUrl}/consultations/${assignedConsultationId}#soap`);
    const subjective = page.getByLabel("Motivo da consulta, HDA e informações da paciente/acompanhante");
    await subjective.waitFor({ timeout: 30_000 });
    await subjective.fill("Texto enviado ao salvar");
    let releaseResponse!: () => void;
    const responseGate = new Promise<void>(resolve => { releaseResponse = resolve; });
    let markRequest!: () => void;
    const requestStarted = new Promise<void>(resolve => { markRequest = resolve; });
    await page.route(`**${path}`, async route => {
      if (route.request().method() !== "PUT") { await route.continue(); return; }
      const response = await route.fetch();
      markRequest();
      await responseGate;
      await route.fulfill({ response });
    });
    await page.getByRole("button", { name: "Salvar evolução e plano", exact: true }).first().click();
    await requestStarted;
    await subjective.fill("Texto posterior que precisa continuar pendente");
    releaseResponse();
    await page.getByText("A versão enviada foi salva. Há alterações posteriores ainda não salvas; salve novamente antes de sair.", { exact: true }).waitFor();
    assert.equal(await subjective.inputValue(), "Texto posterior que precisa continuar pendente");
    await page.unroute(`**${path}`);
    await page.getByRole("button", { name: "Salvar evolução e plano", exact: true }).first().click();
    await page.getByText("Evolução, exames, vacinas, solicitações e plano/condutas salvos nesta consulta.", { exact: true }).waitFor();
    await page.reload();
    await subjective.waitFor({ timeout: 30_000 });
    assert.equal(await subjective.inputValue(), "Texto posterior que precisa continuar pendente");
    const final = await read();
    assert.deepEqual(final.fields.planByProblem?.[problemId], ["Conduta histórica sintética"]);
    assert.equal(final.fields.physicalExam, "Exame sintético");
    assert.deepEqual(final.fields.vaccinationReview, { status: "PENDING", pendingVaccines: ["Influenza"] });
    assert.deepEqual(final.fields.preventiveExamOrders, ["LABORATORY_TESTS", "MAMMOGRAPHY"]);
    await page.screenshot({ path: "/tmp/prontuario-soap-persistencia-sintetica.png", fullPage: true });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  console.log("SOAP_PERSISTENCE_E2E=ROUNDTRIP_LATENCY_HISTORY_ISOLATION_OK");
}

async function main() {
  assert.equal(isCiE2EAuthEnvironment(), true, "O smoke E2E recusou o ambiente: a trava de segurança não foi satisfeita.");
  assert.ok(secret.length >= 32, "E2E_AUTH_SECRET ausente ou curta.");
  assert.match(baseUrl, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/);

  await seed();
  await verifySoapPersistence();

  const patientPage = await request(
    `/patients/${assignedPatientId}`,
    true,
  );
  assert.equal(
    patientPage.status,
    200,
    `A página autenticada do paciente sintético falhou com HTTP ${patientPage.status}.`,
  );

  const anonymous = await request(
    `/api/consultations/${assignedConsultationId}/dietary-assessment`,
    false,
  );
  assert.equal(anonymous.status, 401, "A rota clínica deveria exigir autenticação.");

  const allowed = await request(
    `/api/consultations/${assignedConsultationId}/dietary-assessment`,
    true,
  );
  assert.equal(allowed.status, 200, `A consulta sintética atribuída falhou com HTTP ${allowed.status}.`);
  const payload = await allowed.json() as { consultationId?: string; assessment?: unknown };
  assert.equal(payload.consultationId, assignedConsultationId);
  assert.equal(payload.assessment, null);

  const denied = await request(
    `/api/consultations/${unassignedConsultationId}/dietary-assessment`,
    true,
  );
  assert.equal(denied.status, 403, "O smoke deve provar isolamento de paciente para usuário ASSIGNED_PATIENTS.");

  const deniedBody = await denied.json() as { code?: string };
  assert.equal(deniedBody.code, "ACCESS_FORBIDDEN");

  const audit = await prisma.auditEvent.findFirst({
    where: {
      userId,
      entityType: "Patient",
      entityId: unassignedPatientId,
      action: "patient.access.denied_unassigned",
      outcome: "denied",
    },
  });
  assert.ok(audit, "A tentativa de acesso ao paciente não atribuído precisa deixar trilha de auditoria.");

  const oncoPath = `/patients/${assignedPatientId}/oncogeriatria`;
  const episodeQuery = `?episode=${oncogeriatricEpisodeId}`;
  const scales = await request(`${oncoPath}/avaliacao${episodeQuery}&checkpoint=${oncogeriatricCheckpointId}`, true);
  assert.equal(scales.status, 200);
  const scalesHtml = await scales.text();
  assert.match(scalesHtml, /Demais escalas por domínio/);
  assert.match(scalesHtml, /clinical-scales-title|Carregando escalas clínicas/);
  const scalesWorkspace = await request(`/api/consultations/${assignedConsultationId}/scales/workspace`, true);
  assert.equal(scalesWorkspace.status, 200, "O catálogo de escalas da consulta vinculada deve carregar.");
  const scalesPage = await request(`${oncoPath}/escalas${episodeQuery}&consultation=${assignedConsultationId}`, true);
  assert.equal(scalesPage.status, 200);
  const scalesPageHtml = await scalesPage.text();
  assert.match(scalesPageHtml, /Abrir ou revisar CARG deste momento/);
  assert.match(scalesPageHtml, /Escalas clínicas da consulta/);
  const unlinkedScales = await request(`${oncoPath}/escalas${episodeQuery}&consultation=${unlinkedOncoConsultationId}`, true);
  assert.equal(unlinkedScales.status, 200);
  assert.match(await unlinkedScales.text(), /Iniciar momento clínico e preencher CARG nesta consulta/);
  const inaccessibleScales = await request(`/patients/${unassignedPatientId}/oncogeriatria/escalas${episodeQuery}&consultation=${unassignedConsultationId}`, true);
  assert.equal(inaccessibleScales.status, 404, "Página oncogeriátrica de paciente não atribuído não pode expor identidade ou escalas.");
  const treatmentPage = await request(`${oncoPath}/tratamento${episodeQuery}`, true);
  assert.equal(treatmentPage.status, 200);
  const treatmentHtml = await treatmentPage.text();
  assert.match(treatmentHtml, new RegExp(`/patients/${assignedPatientId}/oncogeriatria/escalas\\?episode=${oncogeriatricEpisodeId}`));
  assert.match(treatmentHtml, /Revisar riscos, efeitos e orientações deste tratamento/);

  const oldCourse = await prisma.oncogeriatricTreatmentCourse.findUniqueOrThrow({ where: { id: oncogeriatricCourseId }, select: { updatedAt: true } });
  const updateBody = { action: "TREATMENT_COURSE_SAFETY_UPDATE", operationId: `ci-e2e-onco-${Date.now()}`, episodeId: oncogeriatricEpisodeId, courseId: oncogeriatricCourseId, expectedUpdatedAt: oldCourse.updatedAt.toISOString(), riskFlags: { selected: ["hema"], commonAdverseEffects: "Efeito sintético confirmado", commonAdverseEffectsSource: "Fonte sintética de teste", clinicianGuidance: "Orientação sintética revisada" } };
  const deniedUpdate = await request(`/api/oncogeriatria/patients/${unassignedPatientId}`, true, updateBody);
  assert.equal(deniedUpdate.status, 403, "Não se pode alterar tratamento de paciente não atribuído.");
  const updated = await request(`/api/oncogeriatria/patients/${assignedPatientId}`, true, updateBody);
  assert.equal(updated.status, 200, `Atualização do tratamento existente falhou: HTTP ${updated.status}.`);
  const replay = await request(`/api/oncogeriatria/patients/${assignedPatientId}`, true, updateBody);
  assert.equal(replay.status, 200, "Repetição da mesma operação deve ser idempotente.");
  const stale = await request(`/api/oncogeriatria/patients/${assignedPatientId}`, true, { ...updateBody, operationId: `ci-e2e-stale-${Date.now()}` });
  assert.equal(stale.status, 409, "Uma versão desatualizada não pode sobrescrever as orientações atuais.");
  const report = await request(`${oncoPath}/relatorio${episodeQuery}`, true);
  assert.equal(report.status, 200);
  const reportHtml = await report.text();
  assert.match(reportHtml, /Efeito sintético confirmado/);
  assert.match(reportHtml, /Fonte sintética de teste/);
  assert.match(reportHtml, /Trajetória geriátrica/);
  await verifyScalesInBrowser();

  console.log("AUTHENTICATED_CI_E2E=SMOKE_OK");
  console.log("- usuário sintético autenticado exclusivamente pelo contexto de CI");
  console.log("- MySQL efêmero validado");
  console.log("- página autenticada do paciente sintético retornou 200");
  console.log("- rota alimentar protegida retornou 401 sem autenticação");
  console.log("- paciente atribuído retornou 200");
  console.log("- paciente não atribuído retornou 403 e gerou auditoria");
  console.log("- CARG, catálogo de escalas e relatório do episódio sintético responderam");
  console.log("- esquema existente atualizado com efeitos, fonte e orientações; isolado, idempotente e protegido contra versão antiga");
  console.log("- navegador percorreu escalas → CARG inicial e CARG vinculado → instrumentos preenchíveis sem tela vazia");
}

try {
  await main();
} finally {
  await cleanup().catch(() => undefined);
  await prisma.$disconnect();
}
