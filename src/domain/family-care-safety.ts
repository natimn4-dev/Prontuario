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
  /\binvestigar\b/i,
  /\bconfirmar\s+(?:diagnóstico|diagnostico|sarcopenia|etiologia|causa)/i,
  /\bclassificar\s+(?:sarcopenia|doença|doenca|estágio|estagio)/i,
  /\bestadiar\b/i,
  /\bsolicitar\b.{0,80}\b(?:exame|dxa|bioimpedância|bioimpedancia|tomografia|ressonância|ressonancia|ultrassom|laborat[oó]rio)/i,
  /\brealizar\b.{0,80}\b(?:exame|dxa|bioimpedância|bioimpedancia|teste\s+diagnóstico|teste\s+diagnostico)/i,
  /\bconsiderar\s+(?:avaliação|avaliacao)\s+de\s+massa\s+muscular/i,
  /\bconsiderar\s+(?:dxa|bioimpedância|bioimpedancia)/i,
  /\bforça\s+de\s+preensão\s+palmar/i,
  /\bteste\s+de\s+sentar[- ]?levantar/i,
  /\bfunção\s+(?:renal|hepática|hepatica)/i,
  /\bencaminhar\b/i,
  /\bencaminhamento\s+(?:para|a)\b/i,
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
    // Encaminhamentos pertencem à área profissional. O relatório compartilhável
    // não deve transformar sugestão de encaminhamento em orientação automática.
    encaminhamentos: [],
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
      // As sugestões originadas do motor clínico permanecem na área profissional.
      // A família recebe ações práticas pelas seções de capacidade intrínseca e segurança.
      interventionSuggestions: [],
    })),
    intrinsicCapacity: {
      ...report.intrinsicCapacity,
      alteredDomains: report.intrinsicCapacity.alteredDomains.map((domain) => ({
        ...domain,
        actions: filterFamilySafeCareItems(domain.actions),
        attentionSigns: filterFamilySafeCareItems(domain.attentionSigns),
      })),
    },
    carePlan: {
      now: filterFamilySafeCareItems(report.carePlan.now),
      mediumTerm: filterFamilySafeCareItems(report.carePlan.mediumTerm),
      caregiver: filterFamilySafeCareItems(report.carePlan.caregiver),
      referrals: [],
      contact: filterFamilySafeCareItems(report.carePlan.contact),
      urgent: filterFamilySafeCareItems(report.carePlan.urgent),
    },
    ...(report.swallowingSupportCare ? {
      swallowingSupportCare: {
        enteralRoute: report.swallowingSupportCare.enteralRoute,
        practicalActions: filterFamilySafeCareItems(report.swallowingSupportCare.practicalActions),
        caregiverActions: filterFamilySafeCareItems(report.swallowingSupportCare.caregiverActions),
        contactGuidance: filterFamilySafeCareItems(report.swallowingSupportCare.contactGuidance),
      },
    } : {}),
  };
}
