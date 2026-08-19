import assert from "node:assert/strict";
import test from "node:test";
import { buildFamilyReportModel, renderFamilyReportText, renderSoapText } from "../../src/domain/document-renderers.ts";
import { emptyInterventionPlan } from "../../src/domain/interventions.ts";

const problems = [
  { id: "p1", patientId: "patient", type: "CLINICAL" as const, status: "ACTIVE" as const, title: "Hipertensão arterial" },
  { id: "p2", patientId: "patient", type: "GERIATRIC" as const, status: "ACTIVE" as const, title: "Risco de quedas" },
];

test("SOAP mantém quatro seções e usa sem dados registrados", () => {
  const text = renderSoapText({ problems });
  assert.match(text, /S — SUBJETIVO/);
  assert.match(text, /O — OBJETIVO/);
  assert.match(text, /A — AVALIAÇÃO/);
  assert.match(text, /P — PLANO/);
  assert.ok(text.includes("sem dados registrados"));
  assert.ok(text.includes("Hipertensão arterial"));
});

test("SOAP inclui medicações no Objetivo", () => {
  const text = renderSoapText({
    subjective: "Sem queixas novas.",
    problems,
    medications: [{ medicationText: "Losartana 50 mg", doseInstruction: "1 comprimido", route: "VO", moments: ["manha", "noite"] }],
  });
  assert.match(text, /Medicações em uso:/);
  assert.match(text, /Losartana 50 mg — 1 comprimido · VO · Manhã, Noite/);
});

test("relatório familiar separa problemas clínicos e geriátricos", () => {
  const plan = emptyInterventionPlan();
  plan.agora.push("Manter rotina organizada.");
  const model = buildFamilyReportModel({ patientName: "Paciente Teste", problems, plan, contactPhone: "71 99992-1416" });
  assert.deepEqual(model.clinicalProblems, ["Hipertensão arterial"]);
  assert.deepEqual(model.geriatricProblems, ["Risco de quedas"]);
  const text = renderFamilyReportText(model);
  assert.match(text, /Problemas clínicos/);
  assert.match(text, /Problemas geriátricos/);
  assert.match(text, /Quando entrar em contato: 71 99992-1416/);
  assert.doesNotMatch(text, /Quando entrar em contato com o consultório/);
});

test("relatório familiar não repete sinais de atenção textualmente idênticos", () => {
  const plan = emptyInterventionPlan();
  plan.contato.push("Nova queda ou piora do equilíbrio.");
  plan.urgencia.push("Procure atendimento em caso de perda de consciência.");

  const model = buildFamilyReportModel({
    patientName: "Paciente Teste",
    problems,
    plan,
    attentionSigns: [
      "Nova queda ou piora do equilíbrio.",
      "Procure atendimento em caso de perda de consciência.",
      "Nova queda ou piora do equilíbrio.",
    ],
  });

  assert.deepEqual(model.attentionSigns, [
    "Nova queda ou piora do equilíbrio.",
    "Procure atendimento em caso de perda de consciência.",
  ]);
  const text = renderFamilyReportText(model);
  assert.equal(text.match(/Nova queda ou piora do equilíbrio\./g)?.length, 1);
  assert.equal(text.match(/Procure atendimento em caso de perda de consciência\./g)?.length, 1);
});

test("deduplicação ignora apenas caixa e espaços e preserva a primeira redação", () => {
  const plan = emptyInterventionPlan();
  plan.contato.push("nova   queda ou piora do equilíbrio.");
  plan.urgencia.push("PROCURE ATENDIMENTO EM CASO DE PERDA DE CONSCIÊNCIA.");

  const model = buildFamilyReportModel({
    patientName: "Paciente Teste",
    problems,
    plan,
    attentionSigns: [
      "Nova queda ou piora do equilíbrio.",
      "Procure atendimento em caso de perda de consciência.",
    ],
  });

  assert.deepEqual(model.attentionSigns, [
    "Nova queda ou piora do equilíbrio.",
    "Procure atendimento em caso de perda de consciência.",
  ]);
});

test("textos clinicamente diferentes permanecem separados", () => {
  const plan = emptyInterventionPlan();
  plan.contato.push("Nova queda.");
  plan.urgencia.push("Nova queda com perda de consciência.");

  const model = buildFamilyReportModel({
    patientName: "Paciente Teste",
    problems,
    plan,
  });

  assert.deepEqual(model.attentionSigns, [
    "Nova queda.",
    "Nova queda com perda de consciência.",
  ]);
});
