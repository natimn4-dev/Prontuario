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
  ["intervencoes", "Plano geriátrico"],
  ["escalas", "Escalas clínicas"],
  ["longitudinal", "Evolução longitudinal"],
  ["pos-tratamento", "Pós-tratamento"],
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

test("visão geral usa resumo semântico compacto e apresenta alertas antes das ações", () => {
  assert.match(overview, /<dl className=\{styles\.summaryGrid\}>/);
  assert.doesNotMatch(overview, /<div className="metrics">/);
  assert.ok(overview.indexOf("activeAlerts.length") < overview.indexOf("<OncogeriatricQuickActions"));
  assert.match(overviewStyles, /\.summaryGrid dt/);
  assert.match(overviewStyles, /font-size: 17px/);
  assert.match(overviewStyles, /@media \(max-width: 560px\)/);
});
