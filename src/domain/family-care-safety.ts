import type { InterventionPlan } from "./interventions";

const EXPLICIT_SELF_MEDICATION_SAFETY = [
  /não\s+(?:suspender|interromper|iniciar|aumentar|reduzir|trocar|alterar).{0,60}(?:por conta própria|sem orientação)/i,
  /não\s+faça\s+mudanças?.{0,40}(?:medicamento|remédio).{0,40}(?:por conta própria|sem orientação)/i,
];

const MEDICAL_CONDUCT_PATTERNS = [
  /\bprescrev\w*/i,
  /\bhipolipemi\w*/i,
  /\bestatina\w*/i,
  /\bvitamina\s*d\b/i,
  /\breposi(?:ção|cao|r)\b/i,
  /\bdosagem\s+de\b/i,
  /\bdesprescri\w*/i,
  /\bajustar\s+(?:a\s+|as\s+)?dose/i,
  /\breavaliar\s+(?:a\s+|as\s+)?dose/i,
  /\bsubstituir\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:medicamento|remédio)/i,
  /\btrocar\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:medicamento|remédio)/i,
  /\biniciar\s+(?:tratamento\s+farmacol[oó]gico|medica(?:ção|cao|mento)|remédio|suplemento)/i,
  /\bsuspender\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:medicamento|remédio)/i,
  /\binvestigar\s+causas?\s+(?:secundárias|reversíveis|clínicas|medicamentosas)/i,
  /\bconsiderar\s+(?:avaliação\s+de\s+massa\s+muscular|dxa|bioimpedância)/i,
];

export function isFamilySafeCareInstruction(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  if (EXPLICIT_SELF_MEDICATION_SAFETY.some((pattern) => pattern.test(normalized))) return true;
  return !MEDICAL_CONDUCT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function filterFamilySafeCareItems(items: readonly string[]): string[] {
  return [...new Set(items.filter(isFamilySafeCareInstruction).map((item) => item.trim()).filter(Boolean))];
}

export function sanitizeFamilyCarePlan(plan: InterventionPlan): InterventionPlan {
  return {
    agora: filterFamilySafeCareItems(plan.agora),
    medio: filterFamilySafeCareItems(plan.medio),
    cuidador: filterFamilySafeCareItems(plan.cuidador),
    encaminhamentos: filterFamilySafeCareItems(plan.encaminhamentos),
    contato: filterFamilySafeCareItems(plan.contato),
    urgencia: filterFamilySafeCareItems(plan.urgencia),
  };
}
