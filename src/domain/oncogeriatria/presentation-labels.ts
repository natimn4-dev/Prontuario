export interface OncogeriatricOption {
  value: string;
  label: string;
}

function labelFrom(map: Readonly<Record<string, string>>, value: string | null | undefined, fallback = "Não informado"): string {
  if (!value) return fallback;
  return map[value] ?? fallback;
}

export const ONCOGERIATRIC_MODALITY_LABELS: Readonly<Record<string, string>> = {
  SYSTEMIC: "Tratamento sistêmico",
  RADIOTHERAPY: "Radioterapia",
  SURGERY: "Cirurgia",
  HORMONAL: "Hormonioterapia",
  TARGETED: "Terapia-alvo",
  IMMUNOTHERAPY: "Imunoterapia",
  OTHER: "Outra modalidade",
};

export const ONCOGERIATRIC_INTENT_LABELS: Readonly<Record<string, string>> = {
  CURATIVE: "Curativa",
  NEOADJUVANT: "Neoadjuvante",
  ADJUVANT: "Adjuvante",
  DISEASE_CONTROL: "Controle da doença",
  PALLIATIVE: "Paliativa",
};

export const ONCOGERIATRIC_COURSE_STATUS_LABELS: Readonly<Record<string, string>> = {
  PLANNED: "Planejado",
  ACTIVE: "Em andamento",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const ONCOGERIATRIC_EPISODE_STATUS_LABELS: Readonly<Record<string, string>> = {
  ACTIVE: "Em acompanhamento",
  COMPLETED: "Acompanhamento concluído",
  ARCHIVED: "Arquivado",
};

export const ONCOGERIATRIC_CHECKPOINT_TYPE_LABELS: Readonly<Record<string, string>> = {
  PRE_TREATMENT: "Avaliação inicial antes do tratamento",
  CYCLE: "Reavaliação durante o tratamento",
  PERIODIC_REASSESSMENT: "Reavaliação ampliada",
  EVENT_DRIVEN: "Reavaliação por mudança clínica",
  END_OF_TREATMENT: "Avaliação ao final do tratamento",
  POST_3_MONTHS: "Seguimento em 3 meses",
  POST_6_MONTHS: "Seguimento em 6 meses",
  POST_12_MONTHS: "Seguimento em 12 meses",
};

export const ONCOGERIATRIC_CHECKPOINT_STATUS_LABELS: Readonly<Record<string, string>> = {
  PLANNED: "Planejada",
  DRAFT: "Rascunho",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export const ONCOGERIATRIC_INTERVENTION_STATUS_LABELS: Readonly<Record<string, string>> = {
  PLANNED: "Planejada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  NOT_PERFORMED: "Não realizada",
};

export const ONCOGERIATRIC_DOMAIN_LABELS: Readonly<Record<string, string>> = {
  FUNCTION: "Funcionalidade",
  NUTRITION: "Nutrição",
  MOBILITY: "Mobilidade",
  SARCOPENIA: "Sarcopenia",
  FALLS: "Quedas",
  COGNITION: "Cognição",
  MEDICATIONS: "Medicamentos",
  POLYPHARMACY: "Polifarmácia",
  MOOD: "Humor",
  SYMPTOMS: "Sintomas",
  FATIGUE: "Fadiga",
  SOCIAL: "Suporte social",
  HEARING: "Audição",
  NEUROPATHY: "Neuropatia",
  PAIN: "Dor",
  OTHER: "Outros",
};

export const ONCOGERIATRIC_RECOVERY_STATUS_LABELS: Readonly<Record<string, string>> = {
  RECOVERED: "Recuperado",
  RECOVERING: "Em recuperação",
  PERSISTENT_DEFICIT: "Déficit persistente",
  NEW_DEFICIT: "Novo déficit",
  NOT_ASSESSED: "Não avaliado",
};

export const ONCOGERIATRIC_RISK_FLAG_LABELS: Readonly<Record<string, string>> = {
  neuro: "Neurotoxicidade",
  cardio: "Cardiotoxicidade",
  nephro: "Nefrotoxicidade",
  oto: "Ototoxicidade",
  hema: "Toxicidade hematológica",
  gi: "Toxicidade gastrointestinal",
  nutrition: "Risco nutricional",
};

export const ONCOGERIATRIC_MODALITY_OPTIONS: readonly OncogeriatricOption[] = Object.entries(ONCOGERIATRIC_MODALITY_LABELS).map(([value, label]) => ({ value, label }));
export const ONCOGERIATRIC_INTENT_OPTIONS: readonly OncogeriatricOption[] = Object.entries(ONCOGERIATRIC_INTENT_LABELS).map(([value, label]) => ({ value, label }));
export const ONCOGERIATRIC_COURSE_STATUS_OPTIONS: readonly OncogeriatricOption[] = Object.entries(ONCOGERIATRIC_COURSE_STATUS_LABELS).map(([value, label]) => ({ value, label }));
export const ONCOGERIATRIC_INTERVENTION_STATUS_OPTIONS: readonly OncogeriatricOption[] = Object.entries(ONCOGERIATRIC_INTERVENTION_STATUS_LABELS).map(([value, label]) => ({ value, label }));
export const ONCOGERIATRIC_INTERVENTION_DOMAIN_OPTIONS: readonly OncogeriatricOption[] = [
  "NUTRITION", "MOBILITY", "SARCOPENIA", "FALLS", "COGNITION", "MEDICATIONS", "MOOD", "SYMPTOMS", "SOCIAL", "HEARING", "OTHER",
].map((value) => ({ value, label: ONCOGERIATRIC_DOMAIN_LABELS[value] }));
export const ONCOGERIATRIC_RECOVERY_DOMAIN_OPTIONS: readonly OncogeriatricOption[] = [
  "FUNCTION", "MOBILITY", "SARCOPENIA", "NUTRITION", "NEUROPATHY", "FALLS", "COGNITION", "FATIGUE", "SYMPTOMS", "MOOD", "POLYPHARMACY", "HEARING", "PAIN", "SOCIAL",
].map((value) => ({ value, label: ONCOGERIATRIC_DOMAIN_LABELS[value] }));
export const ONCOGERIATRIC_RECOVERY_STATUS_OPTIONS: readonly OncogeriatricOption[] = Object.entries(ONCOGERIATRIC_RECOVERY_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function oncogeriatricModalityLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_MODALITY_LABELS, value);
}

export function oncogeriatricIntentLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_INTENT_LABELS, value);
}

export function oncogeriatricCourseStatusLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_COURSE_STATUS_LABELS, value);
}

export function oncogeriatricEpisodeStatusLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_EPISODE_STATUS_LABELS, value);
}

export function oncogeriatricCheckpointTypeLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_CHECKPOINT_TYPE_LABELS, value, "Avaliação oncogeriátrica");
}

export function oncogeriatricCheckpointStatusLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_CHECKPOINT_STATUS_LABELS, value, "Situação não informada");
}

export function oncogeriatricInterventionStatusLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_INTERVENTION_STATUS_LABELS, value, "Situação não informada");
}

export function oncogeriatricDomainLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_DOMAIN_LABELS, value, "Outro domínio");
}

export function oncogeriatricRecoveryStatusLabel(value: string | null | undefined): string {
  return labelFrom(ONCOGERIATRIC_RECOVERY_STATUS_LABELS, value, "Situação não informada");
}

export function oncogeriatricRiskFlagLabel(value: string): string {
  return ONCOGERIATRIC_RISK_FLAG_LABELS[value] ?? "Outro risco registrado";
}
