import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("resumo oncogeriátrico organiza domínio, instrumentos e resultados em colunas próprias responsivas", () => {
  const component = source("src/components/oncogeriatria/domain-status-summary.tsx");
  const styles = source("src/components/oncogeriatria/domain-status-summary.module.css");

  assert.match(component, /className=\{styles\.evolutionCard\}/);
  assert.match(component, /className=\{styles\.metricBlock\}/);
  assert.doesNotMatch(component, /className="evolution-card"/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1\.4fr\) minmax\(190px, 0\.75fr\) minmax\(180px, 0\.75fr\)/);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
});

test("cartões comparativos mantêm todos os resultados visíveis em tablet e celular", () => {
  const styles = source("src/app/globals.css");

  assert.doesNotMatch(styles, /\.evolution-card \.score-block:last-child\s*\{\s*display:\s*none/);
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]*?\.evolution-card \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.evolution-card \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("barra de retorno do paciente não sobrepõe conteúdo durante a rolagem", () => {
  const styles = source("src/components/navigation/patient-context-actions.module.css");
  const globalRule = /\.global\s*\{([\s\S]*?)\}/.exec(styles)?.[1] ?? "";

  assert.match(globalRule, /position:\s*sticky/);
  assert.match(globalRule, /top:\s*0/);
  assert.match(globalRule, /width:\s*100%/);
  assert.match(globalRule, /background:\s*var\(--background\)/);
  assert.doesNotMatch(globalRule, /margin-bottom:\s*-/);
});
