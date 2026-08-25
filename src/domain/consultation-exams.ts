import {
  consultationHorizon,
  type ConsultationTimelinePoint,
} from "./as-of-consultation.ts";

export const MAX_CLINICAL_EXAM_TEXT_LENGTH = 30000;

export interface ClinicalExamTimelineRecord {
  id: string;
  patientId: string;
  consultationId: string;
  content: string;
  updatedAt: Date | string;
}

export interface ClinicalExamHistoryItem {
  id: string;
  consultationId: string;
  consultationOccurredAt: string;
  content: string;
  updatedAt: string;
}

export interface ConsultationExamView {
  current: string;
  history: ClinicalExamHistoryItem[];
}

function iso(value: Date | string, label: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} inválida no histórico de exames.`);
  return parsed.toISOString();
}

export function normalizeClinicalExamText(value: string): string {
  return value.trim();
}

export function buildConsultationExamView(input: {
  patientId: string;
  targetConsultationId: string;
  consultations: readonly ConsultationTimelinePoint[];
  records: readonly ClinicalExamTimelineRecord[];
}): ConsultationExamView {
  const horizon = consultationHorizon({
    patientId: input.patientId,
    targetConsultationId: input.targetConsultationId,
    consultations: input.consultations,
  });
  const consultationById = new Map(horizon.map((item) => [item.id, item]));
  const recordsByConsultation = new Map<string, ClinicalExamTimelineRecord>();

  for (const record of input.records) {
    if (record.patientId !== input.patientId) {
      throw new Error("Exames de pacientes diferentes não podem compor o mesmo histórico.");
    }
    if (!consultationById.has(record.consultationId)) continue;
    if (recordsByConsultation.has(record.consultationId)) {
      throw new Error("Há mais de um registro de exames para a mesma consulta.");
    }
    recordsByConsultation.set(record.consultationId, record);
  }

  const current = normalizeClinicalExamText(
    recordsByConsultation.get(input.targetConsultationId)?.content ?? "",
  );
  const history = horizon
    .filter((consultation) => consultation.id !== input.targetConsultationId)
    .reverse()
    .flatMap((consultation) => {
      const record = recordsByConsultation.get(consultation.id);
      const content = normalizeClinicalExamText(record?.content ?? "");
      if (!record || !content) return [];
      return [{
        id: record.id,
        consultationId: consultation.id,
        consultationOccurredAt: iso(consultation.occurredAt, "Data da consulta"),
        content,
        updatedAt: iso(record.updatedAt, "Data de atualização dos exames"),
      }];
    });

  return { current, history };
}
