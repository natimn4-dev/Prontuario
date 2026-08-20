import {
  consultationHorizon,
  type ConsultationTimelinePoint,
} from "./as-of-consultation.ts";

export function scaleConsultationHorizonIds(input: {
  patientId: string;
  targetConsultationId: string;
  consultations: readonly ConsultationTimelinePoint[];
}): string[] {
  return consultationHorizon(input).map((consultation) => consultation.id);
}
