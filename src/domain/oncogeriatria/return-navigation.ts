export const ONCOGERIATRIC_RETURN_STAGES = {
  overview: { path: "", label: "Visão geral da Oncogeriatria" },
  basal: { path: "/basal", label: "Antes do tratamento" },
  tratamento: { path: "/tratamento", label: "Tratamento oncológico" },
  check: { path: "/check", label: "Durante o tratamento" },
  escalas: { path: "/escalas", label: "Escalas clínicas" },
  avaliacao: { path: "/avaliacao", label: "Avaliação do momento" },
  longitudinal: { path: "/longitudinal", label: "Evolução longitudinal" },
  "pos-tratamento": { path: "/pos-tratamento", label: "Planejamento" },
  relatorio: { path: "/relatorio", label: "Relatório" },
} as const;

export type OncogeriatricReturnStage = keyof typeof ONCOGERIATRIC_RETURN_STAGES;
export type ConsultationWorkspaceSection = "problemas" | "medicamentos" | "soap" | "escalas" | "diretivas" | "relatorio" | "finalizacao";

export function parseOncogeriatricReturnStage(value: unknown): OncogeriatricReturnStage | null {
  return typeof value === "string" && Object.hasOwn(ONCOGERIATRIC_RETURN_STAGES, value)
    ? value as OncogeriatricReturnStage
    : null;
}

export function buildOncogeriatricReturnPath({
  patientId,
  episodeId,
  stage,
}: {
  patientId: string;
  episodeId: string;
  stage: OncogeriatricReturnStage;
}): string {
  const route = ONCOGERIATRIC_RETURN_STAGES[stage];
  return `/patients/${encodeURIComponent(patientId)}/oncogeriatria${route.path}?episode=${encodeURIComponent(episodeId)}`;
}

export function buildOncogeriatricConsultationHref({
  consultationId,
  section,
  episodeId,
  returnStage,
}: {
  consultationId: string;
  section: ConsultationWorkspaceSection;
  episodeId: string;
  returnStage: OncogeriatricReturnStage;
}): string {
  const query = new URLSearchParams({
    oncogeriatriaReturn: returnStage,
    episode: episodeId,
  });
  return `/consultations/${encodeURIComponent(consultationId)}?${query.toString()}#${section}`;
}

export function buildOncogeriatricCargHref({
  patientId,
  episodeId,
  checkpointId,
  consultationId,
}: {
  patientId: string;
  episodeId: string;
  checkpointId?: string | null;
  consultationId?: string | null;
}): string {
  const query = new URLSearchParams({ episode: episodeId });
  if (checkpointId) query.set("checkpoint", checkpointId);
  if (consultationId) query.set("consultation", consultationId);
  return `/patients/${encodeURIComponent(patientId)}/oncogeriatria/avaliacao?${query.toString()}`;
}

export function oncogeriatricReturnLabel(stage: OncogeriatricReturnStage): string {
  return ONCOGERIATRIC_RETURN_STAGES[stage].label;
}
