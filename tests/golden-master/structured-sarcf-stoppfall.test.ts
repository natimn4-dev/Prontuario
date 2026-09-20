import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SARCF_STRUCTURED_DEFINITION,
  SARCF_STRUCTURED_VERSION,
  scoreSarcfStructured,
} from "../../src/domain/sarcf-structured.ts";
import {
  STOPPFALL_STRUCTURED_DEFINITION,
  STOPPFALL_STRUCTURED_VERSION,
  scoreStoppfallStructured,
} from "../../src/domain/stoppfall-structured.ts";

test("SARC-F novo é preenchido pelos cinco itens e calcula o total automaticamente", () => {
  assert.equal(SARCF_STRUCTURED_DEFINITION.fields.length, 5);
  assert.ok(SARCF_STRUCTURED_DEFINITION.fields.every((field) => field.choices.length === 3));
  const scored = scoreSarcfStructured({
    strength: 2,
    walking: 1,
    chair: 0,
    stairs: 1,
    falls: 1,
  });
  assert.equal(scored.result.score, 5);
  assert.match(scored.result.classification, /positivo|provável/i);
  assert.equal(scored.version, SARCF_STRUCTURED_VERSION);
  assert.deepEqual(scored.answers, { strength: 2, walking: 1, chair: 0, stairs: 1, falls: 1 });
});

test("STOPPFall novo expõe as 14 classes e calcula apenas classes presentes", () => {
  assert.equal(STOPPFALL_STRUCTURED_DEFINITION.fields.length, 14);
  assert.ok(STOPPFALL_STRUCTURED_DEFINITION.fields.every((field) => field.display === "checkbox"));
  const answers = Object.fromEntries(STOPPFALL_STRUCTURED_DEFINITION.fields.map((field) => [field.id, 0]));
  answers.anticholinergics = 1;
  answers.diuretics = 1;
  answers.benzodiazepines = 1;
  const scored = scoreStoppfallStructured(answers);
  assert.equal(scored.result.score, 3);
  assert.equal(scored.version, STOPPFALL_STRUCTURED_VERSION);
  assert.match(scored.result.classification, /faixa local|maior carga/i);
});

test("endpoint substitui somente as versões novas sem remover os códigos longitudinais", () => {
  const route = readFileSync("src/app/api/consultations/[id]/scales/complementary/route.ts", "utf8");
  assert.match(route, /SARCF_STRUCTURED_DEFINITION/);
  assert.match(route, /STOPPFALL_STRUCTURED_DEFINITION/);
  assert.match(route, /scoreSarcfStructured/);
  assert.match(route, /scoreStoppfallStructured/);
});

test("workspace usa alternativas abertas para escolhas curtas e mantém listas longas compactas", () => {
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
  assert.match(workspace, /INLINE_CHOICE_LIMIT/);
  assert.match(workspace, /role="radiogroup"/);
  assert.match(workspace, /type="radio"/);
  assert.match(workspace, /<select value=/);
});

test("STOPPFall usa checkbox real e checkbox não marcado é enviado como ausente", () => {
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
  assert.match(workspace, /field\.display === "checkbox"/);
  assert.match(workspace, /type="checkbox"/);
  assert.match(workspace, /event\.target\.checked \? "1" : "0"/);
  assert.match(workspace, /field\.display === "checkbox" \? "0" : ""/);
});

test("guia complementar inicia recolhido para manter a consulta compacta", () => {
  const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
  assert.match(workspace, /<details className=\{styles\.guide\}>/);
  assert.doesNotMatch(workspace, /<details className=\{styles\.guide\} open>/);
});
