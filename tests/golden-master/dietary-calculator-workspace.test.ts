import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(new URL("../../src/components/dietary/dietary-assessment-workspace.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../src/components/dietary/dietary-assessment-workspace.module.css", import.meta.url), "utf8");
const foodRoute = readFileSync(new URL("../../src/app/api/consultations/[id]/dietary-assessment/foods/route.ts", import.meta.url), "utf8");

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

test("adicionar alimento nunca falha silenciosamente quando o ID da refeição mudou no histórico", () => {
  assert.match(workspace, /const nextMeals = draftMeals\(body\.assessment\)/);
  assert.match(workspace, /nextMeals\.some\(\(meal\) => meal\.id === current\)/);
  assert.match(workspace, /const targetMealId = meals\.find\(\(meal\) => meal\.id === mealId\)\?\.id \?\? meals\[0\]\?\.id/);
  assert.match(workspace, /Nenhuma refeição disponível para receber o alimento/);
  assert.match(workspace, /meal\.id === targetMealId \? \{ \.\.\.meal, items: \[\.\.\.meal\.items, item\] \}/);
});

test("busca alimentar entrega composição e mostra o valor nutricional da porção", () => {
  assert.match(foodRoute, /nutrientsPer100g: food\.nutrientsPer100g/);
  assert.match(workspace, /busca automática após digitar/);
  assert.match(workspace, /nutrientsForGrams\(composition\.nutrientsPer100g, grams\)/);
  assert.match(workspace, /Valor nutricional estimado/);
  assert.match(workspace, /Informe a quantidade em gramas para calcular esta porção/);
  assert.match(workspace, /composition: selectedFood/);
  assert.match(workspace, /foodSearchController\.current\?\.abort\(\)/);
  for (const className of [".nutrientPreview", ".nutrientMetrics", ".nutrientLine", ".itemNutrients"]) assert.match(styles, new RegExp(className.replace(/[.]/g, "\\.")));
});
