import assert from "node:assert/strict";
import test from "node:test";
import { DIETARY_PORTION_DEFINITIONS, buildConditionalDietaryGuidance, guidanceAsText } from "../../src/domain/dietary-guidance.ts";

const summary = { proteinG: 50, calciumMg: 600, sodiumMg: 1800 };

test("porções clínicas principais ficam explícitas e não usam peso universal", () => {
  assert.equal(DIETARY_PORTION_DEFINITIONS.find((item) => item.id === "eggs")?.description, "1 porção = 3 ovos inteiros");
  assert.match(DIETARY_PORTION_DEFINITIONS.find((item) => item.id === "meat-fish-poultry")?.description ?? "", /palma da mão/i);
  assert.equal(DIETARY_PORTION_DEFINITIONS.find((item) => item.id === "milk")?.description, "1 porção = 1 copo");
  assert.equal(DIETARY_PORTION_DEFINITIONS.find((item) => item.id === "yogurt")?.description, "1 porção = 1 unidade");
  assert.equal(DIETARY_PORTION_DEFINITIONS.find((item) => item.id === "cheese")?.description, "1 porção = 2 fatias");
});

test("hiperpotassemia não exclui automaticamente alimentos vegetais", () => {
  const guidance = buildConditionalDietaryGuidance({
    context: { ckd: true, renalPotassiumMmolL: 5.7 },
    items: [{ label: "banana" }],
    summary,
  });
  const potassium = guidance.find((item) => item.code === "potassium");
  assert.ok(potassium);
  assert.match(potassium.text, /não excluir automaticamente frutas, verduras ou leguminosas/i);
  assert.equal(potassium.severity, "attention");
});

test("fósforo elevado orienta verificar aditivos sem excluir automaticamente laticínios", () => {
  const guidance = buildConditionalDietaryGuidance({
    context: { ckd: true, renalPhosphorusMgDl: 5.2 },
    items: [{ label: "leite" }],
    summary,
  });
  const phosphorus = guidance.find((item) => item.code === "phosphorus");
  assert.ok(phosphorus);
  assert.match(phosphorus.text, /não recomendar exclusão automática de leite/i);
});

test("diálise usa fluxo proteico próprio", () => {
  const guidance = buildConditionalDietaryGuidance({
    context: { ckd: true, renalDialysis: true, renalDialysisModality: "hemodialysis" },
    items: [],
    summary,
  });
  assert.match(guidance.find((item) => item.code === "protein")?.text ?? "", /fluxo específico/i);
});

test("edema ou insuficiência cardíaca bloqueiam recomendação hídrica automática", () => {
  const guidance = buildConditionalDietaryGuidance({
    context: { edema: true, heartFailure: true },
    items: [],
    summary,
  });
  assert.match(guidance.find((item) => item.code === "fluids")?.text ?? "", /Não gerar recomendação hídrica automática/i);
});

test("qualidade alimentar gera orientação sobre sódio e fosfatos adicionados", () => {
  const guidance = buildConditionalDietaryGuidance({
    context: { diabetes: true },
    items: [{ label: "refrigerante", qualityFlags: ["free-sugar", "ultraprocessed"] }],
    summary,
  });
  const text = guidanceAsText(guidance);
  assert.match(text, /sódio e fosfatos adicionados/i);
  assert.match(text, /substituições graduais/i);
});
