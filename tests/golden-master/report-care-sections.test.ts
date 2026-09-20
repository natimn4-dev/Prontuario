import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { renderAccessibleAgaReportText } from "../../src/domain/accessible-aga-report-text.ts";
import { buildAgaReportCareSections } from "../../src/domain/report-care-sections.ts";

const problems = [
  { id: "problem-1", title: "Hipertensão arterial" },
  { id: "problem-2", title: "Anemia" },
];

function savedPlan() {
  return {
    schemaVersion: "1.0",
    kind: "plan",
    byProblem: {
      "problem-1": [
        "Solicitar hemograma e função renal.",
        "Revisar a receita após a avaliação dos resultados.",
      ],
    },
  };
}

test("condutas clínicas do relatório vêm apenas do plano estruturado salvo pelo médico", () => {
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: false,
    savedPlan: savedPlan(),
    problems,
  });

  assert.deepEqual(sections.clinicalConducts, [{
    problemId: "problem-1",
    problemTitle: "Hipertensão arterial",
    actions: [
      "Solicitar hemograma e função renal.",
      "Revisar a receita após a avaliação dos resultados.",
    ],
  }]);
  assert.equal(sections.gastrostomyCare, undefined);
});

test("conduta vinculada a problema fora do horizonte não vaza para o relatório", () => {
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: false,
    savedPlan: {
      schemaVersion: "1.0",
      kind: "plan",
      byProblem: {
        "problem-outro-paciente": ["Solicitar exame indevido."],
      },
    },
    problems,
  });

  assert.deepEqual(sections.clinicalConducts, []);
});

test("exames e rastreios marcados na evolução aparecem em condutas sem criar indicação automática", () => {
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: false,
    savedPlan: {
      schemaVersion: "1.0",
      kind: "plan",
      preventiveExamOrders: ["MAMMOGRAPHY", "FOBT", "BONE_DENSITOMETRY"],
    },
    problems: [],
  });

  assert.deepEqual(sections.clinicalConducts, [{
    problemId: "preventive-exam-orders",
    problemTitle: "Exames e rastreios solicitados",
    actions: [
      "Pesquisa de sangue oculto nas fezes",
      "Mamografia",
      "Densitometria óssea",
    ],
  }]);
});

test("plano legado ou ambíguo falha fechado e não é reinterpretado como conduta", () => {
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: false,
    savedPlan: { byProblem: { "problem-1": ["Solicitar exame."] } },
    problems,
  });

  assert.deepEqual(sections.clinicalConducts, []);
});

test("gastrostomia estruturada cria caixa de cuidados sem inventar volumes ou fórmula", () => {
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: true,
    savedPlan: savedPlan(),
    problems,
  });

  assert.ok(sections.gastrostomyCare);
  const text = [
    ...sections.gastrostomyCare.practicalActions,
    ...sections.gastrostomyCare.caregiverActions,
    ...sections.gastrostomyCare.contactGuidance,
  ].join(" ");
  assert.match(text, /dieta enteral/i);
  assert.match(text, /antes de triturar um comprimido/i);
  assert.match(text, /estoma/i);
  assert.match(text, /volume prescrito/i);
  assert.doesNotMatch(text, /\b\d+\s*mL\b/i);
  assert.doesNotMatch(text, /\b\d+\s*kcal\b/i);
});

test("texto acessível inclui as duas caixas somente quando os dados correspondentes existem", () => {
  const report = buildAgaReportModel({
    patientId: "patient-1",
    consultationId: "consultation-1",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [],
  });
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: true,
    savedPlan: savedPlan(),
    problems,
  });
  const text = renderAccessibleAgaReportText({ ...report, ...sections });

  assert.match(text, /CONDUTAS CLÍNICAS/);
  assert.match(text, /Solicitar hemograma e função renal/);
  assert.match(text, /CUIDADOS COM GASTROSTOMIA/);

  const withoutSections = renderAccessibleAgaReportText(report);
  assert.doesNotMatch(withoutSections, /CONDUTAS CLÍNICAS/);
  assert.doesNotMatch(withoutSections, /CUIDADOS COM GASTROSTOMIA/);
});

test("relatório de orientações mostra apenas as solicitações de rastreio assinaladas", () => {
  const report = buildAgaReportModel({
    patientId: "patient-1",
    consultationId: "consultation-1",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [],
  });
  const sections = buildAgaReportCareSections({
    gastrostomyPresent: false,
    savedPlan: {
      schemaVersion: "1.0",
      kind: "plan",
      preventiveExamOrders: ["COLONOSCOPY", "BREAST_ULTRASOUND"],
    },
    problems: [],
  });
  const text = renderAccessibleAgaReportText({ ...report, ...sections });

  assert.match(text, /CONDUTAS CLÍNICAS/);
  assert.match(text, /Exames e rastreios solicitados/);
  assert.match(text, /Colonoscopia/);
  assert.match(text, /USG de mamas e axilas/);
  assert.doesNotMatch(text, /Mamografia/);
  assert.doesNotMatch(text, /Densitometria óssea/);
});
