import { proposeProblemsFromAssessments } from "./problem-proposals.ts";
import type { LongitudinalAssessment } from "./clinical-change-summary.ts";

export type SuggestionProblem = {
  id: string;
  patientId: string;
  title: string;
  status: "ACTIVE" | "STABLE" | "MONITORING" | "RESOLVED";
};

export type ProfessionalPlanSource = {
  pmid: string;
  label: string;
};

export type ProfessionalPlanSuggestion = {
  problemId: string;
  problemTitle: string;
  proposalKey: string;
  actions: string[];
  evidence: Array<{
    scaleCode: string;
    scaleVersion: string;
    scoreText: string;
    classification?: string;
  }>;
  sources: ProfessionalPlanSource[];
  requiresPhysicianReview: true;
};

type SuggestionRule = {
  actions: readonly string[];
  sources: readonly ProfessionalPlanSource[];
};

const CGA = { pmid: "17855074", label: "Avaliação Geriátrica Ampla e plano individualizado" } as const;
const FALLS = { pmid: "36178003", label: "World guidelines for falls prevention and management" } as const;
const STOPPFALL = { pmid: "33349863", label: "STOPPFall medication review tool" } as const;
const DEPRESCRIBING = { pmid: "25798731", label: "Evidence-based deprescribing process" } as const;
const EWGSOP2 = { pmid: "30312372", label: "EWGSOP2 sarcopenia consensus" } as const;
const ESPEN = { pmid: "35306388", label: "ESPEN practical guideline: clinical nutrition and hydration in geriatrics" } as const;
const DEPRESSION = { pmid: "28535241", label: "Depression in older adults review" } as const;
const CAREGIVER = { pmid: "24618967", label: "Caregiver burden assessment and intervention review" } as const;
const AASM_INSOMNIA = { pmid: "33164742", label: "AASM guideline: behavioral and psychological treatments for chronic insomnia" } as const;
const EUROPEAN_INSOMNIA = { pmid: "38016484", label: "European Insomnia Guideline 2023" } as const;

const RULES: Readonly<Record<string, SuggestionRule>> = {
  "abvd-dependence": {
    actions: [
      "Revisar causas clínicas, cognitivas, sensoriais, ambientais e medicamentosas potencialmente relacionadas à perda funcional identificada nesta consulta.",
      "Definir, após revisão médica, metas funcionais e medidas de segurança proporcionais ao grau de dependência observado.",
    ],
    sources: [CGA],
  },
  "aivd-dependence": {
    actions: [
      "Revisar os domínios instrumentais comprometidos e possíveis causas reversíveis ou agravantes identificadas nesta consulta.",
      "Definir, após revisão médica, o nível de supervisão e apoio necessário para tarefas de maior risco, preservando autonomia quando possível.",
    ],
    sources: [CGA],
  },
  "depressive-symptoms": {
    actions: [
      "Caracterizar sintomas depressivos, duração, impacto funcional, fatores precipitantes e diagnósticos diferenciais, incluindo cognição, sono e condições clínicas.",
      "Pesquisar risco de autoagressão ou suicídio quando clinicamente indicado e definir o plano terapêutico somente após avaliação médica individualizada.",
    ],
    sources: [DEPRESSION],
  },
  "sleep-insomnia-symptoms": {
    actions: [
      "Caracterizar o padrão sono-vigília e o impacto funcional diurno, incluindo horário de deitar/levantar, latência, despertares, cochilos e variabilidade da rotina; considerar diário do sono quando clinicamente útil.",
      "Revisar fatores associados identificados nesta consulta, incluindo dor, noctúria, ansiedade/depressão, sintomas respiratórios noturnos ou apneia do sono, síndrome das pernas inquietas, ambiente e hábitos comportamentais.",
      "Reconciliar medicamentos e substâncias que possam interferir no sono apenas como revisão profissional de indicação, horário, benefício e risco; qualquer início, suspensão, substituição ou ajuste depende de decisão médica explícita.",
      "Se a avaliação clínica confirmar transtorno de insônia crônica, considerar intervenção comportamental estruturada baseada em evidência, priorizando terapia cognitivo-comportamental para insônia quando aplicável; não reduzir automaticamente a conduta a uma lista genérica de higiene do sono.",
    ],
    sources: [AASM_INSOMNIA, EUROPEAN_INSOMNIA],
  },
  frailty: {
    actions: [
      "Revisar de forma multidimensional mobilidade, funcionalidade, cognição, humor, nutrição, medicamentos, comorbidades e suporte social relacionados à vulnerabilidade observada nesta consulta.",
      "Priorizar problemas modificáveis e pactuar metas individualizadas após revisão médica, sem inferir tratamento a partir do escore isolado.",
    ],
    sources: [CGA],
  },
  "sarcopenia-performance": {
    actions: [
      "Correlacionar o rastreio com força muscular e, quando pertinente e disponível, massa muscular e desempenho físico para qualificar probabilidade e gravidade de sarcopenia.",
      "Revisar causas contribuintes e discutir um plano individualizado de atividade física e suporte nutricional somente após avaliação clínica e de segurança.",
    ],
    sources: [EWGSOP2],
  },
  "nutritional-risk": {
    actions: [
      "Revisar ingestão, peso e trajetória ponderal, hidratação, capacidade de mastigação/deglutição, condições clínicas e fatores sociais associados ao risco nutricional.",
      "Definir objetivos nutricionais individualizados após revisão médica e nutricional, sem gerar suplemento ou terapia nutricional específica automaticamente.",
    ],
    sources: [ESPEN],
  },
  "medication-risk": {
    actions: [
      "Reconciliar medicamentos, indicações, duração, benefícios, riscos, duplicidades e classes associadas a quedas no contexto clínico desta consulta.",
      "Estruturar revisão benefício-risco e possíveis oportunidades de simplificação; qualquer suspensão, substituição, ajuste de dose ou horário depende de decisão médica explícita.",
      "Integrar risco medicamentoso ao risco global de quedas e aos demais fatores modificáveis identificados nesta consulta.",
    ],
    sources: [STOPPFALL, DEPRESCRIBING, FALLS],
  },
  "caregiver-burden": {
    actions: [
      "Caracterizar a sobrecarga, seus principais determinantes, impacto sobre saúde e capacidade de cuidado e recursos de apoio já disponíveis.",
      "Construir, após revisão clínica, estratégias individualizadas de apoio e divisão do cuidado; nenhum encaminhamento é gerado automaticamente.",
    ],
    sources: [CAREGIVER],
  },
};

function altered(assessment: LongitudinalAssessment): boolean {
  return assessment.color === "amarelo" || assessment.color === "vermelho";
}

function displayScore(assessment: LongitudinalAssessment): string {
  return assessment.scoreText ?? (assessment.score === null ? "sem escore" : String(assessment.score));
}

function latestCurrentAssessments(input: {
  targetConsultationId: string;
  patientId: string;
  assessments: readonly LongitudinalAssessment[];
}): LongitudinalAssessment[] {
  const latestByScale = new Map<string, LongitudinalAssessment>();
  for (const assessment of input.assessments) {
    if (assessment.patientId !== input.patientId || assessment.consultationId !== input.targetConsultationId) continue;
    const previous = latestByScale.get(assessment.scaleCode);
    if (!previous || new Date(assessment.appliedAt).getTime() >= new Date(previous.appliedAt).getTime()) {
      latestByScale.set(assessment.scaleCode, assessment);
    }
  }
  return [...latestByScale.values()];
}

export function buildProfessionalPlanSuggestions(input: {
  targetConsultationId: string;
  patientId: string;
  problems: readonly SuggestionProblem[];
  assessments: readonly LongitudinalAssessment[];
}): ProfessionalPlanSuggestion[] {
  const currentAssessments = latestCurrentAssessments(input).filter(altered);
  if (currentAssessments.length === 0) return [];

  const proposals = proposeProblemsFromAssessments(currentAssessments);
  const suggestionByTitle = new Map(proposals.map((proposal) => [proposal.title, proposal]));
  const output: ProfessionalPlanSuggestion[] = [];

  for (const problem of input.problems) {
    if (problem.patientId !== input.patientId || problem.status === "RESOLVED") continue;
    const proposal = suggestionByTitle.get(problem.title);
    if (!proposal) continue;
    const rule = RULES[proposal.key];
    if (!rule) continue;

    const evidence = currentAssessments
      .filter((assessment) => proposal.sourceScales.includes(assessment.scaleCode))
      .map((assessment) => ({
        scaleCode: assessment.scaleCode,
        scaleVersion: assessment.scaleVersion,
        scoreText: displayScore(assessment),
        classification: assessment.classification,
      }));
    if (evidence.length === 0) continue;

    output.push({
      problemId: problem.id,
      problemTitle: problem.title,
      proposalKey: proposal.key,
      actions: [...rule.actions],
      evidence,
      sources: rule.sources.map((source) => ({ ...source })),
      requiresPhysicianReview: true,
    });
  }

  return output;
}
