import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const editor = readFileSync("src/components/consultations/soap-editor.tsx", "utf8");
const styles = readFileSync("src/components/consultations/soap-editor.module.css", "utf8");
const workspace = readFileSync("src/components/consultations/consultation-workspace.tsx", "utf8");
const finalization = readFileSync("src/components/consultations/consultation-finalization-panel.tsx", "utf8");
const noteService = readFileSync("src/server/clinical/consultation-note.ts", "utf8");

test("evolução clínica usa fluxo vertical e deixa ações de cópia após o preenchimento", () => {
  assert.ok(styles.includes(".card {\n  display: flex;\n  flex-direction: column;"));
  assert.ok(styles.includes(".soapGrid {\n  order: 20;"));
  assert.ok(styles.includes("grid-template-columns: minmax(0, 1fr);"));
  assert.ok(styles.includes(".copyPanel {\n  order: 30;"));
});

test("vacinas permanecem clinicamente intactas e ganham separação visual", () => {
  assert.ok(editor.includes("deriveVaccinationReview"));
  assert.ok(editor.includes("GERIATRIC_VACCINE_CHECKLIST"));
  assert.ok(editor.includes("Carteira/status vacinal revisado nesta consulta"));
  assert.ok(styles.includes(".vaccinePanel {"));
  assert.ok(styles.includes("border-left: 4px solid var(--primary) !important;"));
});

test("campos e salvaguardas clínicas do SOAP continuam presentes", () => {
  assert.ok(editor.includes("S — Subjetivo"));
  assert.ok(editor.includes("O — Objetivo"));
  assert.ok(editor.includes("A — Avaliação"));
  assert.ok(editor.includes("P — Plano e condutas"));
  assert.ok(editor.includes("Exames laboratoriais e de imagem"));
  assert.ok(editor.includes("expectedNoteVersion: view.noteVersion"));
  assert.ok(editor.includes("summarizeSoapMedicationProvenance"));
  assert.match(editor, /clinical-note-changed/);
});

test("regressão: etapa soap mantém evolução e plano explícitos na navegação", () => {
  assert.match(
    workspace,
    /\{\s*id:\s*"soap",\s*label:\s*"Evolução e plano",\s*shortLabel:\s*"Evolução \+ plano",\s*description:\s*"SOAP, exames, vacinas e plano por problema"\s*\}/,
  );
  assert.ok(workspace.includes('useState<WorkspaceSectionId>("soap")'));
});

test("revisão e finalização salvam SOAP pendente antes de mudar o status", () => {
  assert.match(finalization, /async function savePendingSoapBeforeWorkflow\(consultationId: string\): Promise<boolean>/);
  assert.match(finalization, /clinical-note-changed/);
  assert.match(finalization, /button\.click\(\)/);
  const saveIndex = finalization.indexOf("await savePendingSoapBeforeWorkflow(consultationId)");
  const workflowPostIndex = finalization.indexOf("fetch(`/api/consultations/${consultationId}/workflow`", saveIndex);
  assert.ok(saveIndex >= 0);
  assert.ok(workflowPostIndex > saveIndex);
  assert.match(finalization, /A mudança de status foi cancelada/);
});

test("falha de salvamento impede workflow e pós-finalização continua imutável", () => {
  assert.match(finalization, /if \(!soapSaved\) \{\s*throw new Error/);
  assert.match(noteService, /consultation\.status === "FINALIZED"/);
  assert.match(noteService, /CONSULTATION_FINALIZED/);
});
