import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const editor = readFileSync("src/components/consultations/soap-editor.tsx", "utf8");
const noteService = readFileSync("src/server/clinical/consultation-note.ts", "utf8");
const preventiveExamOrders = readFileSync("src/domain/preventive-exam-orders.ts", "utf8");

test("Evolução SOAP oferece campo e histórico longitudinal de exames", () => {
  assert.match(editor, /Exames laboratoriais e de imagem/);
  assert.match(editor, /Exames desta consulta/);
  assert.match(editor, /Exames de consultas anteriores/);
  assert.match(editor, /view\.exams\.history\.map/);
  assert.match(noteService, /buildConsultationExamView/);
  assert.match(noteService, /patientId: consultation\.patientId/);
});

test("Evolução SOAP oferece checklist explícito de exames e rastreios solicitados", () => {
  assert.match(editor, /Exames e rastreios solicitados/);
  assert.match(preventiveExamOrders, /Solicitado exames laboratoriais/);
  assert.match(preventiveExamOrders, /Pesquisa de sangue oculto nas fezes/);
  assert.match(preventiveExamOrders, /Colonoscopia/);
  assert.match(preventiveExamOrders, /Mamografia/);
  assert.match(preventiveExamOrders, /USG de mamas e axilas/);
  assert.match(preventiveExamOrders, /Densitometria óssea/);
  assert.match(editor, /preventiveExamOrders/);
  assert.match(editor, /não define indicação clínica/);
});

test("cópias separada e combinada preservam o fluxo aprovado e possuem fallback de navegador", () => {
  assert.match(editor, /Copiar resumo clínico completo/);
  assert.match(editor, />Copiar SOAP</);
  assert.match(editor, /Copiar exames/);
  assert.match(editor, /Copiar escalas preenchidas/);
  assert.match(editor, /renderSoapExamsScalesReport/);
  assert.match(editor, /navigator\.clipboard\?\.writeText/);
  assert.match(editor, /document\.execCommand\("copy"\)/);
  assert.match(editor, /A cópia usa o conteúdo atual da tela/);
});

test("cópia do SOAP não remove a salvaguarda da reconciliação medicamentosa", () => {
  assert.match(editor, /async function medicationsForCopy\(\): Promise<MedicationItem\[\] \| null>/);
  assert.match(editor, /const provenance = summarizeSoapMedicationProvenance\(items\)/);
  assert.match(editor, /if \(!provenance\.canCopySoap\) \{[\s\S]*?return null;/);
  assert.match(editor, /async function copyCombinedReport\(\) \{[\s\S]*?const items = await medicationsForCopy\(\);[\s\S]*?if \(!items\) return;/);
  assert.match(editor, /async function copySoap\(\) \{[\s\S]*?const items = await medicationsForCopy\(\);[\s\S]*?if \(!items\) return;/);
  assert.match(editor, /A cópia do SOAP permanece bloqueada/);
  assert.match(editor, /Exames e escalas podem ser copiados separadamente/);
  assert.doesNotMatch(editor, /const canCopyExams = !dirty/);
  assert.doesNotMatch(editor, /const canCopyScales = [^;]*!dirty/);
});

test("salvamento SOAP usa versão estável do conteúdo além do timestamp legado", () => {
  assert.match(editor, /expectedNoteVersion: view\.noteVersion/);
  assert.match(noteService, /expectedNoteVersion/);
  assert.match(noteService, /consultationNoteVersion/);
});
