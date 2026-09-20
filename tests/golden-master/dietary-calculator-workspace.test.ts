import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync(
  new URL(
    "../../src/components/dietary/dietary-assessment-workspace.tsx",
    import.meta.url,
  ),
  "utf8",
);
const styles = readFileSync(
  new URL(
    "../../src/components/dietary/dietary-assessment-workspace.module.css",
    import.meta.url,
  ),
  "utf8",
);
const foodRoute = readFileSync(
  new URL(
    "../../src/app/api/consultations/[id]/dietary-assessment/foods/route.ts",
    import.meta.url,
  ),
  "utf8",
);
const dietaryService = readFileSync(
  new URL("../../src/server/clinical/dietary-assessment.ts", import.meta.url),
  "utf8",
);

test("calculadora nutricional tem fluxo explícito de registro, conferência, contexto e revisão", () => {
  for (const label of ["Registrar", "Conferir", "Contextualizar", "Revisar"])
    assert.match(workspace, new RegExp(label));
  for (const label of [
    "O que a paciente consumiu neste dia",
    "Conferir porções e preparo",
    "Há condições que mudam a interpretação",
    "Resultado e orientação",
  ])
    assert.match(workspace, new RegExp(label));
  assert.match(workspace, /Recalcular com regras atuais/);
  assert.match(workspace, /data-calculator-release=\{CLINICAL_RELEASE_ID\}/);
});

test("calculadora preserva revisão clínica, histórico e medidas sem conversão silenciosa", () => {
  for (const token of [
    "Histórico preservado",
    "Revisão médica antes do uso em SOAP\/relatório",
    "gramas não confirmados",
    "Não constitui prescrição dietética automática",
    "Potássio, mmol\/L",
    "Fósforo, mg\/dL",
    "Diurese reduzida",
  ])
    assert.match(workspace, new RegExp(token));
  for (const className of [
    ".progressPanel",
    ".stepper",
    ".contentGrid",
    ".saveBar",
    ".legacyNotice",
    "@media print",
  ])
    assert.match(styles, new RegExp(className.replace(/[.]/g, "\\.")));
});

test("calculadora oferece fluxo guiado com uma tarefa principal e detalhes progressivos", () => {
  for (const token of [
    "Etapa {step} de 4",
    "O que a paciente consumiu neste dia",
    "Adicione um alimento por vez",
    "Escolha a refeição",
    "Qual alimento foi consumido",
    "Opções adicionais do relato",
    "Exames e sinais relevantes",
    "Metas nutricionais editáveis",
  ])
    assert.match(workspace, new RegExp(token));
  for (const className of [
    ".mealChoice",
    ".mealSelected",
    ".portionPanel",
    ".advanced",
    ".choiceGrid",
  ])
    assert.match(styles, new RegExp(className.replace(/[.]/g, "\\.")));
});

test("adicionar alimento nunca falha silenciosamente quando o ID da refeição mudou no histórico", () => {
  assert.match(workspace, /const nextMeals = draftMeals\(body\.assessment\)/);
  assert.match(
    workspace,
    /nextMeals\.some\(\(meal\) => meal\.id === current\)/,
  );
  assert.match(
    workspace,
    /const targetMealId\s*=\s*meals\s*\.find\(\(meal\) => meal\.id === mealId\)\?\.id\s*\?\?\s*meals\[0\]\?\.id/,
  );
  assert.match(
    workspace,
    /Nenhuma refeição disponível para receber o alimento/,
  );
  assert.match(
    workspace,
    /meal\.id === targetMealId[\s\S]*?items:\s*\[\.\.\.meal\.items, item\]/,
  );
});

test("busca alimentar entrega composição e mostra o valor nutricional da porção", () => {
  assert.match(foodRoute, /nutrientsPer100g: food\.nutrientsPer100g/);
  assert.match(workspace, /busca automática após digitar/);
  assert.match(
    workspace,
    /nutrientsForGrams\(\s*composition\.nutrientsPer100g,\s*grams,?\s*\)/,
  );
  assert.match(workspace, /Valor nutricional estimado/);
  assert.match(
    workspace,
    /Informe a quantidade\s+em gramas para calcular esta porção/,
  );
  assert.match(workspace, /confirmDietaryDraftItem\(draft, selectedFood\)/);
  assert.match(workspace, /Ca \{format\(nutrients\.calciumMg, 0\)\} mg/);
  assert.match(workspace, /Estimativa atualizada com o rascunho local/);
  assert.match(workspace, /foodSearchController\.current\?\.abort\(\)/);
  for (const className of [
    ".nutrientPreview",
    ".nutrientMetrics",
    ".nutrientLine",
    ".itemNutrients",
  ])
    assert.match(styles, new RegExp(className.replace(/[.]/g, "\\.")));
});

test("TACO é a fonte principal, USDA é fallback e não se avança sem item", () => {
  assert.match(dietaryService, /searchTacoFoods\(q\)/);
  assert.match(workspace, /TACO — NEPA\/UNICAMP/);
  assert.match(workspace, /Fonte principal: TACO/);
  assert.match(dietaryService, /FOOD_SOURCE_NOT_CONFIGURED/);
  assert.match(dietaryService, /FOOD_SOURCE_RATE_LIMIT/);
  assert.doesNotMatch(dietaryService, /DEMO_KEY/);
  assert.match(
    workspace,
    /Adicione pelo menos um alimento antes de conferir porções e preparo/,
  );
  assert.match(workspace, /onClick=\{continueToNextStep\}/);
  assert.match(workspace, /Nenhuma correspondência foi encontrada/);
  assert.match(workspace, /role="status"/);
});
