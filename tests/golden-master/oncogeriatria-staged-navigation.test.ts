import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const navigationPath = "src/components/oncogeriatria/oncogeriatric-nav.tsx";
const navigation = readFileSync(navigationPath, "utf8");
const navigationStyles = readFileSync("src/components/oncogeriatria/oncogeriatric-nav.module.css", "utf8");
const overview = readFileSync("src/app/patients/[id]/oncogeriatria/page.tsx", "utf8");
const overviewStyles = readFileSync("src/app/patients/[id]/oncogeriatria/oncogeriatric-overview.module.css", "utf8");

const stages = [
  ["basal", "Avaliação inicial"],
  ["tratamento", "Tratamento oncológico"],
  ["check", "Durante o tratamento"],
  ["escalas", "Escalas clínicas"],
  ["longitudinal", "Evolução longitudinal"],
  ["pos-tratamento", "Planejamento"],
  ["relatorio", "Relatório"],
] as const;

test("rotas clínicas permanecem acessíveis e avaliação é canônica", () => {
  for (const [stage] of stages) assert.equal(existsSync(`src/app/patients/[id]/oncogeriatria/${stage}/page.tsx`), true);
  const assessment = readFileSync("src/app/patients/[id]/oncogeriatria/avaliacao/page.tsx", "utf8");
  assert.match(assessment, /ClinicalScalesWorkspace/);
  assert.match(assessment, /CargChecklistForm/);
});

test("plano geriátrico foi suprimido sem apagar a rota histórica", () => {
  const legacyPage = readFileSync("src/app/patients/[id]/oncogeriatria/intervencoes/page.tsx", "utf8");
  assert.doesNotMatch(navigation, /Plano geriátrico|path: "\/intervencoes"/);
  assert.match(legacyPage, /redirect\(`/);
  assert.match(legacyPage, /oncogeriatria\/escalas/);
  assert.doesNotMatch(legacyPage, /InterventionForm|OncogeriatricDomainReview|OncogeriatricWorkspaceHeader/);
});

test("navegação apresenta quatro destinos sem hierarquias concorrentes", () => {
  const steps = navigation.match(/\{ id: "(avaliacao|longitudinal|relatorio)", label:/g) ?? [];
  assert.equal(steps.length, 3);
  assert.match(navigation, /<strong>Visão geral<\/strong>/);
  assert.doesNotMatch(navigation, /Ferramentas de apoio|Ações clínicas frequentes|Próxima etapa/);
  assert.match(navigation, /prefetch=\{false\}/);
  assert.match(navigation, /aria-current=\{active \? "step"/);
  assert.match(navigationStyles, /@media \(max-width: 760px\)/);
  assert.match(navigationStyles, /@media print/);
  assert.doesNotMatch(overview, /OncogeriatricQuickActions/);
});

test("cabeçalho clínico prioriza identidade, tarefa e retorno sem hero repetitivo", () => {
  assert.match(navigation, /Paciente em acompanhamento/);
  assert.match(navigation, /Tarefa atual/);
  assert.match(navigation, /Prontuário do paciente/);
  assert.match(navigationStyles, /\.clinicalHeader \{/);
  assert.match(navigationStyles, /grid-template-columns: minmax\(0, \.9fr\) minmax\(0, 1\.1fr\)/);
});

test("etapas clínicas reutilizam medicamentos, SOAP, vacinas, condutas e escalas sem duplicar persistência", () => {
  const continuity = readFileSync("src/components/oncogeriatria/clinical-continuity.tsx", "utf8");
  for (const stage of ["basal", "tratamento", "check", "pos-tratamento"]) {
    const page = readFileSync(`src/app/patients/[id]/oncogeriatria/${stage}/page.tsx`, "utf8");
    assert.match(page, /OncogeriatricClinicalContinuity/);
  }
  for (const anchor of ["medicamentos", "soap", "escalas", "relatorio"]) assert.ok(continuity.includes(`hash: "${anchor}"`));
  assert.match(continuity, /Evolução, vacinas e condutas/);
  assert.match(continuity, /não cria registros clínicos paralelos/);
});

test("planejamento substitui o rótulo pós-tratamento sem apagar recuperação e seguimento", () => {
  const planning = readFileSync("src/app/patients/[id]/oncogeriatria/pos-tratamento/page.tsx", "utf8");
  assert.match(navigation, /label: "Planejamento"/);
  assert.match(planning, /Planejamento das próximas consultas/);
  assert.match(planning, /CheckpointPlannerForm/);
  assert.match(planning, /RecoveryForm/);
});

test("visão geral usa resumo semântico compacto e apresenta alertas antes das ações", () => {
  assert.match(overview, /<dl className=\{styles\.summaryGrid\}>/);
  assert.doesNotMatch(overview, /<div className="metrics">/);
  assert.ok(overview.indexOf("activeAlerts.length") < overview.indexOf("<OncogeriatricDomainStatusSummary"));
  assert.match(overviewStyles, /\.summaryGrid dt/);
  assert.match(overviewStyles, /font-size: 17px/);
  assert.match(overviewStyles, /@media \(max-width: 560px\)/);
});
