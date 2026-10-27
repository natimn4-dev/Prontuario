import type { AgaScaleReportSection } from "./aga-report.ts";
import type { IntrinsicCapacityEvidenceReference } from "./intrinsic-capacity-guidance.ts";

const ASCO_GA: IntrinsicCapacityEvidenceReference = {
  label: "ASCO 2023 — avaliação geriátrica e manejo de vulnerabilidades no câncer",
  pmid: "37459573",
  url: "https://pubmed.ncbi.nlm.nih.gov/37459573/",
  relevance: "Diretriz: avaliação multidimensional e intervenções individualizadas durante terapia sistêmica; desempenho global isolado não substitui avaliação geriátrica.",
};
const PERFORMANCE: IntrinsicCapacityEvidenceReference = {
  label: "Karnofsky e ECOG — concordância entre pacientes e profissionais",
  pmid: "31806655",
  url: "https://pubmed.ncbi.nlm.nih.gov/31806655/",
  relevance: "Revisão sistemática e meta-análise: concordância apenas razoável a moderada, reforçando a escuta do paciente e a avaliação clínica contextualizada.",
};

/** Educação por instrumento presente, sem criar cortes, converter escalas ou prescrever. */
export function oncoPrognosisFamilyGuidance(
  dimension: string,
  scales: readonly AgaScaleReportSection[],
): { actions: string[]; evidenceReferences: IntrinsicCapacityEvidenceReference[] } | undefined {
  if (dimension !== "oncogeriatria" && dimension !== "prognostico") return undefined;
  const current = scales.filter((scale) => scale.assessedInTargetConsultation && scale.dimension === dimension);
  if (current.length === 0) return undefined;
  const has = (code: string) => current.some((scale) => scale.code === code);
  if (dimension === "oncogeriatria") {
    return {
      actions: [
        "Converse com oncologia e geriatria sobre o objetivo do tratamento, os benefícios esperados, os efeitos indesejados e o que é mais importante para você. A avaliação considera sua autonomia, memória, alimentação, outras doenças, medicamentos e rede de apoio.",
        ...(has("ecog") ? ["A ECOG descreve quanto você consegue se movimentar e cuidar de si no dia a dia. Conte à equipe o que ainda faz sozinho e em que precisa de ajuda. O resultado deve ser interpretado junto com a avaliação completa e não determina, sozinho, qual tratamento receber."] : []),
        "Mantenha as atividades que consegue realizar com segurança, alternando movimento e descanso. Se houver perda de peso, pouco apetite ou dificuldade para se movimentar, peça um plano individual de alimentação e reabilitação, respeitando as restrições da equipe.",
        "Leve às consultas a lista de medicamentos, vitaminas e suplementos. Combine quem pode ajudar com transporte, refeições e horários dos remédios; mudanças no tratamento precisam ser discutidas com a equipe.",
        "Anote sintomas novos, quedas, redução da alimentação e dificuldade nas tarefas habituais. Combine um canal de contato e um plano para piora dos sintomas durante o tratamento; comunique mudanças precocemente, sem esperar a próxima consulta.",
      ],
      evidenceReferences: [ASCO_GA, ...(has("ecog") ? [PERFORMANCE] : [])],
    };
  }
  return {
    actions: [
      ...(has("charlson") ? ["O índice de Charlson reúne doenças que podem influenciar a evolução da saúde. Ele ajuda a planejar o cuidado, mas não prevê com precisão quanto tempo uma pessoa viverá. Revise com a equipe o controle das doenças e como os tratamentos podem ser combinados com segurança."] : []),
      ...(has("kps") ? ["A escala de Karnofsky descreve sua capacidade de realizar atividades e a necessidade de ajuda. Informe mudanças para caminhar, tomar banho, vestir-se ou alimentar-se. O resultado retrata o momento da avaliação e, sozinho, não define o tempo de vida nem a indicação de tratamento."] : []),
      "Acompanhe mudanças em mobilidade, alimentação, dor, falta de ar e necessidade de ajuda. Se aparecer uma dificuldade nova, procure a equipe para avaliar a causa e ajustar o apoio; mantenha a participação da pessoa nas atividades que consegue realizar com segurança.",
      "Converse sobre suas prioridades, como conforto, autonomia e convívio com a família. Combine os próximos passos, quem ajudará nas decisões e a data de reavaliação. As decisões dependem da avaliação médica e das preferências da pessoa, e não apenas de um escore.",
      "Se houver sofrimento ou sintomas difíceis de controlar, converse sobre apoio de cuidados paliativos para você e sua família, inclusive junto ao tratamento do câncer quando indicado. Mantenha acessíveis os contatos e o plano para piora; diante de falta de ar intensa ou confusão súbita, procure atendimento imediatamente.",
    ],
    evidenceReferences: [
      ...(has("charlson") ? [{
        label: "Charlson — revisão crítica das propriedades do índice",
        pmid: "34991091",
        url: "https://pubmed.ncbi.nlm.nih.gov/34991091/",
        relevance: "Revisão da validade prognóstica em populações clínicas; não fornece previsão exata de sobrevida individual nem decisão terapêutica isolada.",
      }] : []),
      ...(has("kps") ? [PERFORMANCE] : []),
      {
        label: "ASCO 2024 — integração dos cuidados paliativos em oncologia",
        pmid: "38748941",
        url: "https://pubmed.ncbi.nlm.nih.gov/38748941/",
        relevance: "Diretriz: cuidado paliativo precoce junto ao tratamento ativo no câncer avançado, atenção a sintomas e apoio a cuidadores; sem indicação automática por escore.",
      },
    ],
  };
}
