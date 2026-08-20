import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const reportComponent = readFileSync(
  new URL("../../src/components/reports/aga-report-preview.tsx", import.meta.url),
  "utf8",
);
const medicationTable = readFileSync(
  new URL("../../src/components/medications/medication-plan-table.tsx", import.meta.url),
  "utf8",
);

test("vacinas e prevenção têm seção própria no relatório familiar", () => {
  assert.match(reportComponent, /className="report-section vaccination-prevention-section"/);
  assert.match(reportComponent, />Vacinas e prevenção</);
  assert.match(reportComponent, /não gera prescrição automática/);
  assert.ok(
    reportComponent.indexOf("vaccination-prevention-section")
      < reportComponent.indexOf("care-plan-section"),
  );
});

test("tabela de medicamentos não recebe conteúdo vacinal", () => {
  assert.doesNotMatch(medicationTable, /vacina|vacinação|imunização/i);
});
