import assert from "node:assert/strict";
import test from "node:test";
import {
  TACO_SOURCE_VERSION,
  getTacoFood,
  searchTacoFoods,
  tacoFoodCount,
} from "../../src/server/clinical/taco-food-catalog.ts";

test("catálogo TACO validado contém somente linhas calculáveis", () => {
  assert.equal(tacoFoodCount(), 566);
  assert.match(TACO_SOURCE_VERSION, /TACO 4ª edição.*NEPA\/UNICAMP.*2011/i);
});

test("busca TACO aceita português, caixa e acentos", () => {
  const eggs = searchTacoFoods("  OVO  ");
  assert.ok(eggs.length > 0);
  assert.ok(eggs.every((food) => food.provider === "TACO"));
  assert.ok(eggs.every((food) => /ovo/i.test(food.description)));

  const sugar = searchTacoFoods("acucar mascavo");
  assert.equal(sugar[0]?.description, "Açúcar, mascavo");

  const milk = searchTacoFoods("leite integral");
  assert.match(milk[0]?.description ?? "", /^Leite,/);
});

test("alimento TACO preserva proteína e cálcio por 100 g", () => {
  const food = getTacoFood("488");
  assert.equal(food?.description, "Ovo, de galinha, inteiro, cozido/10minutos");
  assert.ok((food?.nutrientsPer100g.proteinG ?? 0) > 13);
  assert.ok((food?.nutrientsPer100g.calciumMg ?? 0) > 49);
  assert.equal(getTacoFood("inexistente"), null);
});
