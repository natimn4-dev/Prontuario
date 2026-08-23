import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  consultationPage: new URL("../../src/app/consultations/[id]/page.tsx", import.meta.url),
  report: new URL("../../src/components/reports/aga-report-document-preview.tsx", import.meta.url),
  reportCss: new URL("../../src/components/reports/aga-report-document-preview.module.css", import.meta.url),
  medicationPage: new URL("../../src/app/consultations/[id]/medications/print/page.tsx", import.meta.url),
  medicationCss: new URL("../../src/app/consultations/[id]/medications/print/page.module.css", import.meta.url),
  medicationServer: new URL("../../src/server/clinical/medication-plan-document.ts", import.meta.url),
};

async function text(url: URL) {
  return readFile(url, "utf8");
}

test("relatório final usa composição documental aprovada e não incorpora tabela completa de medicamentos", async () => {
  const [consultationPage, report, css] = await Promise.all([
    text(files.consultationPage),
    text(files.report),
    text(files.reportCss),
  ]);

  assert.match(consultationPage, /AgaReportDocumentPreview/);
  assert.doesNotMatch(consultationPage, /AgaReportPreview\s/);
  assert.match(report, /Relatório de Avaliação Geriátrica/);
  assert.match(report, /Visão geral/);
  assert.match(report, /Pontos de atenção/);
  assert.match(report, /Recomendação principal/);
  assert.match(report, /Problemas clínicos/);
  assert.match(report, /Problemas geriátricos/);
  assert.match(report, /CapacityDimensionHistoryChart/);
  assert.match(report, /Vacinas e prevenção/);
  assert.match(report, /Ver \/ imprimir plano de medicamentos/);
  assert.match(report, /\/consultations\/\$\{consultationId\}\/medications\/print/);
  assert.doesNotMatch(report, /MedicationPlanTable/);
  assert.doesNotMatch(report, /data-print-scope/);
  assert.match(css, /size:\s*A4 portrait/);
  assert.match(css, /break-inside:\s*avoid/);
});

test("plano de medicamentos é rota própria, read-only e vinculada à consulta", async () => {
  const [page, css, server] = await Promise.all([
    text(files.medicationPage),
    text(files.medicationCss),
    text(files.medicationServer),
  ]);

  assert.match(page, /getMedicationPlanDocument\(id\)/);
  assert.match(page, /Plano de medicamentos/);
  assert.match(page, /Data de referência/);
  assert.match(page, /MEDICATION_MOMENTS\.map/);
  assert.match(page, /Esta tabela organiza o cuidado e não substitui a receita médica/);
  assert.match(page, /Dra\. Natalia Mendes/);
  assert.match(page, /CRM-BA 27416/);
  assert.match(page, /RQE 24673/);
  assert.doesNotMatch(page, /<input/);
  assert.doesNotMatch(page, /contentEditable/);

  assert.match(server, /requireAuthenticatedUser\("document\.generate"\)/);
  assert.match(server, /where:\s*\{\s*id:\s*consultationId\s*\}/s);
  assert.match(server, /consultation\.patient\.id !== consultation\.patientId/);
  assert.match(server, /workspaceContext\(tx, consultation\.id\)/);
  assert.match(server, /buildMedicationPlanSnapshotModel/);
  assert.doesNotMatch(server, /findUnique\(\{\s*where:\s*\{\s*id:\s*medicationId/s);

  assert.match(css, /size:\s*A4 portrait/);
  assert.match(css, /display:\s*table-header-group/);
  assert.match(css, /break-inside:\s*avoid/);
});
