import assert from "node:assert/strict";
import test from "node:test";
import {
  renderClinicalExamsText,
  renderCompletedScalesText,
  renderSoapExamsScalesReport,
} from "../../src/domain/clinical-copy-report.ts";

const history = [{
  id: "exam-1",
  consultationId: "consultation-1",
  consultationOccurredAt: "2026-01-10T12:00:00.000Z",
  content: "Exame anterior validado.",
  updatedAt: "2026-01-10T13:00:00.000Z",
}];

const scales = [
  { scaleCode: "barthel", scaleName: "Barthel", scoreText: "80/100", classification: "Dependência leve", interpretation: "Resultado registrado.", appliedAt: "2026-08-25T12:00:00Z" },
  { scaleCode: "incompleta", scaleName: "Escala incompleta", scoreNumeric: null, appliedAt: "2026-08-25T12:01:00Z" },
];

test("cópia de exames mantém atual e histórico com data e sem texto vazio", () => {
  const text = renderClinicalExamsText({ current: "Exame atual validado.", history });
  assert.match(text, /EXAMES DESTA CONSULTA/);
  assert.match(text, /EXAMES ANTERIORES — 10\/01\/2026/);
  assert.match(text, /Exame anterior validado/);
});

test("cópia de escalas contém apenas resultados efetivamente preenchidos e nunca respostas", () => {
  const text = renderCompletedScalesText(scales);
  assert.match(text, /Barthel: 80\/100 — Dependência leve — Resultado registrado/);
  assert.doesNotMatch(text, /Escala incompleta/);
  assert.doesNotMatch(text, /answers|respostas|item 1/i);
});

test("relatório combinado ordena SOAP, exames e escalas", () => {
  const text = renderSoapExamsScalesReport({
    soap: "S — SUBJETIVO\nRegistro clínico.",
    problems: [
      { type: "CLINICAL", status: "ACTIVE", title: "Hipertensão arterial" },
      { type: "GERIATRIC", status: "RESOLVED", title: "Queda prévia" },
    ],
    currentExams: "Exame atual validado.",
    examHistory: history,
    scaleResults: scales,
  });
  assert.ok(text.indexOf("S — SUBJETIVO") < text.indexOf("EXAMES DESTA CONSULTA"));
  assert.ok(text.indexOf("LISTA DE PROBLEMAS") < text.indexOf("EXAMES DESTA CONSULTA"));
  assert.match(text, /PROBLEMAS CLÍNICOS\n- Hipertensão arterial — Ativo/);
  assert.match(text, /PROBLEMAS GERIÁTRICOS\n- Queda prévia — Resolvido/);
  assert.ok(text.indexOf("EXAMES DESTA CONSULTA") < text.indexOf("RESULTADOS DAS ESCALAS"));
});

test("se não houver exames ou escalas, a cópia não inventa seções vazias", () => {
  const text = renderSoapExamsScalesReport({ soap: "SOAP", problems: [], currentExams: "", examHistory: [], scaleResults: [] });
  assert.match(text, /^SOAP\n\nLISTA DE PROBLEMAS/);
  assert.match(text, /PROBLEMAS CLÍNICOS\n- sem dados registrados/);
  assert.match(text, /PROBLEMAS GERIÁTRICOS\n- sem dados registrados/);
  assert.doesNotMatch(text, /EXAMES DESTA CONSULTA|RESULTADOS DAS ESCALAS/);
});
