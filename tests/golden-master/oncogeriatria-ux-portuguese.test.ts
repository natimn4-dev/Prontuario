import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  oncogeriatricCheckpointTypeLabel,
  oncogeriatricCourseStatusLabel,
  oncogeriatricDomainLabel,
  oncogeriatricIntentLabel,
  oncogeriatricModalityLabel,
  oncogeriatricRecoveryStatusLabel,
} from "../../src/domain/oncogeriatria/presentation-labels.ts";

const nav = readFileSync("src/components/oncogeriatria/oncogeriatric-nav.tsx", "utf8");
const scalesPage = readFileSync("src/app/patients/[id]/oncogeriatria/escalas/page.tsx", "utf8");
const forms = readFileSync("src/components/oncogeriatria/oncogeriatric-forms.tsx", "utf8");
const checkForm = readFileSync("src/components/oncogeriatria/domain-linked-check-form.tsx", "utf8");
const checkPage = readFileSync("src/app/patients/[id]/oncogeriatria/check/page.tsx", "utf8");
const patientPage = readFileSync("src/app/patients/[id]/oncogeriatria/page.tsx", "utf8");
const reportPage = readFileSync("src/app/patients/[id]/oncogeriatria/relatorio/page.tsx", "utf8");
const reportActions = readFileSync("src/components/oncogeriatria/report-actions.tsx", "utf8");
const homePage = readFileSync("src/app/oncogeriatria/page.tsx", "utf8");
const baselinePage = readFileSync("src/app/patients/[id]/oncogeriatria/basal/page.tsx", "utf8");
const consultationLinker = readFileSync("src/components/oncogeriatria/checkpoint-consultation-linker.tsx", "utf8");

test("oncogeriatria usa fluxo clínico principal curto e separa ferramentas de apoio", () => {
  for (const label of ["Avaliação inicial", "Durante o tratamento", "Evolução longitudinal", "Relatório"]) {
    assert.ok(nav.includes(label), `etapa principal ausente na navegação: ${label}`);
  }
  for (const label of ["Tratamento oncológico", "Escalas clínicas", "Planejamento"]) {
    assert.ok(nav.includes(label), `ferramenta de apoio ausente na navegação: ${label}`);
  }
  assert.match(nav, /workflowSteps/);
  assert.match(nav, /supportSteps/);
  assert.match(nav, /Ferramentas de apoio/);
  assert.match(scalesPage, /buildOncogeriatricConsultationHref/);
  assert.match(scalesPage, /section:\s*"escalas".*episodeId:\s*episode\.id.*returnStage:\s*"escalas"/);
  assert.match(scalesPage, /O geriatra continua decidindo quais instrumentos aplicar/);
  assert.match(scalesPage, /Nenhuma escala é selecionada, preenchida ou interpretada automaticamente/);
});

test("rótulos técnicos permanecem como valores internos, mas são apresentados em português", () => {
  assert.equal(oncogeriatricModalityLabel("SYSTEMIC"), "Tratamento sistêmico");
  assert.equal(oncogeriatricIntentLabel("CURATIVE"), "Curativa");
  assert.equal(oncogeriatricCourseStatusLabel("ACTIVE"), "Em andamento");
  assert.equal(oncogeriatricCheckpointTypeLabel("CYCLE"), "Reavaliação durante o tratamento");
  assert.equal(oncogeriatricDomainLabel("COGNITION"), "Cognição");
  assert.equal(oncogeriatricRecoveryStatusLabel("RECOVERING"), "Em recuperação");
  assert.match(forms, /value=\{item\.value\}/);
  assert.match(readFileSync("src/components/oncogeriatria/checklist-scales.tsx", "utf8"), /action:\s*"G8_SAVE"/);
  assert.match(readFileSync("src/components/oncogeriatria/checklist-scales.tsx", "utf8"), /action: "CARG_SAVE"/);
  assert.match(checkForm, /type:\s*"CYCLE"/);
});

test("avaliação inicial oferece cada grau ECOG e KPS com descrição clínica", () => {
  assert.match(forms, /<select name="ecogKps" defaultValue="">/);
  assert.match(forms, /ECOG_OPTIONS\.map/);
  assert.match(forms, /KPS_OPTIONS\.map/);
  assert.match(forms, /ECOG — graus de 0 a 5/);
  assert.match(forms, /KPS — níveis de 10% a 100%/);
  assert.doesNotMatch(forms, /<input name="ecogKps"/);
});

test("camada visível da oncogeriatria não reintroduz jargões ingleses auditados", () => {
  const visibleSources = [nav, forms, checkForm, checkPage, patientPage, reportPage, reportActions, homePage].join("\n");
  for (const forbidden of [
    "Oncogeriatric Check",
    "Registrar Oncogeriatric Check",
    "G8 — Geriatric 8",
    "Gerar snapshot",
    "Último checkpoint",
    "baseline →",
    "Patient.id",
    "Nenhuma PHI",
  ]) {
    assert.equal(visibleSources.includes(forbidden), false, `jargão visível reintroduzido: ${forbidden}`);
  }
});

test("ponte de escalas preserva vínculo explícito e não cria consulta artificial", () => {
  assert.match(scalesPage, /linkedIds/);
  assert.match(scalesPage, /Consultas vinculadas a este acompanhamento/);
  assert.match(scalesPage, /só entram na trajetória oncogeriátrica após o vínculo explícito/);
  assert.doesNotMatch(scalesPage, /prisma\.consultation\.create/);
  assert.doesNotMatch(scalesPage, /ClinicalScalesWorkspace/);
  assert.match(scalesPage, /Abrir escalas clínicas desta consulta/);
  assert.match(scalesPage, /Próxima página: Evolução longitudinal/);
});

test("domínios alterados mostram instrumentos anteriores sem seleção automática", () => {
  const continuity = readFileSync("src/components/oncogeriatria/clinical-continuity.tsx", "utf8");
  const planPage = readFileSync("src/app/patients/[id]/oncogeriatria/intervencoes/page.tsx", "utf8");
  assert.match(checkPage, /OncogeriatricDomainReview/);
  assert.doesNotMatch(planPage, /OncogeriatricDomainReview|InterventionForm/);
  assert.match(planPage, /oncogeriatria\/escalas/);
  assert.match(continuity, /As escalas exibidas são as preenchidas na avaliação anterior mais recente do domínio/);
  assert.match(continuity, /A reaplicação continua sendo decisão do geriatra/);
});

test("relatório oncogeriátrico reúne tabela, gráfico, orientação por domínio e segurança do esquema", () => {
  assert.match(reportPage, /OncogeriatricTrajectoryTable/);
  assert.match(reportPage, /CapacityDimensionHistoryChart/);
  assert.match(reportPage, /buildOncogeriatricReportGuidance/);
  assert.match(reportPage, /Orientações específicas do esquema e dos eventos registrados/);
  assert.match(reportPage, /O sistema não infere conduta pelo nome do antineoplásico/);
});

test("CARG fica acessível na avaliação inicial antes do vínculo da consulta, sem perder segurança do registro final", () => {
  const checklist = readFileSync("src/components/oncogeriatria/checklist-scales.tsx", "utf8");
  const route = readFileSync("src/app/api/oncogeriatria/patients/[id]/route.ts", "utf8");
  assert.match(baselinePage, /id="carg"/);
  assert.match(baselinePage, /canFinalize=\{hasConsultation\}/);
  assert.match(baselinePage, /O CARG pode ser preenchido e salvo como rascunho antes desse vínculo/);
  assert.match(checklist, /CARG disponível para preenchimento/);
  assert.match(checklist, /Vincule uma consulta para registrar/);
  assert.match(consultationLinker, /CHECKPOINT_LINK_CONSULTATION/);
  assert.match(route, /CHECKPOINT_LINK_CONSULTATION/);
});

test("CARG liberado permanece transparente, local e sem conduta automática", () => {
  const checklist = readFileSync("src/components/oncogeriatria/checklist-scales.tsx", "utf8");
  const route = readFileSync("src/app/api/oncogeriatria/patients/[id]/route.ts", "utf8");
  assert.match(checklist, /Conferir composição do escore/);
  assert.match(checklist, /não define conduta antineoplásica/);
  assert.match(route, /saveCarg/);
  assert.doesNotMatch(route, /CARG_LICENSE_REVIEW_REQUIRED/);
  assert.doesNotMatch(patientPage, /Aguardando liberação formal/);
  assert.doesNotMatch(reportPage, /resultado histórico previamente registrado/);
});
