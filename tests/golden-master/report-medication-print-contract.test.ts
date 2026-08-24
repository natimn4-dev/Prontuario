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
  medicationReadCore: new URL("../../src/server/clinical/medication-document-workspace.ts", import.meta.url),
};

async function text(url: URL) {
  return readFile(url, "utf8");
}

test("relatório final usa composição documental compacta, ilustrativa e não incorpora tabela completa de medicamentos", async () => {
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
  assert.match(report, /ReportGlyph/);
  assert.match(report, /Problemas clínicos/);
  assert.match(report, /Problemas geriátricos/);
  assert.match(report, /DomainSummaryTable/);
  assert.match(report, /<th scope="col">Domínio<\/th>/);
  assert.match(report, /Situação nesta consulta/);
  assert.match(report, /Orientações pertinentes/);
  assert.doesNotMatch(report, /<th scope="col">Escala<\/th>/);
  assert.doesNotMatch(report, /displayResult/);
  assert.match(report, /CapacityDimensionHistoryChart/);
  assert.match(report, /Evolução da capacidade intrínseca e da independência funcional/);
  assert.match(report, /Equipe e encaminhamentos/);
  assert.match(report, /Quando procurar ajuda médica imediata/);
  assert.match(report, /Situações de urgência/);
  assert.match(report, /Quando entrar em contato com a equipe/);
  assert.match(report, /Mensagem final/);
  assert.match(report, /finalMessageItems/);
  assert.doesNotMatch(report, /Orientações por domínio de capacidade intrínseca/);
  assert.match(report, /Vacinas e prevenção/);
  assert.match(report, /Documento separado/);
  assert.match(report, /Ver \/ imprimir plano de medicamentos/);
  assert.match(report, /\/consultations\/\$\{consultationId\}\/medications\/print/);
  assert.doesNotMatch(report, /Sem recomendação priorizada registrada/);
  assert.doesNotMatch(report, /Sem orientação prática adicional registrada/);
  assert.match(report, /Base científica/);
  assert.match(report, /PMID/);
  assert.doesNotMatch(report, /MedicationPlanTable/);
  assert.doesNotMatch(report, /data-print-scope/);
  assert.doesNotMatch(report, /Acompanhar conforme avaliação clínica/);

  assert.match(css, /\.executiveGrid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.glyph\s*\{/);
  assert.match(css, /\.domainTable\s*\{[\s\S]*?table-layout:\s*fixed/);
  assert.match(css, /\.careGrid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.supportGrid\s*\{[\s\S]*?grid-template-columns:\s*1fr 1fr/);
  assert.match(css, /\.safetyColumns\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.finalMessageContent\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 0\.9fr\) minmax\(0, 1\.6fr\)/);
  assert.match(css, /size:\s*A4 portrait/);
  assert.match(css, /break-inside:\s*avoid/);
  assert.match(css, /\.toolbar,\s*\n\s*\.reviewGate\s*\{\s*\n\s*display:\s*none !important/s);
});

test("plano de medicamentos é rota própria, read-only e vinculada à consulta", async () => {
  const [page, css, server, readCore] = await Promise.all([
    text(files.medicationPage),
    text(files.medicationCss),
    text(files.medicationServer),
    text(files.medicationReadCore),
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
  assert.match(server, /medicationDocumentWorkspaceContext\(tx, consultation\.id\)/);
  assert.match(server, /buildMedicationPlanSnapshotModel/);
  assert.doesNotMatch(server, /findUnique\(\{\s*where:\s*\{\s*id:\s*medicationId/s);

  assert.doesNotMatch(readCore, /requireAuthenticatedUser/);
  assert.match(readCore, /where:\s*\{\s*patientId:\s*consultation\.patientId\s*\}/s);
  assert.match(readCore, /medicationStatusAsOf/);
  assert.match(readCore, /effectiveMedicationRegimens/);

  assert.match(css, /size:\s*A4 portrait/);
  assert.match(css, /display:\s*table-header-group/);
  assert.match(css, /break-inside:\s*avoid/);
  assert.match(css, /\.medicationTable thead th\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(css, /@media print[\s\S]*?\.medicationTable thead th\s*\{[\s\S]*?font-size:\s*7pt/);
});
