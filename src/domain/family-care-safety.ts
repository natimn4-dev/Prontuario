import type { AgaReportModel } from "./aga-report.ts";
import type { InterventionPlan } from "./interventions.ts";

const EXPLICIT_SELF_MEDICATION_SAFETY = [
  /não\s+(?:suspender|interromper|iniciar|aumentar|reduzir|trocar|alterar|manter).{0,60}(?:por conta própria|sem orientação)/i,
  /não\s+faça\s+mudanças?.{0,40}(?:medicamento|remédio|suplemento).{0,40}(?:por conta própria|sem orientação)/i,
];

const MEDICATION_CONDUCT_VERBS = "(?:prescrever|iniciar|introduzir|manter|continuar|suspender|interromper|retirar|aumentar|reduzir|ajustar|titular|substituir|trocar|desprescrever|repor)";
const MEDICATION_TERMS = "(?:medica(?:ção|cao|mento)s?|remédios?|fármacos?|suplementos?)";

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
  new RegExp(`\\b${MEDICATION_CONDUCT_VERBS}\\b.{0,60}\\b${MEDICATION_TERMS}\\b`, "i"),
  new RegExp(`\\b${MEDICATION_CONDUCT_VERBS}\\b.{0,80}\\b\\d+(?:[.,]\\d+)?\\s*(?:mg|mcg|µg|g|ml|mL|UI|U)\\b`, "i"),
  /\b(?:aumentar|reduzir|ajustar|titular|manter|continuar)\b.{0,50}\bdose\b/i,
  /\bsubstituir\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:medicamento|remédio)/i,
  /\btrocar\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:medicamento|remédio)/i,
  /\biniciar\s+(?:tratamento\s+farmacol[oó]gico|medica(?:ção|cao|mento)|remédio|suplemento)/i,
  /\bsuspender\s+(?:o\s+|a\s+|um\s+|uma\s+)?(?:medicamento|remédio)/i,
  /\b(?:aplicar|administrar|prescrever|tomar|receber)\b.{0,60}\bvacina\w*/i,
  /\b(?:vacinar|imunizar)\b/i,
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

export function sanitizeFamilyNarrative(text: string | undefined): string | undefined {
  if (!text?.trim()) return text;
  const safeSentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter(isFamilySafeCareInstruction);
  if (safeSentences.length > 0) return safeSentences.join(" ");
  return "Resultado registrado. A interpretação deve ser discutida com a equipe assistencial considerando o contexto clínico e funcional.";
}

export function sanitizeFamilyReportModel(report: AgaReportModel): AgaReportModel {
  return {
    ...report,
    assessedScales: report.assessedScales.map((scale) => ({
      ...scale,
      interpretation: sanitizeFamilyNarrative(scale.interpretation),
      interventionSuggestions: scale.interventionSuggestions.filter((suggestion) => isFamilySafeCareInstruction(suggestion.text)),
    })),
    carePlan: {
      now: filterFamilySafeCareItems(report.carePlan.now),
      mediumTerm: filterFamilySafeCareItems(report.carePlan.mediumTerm),
      caregiver: filterFamilySafeCareItems(report.carePlan.caregiver),
      referrals: filterFamilySafeCareItems(report.carePlan.referrals),
      contact: filterFamilySafeCareItems(report.carePlan.contact),
      urgent: filterFamilySafeCareItems(report.carePlan.urgent),
    },
  };
}
