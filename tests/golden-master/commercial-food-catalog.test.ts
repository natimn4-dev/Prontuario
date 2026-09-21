import assert from "node:assert/strict";
import test from "node:test";
import {
  getCommercialFood,
  searchCommercialFoods,
} from "../../src/server/clinical/commercial-food-catalog.ts";

test("busca comercial encontra Nutren e Nutridrink por nome", () => {
  assert.match(searchCommercialFoods("nutren")[0]?.description ?? "", /Nutren Senior/i);
  assert.match(searchCommercialFoods("nutridrink")[0]?.description ?? "", /Nutridrink Protein/i);
});

test("Nutren preserva composição convertida do rótulo de 55 g para 100 g", () => {
  const food = getCommercialFood("nutren-senior-sem-sabor-po-740g-2026");
  assert.equal(food?.provider, "MANUFACTURER_LABEL");
  assert.equal(food?.nutrientBasis, "100g");
  assert.equal(food?.nutrientsPer100g.calciumMg, 920);
  assert.ok(Math.abs((food?.nutrientsPer100g.proteinG ?? 0) * 0.55 - 20) < 0.001);
});

test("Nutridrink líquido mantém base por 100 mL", () => {
  const food = getCommercialFood("nutridrink-protein-chocolate-200ml-2026");
  assert.equal(food?.nutrientBasis, "100ml");
  assert.equal(food?.nutrientsPer100g.proteinG, 9.2);
  assert.equal(food?.nutrientsPer100g.calciumMg, 216);
});
