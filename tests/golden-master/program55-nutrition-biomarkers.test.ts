import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(new URL("../../src/components/program55/program55-forms.tsx", import.meta.url), "utf8");

const expectedNutritionBiomarkers = [
  "Bioimpedância — Gordura",
  "Bioimpedância — Massa magra e muscular",
  "Bioimpedância — Razão músculo-gordura",
  "Bioimpedância — Hidratação",
  "Bioimpedância — Água intra e extracelular",
  "Bioimpedância — IMC e TMB",
  "Bioimpedância — Análise celular e ângulo de fase",
  "Avaliação muscular — Força de preensão manual bilateral",
  "Avaliação muscular — IMMET",
  "Avaliação muscular — Acompanhamento",
  "Avaliação muscular — Sarcopenia",
];

test("Programa 55+ mantém biomarcadores da bioimpedância na avaliação nutricional", () => {
  for (const label of expectedNutritionBiomarkers) assert.match(form, new RegExp(label));
  assert.match(form, /não interpreta automaticamente métricas proprietárias não documentadas/i);
});
