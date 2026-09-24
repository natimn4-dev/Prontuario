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
      "O FRAIL-BR não mostrou sinais de fragilidade nesta consulta. Vale manter o que já ajuda a preservar força, equilíbrio, disposição e independência, com atividade física regular em um ritmo confortável e seguro.",
      "Mantenha uma alimentação variada, ofereça líquidos ao longo do dia, cuide do sono e preserve o convívio social e as atividades de que a pessoa gosta. Se aparecerem perda de peso sem intenção, cansaço persistente, redução de força, quedas ou dificuldade nova nas atividades do dia, converse com a equipe.",
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
      "O FRAIL-BR mostrou sinais de pré-fragilidade. Este é um bom momento para fortalecer a reserva: inclua exercícios de força e equilíbrio de forma gradual e segura e converse com a equipe sobre alimentação, perda de peso, quedas e medicamentos que possam estar contribuindo para a fraqueza.",
      "Evite passar muitas horas seguidas sentado ou deitado quando for possível se movimentar com segurança. Pequenos períodos de atividade ao longo do dia podem ajudar. Procure a equipe se houver mais cansaço, fraqueza, quedas, redução da alimentação ou dificuldade crescente para caminhar ou levantar-se.",
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
      "O FRAIL-BR mostrou fragilidade, o que significa que a pessoa pode sentir mais os efeitos de doenças, internações ou outros períodos de estresse. O cuidado pode ser organizado em etapas, com atenção à força, alimentação, medicamentos, prevenção de quedas e causas tratáveis de piora.",
      "Organize o dia com pausas e ofereça ajuda antes que a pessoa fique exausta, preservando sua participação no que ainda consegue fazer. Avise a equipe se houver perda de peso, redução da alimentação, piora da força, quedas ou dificuldade nova para levantar, caminhar ou realizar as atividades habituais.",
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
      "O rastreio cognitivo desta consulta está preservado. Mantenha a autonomia nas atividades habituais e a participação ativa nas decisões, na organização da rotina e nas escolhas do dia a dia.",
      "Para fortalecer a reserva cognitiva, incentive atividades que tragam interesse e desafio na medida certa: aprender algo novo, ler e conversar sobre o que leu, praticar música, jogos de estratégia, trabalhos manuais, cursos ou outras atividades de que a pessoa goste. Atividade física e convívio social também fazem parte desse cuidado.",
      "Uma alimentação saudável, sono de boa qualidade, atividade física, convívio social e cuidado com visão e audição ajudam a proteger a saúde do cérebro. Se aparecer uma mudança persistente de memória, raciocínio ou autonomia, vale reavaliar.",
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
      "O rastreio cognitivo mostrou um sinal de atenção. Isso não significa, sozinho, diagnóstico de demência. Vale aprofundar a avaliação considerando escolaridade, mudanças percebidas no dia a dia, autonomia, humor, sono, visão, audição, medicamentos e outras causas que possam afetar a cognição.",
      "Mantenha a autonomia no que continua sendo feito com segurança. Nas tarefas em que começaram a aparecer erros ou insegurança, ofereça apoio de forma discreta e proporcional à dificuldade, enquanto a avaliação é aprofundada.",
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
      "O rastreio cognitivo veio bastante alterado e merece uma avaliação mais detalhada, mas esse resultado, sozinho, não define diagnóstico de demência nem sua causa. A investigação deve considerar a história das mudanças, a autonomia no dia a dia, humor, sono, visão, audição, medicamentos e outras condições que possam interferir na cognição.",
      "Se já houver erros em medicamentos, finanças, deslocamentos ou outras tarefas de risco, ofereça ajuda direta nessas situações e preserve a participação no que ainda é seguro. Confusão, sonolência ou piora cognitiva que apareça de repente precisa de avaliação rápida.",
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
      "A avaliação de fragilidade desta consulta não mostrou sinais de vulnerabilidade. Mantenha autonomia, atividade física, alimentação variada e participação social, respeitando o ritmo e as preferências da pessoa.",
      "Converse com a equipe se surgirem perda de peso sem intenção, cansaço persistente, redução de força, quedas ou dificuldade nova nas atividades do dia.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE.robust.evidenceReferences,
  },
  attention: {
    actions: [
      "A avaliação mostrou sinais iniciais de vulnerabilidade ou pré-fragilidade. Vale aproveitar este momento para fortalecer a reserva, com atenção à atividade física, força, equilíbrio, alimentação, quedas, doenças e medicamentos.",
      "Preserve a independência nas tarefas que continuam seguras e procure a equipe se houver aumento do cansaço ou da fraqueza, perda de peso, quedas ou dificuldade crescente para levantar e caminhar.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE["pre-frail"].evidenceReferences,
  },
  altered: {
    actions: [
      "A avaliação mostrou fragilidade ou vulnerabilidade importante. O cuidado pode ser organizado em prioridades práticas: recuperar ou preservar força, cuidar da alimentação, revisar medicamentos, reduzir o risco de quedas e oferecer ajuda nas atividades em que ela realmente é necessária.",
      "Ofereça apoio nas tarefas de maior risco sem retirar a participação da pessoa no que ela ainda consegue fazer. Avise a equipe se houver perda recente de autonomia, peso ou força, novas quedas ou redução importante da alimentação.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE.frail.evidenceReferences,
  },
};

const DOMAIN_GUIDANCE: Readonly<Partial<Record<string, DomainGuidance>>> = {
  funcionalidade: {
    actions: [
      "Nas atividades que ficaram mais difíceis, organize o ambiente e ofereça ajuda apenas no que for necessário, deixando a pessoa participar do restante no próprio ritmo.",
      "Perceba se banho, vestir-se, alimentação, transferências ou tarefas da casa passaram a exigir mais ajuda e conte essas mudanças na próxima consulta.",
      "Se a dificuldade estiver aumentando, vale revisar com a equipe o que pode ser adaptado em casa e quais movimentos ou tarefas podem ser treinados para trazer mais segurança e independência.",
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
      "O resultado de fragilidade ganha mais sentido quando é visto junto com força, mobilidade, alimentação, doenças, medicamentos e autonomia no dia a dia.",
      "Procure a equipe se houver perda de peso sem intenção, redução de força, dificuldade crescente para levantar ou caminhar, quedas ou cansaço que esteja aumentando.",
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
      "Mantenha uma lista simples e atualizada com os medicamentos, doses e horários e leve essa lista sempre que houver consulta, atendimento de urgência ou internação.",
      "Se surgir dúvida sobre algum medicamento ou vontade de mudar dose ou horário, converse primeiro com a equipe para fazer a mudança com segurança.",
      "Procure a equipe se aparecerem queda, tontura, sonolência, confusão, sangramento, hipoglicemia ou dificuldade para organizar os horários dos remédios.",
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
      "Quando houver mais de uma pessoa disponível para ajudar, divida as tarefas de forma clara para que o cuidado não fique concentrado em uma só pessoa.",
      "Reserve momentos de descanso para quem cuida e combine quem pode substituir quando for preciso. Se o cansaço estiver ficando difícil de sustentar, converse com a equipe.",
      "Peça ajuda prática para as tarefas que estão mais difíceis e para mudanças de comportamento, sempre respeitando os limites, as preferências e a dignidade de quem recebe e de quem oferece o cuidado.",
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
      "Procure a equipe se um sintoma piorar, aparecer de forma nova ou continuar incomodando mesmo depois das medidas que costumavam ajudar.",
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

const CORNELL_DEMENTIA_DEPRESSION_EVIDENCE: readonly IntrinsicCapacityEvidenceReference[] = [
  {
    label: "Cornell Scale for Depression in Dementia",
    pmid: "3337862",
    url: "https://pubmed.ncbi.nlm.nih.gov/3337862/",
    relevance: "Instrumento clínico desenvolvido para avaliar sinais de depressão em pessoas com demência combinando entrevista e observação clínica.",
  },
];

const IADL_FAMILY_GUIDANCE: readonly string[] = [
  "Algumas atividades mais complexas, como finanças, compras, transporte, organização da casa e medicamentos, podem precisar de ajuda por perto. Preserve o que a pessoa ainda faz bem e ofereça apoio apenas onde começaram a aparecer erros ou insegurança.",
  "Mantenha a participação da pessoa nas decisões e tarefas que continuam possíveis. Aumente a ajuda aos poucos, apenas onde a dificuldade realmente apareceu.",
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

function cornellFamilyGuidance(
  allScales: readonly AgaScaleReportSection[],
  dimensionScales: readonly AgaScaleReportSection[],
): DomainGuidance | undefined {
  const cornell = dimensionScales.find(
    (scale) => scale.assessedInTargetConsultation && scale.code === "cornell",
  );
  if (!cornell) return undefined;

  const actions: string[] = [];
  if (cornell.clinicalColor === "verde") {
    actions.push(
      "A escala Cornell, específica para avaliar sinais de depressão em pessoas com demência, não mostrou um conjunto importante de sintomas depressivos nesta consulta. Mesmo assim, o resultado deve ser entendido junto com mudanças de comportamento, sono, apetite, interesse e conforto.",
    );
  } else if (cornell.clinicalColor === "amarelo" || cornell.clinicalColor === "vermelho") {
    actions.push(
      "A escala Cornell, específica para avaliar sinais de depressão em pessoas com demência, mostrou sinais que merecem acompanhamento. O resultado deve ser entendido junto com mudanças de comportamento, sono, apetite, interesse e conforto.",
    );
  } else {
    actions.push(
      "A escala Cornell é específica para avaliar sinais de depressão em pessoas com demência e combina informações do paciente, do cuidador e da observação clínica. O resultado deve ser lido junto com mudanças de comportamento, sono, apetite, interesse e conforto.",
    );
  }

  const fast = allScales.find((scale) => scale.code === "fast");
  const fastScore = fast ? scoreNumber(fast) : undefined;
  const severeDementia = Boolean(
    fast && (
      /demência grave/i.test(fast.result.classification ?? "")
      || (typeof fastScore === "number" && fastScore >= 7)
    )
  );

  if (severeDementia) {
    actions.push(
      "Como o FAST já registra demência grave, a pessoa pode ter mais dificuldade para explicar tristeza, medo ou sofrimento. Observe principalmente mudanças em relação ao jeito habitual: ficar mais retraída ou irritada, perder interesse no contato, recusar alimentação ou cuidados, dormir de forma muito diferente ou parecer desconfortável.",
      "Mantenha uma rotina previsível e tranquila, fale com calma e ofereça contato e atividades simples que tragam conforto, sem cobrar que a pessoa “se anime”. Compartilhe com a equipe mudanças persistentes para que também sejam avaliadas dor, infecção, alterações do sono, medicamentos e outras causas de mudança de comportamento.",
    );
  } else {
    actions.push(
      "Observe mudanças persistentes em relação ao habitual, como maior isolamento, irritabilidade, perda de interesse, alteração importante do sono ou do apetite e sinais de sofrimento. Anote o que mudou e compartilhe com a equipe.",
    );
  }

  const co16 = Number(collectedValues(cornell).get("co16"));
  if (Number.isFinite(co16) && co16 > 0) {
    actions.push(
      "Se a pessoa disser que a vida não vale a pena, falar em morte de forma preocupante ou tentar se machucar, permaneça com ela e procure atendimento médico imediatamente.",
    );
  }

  return {
    actions,
    evidenceReferences: CORNELL_DEMENTIA_DEPRESSION_EVIDENCE,
  };
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

function personalizedWalkingAidGuidance(device: string): string {
  switch (device.trim().toLocaleLowerCase("pt-BR")) {
    case "andador":
      return "Converse com o seu fisioterapeuta sobre o ajuste e o uso correto do seu andador, incluindo segurança nos trajetos do dia a dia. Mantenha o andador ao alcance antes de se levantar.";
    case "bengala":
      return "Converse com o seu fisioterapeuta sobre o ajuste e o uso correto da sua bengala, incluindo segurança nos trajetos do dia a dia. Mantenha a bengala ao alcance antes de se levantar.";
    case "muletas":
      return "Converse com o seu fisioterapeuta sobre o ajuste e o uso correto das suas muletas, incluindo segurança nos trajetos do dia a dia. Mantenha as muletas ao alcance antes de se levantar.";
    case "cadeira de rodas":
      return "Converse com o seu fisioterapeuta sobre o ajuste e o uso correto da sua cadeira de rodas, incluindo posicionamento, transferências e segurança nos deslocamentos do dia a dia.";
    default:
      return `Converse com o seu fisioterapeuta sobre o ajuste e o uso correto do dispositivo de locomoção registrado (${device}), incluindo segurança nos trajetos do dia a dia.`;
  }
}

function mobilityTargetedGuidance(scales: readonly AgaScaleReportSection[]): DomainGuidance | undefined {
  const reducedGrip = reducedGripDetected(scales);
  const device = walkingAidType(scales);
  if (!reducedGrip && !device) return undefined;

  const actions: string[] = [];
  if (reducedGrip) {
    actions.push(
      "A força de preensão veio reduzida. Isso pode acompanhar uma redução de força muscular e maior chance de quedas. Vale observar se houve quedas ou quase quedas e se caminhar, manter o equilíbrio, levantar da cadeira ou fazer transferências ficou mais difícil.",
      "A fisioterapia pode ajudar a avaliar força das pernas, equilíbrio, marcha e transferências e a montar um programa de fortalecimento e equilíbrio que avance no ritmo e na segurança da pessoa.",
      "Deixe os caminhos mais usados, especialmente até o banheiro, livres de obstáculos, bem iluminados e sem tapetes soltos. Conte à equipe se houver nova queda, quase tombo ou piora para caminhar.",
    );
  }
  if (device) {
    actions.push(personalizedWalkingAidGuidance(device));
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
      "O EAT-10 mostrou sinais de dificuldade para engolir. Vale fazer uma avaliação mais detalhada da deglutição, geralmente com fonoaudiólogo. Esse rastreio é um sinal de atenção e, sozinho, não confirma disfagia nem aspiração.",
      "Enquanto aguarda a avaliação, ofereça alimentos e líquidos quando a pessoa estiver desperta, confortável e bem sentada. Prefira um ambiente tranquilo, pequenas quantidades, ritmo lento e pausas entre as ofertas.",
      "Evite engrossar líquidos ou mudar a textura dos alimentos sem uma avaliação da deglutição. A melhor consistência, o volume de cada oferta e as estratégias de posicionamento dependem de como a pessoa engole.",
      "Procure a equipe se houver tosse ou engasgos durante as refeições, voz molhada depois de engolir, sensação de alimento parado, refeições muito demoradas, redução persistente da alimentação ou perda de peso. Engasgo com dificuldade para respirar exige atendimento imediato.",
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
    action: "Memória e orientação foram áreas de maior dificuldade. Agenda, calendário, quadro visual e objetos importantes sempre no mesmo lugar podem ajudar. Em medicamentos, cozinha ou deslocamentos, ofereça ajuda apenas na medida dos erros ou riscos que realmente apareceram.",
  },
  {
    label: "atenção e funções executivas",
    fields: [
      { id: "moca_attention", max: 6 }, { id: "moca_abstraction", max: 2 },
      { id: "meem_attention", max: 5 }, { id: "meem_commands", max: 3 },
    ],
    action: "Atenção e organização do pensamento foram áreas de maior dificuldade. Divida tarefas mais complexas em passos curtos, reduza distrações e acompanhe mais de perto finanças ou medicamentos se já houver erros nessas atividades.",
  },
  {
    label: "linguagem",
    fields: [
      { id: "moca_naming", max: 3 }, { id: "moca_language", max: 3 },
      { id: "meem_naming", max: 2 }, { id: "meem_repetition", max: 1 },
      { id: "meem_writing", max: 1 }, { id: "meem_reading", max: 1 },
    ],
    action: "A linguagem foi uma das áreas de maior dificuldade. Fale devagar, use frases curtas, dê tempo para a resposta e apoie a conversa com gestos ou pistas visuais quando isso ajudar. Se a dificuldade estiver atrapalhando a comunicação, vale conversar sobre avaliação fonoaudiológica.",
  },
  {
    label: "habilidades visuoespaciais/visuoconstrutivas",
    fields: [
      { id: "moca_visuospatial", max: 5 }, { id: "meem_diagram_copy", max: 1 },
    ],
    action: "A percepção visual do espaço foi uma das áreas de maior dificuldade. Boa iluminação, ambiente organizado e menos obstáculos podem ajudar. Se houver insegurança em trajetos desconhecidos ou ao dirigir, converse com a equipe sobre formas mais seguras de manter a mobilidade.",
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
    actions.push("Para agitação, agressividade ou irritabilidade, reduza ruído e aglomeração, fale uma pessoa por vez e tente música, movimento ou outra atividade de que a pessoa goste, observando o que a deixa mais tranquila.");
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

function shouldShowFamilyResult(scale: AgaScaleReportSection): boolean {
  if (scale.code !== "walking_aid_context") return true;
  return collectedValues(scale).get("usesWalkingAid") === "1";
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
    const familyVisibleScales = dimensionScales.filter(shouldShowFamilyResult);
    if (familyVisibleScales.length === 0) return [];

    const state = stateFor(dimensionScales, dimension);
    if (state === "not-assessed") return [];
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
        : dimension === "humor"
          ? cornellFamilyGuidance(scales, dimensionScales)
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
    const hasCornell = dimension === "humor"
      && dimensionScales.some((scale) => scale.assessedInTargetConsultation && scale.code === "cornell");
    const gdsScore = dimension === "humor" ? currentGdsScore(dimensionScales) : undefined;
    const isAlteredGds = !hasCornell && typeof gdsScore === "number" && gdsScore >= 6;
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
      results: familyVisibleScales.map((scale) => ({
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
