import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EAT10_CODE,
  EAT10_MAX_SCORE,
  EAT10_POSITIVE_CUTOFF,
  classifyEat10,
  scoreEat10,
} from "../../src/domain/eat10.ts";
import { clinicalScaleDomain } from "../../src/domain/clinical-scale-workspace.ts";

const eat10Source = readFileSync(new URL("../../src/domain/eat10.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../../src/app/api/consultations/[id]/scales/complementary/route.ts", import.meta.url), "utf8");
const reportSource = readFileSync(new URL("../../src/domain/report-domain-summary.ts", import.meta.url), "utf8");
const licensingSource = readFileSync(new URL("../../docs/ELECTRONIC_SCALE_LICENSING.md", import.meta.url), "utf8");

test("EAT-10 usa total 0-40 e ponto de corte brasileiro >=3 sem criar diagnóstico", () => {
  assert.equal(EAT10_CODE, "eat10");
  assert.equal(EAT10_MAX_SCORE, 40);
  assert.equal(EAT10_POSITIVE_CUTOFF, 3);

  const negative = scoreEat10({ score: 2 });
  assert.equal(negative.result.scoreText, "2/40");
  assert.equal(negative.result.clinicalColor, "verde");
  assert.match(negative.result.classification, /não positivo/i);

  const positive = scoreEat10({ score: 3 });
  assert.equal(positive.result.scoreText, "3/40");
  assert.equal(positive.result.clinicalColor, "vermelho");
  assert.match(positive.result.classification, /rastreio positivo/i);
  assert.match(positive.result.interpretation, /fonoaudiológica/i);
  assert.match(positive.result.interpretation, /não confirma diagnóstico|não.*diagnóstico/i);
});

test("EAT-10 rejeita valores fora da faixa e campos inesperados", () => {
  assert.throws(() => scoreEat10({ score: -1 }), /EAT10_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreEat10({ score: 41 }), /EAT10_SCORE_OUT_OF_RANGE/);
  assert.throws(() => classifyEat10(2.5), /EAT10_SCORE_OUT_OF_RANGE/);
  assert.throws(() => scoreEat10({ score: 3, item1: 1 }), /EAT10_UNEXPECTED_FIELD/);
});

test("workspace unificado agrupa EAT-10 no domínio Disfagia", () => {
  assert.equal(clinicalScaleDomain("eat10", "disfagia"), "Disfagia");
});

test("API complementar expõe e persiste EAT-10 pelo scorer server-side", () => {
  assert.match(routeSource, /EAT10_QUICK_DEFINITION/);
  assert.match(routeSource, /scaleCode === EAT10_CODE[\s\S]*scoreEat10\(answers\)/);
});

test("relatório familiar inclui orientação específica de disfagia baseada em PubMed", () => {
  assert.match(reportSource, /disfagia: "Deglutição \/ disfagia"/);
  assert.match(reportSource, /avaliação clínica da deglutição/i);
  assert.match(reportSource, /fonoaudiologia/i);
  assert.match(reportSource, /Não mude por conta própria a textura dos alimentos nem use espessantes/i);
  assert.match(reportSource, /pmid: "37501570"/);
  assert.match(reportSource, /pmid: "35623866"/);
});

test("formulário eletrônico literal permanece fail-closed até confirmação de licença", () => {
  assert.doesNotMatch(eat10Source, /Meu problema para engolir me faz perder peso/i);
  assert.doesNotMatch(eat10Source, /Eu tusso quando como/i);
  assert.match(licensingSource, /Mapi Research Trust/i);
  assert.match(licensingSource, /registro do escore total de 0 a 40/i);
  assert.match(licensingSource, /não devem ser copiados para o código/i);
});
