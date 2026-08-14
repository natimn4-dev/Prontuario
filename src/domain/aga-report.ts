import { buildClinicalChangeSummary, type LongitudinalAssessment } from "./clinical-change-summary.ts";
import { proposeProblemsFromAssessments } from "./problem-proposals.ts";
import { splitProblems, type ClinicalProblem } from "./problems.ts";
import { SCALE_CATALOG, scaleCatalogEntry } from "./scale-catalog.ts";

export type AgaReportConsultationStatus = "DRAFT" | "IN_REVIEW" | "FINALIZED";
export type AgaScaleTrend =
  | "favorable"
  | "unfavorable"
  | "stable"
  | "not-comparable"
  | "insufficient-data";

export interface AgaCollectedDatum {
  field: string;
  value: string;
}

export interface AgaInterventionSuggestion {
  text: string;
  reviewStatus: "pending-medical-review";
}

export interface AgaScaleReportSection {
  code: string;
  version: string;
  name: string;
  dimension: string;
  assessedInTargetConsultation: boolean;
  lastKnown: {
    consultationId: string;
    appliedAt: string;
    score: number | null;
    version: string;
  };
  collectedData: AgaCollectedDatum[];
  result: {
    score: number | null;
    scoreText?: string;
    classification?: string;
  };
  interpretation?: string;
  clinicalColor?: string;
  relatedProblemProposals: { title: string; type: "CLINICAL" | "GERIATRIC" }[];
  interventionSuggestions: AgaInterventionSuggestion[];
  evolution: {
    previous: number | null;
    previousVersion: string | null;
    baseline: number | null;
    baselineVersion: string;
    current: number | null;
    currentVersion: string | null;
    trend: AgaScaleTrend;
    vsPrevious: string;
    vsBaseline: string;
  };
  source: {
    status: string;
    citation?: string;
    note: string;
  };
}

export interface AgaReportModel {
  schemaVersion: "1.1";
  patientId: string;
  consultationId: string;
  consultationStatus: AgaReportConsultationStatus;
  draftContext: boolean;
  patientName: string;
  clinicalProblems: ClinicalProblem[];
  geriatricProblems: ClinicalProblem[];
  assessedScales: AgaScaleReportSection[];
  notAssessedScaleCodes: string[];
  alerts: { severity: string; message: string }[];
  changeSummary: {
    headline: string;
    narrative: string[];
    counts: {
      favorable: number;
      stable: number;
      unfavorable: number;
      notComparable: number;
      insufficientData: number;
      urgentAlerts: number;
    };
  };
  carePlan: {
    now: string[];
    mediumTerm: string[];
    caregiver: string[];
    referrals: string[];
    contact: string[];
    urgent: string[];
  };
}

function displayCollectedValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function interventionTexts(card: ReturnType<typeof buildClinicalChangeSummary>["cards"][number]): string[] {
  return [...new Set([
    ...card.intervention.agora,
    ...card.intervention.medio,
    ...card.intervention.cuidador,
    ...card.intervention.encaminhamentos,
    ...card.intervention.contato,
    ...card.intervention.urgencia,
  ])];
}

export function buildAgaReportModel(input: {
  patientId: string;
  consultationId: string;
  consultationStatus: AgaReportConsultationStatus;
  patientName: string;
  longitudinalAssessments: readonly LongitudinalAssessment[];
  longitudinalProblems: readonly ClinicalProblem[];
}): AgaReportModel {
  if (!input.patientId || !input.consultationId) {
    throw new Error("Paciente e consulta são obrigatórios para gerar o relatório AGA.");
  }
  if (input.longitudinalProblems.some((problem) => problem.patientId !== input.patientId)) {
    throw new Error("Problema de outro paciente detectado no relatório AGA.");
  }

  const summary = buildClinicalChangeSummary(input.longitudinalAssessments, {
    targetConsultationId: input.consultationId,
  });
  if (summary.patientId && summary.patientId !== input.patientId) {
    throw new Error("Avaliação de outro paciente detectada no relatório AGA.");
  }

  const currentAssessments = summary.cards
    .filter((card) => card.assessedInTargetConsultation)
    .map((card) => card.current);
  const proposals = proposeProblemsFromAssessments(currentAssessments);
  const problems = splitProblems([...input.longitudinalProblems]);
  const assessedCodes = new Set(summary.cards
    .filter((card) => card.assessedInTargetConsultation)
    .map((card) => card.scaleId));

  return {
    schemaVersion: "1.1",
    patientId: input.patientId,
    consultationId: input.consultationId,
    consultationStatus: input.consultationStatus,
    draftContext: input.consultationStatus !== "FINALIZED",
    patientName: input.patientName,
    clinicalProblems: problems.clinical,
    geriatricProblems: problems.geriatric,
    assessedScales: summary.cards.map((card) => {
      const definition = scaleCatalogEntry(card.scaleId);
      const relatedProposals = proposals
        .filter((proposal) => proposal.sourceScales.includes(card.scaleId))
        .map((proposal) => ({ title: proposal.title, type: proposal.type }));
      const collectedData = Object.entries(card.current.answers ?? {})
        .flatMap(([field, value]): AgaCollectedDatum[] => {
          const displayed = displayCollectedValue(value);
          return displayed === null ? [] : [{ field, value: displayed }];
        });

      return {
        code: card.scaleId,
        version: card.scaleVersion,
        name: card.name,
        dimension: card.dimension,
        assessedInTargetConsultation: card.assessedInTargetConsultation,
        lastKnown: {
          consultationId: card.current.consultationId,
          appliedAt: new Date(card.current.appliedAt).toISOString(),
          score: card.current.score,
          version: card.current.scaleVersion,
        },
        collectedData,
        result: {
          score: card.current.score,
          scoreText: card.current.scoreText,
          classification: card.current.classification,
        },
        interpretation: card.current.interpretation,
        clinicalColor: card.current.color,
        relatedProblemProposals: card.assessedInTargetConsultation ? relatedProposals : [],
        interventionSuggestions: (card.assessedInTargetConsultation ? interventionTexts(card) : []).map((text) => ({
          text,
          reviewStatus: "pending-medical-review" as const,
        })),
        evolution: {
          previous: card.vsPrevious.fromScore,
          previousVersion: card.previous?.scaleVersion ?? null,
          baseline: card.baseline.score,
          baselineVersion: card.baseline.scaleVersion,
          current: card.assessedInTargetConsultation ? card.current.score : null,
          currentVersion: card.assessedInTargetConsultation ? card.current.scaleVersion : null,
          trend: card.vsPrevious.trend,
          vsPrevious: card.trendLabel,
          vsBaseline: card.vsBaseline.trend,
        },
        source: {
          status: definition.sourceStatus,
          citation: definition.source,
          note: definition.sourceNote,
        },
      };
    }),
    notAssessedScaleCodes: Object.keys(SCALE_CATALOG).filter((code) => !assessedCodes.has(code)),
    alerts: [...summary.urgentAlerts, ...summary.attentionAlerts].map((alert) => ({
      severity: alert.severity,
      message: alert.message,
    })),
    changeSummary: {
      headline: summary.headline,
      narrative: [...summary.narrative],
      counts: { ...summary.counts },
    },
    carePlan: {
      now: [...summary.combinedPlan.agora],
      mediumTerm: [...summary.combinedPlan.medio],
      caregiver: [...summary.combinedPlan.cuidador],
      referrals: [...summary.combinedPlan.encaminhamentos],
      contact: [...summary.combinedPlan.contato],
      urgent: [...summary.combinedPlan.urgencia],
    },
  };
}

function list(items: readonly string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- sem dados registrados";
}

function carePlanBlock(title: string, items: readonly string[]): string[] {
  return ["", title, list(items)];
}

export function renderAgaReportText(model: AgaReportModel): string {
  const blocks = [
    `RELATÓRIO DA AVALIAÇÃO GERIÁTRICA AMPLA — LONGITUDINAL — ${model.patientName}`,
    `Consulta: ${model.consultationId} · Estado: ${model.consultationStatus}`,
    "",
    "RESUMO LONGITUDINAL",
    model.changeSummary.headline,
    list(model.changeSummary.narrative),
  ];
  if (model.draftContext) {
    blocks.push("", "ATENÇÃO: relatório gerado antes da finalização da consulta.");
  }

  blocks.push(
    "",
    "PROBLEMAS CLÍNICOS",
    list(model.clinicalProblems.map((problem) => `${problem.title} [${problem.status}]`)),
    "",
    "PROBLEMAS GERIÁTRICOS",
    list(model.geriatricProblems.map((problem) => `${problem.title} [${problem.status}]`)),
  );

  for (const scale of model.assessedScales) {
    const resultLabel = scale.assessedInTargetConsultation
      ? "Avaliado nesta consulta"
      : `Último valor conhecido — não avaliado nesta consulta (consulta ${scale.lastKnown.consultationId}, ${scale.lastKnown.appliedAt.slice(0, 10)})`;
    const finalPoint = scale.assessedInTargetConsultation
      ? `atual ${scale.evolution.current ?? "—"}${scale.evolution.currentVersion ? ` (v${scale.evolution.currentVersion})` : ""}`
      : `último conhecido ${scale.lastKnown.score ?? "—"} (v${scale.lastKnown.version}; consulta ${scale.lastKnown.consultationId})`;
    const collectedDataLabel = scale.assessedInTargetConsultation
      ? "Dado coletado nesta consulta"
      : "Dados do último registro conhecido";
    blocks.push(
      "",
      `${scale.name} (${scale.code} · versão ${scale.version})`,
      `${collectedDataLabel}: ${scale.collectedData.length > 0 ? scale.collectedData.map((item) => `${item.field}=${item.value}`).join("; ") : "sem respostas detalhadas registradas"}`,
      `${resultLabel}: ${scale.result.scoreText ?? scale.result.score ?? "sem pontuação registrada"}`,
      `Classificação: ${scale.result.classification ?? "sem classificação registrada"}`,
      `Interpretação: ${scale.interpretation ?? "sem interpretação registrada"}`,
      `Trajetória: baseline ${scale.evolution.baseline ?? "—"} (v${scale.evolution.baselineVersion}); anterior ${scale.evolution.previous ?? "—"}${scale.evolution.previousVersion ? ` (v${scale.evolution.previousVersion})` : ""}; ${finalPoint}; ${scale.evolution.vsPrevious}`,
      `Problema relacionado (proposta): ${scale.relatedProblemProposals.map((problem) => `[${problem.type}] ${problem.title}`).join("; ") || "nenhum proposto"}`,
      `Fonte/status: ${scale.source.status}${scale.source.citation ? ` · ${scale.source.citation}` : ""}`,
      "Intervenções/sugestões pendentes de revisão médica:",
      list(scale.interventionSuggestions.map((suggestion) => suggestion.text)),
    );
  }

  blocks.push("", "PLANO DE CUIDADO — SUGESTÕES PENDENTES DE REVISÃO MÉDICA");
  blocks.push(...carePlanBlock("Agora", model.carePlan.now));
  blocks.push(...carePlanBlock("Médio prazo", model.carePlan.mediumTerm));
  blocks.push(...carePlanBlock("Família/cuidador", model.carePlan.caregiver));
  blocks.push(...carePlanBlock("Encaminhamentos", model.carePlan.referrals));
  blocks.push(...carePlanBlock("Quando entrar em contato", model.carePlan.contact));
  blocks.push(...carePlanBlock("Urgência", model.carePlan.urgent));

  blocks.push("", "ALERTAS VISÍVEIS", list(model.alerts.map((alert) => `[${alert.severity}] ${alert.message}`)));
  return blocks.join("\n");
}
