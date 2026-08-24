import type { IntrinsicCapacityEvidenceReference } from "./intrinsic-capacity-guidance.ts";

export interface FamilyReportSafetyGuidance {
  version: "family-safety-2026-08-v1";
  urgent: string[];
  contact: string[];
  evidenceReferences: IntrinsicCapacityEvidenceReference[];
}

const URGENT = [
  "Súbita fraqueza ou dormência em um lado do corpo, boca torta, fala alterada, perda visual ou desequilíbrio intenso: acione imediatamente o serviço de emergência.",
  "Dor forte no peito, falta de ar intensa ou de início súbito, lábios arroxeados, desmaio ou dificuldade para despertar: procure atendimento de emergência.",
  "Confusão de início súbito, sonolência muito diferente do habitual, agitação abrupta ou convulsão: procure avaliação urgente.",
  "Queda com impacto na cabeça, sangramento, deformidade, dor intensa ou incapacidade nova de ficar em pé: procure atendimento imediato.",
  "Sangramento que não cessa, vômito com sangue, fezes pretas ou grande quantidade de sangue nas fezes ou urina: procure atendimento de emergência.",
  "Engasgo com dificuldade para respirar, coloração arroxeada ou incapacidade de engolir líquidos: acione o serviço de emergência.",
  "Fala sobre se machucar, desejo de morrer, plano suicida ou risco de agressão: não deixe a pessoa sozinha e procure ajuda imediata.",
] as const;

const CONTACT = [
  "Entre em contato com a equipe diante de nova queda ou quase queda, piora progressiva da marcha ou aumento da ajuda necessária nas atividades diárias.",
  "Avise sobre redução persistente da alimentação ou líquidos, perda de peso, vômitos repetidos, febre persistente ou sinais de desidratação.",
  "Comunique nova tontura, sonolência, confusão, sangramento, hipoglicemia ou outro possível efeito adverso após mudança recente do tratamento.",
  "Informe piora persistente do humor, sono, dor, falta de ar, comportamento ou sobrecarga do cuidador, mesmo quando não houver emergência.",
] as const;

const EVIDENCE: readonly IntrinsicCapacityEvidenceReference[] = [
  {
    label: "Diretriz AHA/ASA para prevenção após AVC ou AIT",
    pmid: "34024117",
    url: "https://pubmed.ncbi.nlm.nih.gov/34024117/",
    relevance: "Diretriz reforça reconhecimento e resposta rápida diante de sintomas neurológicos compatíveis com novo evento cerebrovascular.",
  },
  {
    label: "Delirium em pessoas idosas",
    pmid: "28973626",
    url: "https://pubmed.ncbi.nlm.nih.gov/28973626/",
    relevance: "Revisão clínica: delirium é alteração aguda e grave de atenção e cognição que requer investigação rápida da causa.",
  },
  {
    label: "Diretrizes mundiais de prevenção e manejo de quedas",
    pmid: "36178003",
    url: "https://pubmed.ncbi.nlm.nih.gov/36178003/",
    relevance: "Diretriz global orienta estratificação de risco, avaliação após quedas e intervenções individualizadas em idosos.",
  },
  {
    label: "Diretriz ESPEN de nutrição e hidratação em geriatria",
    pmid: "30005900",
    url: "https://pubmed.ncbi.nlm.nih.gov/30005900/",
    relevance: "Diretriz apoia identificação precoce de redução de ingestão, desnutrição e desidratação em pessoas idosas.",
  },
];

export function buildFamilyReportSafetyGuidance(): FamilyReportSafetyGuidance {
  return {
    version: "family-safety-2026-08-v1",
    urgent: [...URGENT],
    contact: [...CONTACT],
    evidenceReferences: EVIDENCE.map((reference) => ({ ...reference })),
  };
}
