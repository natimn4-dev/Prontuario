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
      "Mantenha corredores e o caminho até o banheiro livres, bem iluminados e sem tapetes soltos.",
      "Use bengala, andador, corrimão ou supervisão somente do modo já orientado pela equipe; deixe o apoio ao alcance antes de levantar.",
      "Faça apenas os exercícios e caminhadas que já foram considerados seguros, com companhia quando houver risco de queda.",
      "Anote quedas, quase quedas e atividades que passaram a exigir ajuda para contar à equipe.",
    ],
    attentionSigns: [
      "Avise a equipe se houver nova queda, piora progressiva para caminhar ou necessidade crescente de ajuda.",
      "Procure atendimento imediato após queda com trauma importante ou se surgir incapacidade súbita de ficar em pé ou mover um membro.",
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
      "Mantenha rotina previsível, calendário e relógio visíveis; antecipe mudanças com frases curtas.",
      "Dê uma orientação por vez, confirme que foi compreendida e ofereça tempo para a resposta.",
      "Organize compromissos, finanças e medicamentos com o apoio do cuidador no nível de supervisão definido pela equipe.",
      "Garanta iluminação adequada e que óculos e aparelhos auditivos habituais estejam disponíveis e funcionando.",
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
      "Mantenha rotina previsível e oportunidades de participação em atividades significativas escolhidas pelo paciente.",
      "Planeje diariamente uma atividade simples e significativa, sem cobrança por desempenho.",
      "Mantenha contato frequente com pessoas de confiança e escute mudanças de humor sem minimizar o relato.",
      "Registre por alguns dias alterações de humor, ansiedade, interesse e participação para discutir com a equipe.",
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
      "Priorize uma alimentação possível e prazerosa: ofereça refeições menores e mais frequentes quando grandes volumes cansarem ou reduzirem a aceitação, mantendo as orientações nutricionais já definidas para a pessoa.",
      "Facilite líquidos ao longo do dia e deixe bebidas ao alcance quando isso for seguro, sempre respeitando eventual restrição de líquidos orientada pela equipe.",
      "Acompanhe mudanças que ajudam a perceber perda de reserva: peso, roupas mais folgadas, redução das porções, perda de apetite, dificuldade para mastigar ou engolir e cansaço maior para comer.",
      "Quando o SARC-CalF estiver positivo, leve o resultado à equipe para avaliação de sarcopenia, incluindo revisão de força e desempenho físico, estado nutricional e causas reversíveis; o rastreio não confirma o diagnóstico isoladamente.",
      "Preserve atividade e participação conforme tolerância. Quando clinicamente seguro, priorize exercício resistido e funcional planejado de acordo com capacidade, risco de quedas e orientação da equipe.",
    ],
    attentionSigns: [
      "Avise a equipe se houver perda de peso sem intenção, queda persistente da ingestão, piora do apetite, redução progressiva de força ou desempenho, quedas recorrentes ou cansaço crescente.",
      "Procure avaliação rápida se houver engasgo com falta de ar, incapacidade de ingerir líquidos, redução importante da urina, sonolência fora do habitual ou prostração importante.",
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
      "Use iluminação uniforme, contraste nos degraus e objetos de uso diário sempre no mesmo local.",
      "Reduza ruído de fundo, fale de frente para o paciente e confirme a mensagem sem gritar.",
      "Limpe, carregue e guarde óculos e aparelhos auditivos conforme a rotina habitual; observe se deixaram de funcionar bem.",
      "Leve óculos, aparelhos e lista de dificuldades às avaliações de visão ou audição já programadas.",
    ],
    attentionSigns: [
      "Avise a equipe se a dificuldade para ver ou ouvir estiver aumentando quedas, isolamento ou erros nas tarefas diárias.",
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
