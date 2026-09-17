import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../../src/components/dietary/dietary-assessment-workspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/components/dietary/dietary-assessment-workspace.module.css", import.meta.url), "utf8");

test("calculadora nutricional tem fluxo explícito de registro, conferência, contexto e revisão", () => {
  for (const label of ["Registrar", "Conferir", "Contextualizar", "Revisar"]) assert.match(workspace, new RegExp(label));
  for (const label of ["Relato alimentar do dia", "Conferir porções e preparo", "Contexto clínico e metas", "Resultado e orientação"]) assert.match(workspace, new RegExp(label));
  assert.match(workspace, /Recalcular com regras atuais/);
  assert.match(workspace, /data-calculator-release=\{CLINICAL_RELEASE_ID\}/);
});

test("calculadora preserva revisão clínica, histórico e medidas sem conversão silenciosa", () => {
  for (const token of ["Histórico preservado", "Revisão médica antes do uso em SOAP\/relatório", "gramas não confirmados", "Não constitui prescrição dietética automática", "Potássio, mmol\/L", "Fósforo, mg\/dL", "Diurese reduzida"]) assert.match(workspace, new RegExp(token));
  for (const className of [".stepper", ".contentGrid", ".summaryRail", ".legacyNotice", "@media print"]) assert.match(styles, new RegExp(className.replace(/[.]/g, "\\.")));
});
