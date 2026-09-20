import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const consultationPage = readFileSync("src/app/consultations/[id]/page.tsx", "utf8");
const workspace = readFileSync("src/components/consultations/consultation-workspace.tsx", "utf8");
const previousNote = readFileSync("src/components/consultations/previous-consultation-note.tsx", "utf8");
const soapEditor = readFileSync("src/components/consultations/soap-editor.tsx", "utf8");
const finalizationPanel = readFileSync("src/components/consultations/consultation-finalization-panel.tsx", "utf8");

test("consulta atual recebe somente referência da consulta imediatamente anterior", () => {
  assert.match(consultationPage, /orderBy: \[\{ occurredAt: "desc" \}, \{ createdAt: "desc" \}, \{ id: "desc" \}\]/);
  assert.match(consultationPage, /const previousTimelinePoint = currentTimelineIndex >= 0[\s\S]*?consultationTimeline\[currentTimelineIndex \+ 1\]/);
  assert.match(consultationPage, /previousConsultation=\{previousConsultation\}/);
  assert.doesNotMatch(consultationPage, /subjective|physicalExam|planByProblem/);
});

test("evolução anterior fica somente leitura e não preenche a evolução atual", () => {
  assert.match(workspace, /<PreviousConsultationNote previousConsultation=\{previousConsultation\} \/>[\s\S]*?<SoapEditor consultationId=\{consultationId\} onDirtyChange=/);
  assert.match(previousNote, /method: "GET"/);
  assert.match(previousNote, /cache: "no-store"/);
  assert.match(previousNote, /Este conteúdo não preenche nem altera a evolução atual/);
  assert.match(previousNote, /target="_blank"/);
  assert.doesNotMatch(previousNote, /method: "PUT"|method: "POST"/);
});

test("histórico anterior é carregado apenas quando a médica abre o painel", () => {
  assert.match(previousNote, /onToggle=\{\(event\) => \{[\s\S]*?if \(event\.currentTarget\.open\) void loadPreviousNote\(previousConsultation\)/);
  assert.match(previousNote, /<summary>Ver evolução anterior<\/summary>/);
  assert.match(previousNote, /Abrir consulta anterior completa/);
});

test("apenas exames mantêm visualização longitudinal própria nas consultas seguintes", () => {
  assert.match(soapEditor, /view\.exams\.history/);
  assert.match(soapEditor, /Exames de consultas anteriores/);
  assert.match(soapEditor, /examsText: view\.exams\.current/);
  assert.doesNotMatch(previousNote, /exams\.history|examsText/);
});

test("finalização salva SOAP pendente antes de alterar o workflow e falha fechada se a gravação falhar", () => {
  const saveIndex = finalizationPanel.indexOf("const soapSaved = await savePendingSoapBeforeWorkflow(consultationId)");
  const workflowIndex = finalizationPanel.indexOf("const response = await fetch(`/api/consultations/${consultationId}/workflow`", saveIndex);
  assert.ok(saveIndex >= 0, "salvamento pendente do SOAP deve existir");
  assert.ok(workflowIndex > saveIndex, "workflow só pode ser alterado depois do salvamento do SOAP");
  assert.match(finalizationPanel, /if \(!soapSaved\) \{[\s\S]*?A mudança de status foi cancelada/);
});
