import type { AgaScaleReportSection } from "./aga-report.ts";
import type { IntrinsicCapacityEvidenceReference } from "./intrinsic-capacity-guidance.ts";

const PERFORMANCE: IntrinsicCapacityEvidenceReference = {
  label: "ECOG e Karnofsky — capacidade funcional e avaliação clínica",
  pmid: "31806655",
  url: "https://pubmed.ncbi.nlm.nih.gov/31806655/",
  relevance: "A escuta do paciente e da família complementa a avaliação profissional. As orientações educativas usam as descrições funcionais da ECOG-ACRIN, sem conversão entre escalas.",
};
const ECOG_SOURCE: IntrinsicCapacityEvidenceReference = {
  label: "Eastern Cooperative Oncology Group Performance Status — ECOG-ACRIN",
  pmid: "7165009",
  url: "https://ecog-acrin.org/resources/ecog-performance-status/",
  relevance: "ECOG desenvolvida pelo Eastern Cooperative Oncology Group, hoje ECOG-ACRIN Cancer Research Group; Oken et al., 1982. A página também apresenta as descrições de Karnofsky (Karnofsky e Burchenal, 1949).",
};

const ECOG: Readonly<Record<number, readonly string[]>> = {
  0: [
    "ECOG 0 — Incentive a rotina, os momentos de convivência e as atividades de que o paciente gosta, respeitando as orientações recebidas na consulta e as restrições do tratamento.",
    "Ofereça apoio quando necessário, sem assumir tarefas que o paciente consegue realizar. Manter suas escolhas e sua independência também faz parte do cuidado.",
  ],
  1: [
    "ECOG 1 — Ajude em tarefas como carregar compras e fazer limpeza pesada, mantendo a participação nas atividades mais leves.",
    "O cansaço pode tornar as tarefas mais demoradas. Respeite esse ritmo e intercale atividades com pausas para descanso, preservando os momentos de convivência e lazer.",
  ],
  2: [
    "ECOG 2 — Ofereça ajuda com compras, preparo das refeições e transporte. No banho, na alimentação e na troca de roupa, preserve o que ele consegue fazer com segurança, sem pressa e respeitando seu ritmo.",
    "Deixe os objetos de uso diário ao alcance e os caminhos livres de obstáculos. Facilite o acesso ao banheiro e ofereça apoio nos deslocamentos quando necessário.",
  ],
  3: [
    "ECOG 3 — No banho, na troca de roupa, na alimentação e ao se levantar, ofereça a ajuda necessária com calma. Explique cada cuidado, escute suas preferências e permita que ele participe do que ainda consegue fazer.",
    "Ajude a encontrar posições confortáveis e siga as orientações recebidas na visita sobre mudanças de posição. Durante a higiene, observe a pele, principalmente nas costas, no quadril e nos calcanhares. Avise se houver vermelhidão persistente, feridas ou dor.",
    "Deixe os objetos próximos e os caminhos livres para facilitar o cuidado. Use os equipamentos de apoio conforme a indicação individual registrada na consulta.",
  ],
  4: [
    "ECOG 4 — Faça a higiene com delicadeza, preserve a privacidade e respeite os momentos de descanso. Ajude nas mudanças de posição conforme as orientações recebidas na visita, buscando conforto e observando a pele.",
    "Ao oferecer alimentos e líquidos, siga o plano individual de alimentação. Não insista quando houver desconforto e avise se aparecerem tosse, engasgos ou dificuldade para engolir.",
    "A presença da família, uma conversa tranquila e o contato afetuoso podem trazer segurança e acolhimento. Respeite as preferências do paciente, inclusive quando ele desejar silêncio ou descanso.",
  ],
};

const KPS: Readonly<Record<number, readonly string[]>> = {
  100: [
    "Karnofsky 100% — Incentive a rotina, a convivência e os hábitos saudáveis, conforme as orientações da consulta. Ofereça ajuda quando necessário, preservando a independência.",
  ],
  90: [
    "Karnofsky 90% — Incentive os momentos de trabalho, lazer e convivência que lhe fazem bem. Se houver dificuldade, ajude a organizar os medicamentos e os compromissos.",
  ],
  80: [
    "Karnofsky 80% — Ajude a escolher o que é mais importante no dia e intercale as tarefas com descanso. Reduza cobranças e ofereça ajuda nas atividades mais cansativas, sem retirar as escolhas do paciente.",
  ],
  70: [
    "Karnofsky 70% — Redistribua as responsabilidades da casa e preserve sua participação no banho, na alimentação e na troca de roupa, respeitando seus limites.",
  ],
  60: [
    "Karnofsky 60% — Combine quem poderá ajudar com compras, refeições, transporte e outras tarefas em que exista dificuldade. Preserve os cuidados pessoais que o paciente consegue realizar com segurança.",
    "Se estiver difícil organizar ou tomar os medicamentos, ofereça ajuda seguindo a prescrição e as orientações recebidas na consulta. Compartilhe as dificuldades durante o acompanhamento para que o cuidado seja ajustado.",
  ],
  50: [
    "Karnofsky 50% — Combine uma pessoa de referência para organizar os cuidados e divida as tarefas entre familiares e cuidadores.",
    "Deixe os objetos de uso diário ao alcance e os caminhos livres. Ao ajudar no banho e nas transferências, respeite o ritmo do paciente e siga as orientações recebidas na visita e as indicações de equipamentos registradas no plano de cuidado.",
  ],
  40: [
    "Karnofsky 40% — No banho, na alimentação, na troca de roupa e na movimentação, explique o que será feito e permita que ele participe do que ainda consegue fazer.",
    "Ajude a encontrar posições confortáveis, observe a pele durante a higiene e siga o plano de cuidados recebido na visita. Informe dor, falta de ar ou outros desconfortos para que o cuidado seja ajustado.",
  ],
  30: [
    "Karnofsky 30% — Organize a presença de familiares ou cuidadores e mantenha por perto os itens necessários para higiene, alimentação e conforto.",
    "Escute o que é mais importante para o paciente e respeite suas preferências. As decisões sobre tratamentos e o local do cuidado serão individualizadas durante o acompanhamento; essa pontuação, sozinha, não determina internação ou fim de vida.",
  ],
  20: [
    "Karnofsky 20% — Faça a higiene com delicadeza, ajude a encontrar posições confortáveis e siga o plano individual de alimentação e alívio dos sintomas.",
    "Respeite os momentos de descanso e ofereça companhia sem exigir interação. Mantenha acessíveis os contatos de acompanhamento e siga o plano combinado para situações de piora. A necessidade de internação depende da avaliação individual e dos objetivos de cuidado.",
  ],
  10: [
    "Karnofsky 10% — Priorize o conforto, a higiene delicada e o alívio dos sintomas conforme o plano prescrito. Ofereça presença, afeto e apoio espiritual, se isso fizer sentido para o paciente.",
    "Se a avaliação médica confirmar que o paciente está nos últimos dias de vida, siga as orientações individualizadas para esse momento. A família também precisa de acolhimento e apoio, inclusive durante o luto.",
  ],
};

const CHANGES = "Avise se houver aumento do cansaço, dor, falta de apetite, quedas, mais tempo na cama ou maior necessidade de ajuda. Essas mudanças podem ter diferentes causas e ajudam a ajustar o cuidado; não é preciso esperar a próxima visita para comunicá-las.";
const CONTACT = "Mantenha acessíveis os contatos de acompanhamento e o plano combinado para situações de piora. Falta de ar intensa, confusão súbita, dificuldade para despertar ou engasgo com dificuldade para respirar exigem avaliação imediata.";
const CAREGIVER = "Quem cuida também precisa de cuidado. Sempre que possível, divida as tarefas e combine períodos de descanso. Compartilhe suas dificuldades durante o acompanhamento: suas necessidades também fazem parte do plano de cuidado.";
const LIMITS = "As decisões sobre o cuidado e os tratamentos são individualizadas e consideram a avaliação médica, as prioridades do paciente e as necessidades da família.";

/** Texto educativo por resultado atual exato; sem arredondar, converter escalas ou prescrever. */
export function oncoPrognosisFamilyGuidance(
  dimension: string,
  scales: readonly AgaScaleReportSection[],
): { actions: string[]; evidenceReferences: IntrinsicCapacityEvidenceReference[] } | undefined {
  if (dimension !== "oncogeriatria" && dimension !== "prognostico") return undefined;
  const current = scales.filter((scale) => scale.assessedInTargetConsultation && scale.dimension === dimension);
  if (current.length === 0) return undefined;
  const find = (code: string) => current.find((scale) => scale.code === code);
  const functional = find(dimension === "oncogeriatria" ? "ecog" : "kps");
  const score = functional?.result.score;
  const content = typeof score === "number" && Number.isFinite(score)
    ? (dimension === "oncogeriatria" ? ECOG : KPS)[score]
    : undefined;
  const needsHelp = content !== undefined && typeof score === "number"
    && (dimension === "oncogeriatria" ? score >= 3 : score <= 50);
  return {
    actions: [
      ...(content ?? ["Respeite o ritmo e as preferências do paciente. Ofereça ajuda nas tarefas em que houver dificuldade, preservando sua participação no que consegue fazer com segurança."]),
      LIMITS,
      ...(needsHelp ? [CAREGIVER] : []),
      CHANGES,
      CONTACT,
    ],
    evidenceReferences: [
      ...(functional ? [PERFORMANCE, ECOG_SOURCE] : []),
      ...(find("charlson") ? [{
        label: "Charlson — revisão crítica das propriedades do índice",
        pmid: "34991091",
        url: "https://pubmed.ncbi.nlm.nih.gov/34991091/",
        relevance: "Validade prognóstica em populações clínicas; sem previsão exata da sobrevida individual ou decisão terapêutica isolada.",
      }] : []),
    ],
  };
}
