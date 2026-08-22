import type { ClinicalColor } from "./clinical-engine.ts";
import type { LongitudinalAssessment } from "./clinical-change-summary.ts";

export type ProposedProblemType = "CLINICAL" | "GERIATRIC";
export type ProposalConfidence = "rule-based" | "needs-clinical-review";

export interface ProblemProposal {
  key: string;
  type: ProposedProblemType;
  title: string;
  evidence: string[];
  sourceScales: string[];
  confidence: ProposalConfidence;
  requiresPhysicianConfirmation: true;
}

interface ProblemRule {
  key: string;
  type: ProposedProblemType;
  title: string;
  scales: readonly string[];
}

const PROBLEM_RULES: readonly ProblemRule[] = [
  { key: "abvd-dependence", type: "GERIATRIC", title: "Dependência para atividades básicas de vida diária", scales: ["katz", "barthel"] },
  { key: "aivd-dependence", type: "GERIATRIC", title: "Dependência para atividades instrumentais de vida diária", scales: ["lawton", "pfeffer"] },
  { key: "depressive-symptoms", type: "GERIATRIC", title: "Sintomas depressivos", scales: ["gds15", "cornell"] },
  { key: "sleep-insomnia-symptoms", type: "CLINICAL", title: "Sintomas de insônia / alteração do sono", scales: ["isi"] },
  { key: "frailty", type: "GERIATRIC", title: "Fragilidade / vulnerabilidade geriátrica", scales: ["frail_br", "ves13", "g8"] },
  { key: "oncologic-performance", type: "GERIATRIC", title: "Desempenho funcional oncológico reduzido", scales: ["ecog"] },
  { key: "chemotherapy-toxicity", type: "CLINICAL", title: "Risco de toxicidade grave por quimioterapia — adaptação local", scales: ["crash_mna_sf"] },
  { key: "sarcopenia-performance", type: "GERIATRIC", title: "Risco de sarcopenia / desempenho físico reduzido", scales: ["sarcf", "preensao", "velocidade_marcha", "sentar_levantar_5x", "sppb"] },
  { key: "nutritional-risk", type: "GERIATRIC", title: "Risco nutricional / desnutrição", scales: ["mna_sf"] },
  { key: "medication-risk", type: "CLINICAL", title: "Risco relacionado a medicamentos / polifarmácia", scales: ["polifarmacia", "stoppfall"] },
  { key: "social-support", type: "GERIATRIC", title: "Vulnerabilidade da rede de suporte familiar/social", scales: ["apgar_familiar"] },
  { key: "caregiver-burden", type: "GERIATRIC", title: "Sobrecarga do cuidador", scales: ["zarit_reduzida", "zarit_paliativo_7_ms2013"] },
  { key: "symptom-burden", type: "GERIATRIC", title: "Carga sintomática relevante", scales: ["esas"] },
];

function isAltered(color?: ClinicalColor): boolean {
  return color === "amarelo" || color === "vermelho";
}

export function proposeProblemsFromAssessments(
  currentAssessments: readonly LongitudinalAssessment[],
): ProblemProposal[] {
  const proposals: ProblemProposal[] = [];

  for (const rule of PROBLEM_RULES) {
    const evidenceAssessments = currentAssessments.filter(
      (assessment) => rule.scales.includes(assessment.scaleCode) && isAltered(assessment.color),
    );
    if (evidenceAssessments.length === 0) continue;

    proposals.push({
      key: rule.key,
      type: rule.type,
      title: rule.title,
      evidence: evidenceAssessments.map((assessment) => {
        const score = assessment.scoreText ?? (assessment.score === null ? "sem escore" : String(assessment.score));
        const classification = assessment.classification ? ` — ${assessment.classification}` : "";
        return `${assessment.scaleCode}: ${score}${classification}`;
      }),
      sourceScales: evidenceAssessments.map((assessment) => assessment.scaleCode),
      confidence: "rule-based",
      requiresPhysicianConfirmation: true,
    });
  }

  return proposals;
}
