import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../../src/app/consultations/[id]/page.tsx", import.meta.url);
const workspaceUrl = new URL("../../src/components/consultations/consultation-workspace.tsx", import.meta.url);
const soapUrl = new URL("../../src/components/consultations/soap-editor.tsx", import.meta.url);
const reportTabsUrl = new URL("../../src/components/reports/report-workspace-tabs.tsx", import.meta.url);
const noteServiceUrl = new URL("../../src/server/clinical/consultation-note.ts", import.meta.url);
const scalesWorkspaceUrl = new URL("../../src/components/scales/clinical-scales-workspace.tsx", import.meta.url);
const scalesWorkspaceRouteUrl = new URL("../../src/app/api/consultations/[id]/scales/workspace/route.ts", import.meta.url);
const dietaryUrl = new URL("../../src/components/dietary/dietary-assessment-workspace.tsx", import.meta.url);
const dietaryRouteUrl = new URL("../../src/app/api/consultations/[id]/dietary-assessment/route.ts", import.meta.url);
const patientPageUrl = new URL("../../src/app/patients/[id]/page.tsx", import.meta.url);
const problemServiceUrl = new URL("../../src/server/clinical/problem-workspace.ts", import.meta.url);
const medicationServiceUrl = new URL("../../src/server/clinical/medication-workspace.ts", import.meta.url);
const authenticatedSmokeUrl = new URL("../../scripts/smoke-authenticated-ci.ts", import.meta.url);

async function text(url: URL) {
  return readFile(url, "utf8");
}

test("consulta não monta todos os workspaces na carga inicial", async () => {
  const [page, workspace] = await Promise.all([text(pageUrl), text(workspaceUrl)]);

  assert.match(page, /ConsultationWorkspace/);
  assert.doesNotMatch(page, /from "@\/components\/problems\/problem-workspace"/);
  assert.doesNotMatch(page, /from "@\/components\/medications\/medication-workspace"/);
  assert.doesNotMatch(page, /from "@\/components\/scales\/clinical-scales-workspace"/);
  assert.doesNotMatch(page, /from "@\/components\/consultations\/consultation-finalization-panel"/);

  assert.match(workspace, /dynamic\(/);
  assert.match(workspace, /useState<WorkspaceSectionId>\("soap"\)/);
  assert.match(workspace, /useState<Set<WorkspaceSectionId>>\(new Set\(\)\)/);
  assert.match(workspace, /function shouldMount\(sectionId/);
  assert.match(workspace, /return active === sectionId \|\| dirtySections\.has\(sectionId\)/);
  assert.doesNotMatch(workspace, /visited\.has/);
  assert.match(workspace, /onDirtyChange=\{\(dirty\) => setSectionDirty\("soap", dirty\)\}/);
  assert.match(workspace, /hidden=\{active !==/);
});

test("SOAP não carrega medicações e escalas auxiliares antes de serem necessárias", async () => {
  const soap = await text(soapUrl);

  assert.match(soap, /useEffect\(\(\) => \{ void load\(\); \}, \[consultationId\]\)/);
  assert.doesNotMatch(soap, /useEffect\(\(\) => \{[^}]*ensureMedications/s);
  assert.doesNotMatch(soap, /useEffect\(\(\) => \{[^}]*ensureScaleResults/s);
  assert.match(soap, /async function ensureMedications/);
  assert.match(soap, /async function ensureScaleResults/);
  assert.match(soap, /async function copySoap\(\)[\s\S]*medicationsForCopy/);
  assert.match(soap, /async function copyScales\(\)[\s\S]*ensureScaleResults/);
  assert.match(soap, /Para deixar a tela mais leve/);
});

test("condutas não geram segundo editor nem segunda leitura de nota no relatório", async () => {
  const [soap, reportTabs] = await Promise.all([text(soapUrl), text(reportTabsUrl)]);

  assert.match(soap, /P — Plano e condutas/);
  assert.match(soap, /planSuggestions/);
  assert.match(soap, /Salvar evolução e plano/);
  assert.match(reportTabs, /AgaReportDocumentPreview/);
  assert.doesNotMatch(reportTabs, /GeriatricConductWorkspace/);
  assert.doesNotMatch(reportTabs, /\/api\/consultations/);
});

test("SOAP preserva a transação segura sem reconstruir o contexto completo após a escrita", async () => {
  const source = await text(noteServiceUrl);
  const saveSource = source.slice(source.indexOf("export async function saveConsultationNote"));

  assert.equal((saveSource.match(/noteContext\(tx/g) ?? []).length, 1);
  assert.doesNotMatch(saveSource, /publicView\(await noteContext/);
  assert.match(saveSource, /isolationLevel: "Serializable"/);
  assert.match(saveSource, /auditEvent\.create/);
  assert.match(saveSource, /expectedNoteVersion/);
});

test("Escalas abrem com uma leitura agregada e o salvamento devolve o estado persistido", async () => {
  const [workspace, route] = await Promise.all([text(scalesWorkspaceUrl), text(scalesWorkspaceRouteUrl)]);

  assert.equal((workspace.match(/fetchJson<ClinicalScalesWorkspacePayload>/g) ?? []).length, 1);
  assert.match(workspace, /\/scales\/workspace/);
  assert.doesNotMatch(workspace, /refreshStatus/);
  assert.match(workspace, /setStatusView/);
  assert.match(route, /scaleAssessment\.findMany/);
  assert.match(route, /oncogeriatricPrefills/);
  assert.match(route, /status:\s*\{\s*consultationStatus: consultation\.status,/);
  assert.match(workspace, /const finalized = statusView\?\.consultationStatus === "FINALIZED"/);
  assert.match(workspace, /disabled=\{saving \|\| finalized\} onClick=\{saveActive\}/);
});

test("Alimentação atualiza o estado recalculado do PUT sem GET completo obrigatório", async () => {
  const source = await text(dietaryUrl);
  const saveSource = source.slice(source.indexOf("async function save"));

  assert.match(saveSource, /setData\(/);
  assert.doesNotMatch(saveSource, /await load\(\)/);
});

test("Rota alimentar preserva a fronteira HTTP de autenticação e isolamento", async () => {
  const source = await text(dietaryRouteUrl);

  assert.match(source, /AuthenticationRequiredError/);
  assert.match(source, /AccessForbiddenError/);
  assert.match(source, /status: 401/);
  assert.match(source, /status: 403/);
});

test("Página do paciente prioriza o carregamento integral estável durante a recuperação de produção", async () => {
  const source = await text(patientPageUrl);

  assert.doesNotMatch(source, /historyValue === "full"/);
  assert.doesNotMatch(source, /take: 24/);
  assert.doesNotMatch(source, /take: 250/);
  assert.doesNotMatch(source, /take: 25/);
  assert.doesNotMatch(source, /Carregar histórico completo/);
  assert.match(source, /orderBy: \[\{ occurredAt: "desc" \}/);
  assert.match(source, /orderBy: \{ appliedAt: "asc" \}/);
  assert.match(source, /buildCapacityDimensionHistory/);
});

test("E2E autenticado abre a página real de um paciente sintético", async () => {
  const smoke = await text(authenticatedSmokeUrl);

  assert.match(smoke, /\/patients\/\$\{assignedPatientId\}/);
  assert.match(smoke, /patientPage\.status[\s\S]*200/);
});

test("Problemas e medicamentos devolvem projeção mínima após a gravação", async () => {
  const [problems, medications] = await Promise.all([text(problemServiceUrl), text(medicationServiceUrl)]);
  const problemWrites = problems.slice(problems.indexOf("export async function createProblem"));
  const medicationWrites = medications.slice(medications.indexOf("export async function createMedicationWithRegimen"));

  assert.doesNotMatch(problemWrites, /publicView\(await context\(tx/);
  assert.doesNotMatch(medicationWrites, /await workspaceContext\(tx, input\.consultationId\)\)\.view/);
  assert.match(problemWrites, /auditEvent\.create/);
  assert.match(medicationWrites, /auditEvent\.create/);
});
