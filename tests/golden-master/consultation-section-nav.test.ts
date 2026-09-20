import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("consulta expõe navegação por etapas responsiva sem montar todas as áreas e preserva identidade profissional", () => {
  const pageSource = readFileSync(
    new URL("../../src/app/consultations/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  const workspaceSource = readFileSync(
    new URL("../../src/components/consultations/consultation-workspace.tsx", import.meta.url),
    "utf8",
  );
  const workspaceStyles = readFileSync(
    new URL("../../src/components/consultations/consultation-workspace.module.css", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /ConsultationWorkspace/);
  assert.match(pageSource, /id="resumo-consulta"/);
  assert.match(pageSource, /buildProfessionalIdentity/);
  assert.match(pageSource, /professionalIdentity=\{professionalIdentity\}/);
  assert.doesNotMatch(pageSource, /natalia-mendes-logo\.svg/);

  for (const id of [
    "problemas",
    "medicamentos",
    "soap",
    "escalas",
    "relatorio",
    "finalizacao",
  ]) {
    assert.equal(workspaceSource.includes(`id: "${id}"`), true);
    assert.equal(workspaceSource.includes(`id="${id}"`), true);
  }

  assert.match(workspaceSource, /aria-label="Navegação da consulta"/);
  assert.match(workspaceSource, /aria-label="Áreas do prontuário"/);
  assert.match(workspaceSource, /aria-current=\{active === section\.id \? "step" : undefined\}/);
  assert.match(workspaceSource, /useState<WorkspaceSectionId>\("soap"\)/);
  assert.match(workspaceSource, /new Set\(\)/);
  assert.match(workspaceSource, /dynamic\(/);
  assert.match(workspaceSource, /dirtySections\.has/);
  assert.doesNotMatch(workspaceSource, /visited\.has/);
  assert.match(workspaceSource, /hidden=\{active !==/);
  assert.match(workspaceSource, /professionalIdentity: ProfessionalIdentity/);
  assert.match(workspaceSource, /ReportWorkspaceTabs consultationId=\{consultationId\} professionalIdentity=\{professionalIdentity\}/);
  assert.doesNotMatch(workspaceSource, /IntersectionObserver/);

  assert.match(workspaceStyles, /\.navigation\s*\{[\s\S]*position:\s*sticky/);
  assert.match(workspaceStyles, /\.navigation\s*\{[\s\S]*top:\s*14px/);
  assert.match(workspaceStyles, /grid-template-columns:\s*230px minmax\(0, 1fr\)/);
  assert.match(workspaceStyles, /@media \(max-width:\s*980px\)[\s\S]*\.navigation[\s\S]*position:\s*sticky/);
  assert.match(workspaceStyles, /@media \(max-width:\s*980px\)[\s\S]*top:\s*8px/);
  assert.match(workspaceStyles, /@media \(max-width:\s*620px\)[\s\S]*\.sectionList[\s\S]*overflow-x:\s*auto/);
  assert.match(workspaceStyles, /\.sectionList button\.active/);
});
