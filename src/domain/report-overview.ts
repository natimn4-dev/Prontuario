import type { AgaScaleReportSection } from "./aga-report.ts";
import { displayScaleScore } from "./fast-stage.ts";
import {
  ADVANCE_DIRECTIVE_TOPIC_CODES,
  DOCUMENT_STATUS_LABELS,
  PARTICIPATION_LABELS,
  PRIORITY_LABELS,
  REVIEW_TRIGGER_LABELS,
  TOPIC_LABELS,
  TOPIC_STATUS_LABELS,
  type AdvanceDirectiveRecordView,
} from "./advance-directives.ts";

const COGNITION_PRECEDENCE = ["fast", "meem", "moca", "dez_cs"] as const;
const FUNCTIONALITY_ORDER = ["katz", "barthel", "lawton"] as const;

export interface AgaReportOverviewScaleItem {
  scaleCode: string;
  label: string;
  value: string;
  assessedInTargetConsultation: boolean;
  sourceDate: string;
}

export interface AgaReportOverview {
  ageYears?: number;
  cognition?: AgaReportOverviewScaleItem;
  functionality: AgaReportOverviewScaleItem[];
  device?: {
    label: "Gastrostomia (GTT)";
    source: "structured-medication-route";
  };
  advanceDirectives?: {
    label: string;
    sourceConsultationDate: string;
  };
}

export interface AgaAdvanceDirectiveReportTopic {
  code: string;
  title: string;
  status: string;
  note?: string;
}

export interface AgaAdvanceDirectivesReportSection {
  sourceConsultationId: string;
  sourceConsultationDate: string;
  version: number;
  participation?: string;
  trustedPerson?: {
    name: string;
    relation?: string;
  };
  whatMatters?: string;
  dignityAndComfort?: string;
  priorities: string[];
  topics: AgaAdvanceDirectiveReportTopic[];
  documentStatus?: string;
  reviewTrigger: string;
  history: Array<{
    consultationId: string;
    consultationDate: string;
    version: number;
  }>;
}

export type AgaReportEnrichment = {
  overview: AgaReportOverview;
  advanceDirectives?: AgaAdvanceDirectivesReportSection;
};

export function calculateAgeYearsAt(
  birthDate: Date | string | null | undefined,
  referenceDate: Date | string,
): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  const reference = new Date(referenceDate);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) return undefined;

  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = reference.getUTCMonth() < birth.getUTCMonth()
    || (reference.getUTCMonth() === birth.getUTCMonth() && reference.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : undefined;
}

function fastStageValue(scale: AgaScaleReportSection): string | undefined {
  return displayScaleScore({ scaleCode: scale.code, score: scale.result.score, scoreText: scale.result.scoreText });
}

function isMoca(scale: AgaScaleReportSection): boolean {
  return scale.code === "moca" || scale.code === "moca_br_freitas";
}

function mocaScoreValue(scale: AgaScaleReportSection): string | undefined {
  if (!isMoca(scale)) return undefined;
  if (typeof scale.result.score === "number" && Number.isFinite(scale.result.score)) {
    return `${scale.result.score}/30`;
  }

  const scoreText = scale.result.scoreText?.trim();
  if (!scoreText) return undefined;
  const corrected = scoreText.match(/corrigido\s+(\d+(?:[.,]\d+)?)\s*\/\s*30/i);
  const fallback = scoreText.match(/(\d+(?:[.,]\d+)?)\s*\/\s*30/i);
  const value = corrected?.[1] ?? fallback?.[1];
  return value ? `${value.replace(",", ".")}/30` : undefined;
}

function scaleValue(scale: AgaScaleReportSection): string | undefined {
  const conciseMoca = mocaScoreValue(scale);
  if (conciseMoca) return conciseMoca;

  const canonicalFastStage = scale.code === "fast" ? fastStageValue(scale) : undefined;
  const primary = canonicalFastStage
    || scale.result.scoreText?.trim()
    || (scale.result.score !== null ? String(scale.result.score) : "")
    || scale.result.classification?.trim()
    || scale.interpretation?.trim()
    || "";
  if (!primary) return undefined;

  const classification = scale.result.classification?.trim();
  if (classification && !primary.toLocaleLowerCase("pt-BR").includes(classification.toLocaleLowerCase("pt-BR"))) {
    return `${primary} — ${classification}`;
  }
  return primary;
}

function overviewScaleLabel(scale: AgaScaleReportSection): string {
  if (isMoca(scale)) return "MoCA";
  if (scale.code === "lawton") return "AIVD (atividades instrumentais da vida diária) — Lawton";
  if (scale.code === "katz") return "ABVD (atividades básicas da vida diária) — Katz";
  if (scale.code === "barthel") return "ABVD (atividades básicas da vida diária) — Barthel";
  return scale.name;
}

function scaleOverviewItem(scale: AgaScaleReportSection | undefined): AgaReportOverviewScaleItem | undefined {
  if (!scale) return undefined;
  const value = scaleValue(scale);
  if (!value) return undefined;
  return {
    scaleCode: scale.code,
    label: overviewScaleLabel(scale),
    value,
    assessedInTargetConsultation: scale.assessedInTargetConsultation,
    sourceDate: scale.lastKnown.appliedAt,
  };
}

function isAdvanceDirectiveConversation(record: AdvanceDirectiveRecordView): boolean {
  return record.disposition === "WANTS_TO_TALK";
}

function hasSpecificAdvanceDirectiveContent(record: AdvanceDirectiveRecordView): boolean {
  if (!isAdvanceDirectiveConversation(record)) return false;
  if (record.whatMatters?.trim() || record.dignityAndComfort?.trim()) return true;
  if (record.priorities.length > 0) return true;
  if (record.trustedPersonName?.trim()) return true;
  if (record.documentStatus === "PRESENTED" || record.documentStatus === "WILL_BRING_LATER") return true;
  return ADVANCE_DIRECTIVE_TOPIC_CODES.some((code) => {
    const topic = record.topics[code];
    return Boolean(topic.note?.trim()) || topic.status !== "NOT_DISCUSSED";
  });
}

export function buildAdvanceDirectivesReportSection(
  history: readonly AdvanceDirectiveRecordView[],
): AgaAdvanceDirectivesReportSection | undefined {
  const conversationHistory = history.filter(isAdvanceDirectiveConversation);
  const selected = conversationHistory.find(hasSpecificAdvanceDirectiveContent) ?? conversationHistory[0];
  if (!selected) return undefined;

  const topics = ADVANCE_DIRECTIVE_TOPIC_CODES.flatMap((code): AgaAdvanceDirectiveReportTopic[] => {
    const topic = selected.topics[code];
    const note = topic.note?.trim();
    if (topic.status === "NOT_DISCUSSED" && !note) return [];
    if (topic.status === "PREFERENCE_RECORDED") {
      if (!note) return [];
      return [{
        code,
        title: TOPIC_LABELS[code].title,
        status: note,
      }];
    }
    return [{
      code,
      title: TOPIC_LABELS[code].title,
      status: TOPIC_STATUS_LABELS[topic.status],
      ...(note ? { note } : {}),
    }];
  });

  return {
    sourceConsultationId: selected.consultationId,
    sourceConsultationDate: selected.consultationOccurredAt,
    version: selected.version,
    ...(selected.participationMode ? { participation: PARTICIPATION_LABELS[selected.participationMode] } : {}),
    ...(selected.trustedPersonName?.trim() ? {
      trustedPerson: {
        name: selected.trustedPersonName.trim(),
        ...(selected.trustedRelation?.trim() ? { relation: selected.trustedRelation.trim() } : {}),
      },
    } : {}),
    ...(selected.whatMatters?.trim() ? { whatMatters: selected.whatMatters.trim() } : {}),
    ...(selected.dignityAndComfort?.trim() ? { dignityAndComfort: selected.dignityAndComfort.trim() } : {}),
    priorities: selected.priorities.map((priority) => PRIORITY_LABELS[priority]),
    topics,
    ...(selected.documentStatus !== "NOT_INFORMED" ? { documentStatus: DOCUMENT_STATUS_LABELS[selected.documentStatus] } : {}),
    reviewTrigger: REVIEW_TRIGGER_LABELS[selected.reviewTrigger],
    history: [],
  };
}

function hasSpecificAdvanceDirectiveSectionContent(section: AgaAdvanceDirectivesReportSection): boolean {
  return Boolean(
    section.whatMatters
    || section.dignityAndComfort
    || section.trustedPerson
    || section.documentStatus
    || section.priorities.length > 0
    || section.topics.length > 0,
  );
}

export function buildAgaReportEnrichment(input: {
  patientBirthDate?: Date | string | null;
  consultationDate: Date | string;
  scales: readonly AgaScaleReportSection[];
  gastrostomyPresent: boolean;
  directiveHistory: readonly AdvanceDirectiveRecordView[];
}): AgaReportEnrichment {
  const byCode = new Map(input.scales.map((scale) => [scale.code, scale]));
  const cognition = COGNITION_PRECEDENCE
    .map((code) => scaleOverviewItem(byCode.get(code)))
    .find((item): item is AgaReportOverviewScaleItem => Boolean(item));
  const functionality = FUNCTIONALITY_ORDER
    .map((code) => scaleOverviewItem(byCode.get(code)))
    .filter((item): item is AgaReportOverviewScaleItem => Boolean(item));
  const advanceDirectives = buildAdvanceDirectivesReportSection(input.directiveHistory);

  return {
    overview: {
      ...(calculateAgeYearsAt(input.patientBirthDate, input.consultationDate) !== undefined
        ? { ageYears: calculateAgeYearsAt(input.patientBirthDate, input.consultationDate) }
        : {}),
      ...(cognition ? { cognition } : {}),
      functionality,
      ...(input.gastrostomyPresent ? {
        device: {
          label: "Gastrostomia (GTT)" as const,
          source: "structured-medication-route" as const,
        },
      } : {}),
      ...(advanceDirectives ? {
        advanceDirectives: {
          label: hasSpecificAdvanceDirectiveSectionContent(advanceDirectives)
            ? "Registradas — preferências e objetivos de cuidado documentados"
            : "Conversa registrada — preferências específicas ainda não documentadas",
          sourceConsultationDate: advanceDirectives.sourceConsultationDate,
        },
      } : {}),
    },
    ...(advanceDirectives ? { advanceDirectives } : {}),
  };
}
