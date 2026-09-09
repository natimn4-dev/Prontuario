import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const navigationPath = "src/components/oncogeriatria/oncogeriatric-nav.tsx";
const navigation = readFileSync(navigationPath, "utf8");
const navigationStyles = readFileSync("src/components/oncogeriatria/oncogeriatric-nav.module.css", "utf8");
const overview = readFileSync("src/app/patients/[id]/oncogeriatria/page.tsx", "utf8");
const overviewStyles = readFileSync("src/app/patients/[id]/oncogeriatria/oncogeriatric-overview.module.css", "utf8");

const stages = [
  ["basal", "Antes do tratamento"],
  ["tratamento", "Tratamento oncológico"],
  ["check", "Durante o tratamento"],
  ["escalas", "Escalas clínicas"],
  ["longitudinal", "Evolução longitudinal"],
  ["pos-tratamento", "Planejamento"],
  ["relatorio", "Relatório"],
] as const;

test("acompanhamento oncogeriátrico mantém uma rota independente por etapa", () => {
  for (const [stage, label] of stages) {
    const pagePath = `src/app/patients/[id]/oncogeriatria/${stage}/page.tsx`;
    assert.equal(existsSync(pagePath), true, `página ausente para ${label}`);
    const page = readFileSync(pagePath, "utf8");
    assert.match(page, /OncogeriatricStepActions/);
    assert.match(page, /OncogeriatricWorkspaceHeader/);
    assert.ok(page.includes(`currentStep="${stage}"`), `rodapé de fluxo ausente em ${label}`);
  }
});

test("plano geriátrico foi suprimido sem apagar a rota histórica", () => {
  const legacyPage = readFileSync("src/app/patients/[id]/oncogeriatria/intervencoes/page.tsx", "utf8");
  assert.doesNotMatch(navigation, /Plano geriátrico|path: "\/intervencoes"/);
  assert.match(legacyPage, /redirect\(`/);
  assert.match(legacyPage, /oncogeriatria\/escalas/);
  assert.doesNotMatch(legacyPage, /InterventionForm|OncogeriatricDomainReview|OncogeriatricWorkspaceHeader/);
});

test("navegação oferece orientação, retorno e finalização sem alterar regras clínicas", () => {
  assert.match(navigation, /Etapa \$\{activeIndex \+ 1\} de \$\{steps\.length\}/);
  assert.match(navigation, /<progress/);
  assert.match(navigation, /Página inicial/);
  assert.match(navigation, /Prontuário do paciente/);
  assert.match(navigation, /Página anterior/);
  assert.match(navigation, /Próxima etapa/);
  assert.match(navigation, /Finalizar e voltar à página inicial/);
  assert.match(navigation, /Salve os formulários desta página antes de continuar/);
  assert.doesNotMatch(navigation, /fetch\(|POST|PATCH|DELETE/);
});

test("menu não pré-carrega todas as áreas e preserva acessibilidade responsiva", () => {
  assert.match(navigation, /prefetch=\{false\}/);
  assert.match(navigation, /aria-current=\{active \? "step"/);
  assert.match(navigation, /aria-label="Ações da etapa"/);
  assert.match(navigation, /scrollIntoView\(\{ block: "nearest", inline: "center" \}\)/);
  assert.match(navigation, /aria-label="Retorno e contexto do paciente"/);
  assert.match(navigationStyles, /overflow-x: auto/);
  assert.match(navigationStyles, /scroll-snap-type: x proximity/);
  assert.match(navigationStyles, /@media \(max-width: 760px\)/);
  assert.match(navigationStyles, /@media print/);
});

test("atalhos frequentes permanecem separados, legíveis e sem pré-carregamento", () => {
  assert.match(overview, /<OncogeriatricQuickActions patientId=\{patientId\} episodeId=\{episode\.id\} \/>/);
  assert.doesNotMatch(overview, /program55-nav/);
  assert.match(navigation, /aria-label="Ações clínicas frequentes"/);
  assert.match(navigation, /Aplicar ou revisar escalas/);
  assert.match(navigationStyles, /\.quickActions \{/);
  assert.match(navigationStyles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(navigationStyles, /gap: 10px/);
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
  assert.ok(overview.indexOf("activeAlerts.length") < overview.indexOf("<OncogeriatricQuickActions"));
  assert.match(overviewStyles, /\.summaryGrid dt/);
  assert.match(overviewStyles, /font-size: 17px/);
  assert.match(overviewStyles, /@media \(max-width: 560px\)/);
});
