import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import { renderAccessibleAgaReportText } from "../../src/domain/accessible-aga-report-text.ts";
import {
  emptyAdvanceDirectiveTopics,
  type AdvanceDirectiveRecordView,
} from "../../src/domain/advance-directives.ts";
import {
  buildAgaReportEnrichment,
  buildAdvanceDirectivesReportSection,
  calculateAgeYearsAt,
} from "../../src/domain/report-overview.ts";

const reportPreviewComponent = readFileSync(
  new URL("../../src/components/reports/aga-report-document-preview.tsx", import.meta.url),
  "utf8",
);

function directiveRecord(overrides: Partial<AdvanceDirectiveRecordView> = {}): AdvanceDirectiveRecordView {
  return {
    id: "directive-1",
    consultationId: "consultation-previous",
    consultationOccurredAt: "2026-06-01T12:00:00.000Z",
    recordedByName: "Médica",
    version: 1,
    protocolVersion: "advance-directives-conversation-2026-08-v1",
    createdAt: "2026-06-01T12:30:00.000Z",
    disposition: "WANTS_TO_TALK",
    participationMode: "PATIENT_DIRECT",
    priorities: [],
    topics: emptyAdvanceDirectiveTopics(),
    documentStatus: "NOT_INFORMED",
    reviewTrigger: "WHEN_PERSON_WANTS_OR_CONDITION_CHANGES",
    ...overrides,
  };
}

test("idade é calculada na data da consulta, não na data atual", () => {
  assert.equal(calculateAgeYearsAt("1944-09-01", "2026-08-30"), 81);
  assert.equal(calculateAgeYearsAt("1944-08-30", "2026-08-30"), 82);
});

test("visão geral respeita FAST > MEEM > MoCA > 10-CS e Katz > Barthel > Lawton", () => {
  const report = buildAgaReportModel({
    patientId: "patient-overview",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [
      {
        patientId: "patient-overview",
        consultationId: "consultation-current",
        scaleCode: "moca",
        scaleVersion: "1.0",
        score: 18,
        scoreText: "18/30",
        classification: "resultado registrado",
        appliedAt: "2026-08-30",
      },
      {
        patientId: "patient-overview",
        consultationId: "consultation-current",
        scaleCode: "meem",
        scaleVersion: "1.0",
        score: 22,
        scoreText: "22/30",
        classification: "resultado registrado",
        appliedAt: "2026-08-30",
      },
      {
        patientId: "patient-overview",
        consultationId: "consultation-current",
        scaleCode: "fast",
        scaleVersion: "1.0",
        score: 6.5,
        scoreText: "6e",
        classification: "FAST 6e",
        appliedAt: "2026-08-30",
      },
      {
        patientId: "patient-overview",
        consultationId: "consultation-current",
        scaleCode: "katz",
        scaleVersion: "1.0",
        score: 2,
        scoreText: "2/6",
        classification: "dependência importante",
        appliedAt: "2026-08-30",
      },
      {
        patientId: "patient-overview",
        consultationId: "consultation-current",
        scaleCode: "barthel",
        scaleVersion: "1.0",
        score: 35,
        scoreText: "35/100",
        appliedAt: "2026-08-30",
      },
      {
        patientId: "patient-overview",
        consultationId: "consultation-current",
        scaleCode: "lawton",
        scaleVersion: "1.0",
        score: 7,
        scoreText: "7/21",
        appliedAt: "2026-08-30",
      },
    ],
  });

  const enrichment = buildAgaReportEnrichment({
    patientBirthDate: "1944-09-01",
    consultationDate: "2026-08-30",
    scales: report.assessedScales,
    gastrostomyPresent: true,
    directiveHistory: [],
  });

  assert.equal(enrichment.overview.ageYears, 81);
  assert.equal(enrichment.overview.cognition?.scaleCode, "fast");
  assert.deepEqual(enrichment.overview.functionality.map((item) => item.scaleCode), ["katz", "barthel", "lawton"]);
  assert.equal(enrichment.overview.device?.label, "Gastrostomia (GTT)");
  assert.equal(enrichment.overview.advanceDirectives, undefined);
});

test("diretiva estruturada salva aparece no relatório mesmo sem campos adicionais", () => {
  const savedConversation = directiveRecord({
    id: "directive-saved",
    consultationId: "consultation-current",
    consultationOccurredAt: "2026-08-30T12:00:00.000Z",
    createdAt: "2026-08-30T12:30:00.000Z",
  });

  const section = buildAdvanceDirectivesReportSection([savedConversation]);
  assert.ok(section);
  assert.equal(section.sourceConsultationId, "consultation-current");
  assert.equal(section.version, 1);
  assert.equal(section.participation, "Paciente participou diretamente");

  const enrichment = buildAgaReportEnrichment({
    consultationDate: "2026-08-30",
    scales: [],
    gastrostomyPresent: false,
    directiveHistory: [savedConversation],
  });
  assert.ok(enrichment.advanceDirectives);
  assert.equal(
    enrichment.overview.advanceDirectives?.label,
    "Conversa registrada — preferências específicas ainda não documentadas",
  );
});

test("diretiva específica prévia não é apagada e histórico não é exposto no relatório final", () => {
  const topics = emptyAdvanceDirectiveTopics();
  const recordedPreference = "Não deseja reanimação cardiopulmonar se não houver perspectiva de recuperação.";
  topics.CARDIOPULMONARY_RESUSCITATION = {
    status: "PREFERENCE_RECORDED",
    note: recordedPreference,
  };
  const meaningful = directiveRecord({
    whatMatters: "Permanecer próxima à família.",
    priorities: ["SYMPTOM_RELIEF_AND_COMFORT"],
    topics,
    documentStatus: "PRESENTED",
  });
  const laterEmptyConversation = directiveRecord({
    id: "directive-empty-later",
    consultationId: "consultation-intermediate",
    consultationOccurredAt: "2026-08-15T12:00:00.000Z",
    createdAt: "2026-08-15T12:30:00.000Z",
    version: 1,
  });
  const laterDeclined = directiveRecord({
    id: "directive-2",
    consultationId: "consultation-current",
    consultationOccurredAt: "2026-08-30T12:00:00.000Z",
    createdAt: "2026-08-30T12:30:00.000Z",
    disposition: "DECLINED",
    participationMode: undefined,
    priorities: [],
    topics: emptyAdvanceDirectiveTopics(),
    documentStatus: "NOT_INFORMED",
  });

  const section = buildAdvanceDirectivesReportSection([laterDeclined, laterEmptyConversation, meaningful]);
  assert.ok(section);
  assert.equal(section.sourceConsultationId, "consultation-previous");
  assert.equal(section.whatMatters, "Permanecer próxima à família.");
  assert.equal(section.topics[0]?.status, recordedPreference);
  assert.equal(section.topics[0]?.note, undefined);
  assert.doesNotMatch(section.topics[0]?.status ?? "", /Preferência registrada/i);
  assert.deepEqual(section.history, []);
});

test("preferência marcada como registrada sem descrição não cria texto genérico no relatório", () => {
  const topics = emptyAdvanceDirectiveTopics();
  topics.CARDIOPULMONARY_RESUSCITATION = { status: "PREFERENCE_RECORDED" };
  const section = buildAdvanceDirectivesReportSection([directiveRecord({ topics })]);
  assert.ok(section);
  assert.deepEqual(section.topics, []);
});

test("adiamento ou recusa sem conversa de diretivas não criam aba falsa no relatório", () => {
  const declined = directiveRecord({
    id: "directive-declined",
    disposition: "DECLINED",
    participationMode: undefined,
  });
  const later = directiveRecord({
    id: "directive-later",
    disposition: "PREFERS_LATER",
    participationMode: undefined,
  });
  assert.equal(buildAdvanceDirectivesReportSection([declined, later]), undefined);
});

test("componente visual mantém aba condicional e documento de diretivas no relatório final", () => {
  assert.match(reportPreviewComponent, /generated\.report\.advanceDirectives \? \(/);
  assert.match(reportPreviewComponent, />Diretivas antecipadas<\/button>/);
  assert.match(reportPreviewComponent, /<AdvanceDirectivesDocument/);
  assert.match(reportPreviewComponent, /activeTab === "directives" && generated\.report\.advanceDirectives/);
});

test("exportação acessível usa visão geral estruturada, preferência documentada e omite histórico", () => {
  const report = buildAgaReportModel({
    patientId: "patient-text",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [{
      patientId: "patient-text",
      consultationId: "consultation-current",
      scaleCode: "fast",
      scaleVersion: "1.0",
      score: 6.5,
      scoreText: "6e",
      classification: "FAST 6e",
      appliedAt: "2026-08-30",
    }],
  });
  const topics = emptyAdvanceDirectiveTopics();
  const recordedPreference = "Prefere permanecer em casa quando isso for seguro e clinicamente possível.";
  topics.CARDIOPULMONARY_RESUSCITATION = { status: "PREFERENCE_RECORDED", note: recordedPreference };
  topics.HOSPITALIZATION_AND_PLACE_OF_CARE = { status: "UNCERTAIN_CONTEXT_DEPENDENT" };
  const enrichment = buildAgaReportEnrichment({
    patientBirthDate: "1944-08-30",
    consultationDate: "2026-08-30",
    scales: report.assessedScales,
    gastrostomyPresent: true,
    directiveHistory: [
      directiveRecord({
        id: "directive-current",
        consultationId: "consultation-current",
        consultationOccurredAt: "2026-08-30T12:00:00.000Z",
        whatMatters: "Conforto e proximidade da família.",
        topics,
      }),
      directiveRecord({
        id: "directive-older",
        consultationId: "consultation-older",
        consultationOccurredAt: "2026-07-15T12:00:00.000Z",
        whatMatters: "Manter contato com a família.",
      }),
    ],
  });

  const text = renderAccessibleAgaReportText({ ...report, ...enrichment });
  assert.match(text, /VISÃO GERAL/);
  assert.match(text, /Idade: 82 anos/);
  assert.match(text, /Cognição — FAST: 6E — FAST 6E/);
  assert.doesNotMatch(text, /Cognição — FAST: 6\.5/);
  assert.match(text, /Dispositivo: Gastrostomia \(GTT\)/);
  assert.match(text, /DIRETIVAS ANTECIPADAS/);
  assert.match(text, new RegExp(recordedPreference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(text, /Preferência registrada/i);
  assert.doesNotMatch(text, /\nHistórico\n/i);
  assert.doesNotMatch(text, /Sem mudança numérica classificável/);
});
