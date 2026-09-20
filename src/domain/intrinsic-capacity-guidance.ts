import type { ClinicalColor } from "./clinical-engine.ts";
import { methodologyForScale } from "./intrinsic-capacity-methodology.ts";

export type IntrinsicCapacityDomainCode =
  | "locomocao"
  | "cognicao"
  | "psicologico"
  | "vitalidade"
  | "sensorial";

export interface IntrinsicCapacityEvidenceReference {
  label: string;
  pmid: string;
  url: string;
  relevance: string;
}

export interface IntrinsicCapacityGuidanceSection {
  code: IntrinsicCapacityDomainCode;
  label: string;
  whyItMatters: string;
  triggeredBy: string[];
  actions: string[];
  attentionSigns: string[];
  evidenceReferences: IntrinsicCapacityEvidenceReference[];
}

export interface IntrinsicCapacityGuidance {
  framework: "WHO intrinsic capacity — five domains";
  sourceLabel: string;
  alteredDomains: IntrinsicCapacityGuidanceSection[];
}

interface AssessmentSignal {
  scaleId: string;
  scaleName: string;
  color?: ClinicalColor;
  assessedInTargetConsultation: boolean;
}

const DOMAIN_ORDER: readonly IntrinsicCapacityDomainCode[] = [
  "locomocao",
  "cognicao",
  "psicologico",
  "vitalidade",
  "sensorial",
];

const DOMAIN_CONTENT: Readonly<Record<IntrinsicCapacityDomainCode, Omit<IntrinsicCapacityGuidanceSection, "code" | "triggeredBy">>> = {
  locomocao: {
    label: "Locomoção",
    whyItMatters: "Reúne força, equilíbrio e marcha necessários para se movimentar com segurança.",
    actions: [
      "Deixe os caminhos mais usados, especialmente até o banheiro, livres de obstáculos, bem iluminados e sem tapetes soltos.",
      "Se levantar ou caminhar estiver mais difícil, ofereça apoio por perto e organize o ambiente para que a pessoa se movimente com mais confiança e segurança.",
      "Prefira exercícios e caminhadas que a pessoa consiga fazer com segurança e sem medo. Quando houver instabilidade ou receio de cair, vale ter alguém por perto.",
      "Conte à equipe se acontecer uma queda, um quase tombo ou se alguma atividade começar a exigir mais ajuda do que antes.",
    ],
    attentionSigns: [
      "Procure a equipe se houver nova queda, piora para caminhar ou necessidade de ajuda maior do que o habitual.",
      "Procure atendimento imediato após uma queda com trauma importante ou se a pessoa, de repente, não conseguir ficar em pé ou mover um braço ou uma perna.",
    ],
    evidenceReferences: [{
      label: "Exercício para prevenção de quedas em idosos na comunidade",
      pmid: "30703272",
      url: "https://pubmed.ncbi.nlm.nih.gov/30703272/",
      relevance: "Revisão sistemática: exercícios de equilíbrio e funcionais reduzem quedas; o programa deve ser individualizado e seguro.",
    }],
  },
  cognicao: {
    label: "Cognição",
    whyItMatters: "Inclui memória, orientação, atenção e capacidade de organizar informações e tarefas.",
    actions: [
      "Uma rotina previsível costuma trazer mais segurança. Deixe calendário e relógio visíveis e avise mudanças com antecedência, usando frases simples.",
      "Fale uma coisa de cada vez, com calma, e dê tempo para a pessoa compreender e responder.",
      "Nas tarefas que começaram a trazer erros ou insegurança, como medicamentos, finanças ou compromissos, ofereça ajuda de perto sem retirar a participação da pessoa no que ela ainda consegue fazer bem.",
      "Boa iluminação, óculos adequados e aparelho auditivo funcionando ajudam a pessoa a entender melhor o ambiente e participar das atividades do dia.",
    ],
    attentionSigns: [
      "Avise a equipe se esquecimentos começarem a comprometer alimentação, higiene, segurança, dinheiro ou uso correto dos medicamentos.",
      "Confusão de início súbito, sonolência incomum, agitação nova ou grande flutuação ao longo do dia requer avaliação urgente.",
    ],
    evidenceReferences: [
      {
        label: "Reabilitação cognitiva orientada por metas na demência inicial",
        pmid: "30724405",
        url: "https://pubmed.ncbi.nlm.nih.gov/30724405/",
        relevance: "Ensaio clínico: metas funcionais individualizadas podem melhorar o desempenho nas atividades diretamente trabalhadas.",
      },
      {
        label: "Intervenção multicomponente para prevenção de delirium",
        pmid: "10053175",
        url: "https://pubmed.ncbi.nlm.nih.gov/10053175/",
        relevance: "Estudo clínico: orientação, sono, mobilidade, visão, audição e hidratação são fatores modificáveis relevantes no cuidado do idoso hospitalizado.",
      },
    ],
  },
  psicologico: {
    label: "Capacidade psicológica",
    whyItMatters: "Abrange principalmente humor, motivação, bem-estar emocional e participação social.",
    actions: [
      "Mantenha uma rotina que faça sentido para a pessoa e inclua atividades de que ela goste ou que tragam sensação de propósito.",
      "Convide para pelo menos uma atividade simples e agradável ao longo do dia, sem cobrança por desempenho.",
      "Favoreça o contato com pessoas de confiança e acolha mudanças de humor com escuta e sem minimizar o que a pessoa está sentindo.",
      "Se perceber mudança de humor, ansiedade, perda de interesse ou isolamento, anote o que aconteceu e compartilhe com a equipe na próxima conversa.",
    ],
    attentionSigns: [
      "Avise a equipe se tristeza, ansiedade, apatia, irritabilidade ou recusa de atividades persistirem ou piorarem.",
      "Fala sobre morte, desesperança intensa, intenção de se machucar ou risco para outras pessoas exige ajuda imediata.",
    ],
    evidenceReferences: [
      {
        label: "Ativação comportamental para sintomas depressivos em instituições de longa permanência",
        pmid: "35680539",
        url: "https://pubmed.ncbi.nlm.nih.gov/35680539/",
        relevance: "Ensaio clínico em idosos: atividades estruturadas e significativas integram uma estratégia não farmacológica para sintomas depressivos.",
      },
      {
        label: "Intervenções domiciliares para solidão e conexão social",
        pmid: "37466183",
        url: "https://pubmed.ncbi.nlm.nih.gov/37466183/",
        relevance: "Revisão sistemática: intervenções domiciliares podem ampliar conexão social e reduzir solidão e sintomas depressivos.",
      },
    ],
  },
  vitalidade: {
    label: "Vitalidade",
    whyItMatters: "Vitalidade representa a reserva que o organismo usa para enfrentar doenças e manter as atividades do dia. Nesta versão, o estado nutricional e o rastreio de vulnerabilidade muscular pelo SARC-CalF são sinais acompanhados e devem ser interpretados junto com força, funcionalidade e condições clínicas.",
    actions: [
      "Para tornar as refeições mais agradáveis e menos cansativas, ofereça porções menores ao longo do dia quando refeições grandes forem difíceis. Valorize alimentos de que a pessoa gosta, respeite o ritmo da refeição e procure manter esse momento tranquilo e prazeroso.",
      "Ofereça líquidos várias vezes ao longo do dia, em pequenas quantidades e nos horários de melhor aceitação. Se foi combinado um limite diário de líquidos, distribua essa quantidade ao longo do dia para facilitar a hidratação sem ultrapassar o volume recomendado.",
      "Observe sinais simples que podem mostrar perda de força ou de reserva: roupas ficando mais folgadas, porções menores, falta de apetite, dificuldade para mastigar ou engolir e cansaço maior durante as refeições.",
      "Se o SARC-CalF vier positivo, converse com a equipe sobre uma avaliação mais completa de força, mobilidade e nutrição. Esse resultado é um sinal de atenção e, sozinho, não confirma sarcopenia.",
      "Ajude a pessoa a continuar ativa nas tarefas que fazem parte da sua rotina e que consegue realizar com segurança. Exercícios de força e movimentos funcionais podem ser incluídos de forma gradual, respeitando a capacidade, o equilíbrio e o risco de quedas.",
    ],
    attentionSigns: [
      "Procure a equipe se houver perda de peso sem intenção, apetite muito menor, redução persistente da alimentação, perda de força, quedas repetidas ou cansaço que esteja aumentando.",
      "Procure avaliação rápida se houver engasgo com falta de ar, dificuldade importante para beber líquidos, redução marcante da urina, sonolência diferente do habitual ou prostração intensa.",
    ],
    evidenceReferences: [
      {
        label: "Diretriz prática ESPEN de nutrição clínica e hidratação em geriatria",
        pmid: "35306388",
        url: "https://pubmed.ncbi.nlm.nih.gov/35306388/",
        relevance: "Diretriz prática: rastreio e cuidado nutricional devem ser individualizados; alimentação, hidratação e suporte oral fazem parte de uma abordagem abrangente e multidisciplinar para pessoas idosas.",
      },
      {
        label: "Validação brasileira do SARC-CalF para rastreio de sarcopenia",
        pmid: "27650212",
        url: "https://pubmed.ncbi.nlm.nih.gov/27650212/",
        relevance: "Estudo de validação: adicionar a circunferência da panturrilha ao SARC-F melhora o desempenho do rastreio de sarcopenia; resultado positivo requer avaliação clínica confirmatória.",
      },
    ],
  },
  sensorial: {
    label: "Capacidade sensorial",
    whyItMatters: "Visão e audição sustentam comunicação, orientação, mobilidade e participação social.",
    actions: [
      "Mantenha boa iluminação, destaque degraus e deixe os objetos mais usados em locais fáceis de encontrar.",
      "Reduza o ruído ao redor, fale de frente para a pessoa e confirme se ela ouviu bem, sem precisar elevar a voz.",
      "Mantenha óculos e aparelhos auditivos limpos, carregados e fáceis de encontrar. Se parecer que deixaram de ajudar como antes, vale revisar o funcionamento.",
      "Nas consultas de visão ou audição, leve os óculos ou aparelhos usados no dia a dia e conte quais dificuldades têm aparecido em casa.",
    ],
    attentionSigns: [
      "Converse com a equipe se a dificuldade para ver ou ouvir estiver aumentando quedas, isolamento ou erros nas atividades do dia.",
      "Perda súbita de visão ou audição, dor ocular intensa ou novo sintoma neurológico requer avaliação urgente.",
    ],
    evidenceReferences: [{
      label: "ACHIEVE: intervenção auditiva e declínio cognitivo em idosos",
      pmid: "37478886",
      url: "https://pubmed.ncbi.nlm.nih.gov/37478886/",
      relevance: "Ensaio clínico: a avaliação e o cuidado auditivo são relevantes; o benefício cognitivo global não foi uniforme e deve ser interpretado conforme o risco individual.",
    }],
  },
};

export function intrinsicCapacityGuidanceForDomain(
  code: IntrinsicCapacityDomainCode,
): Omit<IntrinsicCapacityGuidanceSection, "code" | "triggeredBy"> {
  const content = DOMAIN_CONTENT[code];
  return {
    label: content.label,
    whyItMatters: content.whyItMatters,
    actions: [...content.actions],
    attentionSigns: [...content.attentionSigns],
    evidenceReferences: content.evidenceReferences.map((reference) => ({ ...reference })),
  };
}

function isAltered(color: ClinicalColor | undefined): boolean {
  return color === "amarelo" || color === "vermelho";
}

function isIntrinsicDomain(value: string): value is IntrinsicCapacityDomainCode {
  return DOMAIN_ORDER.includes(value as IntrinsicCapacityDomainCode);
}

export function buildIntrinsicCapacityGuidance(
  assessments: readonly AssessmentSignal[],
): IntrinsicCapacityGuidance {
  const triggers = new Map<IntrinsicCapacityDomainCode, Set<string>>();

  for (const assessment of assessments) {
    if (!assessment.assessedInTargetConsultation || !isAltered(assessment.color)) continue;

    for (const rule of methodologyForScale(assessment.scaleId)) {
      if (!isIntrinsicDomain(rule.domain) || !rule.canClassifyDomain || rule.role === "context") continue;
      const domain: IntrinsicCapacityDomainCode = rule.domain;
      const names = triggers.get(domain) ?? new Set<string>();
      names.add(assessment.scaleName);
      triggers.set(domain, names);
    }
  }

  return {
    framework: "WHO intrinsic capacity — five domains",
    sourceLabel: "OMS — capacidade intrínseca: locomoção, capacidade sensorial, vitalidade, cognição e capacidade psicológica. Orientações apoiadas por literatura científica indexada no PubMed; o aplicativo usa regras metodológicas versionadas, não cria escore global e não substitui revisão médica.",
    alteredDomains: DOMAIN_ORDER.flatMap((code) => {
      const names = triggers.get(code);
      if (!names?.size) return [];
      const content = DOMAIN_CONTENT[code];
      return [{
        code,
        label: content.label,
        whyItMatters: content.whyItMatters,
        triggeredBy: [...names],
        actions: [...content.actions],
        attentionSigns: [...content.attentionSigns],
        evidenceReferences: content.evidenceReferences.map((reference) => ({ ...reference })),
      }];
    }),
  };
}
