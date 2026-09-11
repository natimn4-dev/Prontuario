export type CapacityDimensionCode =
  | "funcionalidade"
  | "locomocao"
  | "cognicao"
  | "psicologico"
  | "vitalidade"
  | "sensorial";

export type CapacityEvidenceRole =
  | "anchor"
  | "assessment"
  | "indicator"
  | "screening"
  | "context";

export type ConstructMappingStrength = "strong" | "acceptable" | "indirect" | "inadequate";

export type DomainEvidenceBasis = "direct" | "proxy" | "screening" | "context";

export interface CapacityInstrumentMethodology {
  scaleCode: string;
  domain: CapacityDimensionCode;
  role: CapacityEvidenceRole;
  mappingStrength: ConstructMappingStrength;
  basis: DomainEvidenceBasis;
  canClassifyDomain: boolean;
  rationale: string;
  researchNote?: string;
}

/**
 * Versão metodológica explícita da representação longitudinal.
 *
 * Regra de governança: mudar mapeamentos, hierarquia, semântica de estado ou
 * comparabilidade exige uma nova versão. Snapshots/documentos já emitidos não
 * devem ser reescritos silenciosamente.
 */
export const INTRINSIC_CAPACITY_MODEL_VERSION = "intrinsic-capacity-model-v1.2.0" as const;

/**
 * Definição operacional da primeira versão.
 *
 * - funcionalidade é mantida separada da capacidade intrínseca;
 * - instrumentos contextuais podem aparecer nos detalhes, mas não definem o
 *   estado do domínio;
 * - rastreios positivos geram sinal de atenção, nunca confirmação de redução;
 * - indicadores proxy podem classificar apenas o indicador operacional usado,
 *   e essa limitação deve permanecer visível;
 * - não existe escore global ou combinação aritmética entre instrumentos.
 */
export const CAPACITY_INSTRUMENT_METHODOLOGY: readonly CapacityInstrumentMethodology[] = [
  // Independência/desempenho funcional — separado da capacidade intrínseca.
  {
    scaleCode: "katz",
    domain: "funcionalidade",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Mede independência em atividades básicas de vida diária (ABVD).",
  },
  {
    scaleCode: "lawton",
    domain: "funcionalidade",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Mede independência em atividades instrumentais de vida diária (AIVD).",
  },
  {
    scaleCode: "barthel",
    domain: "funcionalidade",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Mede independência funcional em atividades básicas, com forte uso em reabilitação.",
  },
  {
    scaleCode: "pfeffer",
    domain: "funcionalidade",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Mede desempenho funcional complexo por informante; não é teste cognitivo direto.",
  },
  {
    scaleCode: "pfeffer10",
    domain: "funcionalidade",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Versão persistida do Pfeffer; mede desempenho funcional complexo por informante.",
  },
  {
    scaleCode: "ecog",
    domain: "funcionalidade",
    role: "context",
    mappingStrength: "indirect",
    basis: "context",
    canClassifyDomain: false,
    rationale: "Performance status oncológico é clinicamente relevante, mas não equivale a ABVD/AIVD.",
  },
  {
    scaleCode: "kps",
    domain: "funcionalidade",
    role: "context",
    mappingStrength: "indirect",
    basis: "context",
    canClassifyDomain: false,
    rationale: "Karnofsky descreve performance global e necessidade de assistência, não um construto funcional geriátrico específico.",
  },

  // Locomoção.
  {
    scaleCode: "sppb",
    domain: "locomocao",
    role: "anchor",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Bateria objetiva de equilíbrio, velocidade de marcha e levantar da cadeira; âncora operacional do domínio na v1.",
  },
  {
    scaleCode: "velocidade_marcha",
    domain: "locomocao",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Medida objetiva e direta de desempenho de marcha.",
  },
  {
    scaleCode: "sentar_levantar_5x",
    domain: "locomocao",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Mede desempenho/força de membros inferiores como componente locomotor.",
  },
  {
    scaleCode: "poma",
    domain: "locomocao",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Avalia equilíbrio e marcha; complementar ao desempenho locomotor.",
  },
  {
    scaleCode: "preensao",
    domain: "locomocao",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Força de preensão é marcador neuromuscular útil, mas não representa isoladamente toda a locomoção.",
  },
  {
    scaleCode: "sarcf",
    domain: "locomocao",
    role: "screening",
    mappingStrength: "acceptable",
    basis: "screening",
    canClassifyDomain: true,
    rationale: "Rastreia risco de sarcopenia; resultado positivo sinaliza necessidade de assessment, sem confirmar redução locomotora.",
  },
  {
    scaleCode: "frail_br",
    domain: "locomocao",
    role: "context",
    mappingStrength: "indirect",
    basis: "context",
    canClassifyDomain: false,
    rationale: "Fragilidade é multidimensional e não deve definir isoladamente o domínio locomotor.",
  },

  // Cognição.
  {
    scaleCode: "moca",
    domain: "cognicao",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Rastreio cognitivo multidomínio; interpretação depende da versão e população.",
  },
  {
    scaleCode: "moca_br_freitas",
    domain: "cognicao",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Versão brasileira persistida do MoCA; deve conservar versão, escolaridade e regra de interpretação.",
  },
  {
    scaleCode: "meem",
    domain: "cognicao",
    role: "assessment",
    mappingStrength: "strong",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Rastreio cognitivo global; interpretação deve preservar regra de escolaridade utilizada.",
  },
  {
    scaleCode: "dez_cs",
    domain: "cognicao",
    role: "screening",
    mappingStrength: "acceptable",
    basis: "screening",
    canClassifyDomain: true,
    rationale: "Rastreio cognitivo breve; resultado positivo sinaliza necessidade de avaliação complementar.",
  },
  {
    scaleCode: "minicog_freitas",
    domain: "cognicao",
    role: "screening",
    mappingStrength: "acceptable",
    basis: "screening",
    canClassifyDomain: true,
    rationale: "Rastreio cognitivo breve; não deve ser tratado como equivalente longitudinal a MoCA ou MEEM.",
  },
  {
    scaleCode: "clock_shulman",
    domain: "cognicao",
    role: "screening",
    mappingStrength: "acceptable",
    basis: "screening",
    canClassifyDomain: true,
    rationale: "Teste do relógio contribui para rastreio cognitivo, mas não representa sozinho todo o domínio.",
  },
  {
    scaleCode: "iqcode_br_26",
    domain: "cognicao",
    role: "screening",
    mappingStrength: "acceptable",
    basis: "screening",
    canClassifyDomain: true,
    rationale: "Informante sobre declínio cognitivo; útil como rastreio, não equivalente a teste de desempenho direto.",
  },
  {
    scaleCode: "fast",
    domain: "cognicao",
    role: "context",
    mappingStrength: "inadequate",
    basis: "context",
    canClassifyDomain: false,
    rationale: "FAST é estadiamento funcional da demência e não medida direta de desempenho cognitivo.",
  },
  {
    scaleCode: "cam",
    domain: "cognicao",
    role: "context",
    mappingStrength: "inadequate",
    basis: "context",
    canClassifyDomain: false,
    rationale: "CAM identifica delirium agudo; deve funcionar como evento/contexto e não como trajetória cognitiva basal.",
  },
  {
    scaleCode: "pfeffer",
    domain: "cognicao",
    role: "context",
    mappingStrength: "indirect",
    basis: "context",
    canClassifyDomain: false,
    rationale: "Comprometimento funcional pode apoiar avaliação cognitiva, mas Pfeffer não mede cognição diretamente.",
  },
  {
    scaleCode: "pfeffer10",
    domain: "cognicao",
    role: "context",
    mappingStrength: "indirect",
    basis: "context",
    canClassifyDomain: false,
    rationale: "Comprometimento funcional pode apoiar avaliação cognitiva, mas esta versão do Pfeffer não mede cognição diretamente.",
  },

  // Capacidade psicológica.
  {
    scaleCode: "gds15",
    domain: "psicologico",
    role: "anchor",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Rastreia sintomas depressivos e é a âncora operacional disponível na v1; não esgota todo o construto psicológico.",
  },
  {
    scaleCode: "cornell",
    domain: "psicologico",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Avalia sintomas depressivos, especialmente em contexto de comprometimento cognitivo/demência.",
  },
  {
    scaleCode: "cesd_br_elderly",
    domain: "psicologico",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Avalia sintomas depressivos; interpretação deve permanecer vinculada à versão validada utilizada.",
  },
  {
    scaleCode: "isi",
    domain: "psicologico",
    role: "context",
    mappingStrength: "inadequate",
    basis: "context",
    canClassifyDomain: false,
    rationale: "ISI mede gravidade de insônia. Sono é clinicamente relacionado, mas não equivale à capacidade psicológica.",
  },

  // Vitalidade — operacionalização explicitamente provisória.
  {
    scaleCode: "mna_sf",
    domain: "vitalidade",
    role: "indicator",
    mappingStrength: "acceptable",
    basis: "proxy",
    canClassifyDomain: true,
    rationale: "Indicador nutricional usado como proxy operacional de vitalidade; não equivale ao construto fisiológico completo.",
    researchNote: "A OMS e revisões recentes descrevem vitalidade como construto mais amplo envolvendo energia/metabolismo, função neuromuscular e resposta imune/ao estresse. A validação do domínio amplo permanece agenda de pesquisa.",
  },
  {
    scaleCode: "sarc_calf",
    domain: "vitalidade",
    role: "screening",
    mappingStrength: "acceptable",
    basis: "screening",
    canClassifyDomain: true,
    rationale: "O SARC-CalF combina desempenho autorreferido do SARC-F com circunferência da panturrilha como marcador antropométrico de massa muscular; um rastreio positivo sinaliza vulnerabilidade muscular relevante para a Vitalidade, sem confirmar sarcopenia isoladamente.",
    researchNote: "Validação brasileira: Barbosa-Silva TG et al., J Am Med Dir Assoc. 2016; PMID 27650212. A classificação deve permanecer vinculada à versão SARC-CalF e não ser comparada como se fosse o SARC-F 0–10.",
  },
  {
    scaleCode: "frail_br",
    domain: "vitalidade",
    role: "context",
    mappingStrength: "indirect",
    basis: "context",
    canClassifyDomain: false,
    rationale: "Fragilidade é síndrome multidimensional e não deve ser usada como medida específica de vitalidade.",
  },

  // Sensorial — manter visão e audição identificáveis; não combiná-las aritmeticamente.
  {
    scaleCode: "audicao",
    domain: "sensorial",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Indicador auditivo persistido. A versão de pesquisa deve registrar método, unidade e regra de classificação.",
  },
  {
    scaleCode: "hearing",
    domain: "sensorial",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Indicador auditivo persistido. A versão de pesquisa deve registrar método, unidade e regra de classificação.",
  },
  {
    scaleCode: "visao",
    domain: "sensorial",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Indicador visual persistido. A versão de pesquisa deve registrar método, unidade e regra de classificação.",
  },
  {
    scaleCode: "vision",
    domain: "sensorial",
    role: "assessment",
    mappingStrength: "acceptable",
    basis: "direct",
    canClassifyDomain: true,
    rationale: "Indicador visual persistido. A versão de pesquisa deve registrar método, unidade e regra de classificação.",
  },
] as const;

const ROLE_PRIORITY: Readonly<Record<CapacityEvidenceRole, number>> = {
  anchor: 5,
  assessment: 4,
  indicator: 3,
  screening: 2,
  context: 1,
};

export function methodologyForScale(scaleCode: string): readonly CapacityInstrumentMethodology[] {
  return CAPACITY_INSTRUMENT_METHODOLOGY.filter((item) => item.scaleCode === scaleCode);
}

export function methodologyForScaleInDomain(
  scaleCode: string,
  domain: CapacityDimensionCode,
): CapacityInstrumentMethodology | undefined {
  return CAPACITY_INSTRUMENT_METHODOLOGY.find(
    (item) => item.scaleCode === scaleCode && item.domain === domain,
  );
}

export function scaleDomains(scaleCode: string): readonly CapacityDimensionCode[] {
  return methodologyForScale(scaleCode).map((item) => item.domain);
}

export function evidenceRolePriority(role: CapacityEvidenceRole): number {
  return ROLE_PRIORITY[role];
}

export function isCapacityScale(scaleCode: string): boolean {
  return CAPACITY_INSTRUMENT_METHODOLOGY.some((item) => item.scaleCode === scaleCode);
}
