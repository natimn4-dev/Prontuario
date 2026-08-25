import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const editor = readFileSync("src/components/consultations/soap-editor.tsx", "utf8");
const noteService = readFileSync("src/server/clinical/consultation-note.ts", "utf8");

test("Evolução SOAP oferece campo e histórico longitudinal de exames", () => {
  assert.match(editor, /Exames laboratoriais e de imagem/);
  assert.match(editor, /Exames desta consulta/);
  assert.match(editor, /Exames de consultas anteriores/);
  assert.match(editor, /view\.exams\.history\.map/);
  assert.match(noteService, /buildConsultationExamView/);
  assert.match(noteService, /patientId: consultation\.patientId/);
});

test("cópias separada e combinada preservam o fluxo aprovado", () => {
  assert.match(editor, /Copiar SOAP \+ exames \+ escalas/);
  assert.match(editor, />Copiar SOAP</);
  assert.match(editor, /Copiar exames/);
  assert.match(editor, /Copiar escalas preenchidas/);
  assert.match(editor, /renderSoapExamsScalesReport/);
});
