import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workspace = readFileSync("src/components/scales/clinical-scales-workspace.tsx", "utf8");
const styles = readFileSync("src/components/scales/clinical-scales-workspace.module.css", "utf8");

test("grade principal de escalas continua organizada em boxes por domínio com checkbox", () => {
  assert.match(workspace, /styles\.domainGrid/);
  assert.match(workspace, /<fieldset className=\{styles\.domainBox\}/);
  assert.match(workspace, /type="checkbox"/);
  assert.match(workspace, />Aplicada<\/strong>/);
});

test("reforço inferior agrupa somente escalas selecionadas por domínio", () => {
  assert.match(workspace, /groupClinicalScaleOptions\(selectedOptions\)/);
  assert.match(workspace, /Em preenchimento nesta consulta:/);
  assert.match(workspace, /styles\.selectedDomainList/);
  assert.match(workspace, /styles\.selectedDomain/);
  assert.match(workspace, /<strong>\{group\.domain\}<\/strong>/);
  assert.match(workspace, /group\.options\.map/);
});

test("chips agrupados continuam alternando a escala ativa e preservando indicação de aplicada", () => {
  assert.match(workspace, /onClick=\{\(\) => setActiveKey\(option\.key\)\}/);
  assert.match(workspace, /aria-pressed=\{activeKey === option\.key\}/);
  assert.match(workspace, /option\.appliedInCurrentConsultation \? " ✓" : ""/);
});

test("layout do reforço possui agrupamento por domínio e adaptação mobile sem substituir os boxes", () => {
  assert.match(styles, /\.selectedDomainList/);
  assert.match(styles, /\.selectedDomain \{/);
  assert.match(styles, /grid-template-columns: minmax\(140px, 210px\) minmax\(0, 1fr\)/);
  assert.match(styles, /\.domainGrid/);
  assert.match(styles, /\.domainBox/);
});
