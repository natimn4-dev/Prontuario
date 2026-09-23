import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actions = readFileSync("src/components/navigation/patient-context-actions.tsx", "utf8");
const actionStyles = readFileSync("src/components/navigation/patient-context-actions.module.css", "utf8");
const patientLayout = readFileSync("src/app/patients/[id]/layout.tsx", "utf8");
const consultationWorkspace = readFileSync("src/components/consultations/consultation-workspace.tsx", "utf8");
const patientFinder = readFileSync("src/components/patients/patient-finder.tsx", "utf8");

test("rotas de paciente expõem retorno global e troca de paciente sem duplicar lógica por módulo", () => {
  assert.match(patientLayout, /PatientContextActions/);
  assert.match(actions, /href="\/"[^>]*>Início</);
  assert.match(actions, /href="\/#patient-finder-title"[^>]*>Trocar paciente</);
  assert.match(actions, /aria-label="Navegação global do prontuário"/);
  assert.match(patientFinder, /id="patient-finder-title"/);
  assert.match(actionStyles, /\.global\s*\{[\s\S]*position:\s*sticky/);
  assert.match(actionStyles, /@media print[\s\S]*display:\s*none !important/);
});

test("consulta protege rascunhos locais antes de sair para início ou trocar paciente", () => {
  assert.match(consultationWorkspace, /PatientContextActions variant="inline" hasUnsavedChanges=\{dirtySections\.size > 0\}/);
  assert.match(actions, /hasUnsavedChanges/);
  assert.match(actions, /window\.confirm\(UNSAVED_CHANGES_MESSAGE\)/);
  assert.match(actions, /alterações ainda não salvas nesta consulta/);
  assert.match(actions, /event\.preventDefault\(\)/);
});
