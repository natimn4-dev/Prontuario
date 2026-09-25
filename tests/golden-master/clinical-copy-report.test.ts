import assert from "node:assert/strict";
import test from "node:test";
import {
  renderClinicalExamsText,
  renderCompletedScalesText,
  renderSoapExamsScalesReport,
  renderSoapPlan,
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

test("relatório combinado ordena problemas, evolução, medicamentos, exames, escalas, plano, nutrição e vacinas", () => {
  const text = renderSoapExamsScalesReport({
    evolution: "S — SUBJETIVO\nRegistro clínico.",
    medications: "MEDICAMENTOS EM USO\n- Medicação confirmada",
    plan: "P — PLANO\n1. Hipertensão arterial\n- Aferir pressão.",
    dietaryOrientation: { text: "Orientação revisada.", reviewed: true, includeInSoap: true },
    pendingVaccines: ["Influenza (gripe)"],
    problems: [
      { type: "CLINICAL", status: "ACTIVE", title: "Hipertensão arterial" },
      { type: "GERIATRIC", status: "RESOLVED", title: "Queda prévia" },
    ],
    currentExams: "Exame atual validado.",
    examHistory: history,
    scaleResults: scales,
  });
  assert.ok(text.indexOf("LISTA DE PROBLEMAS") < text.indexOf("EVOLUÇÃO"));
  assert.ok(text.indexOf("EVOLUÇÃO") < text.indexOf("MEDICAMENTOS EM USO"));
  assert.ok(text.indexOf("MEDICAMENTOS EM USO") < text.indexOf("EXAMES DESTA CONSULTA"));
  assert.match(text, /PROBLEMAS CLÍNICOS\n- Hipertensão arterial — Ativo/);
  assert.match(text, /PROBLEMAS GERIÁTRICOS\n- Queda prévia — Resolvido/);
  assert.ok(text.indexOf("EXAMES DESTA CONSULTA") < text.indexOf("RESULTADOS DAS ESCALAS"));
  assert.ok(text.indexOf("RESULTADOS DAS ESCALAS") < text.indexOf("P — PLANO"));
  assert.ok(text.indexOf("P — PLANO") < text.indexOf("RECOMENDAÇÕES NUTRICIONAIS"));
  assert.ok(text.indexOf("RECOMENDAÇÕES NUTRICIONAIS") < text.indexOf("VACINAS RECOMENDADAS PARA REVISÃO"));
  assert.match(text, /Orientação revisada\./);
  assert.match(text, /Influenza \(gripe\)/);
});

test("se não houver exames ou escalas, a cópia não inventa seções vazias", () => {
  const text = renderSoapExamsScalesReport({ evolution: "S — SUBJETIVO", medications: "MEDICAMENTOS EM USO\n- sem dados registrados", plan: "P — PLANO\nsem dados registrados", problems: [], currentExams: "", examHistory: [], scaleResults: [] });
  assert.match(text, /^LISTA DE PROBLEMAS/);
  assert.match(text, /PROBLEMAS CLÍNICOS\n- sem dados registrados/);
  assert.match(text, /PROBLEMAS GERIÁTRICOS\n- sem dados registrados/);
  assert.doesNotMatch(text, /EXAMES DESTA CONSULTA|RESULTADOS DAS ESCALAS/);
  assert.ok(text.indexOf("EVOLUÇÃO") < text.indexOf("P — PLANO"));
  assert.doesNotMatch(text, /RECOMENDAÇÕES NUTRICIONAIS|VACINAS RECOMENDADAS/);
});

test("orientação alimentar só entra após revisão e seleção para SOAP", () => {
  const base = { evolution: "Evolução", medications: "Medicamentos", plan: "Plano", problems: [], currentExams: "", examHistory: [], scaleResults: [] };
  for (const dietaryOrientation of [
    { text: "Rascunho", reviewed: false, includeInSoap: true },
    { text: "Sem autorização", reviewed: true, includeInSoap: false },
    { text: "  ", reviewed: true, includeInSoap: true },
  ]) assert.doesNotMatch(renderSoapExamsScalesReport({ ...base, dietaryOrientation }), /RECOMENDAÇÕES NUTRICIONAIS/);
  assert.doesNotMatch(renderSoapExamsScalesReport({ ...base, pendingVaccines: [] }), /VACINAS RECOMENDADAS/);
});

test("plano copia só problemas ativos com conduta e preserva solicitações independentes", () => {
  const problems = [
    { id: "a", title: "Hipertensão", status: "ACTIVE" as const },
    { id: "b", title: "Queda", status: "MONITORING" as const },
    { id: "c", title: "Dor", status: "ACTIVE" as const },
    { id: "d", title: "Condição resolvida", status: "RESOLVED" as const },
  ];
  const text = renderSoapPlan({ problems, planTextByProblem: { a: "  ", b: "Orientar exercícios.\n\nReavaliar.", c: "Solicitar exame.", d: "Conduta antiga." }, examOrders: ["Hemograma"] });
  assert.match(text, /Solicitações de exames e rastreios:\n- Hemograma/);
  assert.match(text, /1\. Queda\n- Orientar exercícios\.\n- Reavaliar\./);
  assert.match(text, /2\. Dor\n- Solicitar exame\./);
  assert.doesNotMatch(text, /Hipertensão|Condição resolvida|Conduta antiga|sem dados registrados/);
  assert.equal(renderSoapPlan({ problems, planTextByProblem: {}, examOrders: [] }), "P — PLANO\nsem dados registrados");
});
