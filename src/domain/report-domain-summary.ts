import type { AgaScaleReportSection } from "./aga-report.ts";
import {
  contextualFamilyGuidance,
  deriveFamilyFunctionalContext,
} from "./family-functional-context.ts";
import {
  contextualizeImmobilityDomainGuidance,
  deriveEstablishedImmobilityContext,
} from "./family-contextual-care.ts";
import type {
  IntrinsicCapacityDomainCode,
  IntrinsicCapacityEvidenceReference,
  IntrinsicCapacityGuidance,
} from "./intrinsic-capacity-guidance.ts";
import { intrinsicCapacityGuidanceForDomain } from "./intrinsic-capacity-guidance.ts";
import {
  COGNITIVE_DOMAIN_OBSERVATION_FIELDS,
  cognitiveScreenClassification,
} from "./cognitive-domain-observation.ts";
import { FRAIL_BR } from "./clinical-config/legacy-core.ts";

export type ReportDomainState = "altered" | "attention" | "preserved" | "not-assessed";

export interface ReportDomainSummary {
  code: string;
  label: string;
  state: ReportDomainState;
  stateLabel: string;
  results: { scaleCode: string; scaleName: string; value: string }[];
  guidance: string[];
  evidenceReferences: IntrinsicCapacityEvidenceReference[];
  requiresMedicalGuidance: boolean;
}

const DIMENSION_LABELS: Readonly<Record<string, string>> = {
  funcionalidade: "Funcionalidade",
  cognicao: "Cognição",
  humor: "Humor e saúde mental",
  fragilidade: "Fragilidade",
  mobilidade: "Locomoção e equilíbrio",
  nutricao: "Nutrição e vitalidade",
  medicamentos: "Medicamentos",
  "suporte-social": "Família e rede de apoio",
  oncogeriatria: "Oncogeriatria",
  prognostico: "Prognóstico e cuidados paliativos",
  sintomas: "Sintomas",
  outros: "Outras avaliações",
};

const DIMENSION_ORDER = [
  "funcionalidade",
  "cognicao",
  "humor",
  "fragilidade",
  "mobilidade",
  "nutricao",
  "medicamentos",
  "suporte-social",
  "oncogeriatria",
  "prognostico",
  "sintomas",
  "outros",
] as const;

const INTRINSIC_DOMAIN_FOR_DIMENSION: Readonly<Partial<Record<string, IntrinsicCapacityDomainCode>>> = {
  mobilidade: "locomocao",
  cognicao: "cognicao",
  humor: "psicologico",
  nutricao: "vitalidade",
};

type DomainGuidance = {
  actions: readonly string[];
  evidenceReferences: readonly IntrinsicCapacityEvidenceReference[];
};

type FrailtyGuidanceProfile = "robust" | "pre-frail" | "frail";

const FRAILTY_GUIDANCE: Readonly<Record<FrailtyGuidanceProfile, DomainGuidance>> = {
  robust: {
    actions: [
      "O FRAIL-BR não identificou critérios de fragilidade nesta consulta: o perfil é robusto. O objetivo é preservar a reserva e a independência, mantendo atividade física regular com força, equilíbrio e resistência, em intensidade compatível com a capacidade e a segurança da pessoa.",
      "Mantenha alimentação suficiente e variada, hidratação conforme o plano clínico, sono regular e participação social e em atividades significativas. Na ausência de declínio, não é necessário tratar a pessoa como frágil; reavalie se surgirem perda de peso não intencional, fadiga persistente, redução de força, quedas ou perda funcional.",
    ],
    evidenceReferences: [
      {
        label: "Diretriz de detecção e manejo da fragilidade na atenção primária",
        pmid: "42560630",
        url: "https://pubmed.ncbi.nlm.nih.gov/42560630/",
        relevance: "Diretriz clínica de 2026: a abordagem da fragilidade deve ser personalizada e multidimensional, com atividade física, suporte nutricional e revisão de fatores modificáveis conforme o perfil clínico.",
      },
    ],
  },
  "pre-frail": {
    actions: [
      "O FRAIL-BR indica pré-fragilidade — uma janela de oportunidade para evitar progressão. Priorize exercício multicomponente, com força e equilíbrio, adaptado à capacidade e com supervisão quando houver risco; revise nutrição, perda de peso, quedas e medicamentos com a equipe.",
      "Interrompa períodos prolongados sentado ou deitado com atividades seguras e curtas, preservando a participação nas tarefas do dia. Avise a equipe se houver mais fadiga, fraqueza, quedas, redução da ingestão ou dificuldade para caminhar e levantar-se.",
    ],
    evidenceReferences: [
      {
        label: "Intervenções multidomínio para fragilidade e pré-fragilidade",
        pmid: "42620771",
        url: "https://pubmed.ncbi.nlm.nih.gov/42620771/",
        relevance: "Revisão sistemática: exercício, especialmente treinamento funcional e de resistência, apresenta benefícios consistentes; apoio nutricional pode complementar uma abordagem individualizada e multidomínio.",
      },
      {
        label: "Exercício e força muscular em pessoas idosas",
        pmid: "42570706",
        url: "https://pubmed.ncbi.nlm.nih.gov/42570706/",
        relevance: "Revisão sistemática e meta-análise: exercício resistido melhora força muscular; intervenções devem ser adaptadas à capacidade e segurança de cada pessoa.",
      },
    ],
  },
  frail: {
    actions: [
      "O FRAIL-BR indica fragilidade e maior vulnerabilidade a doenças e outros estressores. Organize avaliação e plano individualizados, combinando exercício funcional e resistido supervisionado quando seguro, cuidado nutricional, revisão de medicamentos, prevenção de quedas e investigação de causas reversíveis.",
      "Planeje o dia em etapas curtas, oferecendo ajuda antes da exaustão sem retirar toda a participação possível. Comunique perda de peso, redução da ingestão, piora da força, quedas, dificuldade para levantar ou caminhar e qualquer declínio funcional recente.",
    ],
    evidenceReferences: [
      {
        label: "Intervenções multidomínio para fragilidade e pré-fragilidade",
        pmid: "42620771",
        url: "https://pubmed.ncbi.nlm.nih.gov/42620771/",
        relevance: "Revisão sistemática: intervenções de exercício e nutrição devem ser individualizadas e integradas ao cuidado da pessoa idosa frágil.",
      },
      {
        label: "Exercício e força muscular em pessoas idosas",
        pmid: "42570706",
        url: "https://pubmed.ncbi.nlm.nih.gov/42570706/",
        relevance: "Revisão sistemática e meta-análise: exercício resistido melhora força muscular; a prescrição precisa considerar capacidade, comorbidades e segurança.",
      },
    ],
  },
};

const COGNITIVE_SCREEN_GUIDANCE: Readonly<Record<"preserved" | "attention" | "altered", DomainGuidance>> = {
  preserved: {
    actions: [
      "O rastreio cognitivo desta consulta está preservado. Preserve a autonomia e a independência nas atividades habituais, estimulando participação ativa nas decisões, na organização da rotina e nas atividades que a pessoa realiza com segurança.",
      "Para favorecer a reserva cognitiva, mantenha atividade física regular e atividades mentalmente desafiadoras e significativas — por exemplo, aprender uma habilidade nova, participar de cursos, ler e discutir conteúdos, praticar música, jogos de estratégia ou atividades manuais — variando os desafios e progredindo conforme interesse e conforto. Mantenha também convívio social e participação em grupos ou atividades significativas.",
      "Cuide dos hábitos que ajudam a manter a saúde do cérebro: alimentação saudável, atividade física regular, sono adequado, convívio social e correção de perda auditiva e visual quando presente. Reavalie se houver mudança cognitiva ou funcional nova e persistente.",
    ],
    evidenceReferences: [
      {
        label: "LatAm-FINGERS: intervenção multidomínio para prevenção do declínio cognitivo na América Latina",
        pmid: "42442374",
        url: "https://pubmed.ncbi.nlm.nih.gov/42442374/",
        relevance: "Ensaio clínico randomizado em 11 países latino-americanos: uma intervenção estruturada com atividade física, alimentação, treino cognitivo e manejo de fatores de risco produziu maior melhora cognitiva que aconselhamento flexível em idosos sob risco.",
      },
      {
        label: "FINGER: intervenção multidomínio e manutenção da cognição",
        pmid: "25771249",
        url: "https://pubmed.ncbi.nlm.nih.gov/25771249/",
        relevance: "Ensaio clínico randomizado: dieta, exercício, treino cognitivo e monitoramento de risco vascular, combinados, melhoraram ou mantiveram o desempenho cognitivo em idosos sob risco.",
      },
      {
        label: "Educação continuada e atividades cognitivamente estimulantes",
        pmid: "31270114",
        url: "https://pubmed.ncbi.nlm.nih.gov/31270114/",
        relevance: "Revisão sistemática: educação continuada e atividades de lazer cognitivamente estimulantes se associam a maior reserva cognitiva e melhor desempenho; a evidência para prevenção isolada de demência permanece menos definitiva que a abordagem multidomínio.",
      },
      {
        label: "Lancet Commission 2024 — prevenção, intervenção e cuidado em demência",
        pmid: "39096926",
        url: "https://pubmed.ncbi.nlm.nih.gov/39096926/",
        relevance: "Relatório de comissão: estratégias de redução de risco ao longo da vida incluem atividade física, participação social e manejo de fatores vasculares, metabólicos, sensoriais e outros riscos modificáveis.",
      },
    ],
  },
  attention: {
    actions: [
      "O rastreio cognitivo foi positivo para possível comprometimento cognitivo, mas um rastreio positivo não é diagnóstico de demência. Confirme o achado em avaliação clínica estruturada, considerando escolaridade, relato do paciente e informante, funcionalidade, humor, sono, visão, audição, medicamentos e causas potencialmente reversíveis.",
      "Preserve a autonomia que permanece segura. Ofereça lembretes ou supervisão apenas nas tarefas em que existam erros ou risco observável e organize seguimento para definir se há comprometimento cognitivo, sua repercussão funcional e necessidade de investigação adicional.",
    ],
    evidenceReferences: [{
      label: "Diretriz DETeCD-ADRD para avaliação diagnóstica de suspeita de comprometimento cognitivo",
      pmid: "39713942",
      url: "https://pubmed.ncbi.nlm.nih.gov/39713942/",
      relevance: "Diretriz clínica da Alzheimer's Association: suspeita de comprometimento cognitivo deve seguir avaliação estruturada do estado cognitivo e funcional e do provável processo causal; instrumentos de rastreio não substituem o diagnóstico clínico.",
    }],
  },
  altered: {
    actions: [
      "O rastreio cognitivo foi claramente alterado e aumenta a necessidade de investigação, mas não estabelece sozinho diagnóstico de demência nem sua causa. Faça avaliação clínica e funcional estruturada, com história evolutiva, informante, revisão de humor, sono, visão, audição, medicamentos e causas potencialmente reversíveis, além de exames complementares quando clinicamente indicados.",
      "Se já houver erros em medicamentos, finanças, deslocamentos ou outras tarefas de risco, organize apoio direto nessas atividades sem retirar a participação segura nas demais. Confusão, sonolência ou piora cognitiva de início súbito deve ser tratada como mudança aguda e avaliada prontamente.",
    ],
    evidenceReferences: [{
      label: "Diretriz DETeCD-ADRD para avaliação diagnóstica de suspeita de comprometimento cognitivo",
      pmid: "39713942",
      url: "https://pubmed.ncbi.nlm.nih.gov/39713942/",
      relevance: "Diretriz clínica da Alzheimer's Association: o diagnóstico requer caracterização cognitiva, funcional e etiológica estruturada; resultado de teste cognitivo isolado não define demência.",
    }],
  },
};

const FRAILTY_STATE_FALLBACK_GUIDANCE: Readonly<Record<Exclude<ReportDomainState, "not-assessed">, DomainGuidance>> = {
  preserved: {
    actions: [
      "A avaliação de fragilidade desta consulta não sinalizou vulnerabilidade. Preserve autonomia, atividade física regular, alimentação adequada e participação social; não aplique rotinas de cuidado destinadas a pessoas frágeis apenas por causa da idade.",
      "Reavalie se surgirem perda de peso sem intenção, fadiga persistente, redução de força, quedas ou perda funcional nova.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE.robust.evidenceReferences,
  },
  attention: {
    actions: [
      "A avaliação mostrou sinal de vulnerabilidade ou pré-fragilidade. Esta é uma oportunidade de intervenção precoce: revise atividade física, força e equilíbrio, estado nutricional, quedas, doenças e medicamentos de forma individualizada.",
      "Preserve a independência nas tarefas seguras e acompanhe a evolução; procure a equipe se houver progressão de fadiga, fraqueza, perda de peso, quedas ou dificuldade para levantar e caminhar.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE["pre-frail"].evidenceReferences,
  },
  altered: {
    actions: [
      "A avaliação sinalizou fragilidade ou vulnerabilidade relevante. Organize um plano geriátrico individualizado para identificar causas modificáveis e integrar exercício seguro, nutrição, revisão de medicamentos, prevenção de quedas e suporte funcional.",
      "Apoie as tarefas de maior risco sem retirar toda a autonomia possível e comunique declínio funcional recente, perda de peso, piora da força, quedas ou redução importante da ingestão.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE.frail.evidenceReferences,
  },
};

const DOMAIN_GUIDANCE: Readonly<Partial<Record<string, DomainGuidance>>> = {
  funcionalidade: {
    actions: [
      "Facilite as atividades em que houve dificuldade com organização do ambiente, utensílios simples e ajuda apenas na medida necessária, preservando a participação segura.",
      "Observe e anote mudanças em banho, vestir-se, alimentação, transferências e tarefas domésticas para discutir na próxima revisão.",
      "Se a dificuldade estiver aumentando, peça à equipe que revise barreiras do domicílio e a necessidade de treinamento funcional individualizado.",
    ],
    evidenceReferences: [{
      label: "Intervenções de terapia ocupacional para atividades de vida diária em idosos",
      pmid: "29953830",
      url: "https://pubmed.ncbi.nlm.nih.gov/29953830/",
      relevance: "Revisão sistemática: intervenções domiciliares e adequação do ambiente podem beneficiar idosos com dificuldade nas atividades diárias.",
    }],
  },
  fragilidade: {
    actions: [
      "Interprete a fragilidade junto com funcionalidade, força, mobilidade, nutrição, doenças e medicamentos; o resultado isolado não substitui avaliação clínica individualizada.",
      "Avise a equipe se houver perda de peso sem intenção, redução de força, mais dificuldade para levantar ou caminhar, quedas ou cansaço que esteja aumentando.",
    ],
    evidenceReferences: [
      {
        label: "Intervenções multidomínio para fragilidade e pré-fragilidade",
        pmid: "42620771",
        url: "https://pubmed.ncbi.nlm.nih.gov/42620771/",
        relevance: "Revisão sistemática: exercício, especialmente treinamento funcional e de resistência, apresenta benefícios consistentes; apoio nutricional pode complementar uma abordagem individualizada e multidomínio.",
      },
      {
        label: "Exercício e força muscular em pessoas idosas",
        pmid: "42570706",
        url: "https://pubmed.ncbi.nlm.nih.gov/42570706/",
        relevance: "Revisão sistemática e meta-análise: exercício resistido melhora força muscular; intervenções devem ser adaptadas à capacidade e segurança de cada pessoa.",
      },
    ],
  },
  medicamentos: {
    actions: [
      "Mantenha uma lista única e atualizada de medicamentos, doses e horários e leve-a a consultas, urgências e internações.",
      "Não inicie, suspenda, substitua ou ajuste medicamentos por conta própria; dúvidas e mudanças devem ser confirmadas pela equipe responsável.",
      "Avise a equipe após nova queda, tontura, sonolência, confusão, sangramento, hipoglicemia ou dificuldade para organizar os horários.",
    ],
    evidenceReferences: [
      {
        label: "STOPP/START versão 3",
        pmid: "37256475",
        url: "https://pubmed.ncbi.nlm.nih.gov/37256475/",
        relevance: "Consenso europeu atualizado para revisão estruturada de prescrições potencialmente inadequadas e omissões em idosos.",
      },
      {
        label: "Consenso STOPPFall",
        pmid: "33349863",
        url: "https://pubmed.ncbi.nlm.nih.gov/33349863/",
        relevance: "Consenso identifica classes de medicamentos associadas a quedas e apoia revisão individualizada, sem retirada automática.",
      },
    ],
  },
  "suporte-social": {
    actions: [
      "Divida tarefas de cuidado entre pessoas disponíveis e deixe por escrito quem ajuda em medicamentos, alimentação, higiene, deslocamentos e consultas.",
      "Programe pausas regulares e uma pessoa de apoio para o cuidador; sobrecarga persistente deve ser comunicada à equipe.",
      "Use orientação e treinamento prático para lidar com tarefas difíceis e alterações de comportamento, respeitando limites do paciente e do cuidador.",
    ],
    evidenceReferences: [{
      label: "Intervenção multicomponente REACH II para cuidadores de pessoas com demência",
      pmid: "29233097",
      url: "https://pubmed.ncbi.nlm.nih.gov/29233097/",
      relevance: "Ensaio clínico: apoio estruturado, treinamento e acompanhamento podem reduzir ou estabilizar a sobrecarga do cuidador.",
    }],
  },
  oncogeriatria: {
    actions: [
      "Leve este resumo às consultas de oncologia e geriatria para que função, cognição, nutrição, medicamentos e apoio social sejam considerados em conjunto.",
      "Registre sintomas novos, redução da ingestão, quedas, confusão, perda funcional e dificuldade do cuidador durante o tratamento e comunique precocemente à equipe.",
      "Confirme com a equipe o canal de contato e quais sintomas exigem avaliação no mesmo dia durante o tratamento.",
    ],
    evidenceReferences: [{
      label: "Atualização da diretriz ASCO de avaliação geriátrica em oncologia",
      pmid: "37459573",
      url: "https://pubmed.ncbi.nlm.nih.gov/37459573/",
      relevance: "Diretriz recomenda avaliação geriátrica e manejo orientado pelos domínios identificados em idosos recebendo terapia sistêmica.",
    }],
  },
  prognostico: {
    actions: [
      "Mantenha acessíveis os contatos da equipe, as preferências de cuidado já discutidas e o plano combinado para piora de sintomas.",
      "Registre mudanças em dor, falta de ar, ingestão, consciência, mobilidade e necessidade de ajuda para facilitar ajustes do plano pela equipe.",
      "Compartilhe com a equipe as prioridades do paciente e da família, especialmente quando houver mudança importante de funcionalidade ou sintomas.",
    ],
    evidenceReferences: [{
      label: "Cuidados paliativos e desfechos de pacientes e cuidadores",
      pmid: "27893131",
      url: "https://pubmed.ncbi.nlm.nih.gov/27893131/",
      relevance: "Meta-análise de ensaios clínicos: cuidados paliativos foram associados a melhor qualidade de vida, carga de sintomas e planejamento do cuidado.",
    }],
  },
  sintomas: {
    actions: [
      "Anote a intensidade dos sintomas no mesmo horário e informe quais interferem em sono, alimentação, mobilidade ou atividades do dia.",
      "Use o canal combinado com a equipe quando um sintoma piorar, surgir de forma nova ou deixar de responder às medidas já orientadas.",
      "Sintoma intenso isolado deve ser comunicado mesmo que a soma global da escala pareça baixa.",
    ],
    evidenceReferences: [{
      label: "Cuidados paliativos e carga de sintomas",
      pmid: "27893131",
      url: "https://pubmed.ncbi.nlm.nih.gov/27893131/",
      relevance: "Meta-análise: acompanhamento paliativo estruturado pode melhorar carga de sintomas e qualidade de vida em doença grave.",
    }],
  },
};

const LATE_LIFE_DEPRESSION_GUIDANCE: readonly string[] = [
  "Um resultado alterado na GDS é um sinal para olhar o humor com cuidado. Tristeza persistente, perda de interesse, apatia ou isolamento não devem ser tratados como algo esperado do envelhecimento. Acolha o relato sem julgamento e compartilhe mudanças com a equipe assistencial.",
  "Ajude a manter uma rotina simples, com horários regulares, alimentação, movimento seguro e pelo menos uma atividade prazerosa ou contato com alguém de confiança. Se já houver tratamento, incentive o acompanhamento e não altere medicamentos por conta própria.",
  "Se houver fala sobre morte, desesperança intensa, intenção de se machucar ou risco para outra pessoa, permaneça com a pessoa e procure ajuda imediatamente.",
];

const LATE_LIFE_DEPRESSION_EVIDENCE: readonly IntrinsicCapacityEvidenceReference[] = [
  {
    label: "Tratamento da depressão em pessoas idosas",
    pmid: "36649548",
    url: "https://pubmed.ncbi.nlm.nih.gov/36649548/",
    relevance: "Revisão clínica: psicoterapia e tratamento farmacológico podem ser eficazes na depressão tardia; a escolha deve ser individualizada e acompanhada clinicamente.",
  },
  {
    label: "Depressão tardia e risco de suicídio",
    pmid: "40809860",
    url: "https://pubmed.ncbi.nlm.nih.gov/40809860/",
    relevance: "Revisão destaca a necessidade de reconhecer risco suicida e intervir precocemente em pessoas idosas com depressão.",
  },
];

const IADL_FAMILY_GUIDANCE: readonly string[] = [
  "Atenção às atividades fora do domicílio ou mais complexas, como finanças, compras, transporte, organização da casa e medicamentos. Essa fase é de autonomia vigiada: preserve o que a pessoa ainda faz com segurança e acompanhe de perto o que já traz risco ou erros.",
  "Evite retirar toda a independência de uma vez. Ofereça ajuda proporcional à dificuldade e reavalie se novas tarefas passarem a exigir supervisão.",
];

function unique(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function scoreNumber(scale: AgaScaleReportSection): number | undefined {
  if (typeof scale.result.score === "number" && Number.isFinite(scale.result.score)) return scale.result.score;
  const scoreText = scale.result.scoreText?.trim();
  if (!scoreText) return undefined;
  const corrected = scoreText.match(/corrigido\s+(\d+(?:[.,]\d+)?)/i);
  const first = scoreText.match(/(\d+(?:[.,]\d+)?)/);
  const raw = corrected?.[1] ?? first?.[1];
  if (!raw) return undefined;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isMocaScale(scale: AgaScaleReportSection): boolean {
  return scale.code === "moca" || scale.code === "moca_br_freitas";
}

function isMeemScale(scale: AgaScaleReportSection): boolean {
  return scale.code === "meem" || scale.code === "meem_freitas";
}

function isGdsScale(scale: AgaScaleReportSection): boolean {
  return scale.code === "gds15" || scale.code === "gds_15";
}

function currentMocaScore(scales: readonly AgaScaleReportSection[]): number | undefined {
  const moca = scales.find((scale) => scale.assessedInTargetConsultation && isMocaScale(scale));
  return moca ? scoreNumber(moca) : undefined;
}

function currentGdsScore(scales: readonly AgaScaleReportSection[]): number | undefined {
  const gds = scales.find((scale) => scale.assessedInTargetConsultation && isGdsScale(scale));
  return gds ? scoreNumber(gds) : undefined;
}

function collectedValues(scale: AgaScaleReportSection): Map<string, string> {
  return new Map(scale.collectedData.map((item) => [item.field, item.value]));
}

const CONTEXT_ONLY_SCALE_CODES = new Set(["walking_aid_context"]);

function walkingAidType(scales: readonly AgaScaleReportSection[]): string | undefined {
  const device = scales.find((scale) => scale.assessedInTargetConsultation && scale.code === "walking_aid_context");
  if (!device) return undefined;
  const values = collectedValues(device);
  if (values.get("usesWalkingAid") !== "1") return undefined;
  return values.get("walkingAidType") || device.result.scoreText || undefined;
}

function reducedGripDetected(scales: readonly AgaScaleReportSection[]): boolean {
  const grip = scales.find((scale) => scale.assessedInTargetConsultation && scale.code === "preensao");
  if (!grip) return false;
  if (grip.clinicalColor === "vermelho" || grip.clinicalColor === "amarelo") return true;
  return /reduzid|baixa|alterad/i.test(grip.result.classification ?? "");
}

function mobilityTargetedGuidance(scales: readonly AgaScaleReportSection[]): DomainGuidance | undefined {
  const reducedGrip = reducedGripDetected(scales);
  const device = walkingAidType(scales);
  if (!reducedGrip && !device) return undefined;

  const actions: string[] = [];
  if (reducedGrip) {
    actions.push(
      "A força de preensão está reduzida. Esse achado é um marcador de menor força muscular e se associa a maior risco de quedas: revise quedas e quase quedas, marcha, equilíbrio, transferências e a capacidade de levantar-se da cadeira.",
      "Fisioterapia: avaliar força de membros inferiores, equilíbrio, marcha, transferências e segurança no ambiente; estruturar exercício multicomponente com fortalecimento/resistência e treino de equilíbrio, com progressão individual e supervisão conforme o risco.",
      "Mantenha corredores e o caminho até o banheiro livres, bem iluminados e sem tapetes soltos; comunique nova queda, quase queda ou piora para caminhar.",
    );
  }
  if (device) {
    actions.push(
      `Como há uso de ${device.toLocaleLowerCase("pt-BR")}, peça ao fisioterapeuta para conferir altura e ajuste, técnica, lado de uso quando aplicável, estabilidade e segurança nos trajetos habituais; deixe o dispositivo ao alcance antes de levantar.`,
    );
  }

  return {
    actions,
    evidenceReferences: [
      {
        label: "Força de preensão e risco de quedas graves em idosos",
        pmid: "37155689",
        url: "https://pubmed.ncbi.nlm.nih.gov/37155689/",
        relevance: "Coorte prospectiva com 16.445 idosos: menor força de preensão associou-se a maior risco de quedas graves, apoiando seu uso como marcador de vulnerabilidade e a avaliação complementar de marcha e equilíbrio.",
      },
      {
        label: "Exercício para prevenção de quedas em idosos na comunidade",
        pmid: "30703272",
        url: "https://pubmed.ncbi.nlm.nih.gov/30703272/",
        relevance: "Revisão sistemática: exercícios de equilíbrio e funcionais reduzem quedas; programas devem ser individualizados e seguros.",
      },
    ],
  };
}

function eat10TargetedGuidance(scales: readonly AgaScaleReportSection[]): DomainGuidance | undefined {
  const eat10 = scales.find((scale) => scale.assessedInTargetConsultation && scale.code === "eat10");
  const score = eat10 ? scoreNumber(eat10) : undefined;
  if (!eat10 || typeof score !== "number" || score < 3) return undefined;

  return {
    actions: [
      "O EAT-10 foi positivo para risco de disfagia. Organize avaliação clínica aprofundada da deglutição, geralmente com fonoaudiólogo; o rastreio isolado não diagnostica disfagia nem aspiração.",
      "Até a avaliação, ofereça alimentos e líquidos somente quando a pessoa estiver desperta e bem posicionada, de preferência sentada e ereta; use ambiente tranquilo, pequenas quantidades, ritmo lento e pausas, respeitando a consistência já orientada pela equipe.",
      "Não espesse líquidos nem mude a textura da dieta por conta própria. Consistência, volume, manobras posturais e outras estratégias devem ser individualizados após avaliação da deglutição.",
      "Avise a equipe se houver tosse ou engasgos nas refeições, voz molhada após engolir, sensação de alimento parado, refeições muito demoradas, redução persistente da ingestão ou perda de peso. Engasgo com dificuldade para respirar exige atendimento imediato.",
    ],
    evidenceReferences: [
      {
        label: "Validade e confiabilidade do EAT-10",
        pmid: "19140539",
        url: "https://pubmed.ncbi.nlm.nih.gov/19140539/",
        relevance: "Estudo de validação original: escore EAT-10 ≥3 é anormal e o instrumento pode ser usado para rastreio e acompanhamento de sintomas de deglutição.",
      },
      {
        label: "Adaptação transcultural brasileira do EAT-10",
        pmid: "24626972",
        url: "https://pubmed.ncbi.nlm.nih.gov/24626972/",
        relevance: "A versão brasileira manteve os dez itens e o corte de 3 pontos ou mais para risco de disfagia.",
      },
      {
        label: "Recomendações clínicas para disfagia orofaríngea",
        pmid: "40543044",
        url: "https://pubmed.ncbi.nlm.nih.gov/40543044/",
        relevance: "Consenso multidisciplinar: avaliação fonoaudiológica e, quando indicada, FEES/VFSS ajudam a definir consistências e estratégias individualizadas para minimizar aspiração e melhorar eficiência da deglutição.",
      },
    ],
  };
}

function uniqueEvidence(
  groups: readonly (readonly IntrinsicCapacityEvidenceReference[] | undefined)[],
): IntrinsicCapacityEvidenceReference[] {
  const byPmid = new Map<string, IntrinsicCapacityEvidenceReference>();
  for (const group of groups) {
    for (const item of group ?? []) {
      if (!byPmid.has(item.pmid)) byPmid.set(item.pmid, item);
    }
  }
  return [...byPmid.values()];
}

function cognitiveObservationInstrument(scale: AgaScaleReportSection): "moca" | "meem" | "clinical_observation" | undefined {
  if (scale.code !== "cognitive_domain_observation") return undefined;
  const instrument = collectedValues(scale).get("instrument");
  return instrument === "moca" || instrument === "meem" || instrument === "clinical_observation" ? instrument : undefined;
}

function cognitiveScreenState(scales: readonly AgaScaleReportSection[]): Exclude<ReportDomainState, "not-assessed"> | undefined {
  const states: Array<Exclude<ReportDomainState, "not-assessed">> = [];
  for (const scale of scales.filter((item) => item.assessedInTargetConsultation)) {
    const score = scoreNumber(scale);
    if (isMocaScale(scale) && typeof score === "number") {
      states.push(score >= 26 ? "preserved" : score >= 18 ? "attention" : "altered");
      continue;
    }
    if (isMeemScale(scale) && typeof score === "number") {
      states.push(score >= 24 ? "preserved" : score >= 20 ? "attention" : "altered");
      continue;
    }
    const instrument = cognitiveObservationInstrument(scale);
    if ((instrument === "moca" || instrument === "meem") && typeof score === "number") {
      states.push(instrument === "moca"
        ? score >= 26 ? "preserved" : score >= 18 ? "attention" : "altered"
        : score >= 24 ? "preserved" : score >= 20 ? "attention" : "altered");
    }
  }
  if (states.includes("altered")) return "altered";
  if (states.includes("attention")) return "attention";
  if (states.includes("preserved")) return "preserved";
  return undefined;
}

type CognitiveGuidanceGroup = {
  label: string;
  fields: readonly { id: string; max: number }[];
  action: string;
};

const COGNITIVE_GUIDANCE_GROUPS: readonly CognitiveGuidanceGroup[] = [
  {
    label: "memória e orientação",
    fields: [
      { id: "moca_delayed_recall", max: 5 }, { id: "moca_orientation", max: 6 },
      { id: "meem_orientation_temporal", max: 5 }, { id: "meem_orientation_spatial", max: 5 },
      { id: "meem_registration", max: 3 }, { id: "meem_recall", max: 3 },
    ],
    action: "Memória/orientação foi uma das áreas mais acometidas: use agenda, calendário ou quadro visual, mantenha objetos importantes em locais fixos e introduza lembretes simples. Supervisão de medicamentos, fogo/cozinha ou deslocamentos deve ser proporcional aos erros e riscos realmente observados.",
  },
  {
    label: "atenção e funções executivas",
    fields: [
      { id: "moca_attention", max: 6 }, { id: "moca_abstraction", max: 2 },
      { id: "meem_attention", max: 5 }, { id: "meem_commands", max: 3 },
    ],
    action: "Atenção/funções executivas foi uma das áreas mais acometidas: divida tarefas complexas em etapas curtas, reduza estímulos simultâneos e confira atividades de maior risco, como finanças e organização de medicamentos, quando houver erros observáveis.",
  },
  {
    label: "linguagem",
    fields: [
      { id: "moca_naming", max: 3 }, { id: "moca_language", max: 3 },
      { id: "meem_naming", max: 2 }, { id: "meem_repetition", max: 1 },
      { id: "meem_writing", max: 1 }, { id: "meem_reading", max: 1 },
    ],
    action: "Linguagem foi uma das áreas mais acometidas: fale devagar, use frases curtas e objetivas, dê tempo para resposta e complemente com gestos ou pistas visuais quando necessário. Se a dificuldade persistir e interferir na comunicação, discuta avaliação fonoaudiológica.",
  },
  {
    label: "habilidades visuoespaciais/visuoconstrutivas",
    fields: [
      { id: "moca_visuospatial", max: 5 }, { id: "meem_diagram_copy", max: 1 },
    ],
    action: "Habilidades visuoespaciais/visuoconstrutivas foram uma das áreas mais acometidas: melhore a iluminação e a organização visual do ambiente, retire obstáculos e tapetes soltos e revise segurança em rotas desconhecidas e direção veicular quando aplicável.",
  },
];

function targetedCognitiveGuidance(scales: readonly AgaScaleReportSection[]): string[] {
  const scale = scales.find((item) => item.assessedInTargetConsultation
    && item.code === "cognitive_domain_observation"
    && (cognitiveObservationInstrument(item) === "moca" || cognitiveObservationInstrument(item) === "meem"));
  if (!scale) return [];
  const values = collectedValues(scale);
  const ranked = COGNITIVE_GUIDANCE_GROUPS.map((group) => {
    let deficit = 0;
    let maximum = 0;
    for (const field of group.fields) {
      const raw = values.get(field.id);
      if (raw === undefined) continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      deficit += Math.max(0, field.max - value);
      maximum += field.max;
    }
    return { ...group, ratio: maximum > 0 ? deficit / maximum : 0, deficit };
  })
    .filter((group) => group.deficit > 0)
    .sort((left, right) => right.ratio - left.ratio || right.deficit - left.deficit);
  return ranked.slice(0, 2).map((group) => group.action);
}

function npiPositiveDomains(scales: readonly AgaScaleReportSection[]): string[] {
  const npi = scales.find((item) => item.assessedInTargetConsultation && item.code === "npi");
  if (!npi) return [];
  const values = collectedValues(npi);
  const domains = [
    ["delusions", "Delírios"], ["hallucinations", "Alucinações"], ["dysphoria", "Disforia/depressão"],
    ["anxiety", "Ansiedade"], ["agitation", "Agitação/agressividade"], ["euphoria", "Euforia"],
    ["disinhibition", "Desinibição"], ["irritability", "Irritabilidade/labilidade"],
    ["apathy", "Apatia/indiferença"], ["aberrant_motor", "Atividade motora aberrante"],
  ] as const;
  return domains.flatMap(([key, label]) => {
    const frequency = Number(values.get(`npi_${key}_frequency`) ?? 0);
    const severity = Number(values.get(`npi_${key}_severity`) ?? 0);
    return frequency > 0 && severity > 0 ? [label] : [];
  });
}

function npiNonPharmacologicalGuidance(scales: readonly AgaScaleReportSection[]): string[] {
  const positive = npiPositiveDomains(scales);
  if (positive.length === 0) return [];
  const actions = [
    "O NPI registrou sintomas neuropsiquiátricos. Antes de atribuir o comportamento apenas à demência, procure gatilhos ou necessidades não atendidas, como dor, constipação, necessidade de urinar, fome, desidratação, privação de sono, déficit visual/auditivo, excesso de ruído ou mudança recente de medicamentos. Prefira rotina previsível, abordagem calma e comunicação simples, centrada na pessoa.",
  ];
  if (positive.some((item) => /Delírios|Alucinações/.test(item))) {
    actions.push("Para delírios ou alucinações, evite confronto para provar que a percepção está errada; reconheça a emoção, redirecione com calma, reduza estímulos e revise iluminação, visão e audição. Mudança súbita ou flutuação importante requer avaliação clínica.");
  }
  if (positive.some((item) => /Agitação|Irritabilidade/.test(item))) {
    actions.push("Para agitação, agressividade ou irritabilidade, reduza ruído e aglomeração, fale uma pessoa por vez e use atividades individualizadas, música ou movimento seguro conforme preferências e resposta da pessoa.");
  }
  if (positive.includes("Ansiedade")) {
    actions.push("Para ansiedade, antecipe o que será feito, explique antes de tocar ou mover a pessoa, mantenha rotina e reduza mudanças abruptas ou situações excessivamente estimulantes.");
  }
  if (positive.some((item) => /Apatia|Disforia/.test(item))) {
    actions.push("Para apatia ou disforia, ofereça atividades significativas e curtas, contato social e movimento seguro, com convite gentil e sem cobrança ou críticas quando a pessoa não conseguir participar.");
  }
  if (positive.some((item) => /Desinibição|Euforia/.test(item))) {
    actions.push("Para desinibição ou euforia, redirecione com privacidade e sem humilhação, organize o ambiente para reduzir gatilhos e preserve limites de segurança de forma discreta.");
  }
  if (positive.includes("Atividade motora aberrante")) {
    actions.push("Para atividade motora repetitiva ou deambulação, ofereça rota segura para caminhar, atividades programadas e verifique dor, necessidade de banheiro, fome e tédio; contenção física não deve ser estratégia de rotina.");
  }
  return actions;
}

function cognitiveGuidanceFor(
  scales: readonly AgaScaleReportSection[],
  overallState: Exclude<ReportDomainState, "not-assessed">,
): DomainGuidance {
  const screenState = cognitiveScreenState(scales);
  const screenGuidance = screenState ? COGNITIVE_SCREEN_GUIDANCE[screenState] : undefined;
  const targeted = screenState === "preserved" ? [] : targetedCognitiveGuidance(scales);
  const npiGuidance = npiNonPharmacologicalGuidance(scales);
  const npiEvidence: IntrinsicCapacityEvidenceReference[] = npiGuidance.length > 0 ? [
    {
      label: "Diretriz clínica para sintomas comportamentais e psicológicos da demência",
      pmid: "40051590",
      url: "https://pubmed.ncbi.nlm.nih.gov/40051590/",
      relevance: "Diretriz baseada em revisão de evidências: avaliação estruturada e intervenções psicossociais/não farmacológicas devem integrar o manejo de sintomas neuropsiquiátricos.",
    },
    {
      label: "Consenso baseado em evidências para agitação na demência",
      pmid: "42563132",
      url: "https://pubmed.ncbi.nlm.nih.gov/42563132/",
      relevance: "Consenso de 2026: cuidado centrado na pessoa, identificação de necessidades e intervenções individualizadas formam a base do manejo não farmacológico da agitação.",
    },
  ] : [];
  const fallback = screenGuidance ?? (npiGuidance.length > 0 ? undefined : COGNITIVE_SCREEN_GUIDANCE[overallState]);
  return {
    actions: unique([
      ...(fallback?.actions ?? []),
      ...targeted,
      ...npiGuidance,
    ]),
    evidenceReferences: [
      ...(fallback?.evidenceReferences ?? []),
      ...npiEvidence,
    ],
  };
}

function frailtyProfileFor(scales: readonly AgaScaleReportSection[]): FrailtyGuidanceProfile | undefined {
  const frail = scales.find((scale) => scale.code === "frail_br" && scale.assessedInTargetConsultation);
  if (!frail) return undefined;

  const score = scoreNumber(frail);
  if (typeof score === "number") {
    const range = FRAIL_BR.ranges.find((item) => score >= item.min && score <= item.max);
    if (range?.classe === "Idoso robusto") return "robust";
    if (range?.classe === "Idoso pré-frágil") return "pre-frail";
    if (range?.classe === "Idoso frágil") return "frail";
  }

  const classification = frail.result.classification ?? "";
  if (/pré[- ]?fr[aá]gil/i.test(classification)) return "pre-frail";
  if (/fr[aá]gil/i.test(classification)) return "frail";
  if (/robusto/i.test(classification)) return "robust";
  return undefined;
}

function functionalDependenceDetected(scales: readonly AgaScaleReportSection[]): boolean {
  return scales.some((scale) => {
    if (!scale.assessedInTargetConsultation || typeof scale.result.score !== "number") return false;
    if (scale.code === "katz") return scale.result.score < 6;
    if (scale.code === "barthel") return scale.result.score < 100;
    if (scale.code === "lawton") return scale.result.score < 21;
    return false;
  });
}

function stateFor(scales: readonly AgaScaleReportSection[], dimension: string): ReportDomainState {
  const current = scales.filter((scale) => scale.assessedInTargetConsultation && !CONTEXT_ONLY_SCALE_CODES.has(scale.code));
  if (current.length === 0) return "not-assessed";
  // ABVD ou AIVD comprometida é alteração funcional, independentemente de uma cor
  // técnica ausente/inconsistente em registros legados.
  if (dimension === "funcionalidade" && functionalDependenceDetected(current)) return "altered";
  const cognitiveScreen = dimension === "cognicao" ? cognitiveScreenState(current) : undefined;
  if (cognitiveScreen === "altered") return "altered";
  if (current.some((scale) => scale.clinicalColor === "vermelho")) return "altered";

  const mocaScore = dimension === "cognicao" ? currentMocaScore(current) : undefined;
  if (typeof mocaScore === "number" && mocaScore <= 17) return "altered";

  const gdsScore = dimension === "humor" ? currentGdsScore(current) : undefined;
  if (typeof gdsScore === "number" && gdsScore >= 11) return "altered";

  if (cognitiveScreen === "attention") return "attention";
  if (current.some((scale) => scale.clinicalColor === "amarelo")) return "attention";
  if (typeof mocaScore === "number" && mocaScore >= 18 && mocaScore <= 25) return "attention";
  if (typeof gdsScore === "number" && gdsScore >= 6) return "attention";
  return "preserved";
}

function stateLabelFor(state: ReportDomainState): string {
  if (state === "altered") return "Alteração identificada — requer atenção";
  if (state === "attention") return "Sinal de atenção";
  if (state === "preserved") return "Sem alteração sinalizada nesta consulta";
  return "Não avaliado nesta consulta";
}

function familyResultValue(scale: AgaScaleReportSection): string {
  if (isMocaScale(scale)) {
    const score = scoreNumber(scale);
    if (typeof score === "number") return `${score}/30 — ${cognitiveScreenClassification("moca", score)}`;
  }
  if (isMeemScale(scale)) {
    const score = scoreNumber(scale);
    if (typeof score === "number") return `${score}/30 — ${cognitiveScreenClassification("meem", score)}`;
  }
  if (scale.code === "cognitive_domain_observation") {
    const instrument = cognitiveObservationInstrument(scale);
    if (instrument === "moca" || instrument === "meem") {
      const score = scale.result.scoreText ?? (scale.result.score !== null ? String(scale.result.score) : "Resultado registrado");
      return unique([score, scale.result.classification ?? ""]).join(" — ");
    }
    const labels = new Map<string, string>(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => [field.id, field.label]));
    const altered = scale.collectedData
      .filter((item) => item.value === "change_observed")
      .map((item) => labels.get(item.field) ?? item.field);
    if (altered.length > 0) return `Alterações observadas: ${altered.join(", ")}. Registro descritivo, sem diagnóstico automático.`;
    const assessed = scale.collectedData.filter((item) => item.value !== "not_assessed" && item.field !== "instrument");
    return assessed.length > 0
      ? "Sem alteração observada nos domínios avaliados; o achado não exclui comprometimento sutil."
      : "Domínios não avaliados nesta consulta.";
  }
  const score = scale.result.scoreText ?? (scale.result.score !== null ? String(scale.result.score) : undefined);
  return unique([score ?? "Resultado registrado", scale.result.classification ?? ""]).join(" — ");
}

function familyScaleName(scale: AgaScaleReportSection): string {
  if (isMocaScale(scale)) return "MoCA";
  if (scale.code === "cognitive_domain_observation") return "Perfil cognitivo por domínios";
  if (scale.code === "lawton") return "AIVD — atividades instrumentais da vida diária (Lawton)";
  if (scale.code === "katz") return "ABVD — atividades básicas da vida diária (Katz)";
  if (scale.code === "barthel") return "ABVD — atividades básicas da vida diária (Barthel)";
  return scale.name;
}

export function buildReportDomainSummaries(
  scales: readonly AgaScaleReportSection[],
  intrinsicCapacity: IntrinsicCapacityGuidance,
): ReportDomainSummary[] {
  const grouped = new Map<string, AgaScaleReportSection[]>();
  for (const scale of scales.filter((item) => item.assessedInTargetConsultation)) {
    const items = grouped.get(scale.dimension) ?? [];
    items.push(scale);
    grouped.set(scale.dimension, items);
  }

  const functionalContext = deriveFamilyFunctionalContext(scales);
  const immobilityContext = deriveEstablishedImmobilityContext({ scales });

  return DIMENSION_ORDER.flatMap((dimension): ReportDomainSummary[] => {
    const dimensionScales = grouped.get(dimension);
    if (!dimensionScales?.length) return [];

    const state = stateFor(dimensionScales, dimension);
    const intrinsicCode = INTRINSIC_DOMAIN_FOR_DIMENSION[dimension];
    const alteredIntrinsicGuidance = intrinsicCode
      ? intrinsicCapacity.alteredDomains.find((domain) => domain.code === intrinsicCode)
      : undefined;
    const intrinsicGuidance = intrinsicCode
      ? intrinsicCapacityGuidanceForDomain(intrinsicCode)
      : undefined;
    const domainGuidance = DOMAIN_GUIDANCE[dimension];
    const stateAwareGuidance = dimension === "fragilidade"
      ? (() => {
          const profile = frailtyProfileFor(dimensionScales);
          if (profile) return FRAILTY_GUIDANCE[profile];
          return state === "not-assessed" ? undefined : FRAILTY_STATE_FALLBACK_GUIDANCE[state];
        })()
      : dimension === "cognicao" && (state === "preserved" || state === "attention" || state === "altered")
        ? cognitiveGuidanceFor(dimensionScales, state)
        : undefined;
    const targetedGuidance = dimension === "mobilidade"
      ? mobilityTargetedGuidance(dimensionScales)
      : dimension === "nutricao"
        ? eat10TargetedGuidance(dimensionScales)
        : undefined;
    const fallbackGuidance = stateAwareGuidance?.actions
      ?? alteredIntrinsicGuidance?.actions
      ?? intrinsicGuidance?.actions
      ?? domainGuidance?.actions
      ?? [];
    const mobilitySafeFallback = dimension === "mobilidade"
      ? fallbackGuidance.filter((action) => !/bengala|andador|corrimão|dispositivo de auxílio/i.test(action))
      : fallbackGuidance;
    const genericGuidance = unique([
      ...(targetedGuidance?.actions ?? []),
      ...mobilitySafeFallback,
    ]);
    // Dependência funcional pode ter causas motoras, sensoriais ou clínicas e não deve
    // transformar uma cognição preservada em orientação de supervisão cognitiva.
    // A necessidade de apoio funcional permanece descrita na linha Funcionalidade.
    const functionallyContextualized = dimension === "cognicao" && state === "preserved"
      ? genericGuidance
      : contextualFamilyGuidance(
          dimension,
          genericGuidance,
          functionalContext,
        );
    const gdsScore = dimension === "humor" ? currentGdsScore(dimensionScales) : undefined;
    const isAlteredGds = typeof gdsScore === "number" && gdsScore >= 6;
    const isIadlSupport = dimension === "funcionalidade" && functionalContext.level === "iadl-support";
    // Imobilidade contextualiza mobilidade, mas não pode apagar a orientação de
    // Funcionalidade derivada de Katz/Barthel/Lawton.
    const contextGuidance = isIadlSupport
      ? IADL_FAMILY_GUIDANCE
      : isAlteredGds
        ? LATE_LIFE_DEPRESSION_GUIDANCE
        : dimension === "funcionalidade"
          ? functionallyContextualized
          : contextualizeImmobilityDomainGuidance(
              dimension,
              functionallyContextualized,
              immobilityContext,
            );
    const guidanceLimit = dimension === "cognicao"
      ? state === "preserved"
        ? 3
        : (npiPositiveDomains(dimensionScales).length > 0 ? 5 : targetedCognitiveGuidance(dimensionScales).length > 0 ? 4 : 2)
      : targetedGuidance
        ? 4
        : 2;
    const guidance = unique(contextGuidance).slice(0, isAlteredGds ? 3 : guidanceLimit);
    const requiresMedicalGuidance = (state === "altered" || state === "attention") && guidance.length === 0;
    const fallbackEvidence = stateAwareGuidance?.evidenceReferences
      ?? alteredIntrinsicGuidance?.evidenceReferences
      ?? intrinsicGuidance?.evidenceReferences
      ?? domainGuidance?.evidenceReferences
      ?? [];
    const evidenceReferences = isAlteredGds
      ? LATE_LIFE_DEPRESSION_EVIDENCE
      : uniqueEvidence([targetedGuidance?.evidenceReferences, fallbackEvidence]);

    return [{
      code: dimension,
      label: DIMENSION_LABELS[dimension] ?? dimension,
      state,
      stateLabel: stateLabelFor(state),
      results: dimensionScales.map((scale) => ({
        scaleCode: scale.code,
        scaleName: familyScaleName(scale),
        value: familyResultValue(scale),
      })),
      guidance,
      evidenceReferences: evidenceReferences.map((reference) => ({ ...reference })),
      requiresMedicalGuidance,
    }];
  });
}
