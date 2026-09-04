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

test("oncogeriatria segue fluxo clínico em etapas e oferece acesso explícito às escalas", () => {
  for (const label of [
    "1. Antes do tratamento",
    "2. Tratamento oncológico",
    "3. Durante o tratamento",
    "4. Plano geriátrico",
    "5. Escalas clínicas",
    "6. Evolução longitudinal",
    "7. Pós-tratamento",
    "8. Relatório",
  ]) {
    assert.ok(nav.includes(label), `etapa ausente na navegação: ${label}`);
  }
  assert.match(scalesPage, /\/consultations\/\$\{consultation\.id\}#escalas/);
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
  assert.match(forms, /action: "G8_SAVE"/);
  assert.match(checkForm, /type: "CYCLE"/);
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
});
