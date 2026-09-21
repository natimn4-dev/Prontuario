export interface OncogeriatricTemporalMarker {
  id: string;
  patientId: string;
  episodeId: string;
  occurredAt: Date | string;
  title: string;
  detail?: string | null;
  checkpointId?: string | null;
  consultationId?: string | null;
  treatmentCourseId?: string | null;
  source: "treatment" | "checkpoint" | "toxicity" | "intervention" | "recovery" | "problem";
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function dateKey(value: Date | string): number {
  return new Date(value).getTime();
}

function checkpointLabels(structuredData: unknown): string[] {
  const data = record(structuredData);
  const functional = record(data.functional);
  const mobility = record(data.mobility);
  const careEvents = record(data.careEvents);
  const labels: string[] = [];
  if (mobility.fall === true) labels.push("Queda registrada");
  if (careEvents.hospitalization === true) labels.push("Internação registrada");
  if (careEvents.stroke === true) labels.push("AVC registrado");
  if (careEvents.infection === true) labels.push("Infecção registrada");
  if (careEvents.cycleDelay === true) labels.push("Atraso de ciclo registrado");
  if (careEvents.treatmentInterruption === true) labels.push("Interrupção do tratamento registrada");
  if (careEvents.doseReductionRecorded === true) labels.push("Redução de dose registrada");
  if (functional.newIadlHelp === true || functional.newAdlHelp === true) labels.push("Mudança funcional registrada");
  const trigger = typeof data.trigger === "string" ? data.trigger.trim() : "";
  if (trigger) labels.push(trigger);
  return labels;
}

export function buildOncogeriatricTemporalMarkers(input: {
  patientId: string;
  episodeId: string;
  courses: ReadonlyArray<{ id: string; actualStartAt?: Date | string | null; regimenName: string }>;
  checkpoints: ReadonlyArray<{ id: string; consultationId?: string | null; treatmentCourseId?: string | null; occurredAt: Date | string; structuredData?: unknown }>;
  toxicities: ReadonlyArray<{ id: string; checkpointId?: string | null; consultationId?: string | null; treatmentCourseId?: string | null; occurredAt: Date | string; toxicityType: string; grade?: string | null; hospitalizationAssociated?: boolean; cycleDelayAssociated?: boolean; treatmentModificationRecorded?: string | null }>;
  interventions: ReadonlyArray<{ id: string; checkpointId?: string | null; consultationId?: string | null; startedAt?: Date | string | null; createdAt: Date | string; domain: string; intervention?: string | null; description: string }>;
  recovery: ReadonlyArray<{ id: string; checkpointId?: string | null; consultationId?: string | null; assessedAt: Date | string; domain: string; status: string; notes?: string | null }>;
  problemMilestones?: ReadonlyArray<{ consultationId: string; title: string; note?: string | null; recordedAt: Date | string }>;
}): OncogeriatricTemporalMarker[] {
  const checkpointById = new Map(input.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
  const markers: OncogeriatricTemporalMarker[] = [];
  const common = { patientId: input.patientId, episodeId: input.episodeId };

  for (const course of input.courses) {
    if (!course.actualStartAt) continue;
    markers.push({ ...common, id: `course:${course.id}`, occurredAt: course.actualStartAt, title: `Início de tratamento: ${course.regimenName}`, treatmentCourseId: course.id, source: "treatment" });
  }

  for (const checkpoint of input.checkpoints) {
    for (const [index, title] of checkpointLabels(checkpoint.structuredData).entries()) {
      markers.push({ ...common, id: `checkpoint:${checkpoint.id}:${index}`, occurredAt: checkpoint.occurredAt, title, checkpointId: checkpoint.id, consultationId: checkpoint.consultationId, treatmentCourseId: checkpoint.treatmentCourseId, source: "checkpoint" });
    }
  }

  for (const toxicity of input.toxicities) {
    const checkpoint = toxicity.checkpointId ? checkpointById.get(toxicity.checkpointId) : undefined;
    const details = [
      toxicity.grade ? `grau ${toxicity.grade}` : null,
      toxicity.hospitalizationAssociated ? "hospitalização associada" : null,
      toxicity.cycleDelayAssociated ? "atraso de ciclo associado" : null,
      toxicity.treatmentModificationRecorded ? `mudança documentada: ${toxicity.treatmentModificationRecorded}` : null,
    ].filter(Boolean).join(" · ");
    markers.push({
      ...common,
      id: `toxicity:${toxicity.id}`,
      occurredAt: toxicity.occurredAt,
      title: `Toxicidade registrada: ${toxicity.toxicityType}`,
      detail: details || null,
      checkpointId: toxicity.checkpointId,
      consultationId: toxicity.consultationId ?? checkpoint?.consultationId ?? null,
      treatmentCourseId: toxicity.treatmentCourseId ?? checkpoint?.treatmentCourseId ?? null,
      source: "toxicity",
    });
  }

  for (const intervention of input.interventions) {
    const checkpoint = intervention.checkpointId ? checkpointById.get(intervention.checkpointId) : undefined;
    markers.push({ ...common, id: `intervention:${intervention.id}`, occurredAt: intervention.startedAt ?? intervention.createdAt, title: `Intervenção registrada: ${intervention.domain}`, detail: intervention.intervention ?? intervention.description, checkpointId: intervention.checkpointId, consultationId: intervention.consultationId ?? checkpoint?.consultationId ?? null, treatmentCourseId: checkpoint?.treatmentCourseId ?? null, source: "intervention" });
  }

  for (const item of input.recovery) {
    const checkpoint = item.checkpointId ? checkpointById.get(item.checkpointId) : undefined;
    markers.push({ ...common, id: `recovery:${item.id}`, occurredAt: item.assessedAt, title: `Recuperação registrada: ${item.domain}`, detail: [item.status, item.notes].filter(Boolean).join(" · ") || null, checkpointId: item.checkpointId, consultationId: item.consultationId ?? checkpoint?.consultationId ?? null, treatmentCourseId: checkpoint?.treatmentCourseId ?? null, source: "recovery" });
  }

  for (const item of input.problemMilestones ?? []) {
    markers.push({ ...common, id: `problem:${item.consultationId}:${dateKey(item.recordedAt)}:${item.title}`, occurredAt: item.recordedAt, title: item.title, detail: item.note, consultationId: item.consultationId, source: "problem" });
  }

  return markers.sort((left, right) => dateKey(left.occurredAt) - dateKey(right.occurredAt) || left.id.localeCompare(right.id));
}

export function temporalMarkerContext(markers: readonly OncogeriatricTemporalMarker[]): string {
  if (!markers.length) return "Sem motivo associado registrado nesta consulta";
  return `Registro temporal associado: ${markers.map((marker) => marker.detail ? `${marker.title} — ${marker.detail}` : marker.title).join("; ")}`;
}
