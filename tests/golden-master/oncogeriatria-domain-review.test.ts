import assert from "node:assert/strict";
import test from "node:test";
import type { CapacityDimensionHistory } from "../../src/domain/capacity-dimension-history.ts";
import {
  buildOncogeriatricDomainReviewPriorities,
  buildOncogeriatricReportGuidance,
} from "../../src/domain/oncogeriatria/domain-review.ts";

function history(): CapacityDimensionHistory {
  return {
    patientId: "patient-a",
    methodologyVersion: "intrinsic-capacity-model-v1.1.0",
    frameworkLabel: "Teste",
    methodologyNote: "Teste",
    consultations: [
      { id: "consultation-1", occurredAt: "2026-01-10T00:00:00.000Z", isTarget: false },
      { id: "consultation-2", occurredAt: "2026-02-10T00:00:00.000Z", isTarget: true },
    ],
    dimensions: [
      {
        code: "cognicao",
        label: "Cognição",
        framework: "intrinsic-capacity",
        cells: [
          {
            consultationId: "consultation-1",
            status: "altered",
            statusReason: "Alteração persistida",
            assessments: [
              { scaleCode: "moca", scaleName: "MoCA", scaleVersion: "v1", scoreNumeric: 17, scoreText: "17/30", classification: "Alterado", clinicalColor: "vermelho", role: "assessment", mappingStrength: "strong", basis: "direct", canClassifyDomain: true, selectedForDomainState: true, rationale: "Teste" },
              { scaleCode: "meem", scaleName: "MEEM", scaleVersion: "v1", scoreNumeric: 22, scoreText: "22/30", classification: "Revisar", clinicalColor: "amarelo", role: "screening", mappingStrength: "strong", basis: "screening", canClassifyDomain: true, selectedForDomainState: false, rationale: "Teste" },
            ],
          },
          { consultationId: "consultation-2", status: "not-assessed", statusReason: "Não reaplicada", assessments: [] },
        ],
      },
      {
        code: "sensorial",
        label: "Capacidade sensorial",
        framework: "intrinsic-capacity",
        cells: [
          { consultationId: "consultation-1", status: "preserved", statusReason: "Sem redução", assessments: [{ scaleCode: "hearing", scaleName: "Audição", scaleVersion: "v1", scoreText: "preservada", clinicalColor: "verde", role: "assessment", mappingStrength: "strong", basis: "direct", canClassifyDomain: true, selectedForDomainState: true, rationale: "Teste" }] },
          { consultationId: "consultation-2", status: "not-assessed", statusReason: "Não reaplicada", assessments: [] },
        ],
      },
    ],
    inflectionPoints: [],
    hasAssessmentData: true,
    hasLongitudinalHistoryData: true,
    hasLongitudinalTrendData: false,
  };
}

test("reavaliação prioriza os instrumentos da última consulta que avaliou o domínio", () => {
  const priorities = buildOncogeriatricDomainReviewPriorities(history());
  assert.equal(priorities.length, 1);
  assert.equal(priorities[0]?.code, "cognicao");
  assert.equal(priorities[0]?.consultationId, "consultation-1");
  assert.deepEqual(priorities[0]?.instruments.map((item) => item.name), ["MoCA", "MEEM"]);
  assert.equal(priorities[0]?.instruments[0]?.selectedForDomainState, true);
});

test("consulta posterior sem reaplicação não apaga prioridade anterior nem fabrica dado", () => {
  const priorities = buildOncogeriatricDomainReviewPriorities(history());
  assert.equal(priorities[0]?.occurredAt, "2026-01-10T00:00:00.000Z");
  assert.equal(priorities.some((item) => item.code === "sensorial"), false);
});

test("orientação do relatório usa domínio persistido, PubMed e revisão clínica obrigatória", () => {
  const guidance = buildOncogeriatricReportGuidance(history());
  assert.equal(guidance.length, 1);
  assert.equal(guidance[0]?.requiresClinicalReview, true);
  assert.deepEqual(guidance[0]?.triggeredBy, ["MoCA", "MEEM"]);
  assert.ok(guidance[0]?.evidenceReferences.every((reference) => reference.url.startsWith("https://pubmed.ncbi.nlm.nih.gov/")));
});
