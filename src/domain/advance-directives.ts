export const ADVANCE_DIRECTIVE_PROTOCOL_VERSION = "advance-directives-conversation-2026-08-v1" as const;

export const ADVANCE_DIRECTIVE_DISPOSITIONS = [
  "WANTS_TO_TALK",
  "PREFERS_LATER",
  "DECLINED",
] as const;

export const ADVANCE_DIRECTIVE_PARTICIPATION_MODES = [
  "PATIENT_DIRECT",
  "PATIENT_SUPPORTED",
  "SURROGATE_PRIOR_PREFERENCES",
  "PARTICIPATION_NOT_POSSIBLE",
] as const;

export const ADVANCE_DIRECTIVE_PRIORITIES = [
  "SYMPTOM_RELIEF_AND_COMFORT",
  "PRESERVE_AUTONOMY_AND_COMMUNICATION",
  "STAY_CLOSE_TO_IMPORTANT_PEOPLE",
  "REMAIN_HOME_WHEN_SAFE_AND_POSSIBLE",
  "PROLONG_LIFE_WHEN_BENEFIT_ACCEPTABLE",
  "AVOID_INTERVENTIONS_THAT_PROLONG_SUFFERING",
] as const;

export const ADVANCE_DIRECTIVE_TOPIC_CODES = [
  "CARDIOPULMONARY_RESUSCITATION",
  "VENTILATION_AND_INTENSIVE_CARE",
  "ARTIFICIAL_NUTRITION_AND_HYDRATION",
  "HOSPITALIZATION_AND_PLACE_OF_CARE",
] as const;

export const ADVANCE_DIRECTIVE_TOPIC_STATUSES = [
  "NOT_DISCUSSED",
  "WANTS_TO_DISCUSS",
  "PREFERENCE_RECORDED",
  "UNCERTAIN_CONTEXT_DEPENDENT",
] as const;

export const ADVANCE_DIRECTIVE_DOCUMENT_STATUSES = [
  "NOT_INFORMED",
  "DOES_NOT_HAVE",
  "PRESENTED",
  "WILL_BRING_LATER",
] as const;

export const ADVANCE_DIRECTIVE_REVIEW_TRIGGERS = [
  "WHEN_PERSON_WANTS_OR_CONDITION_CHANGES",
  "NEXT_CONSULTATION",
  "AFTER_FAMILY_CONVERSATION",
  "AFTER_SPECIFIC_CLINICAL_REVIEW",
] as const;

export type AdvanceDirectiveDisposition = (typeof ADVANCE_DIRECTIVE_DISPOSITIONS)[number];
export type AdvanceDirectiveParticipationMode = (typeof ADVANCE_DIRECTIVE_PARTICIPATION_MODES)[number];
export type AdvanceDirectivePriority = (typeof ADVANCE_DIRECTIVE_PRIORITIES)[number];
export type AdvanceDirectiveTopicCode = (typeof ADVANCE_DIRECTIVE_TOPIC_CODES)[number];
export type AdvanceDirectiveTopicStatus = (typeof ADVANCE_DIRECTIVE_TOPIC_STATUSES)[number];
export type AdvanceDirectiveDocumentStatus = (typeof ADVANCE_DIRECTIVE_DOCUMENT_STATUSES)[number];
export type AdvanceDirectiveReviewTrigger = (typeof ADVANCE_DIRECTIVE_REVIEW_TRIGGERS)[number];

export interface AdvanceDirectiveTopicDraft {
  status: AdvanceDirectiveTopicStatus;
  note?: string;
}

export type AdvanceDirectiveTopics = Record<AdvanceDirectiveTopicCode, AdvanceDirectiveTopicDraft>;

export interface AdvanceDirectiveDraft {
  disposition: AdvanceDirectiveDisposition;
  participationMode?: AdvanceDirectiveParticipationMode;
  trustedPersonName?: string;
  trustedRelation?: string;
  trustedContact?: string;
  whatMatters?: string;
  dignityAndComfort?: string;
  priorities: AdvanceDirectivePriority[];
  topics: AdvanceDirectiveTopics;
  documentStatus: AdvanceDirectiveDocumentStatus;
  reviewTrigger: AdvanceDirectiveReviewTrigger;
}

export interface AdvanceDirectiveRecordView extends AdvanceDirectiveDraft {
  id: string;
  consultationId: string;
  consultationOccurredAt: string;
  recordedByName: string;
  version: number;
  protocolVersion: string;
  createdAt: string;
}

export interface AdvanceDirectiveWorkspaceView {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  latestVersion: number;
  current?: AdvanceDirectiveRecordView;
  history: AdvanceDirectiveRecordView[];
}

export const DISPOSITION_LABELS: Readonly<Record<AdvanceDirectiveDisposition, string>> = {
  WANTS_TO_TALK: "Deseja conversar",
  PREFERS_LATER: "Prefere outro momento",
  DECLINED: "Não quis responder",
};

export const PARTICIPATION_LABELS: Readonly<Record<AdvanceDirectiveParticipationMode, string>> = {
  PATIENT_DIRECT: "Paciente participou diretamente",
  PATIENT_SUPPORTED: "Paciente participou com apoio",
  SURROGATE_PRIOR_PREFERENCES: "Familiar ou representante relatou preferências previamente expressas",
  PARTICIPATION_NOT_POSSIBLE: "Participação não foi possível nesta consulta",
};

export const PRIORITY_LABELS: Readonly<Record<AdvanceDirectivePriority, string>> = {
  SYMPTOM_RELIEF_AND_COMFORT: "Alívio de sintomas e conforto",
  PRESERVE_AUTONOMY_AND_COMMUNICATION: "Preservar autonomia e comunicação",
  STAY_CLOSE_TO_IMPORTANT_PEOPLE: "Permanecer perto de pessoas importantes",
  REMAIN_HOME_WHEN_SAFE_AND_POSSIBLE: "Permanecer em casa, quando for seguro e possível",
  PROLONG_LIFE_WHEN_BENEFIT_ACCEPTABLE: "Prolongar a vida quando houver benefício aceitável",
  AVOID_INTERVENTIONS_THAT_PROLONG_SUFFERING: "Evitar intervenções que prolonguem sofrimento",
};

export const TOPIC_LABELS: Readonly<Record<AdvanceDirectiveTopicCode, { title: string; hint: string }>> = {
  CARDIOPULMONARY_RESUSCITATION: {
    title: "Reanimação cardiopulmonar",
    hint: "Em parada cardiorrespiratória",
  },
  VENTILATION_AND_INTENSIVE_CARE: {
    title: "Ventilação e terapia intensiva",
    hint: "Em doença grave ou piora aguda",
  },
  ARTIFICIAL_NUTRITION_AND_HYDRATION: {
    title: "Alimentação e hidratação artificiais",
    hint: "Se não puder alimentar-se pela via habitual",
  },
  HOSPITALIZATION_AND_PLACE_OF_CARE: {
    title: "Hospitalização e local de cuidado",
    hint: "Preferências diante de piora importante",
  },
};

export const TOPIC_STATUS_LABELS: Readonly<Record<AdvanceDirectiveTopicStatus, string>> = {
  NOT_DISCUSSED: "Não discutido",
  WANTS_TO_DISCUSS: "Prefere conversar",
  PREFERENCE_RECORDED: "Preferência registrada",
  UNCERTAIN_CONTEXT_DEPENDENT: "Incerto ou depende do contexto",
};

export const DOCUMENT_STATUS_LABELS: Readonly<Record<AdvanceDirectiveDocumentStatus, string>> = {
  NOT_INFORMED: "Não informado",
  DOES_NOT_HAVE: "Não possui",
  PRESENTED: "Possui e foi apresentado",
  WILL_BRING_LATER: "Possui e trará depois",
};

export const REVIEW_TRIGGER_LABELS: Readonly<Record<AdvanceDirectiveReviewTrigger, string>> = {
  WHEN_PERSON_WANTS_OR_CONDITION_CHANGES: "Quando a pessoa desejar ou o quadro mudar",
  NEXT_CONSULTATION: "Na próxima consulta",
  AFTER_FAMILY_CONVERSATION: "Após conversa com a família",
  AFTER_SPECIFIC_CLINICAL_REVIEW: "Após avaliação clínica específica",
};

export function emptyAdvanceDirectiveTopics(): AdvanceDirectiveTopics {
  return Object.fromEntries(
    ADVANCE_DIRECTIVE_TOPIC_CODES.map((code) => [code, { status: "NOT_DISCUSSED" as const }]),
  ) as AdvanceDirectiveTopics;
}

export function emptyAdvanceDirectiveDraft(): AdvanceDirectiveDraft {
  return {
    disposition: "WANTS_TO_TALK",
    participationMode: "PATIENT_DIRECT",
    priorities: [],
    topics: emptyAdvanceDirectiveTopics(),
    documentStatus: "NOT_INFORMED",
    reviewTrigger: "WHEN_PERSON_WANTS_OR_CONDITION_CHANGES",
  };
}

export function shouldCollectAdvanceDirectiveDetails(disposition: AdvanceDirectiveDisposition): boolean {
  return disposition === "WANTS_TO_TALK";
}
