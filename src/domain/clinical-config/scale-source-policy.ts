export const PRIMARY_SCALE_SOURCE_ID = "freitas-py-apendice" as const;
export const PRIMARY_SCALE_SOURCE_LABEL =
  "Freitas e Py — Apêndice: Instrumentos de Avaliação" as const;
export const PRIMARY_SCALE_SOURCE_POLICY_VERSION = "2026-08-19" as const;

export type PrimarySourceCoverage =
  | "defines-instrument"
  | "defines-form-only"
  | "different-version"
  | "not-covered";

export type SourceMigrationStatus =
  | "adopted"
  | "migration-required"
  | "review-required"
  | "secondary-source";

export interface ScaleSourcePolicy {
  code: string;
  coverage: PrimarySourceCoverage;
  migrationStatus: SourceMigrationStatus;
  note: string;
}

/**
 * Política clínica aprovada para novas avaliações:
 * quando uma escala está descrita no apêndice Freitas e Py, esse material
 * prevalece para estrutura, redação, opções e pontuação que ele documenta.
 * O legado permanece disponível para histórico/compatibilidade, mas não pode
 * substituir silenciosamente a versão da fonte primária.
 *
 * A presença de um formulário no PDF não autoriza completar score, cutoff ou
 * interpretação ausentes. Lacunas permanecem explicitamente em revisão.
 */
export const SCALE_SOURCE_POLICY: Readonly<Record<string, ScaleSourcePolicy>> = {
  katz: {
    code: "katz",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "O PDF define as seis ABVD e a independência/dependência por item. Preservar cada função separadamente e o total 0-6.",
  },
  lawton: {
    code: "lawton",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "O PDF define sete AIVD, pontuadas de 1 a 3, total 7-21; maior escore indica maior independência.",
  },
  pfeffer: {
    code: "pfeffer",
    coverage: "different-version",
    migrationStatus: "migration-required",
    note: "O PDF apresenta versão de 10 itens com respostas A-F. Não reutilizar silenciosamente a versão legada de 11 itens nem inventar transformação numérica/corte.",
  },
  pfeffer10: {
    code: "pfeffer10",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "Versão Freitas/Py de 10 itens já implementada com código e versão próprios; não converter nem reclassificar avaliações legadas de Pfeffer.",
  },
  gds15: {
    code: "gds15",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "O PDF define os 15 itens e a chave de respostas. Resultado de rastreio não deve ser promovido automaticamente a diagnóstico.",
  },
  meem: {
    code: "meem",
    coverage: "defines-form-only",
    migrationStatus: "review-required",
    note: "O PDF define o formulário/itens do MEEM; pontos de corte por escolaridade exigem fonte complementar/versionada quando não definidos no apêndice.",
  },
  meem_freitas: {
    code: "meem_freitas",
    coverage: "defines-form-only",
    migrationStatus: "adopted",
    note: "Formulário Freitas/Py implementado com versão própria; referências educacionais brasileiras suplementares permanecem identificadas e não são tratadas como pontos diagnósticos.",
  },
  moca: {
    code: "moca",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "A versão apresentada no PDF deve ser tratada como versão explícita própria; não substituir a versão histórica já registrada.",
  },
  moca_br_freitas: {
    code: "moca_br_freitas",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "Versão brasileira reproduzida no Freitas/Py implementada com código próprio; referências brasileiras suplementares são versionadas e o resultado permanece de rastreio.",
  },
  sppb: {
    code: "sppb",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "O PDF documenta componentes e pontuação por desempenho. A nova versão deve preservar medidas brutas e subescores antes do total.",
  },
  sppb_freitas: {
    code: "sppb_freitas",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "Versão Freitas/Py implementada separadamente, preservando medidas brutas, subescores e percurso documentado; não reclassificar o SPPB legado.",
  },
  mna_sf: {
    code: "mna_sf",
    coverage: "different-version",
    migrationStatus: "migration-required",
    note: "O PDF apresenta a Miniavaliação Nutricional completa A-R, não o MNA-SF legado. Não tratar os instrumentos como equivalentes.",
  },
  mna_full: {
    code: "mna_full",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "O PDF define triagem A-F e avaliação global G-R. A MNA completa foi implementada com versão própria e permanece separada da MNA-SF histórica.",
  },
  apgar_familiar: {
    code: "apgar_familiar",
    coverage: "defines-form-only",
    migrationStatus: "review-required",
    note: "O PDF fornece o formulário. Pontuação/faixas não devem ser inventadas quando não estiverem explicitadas na referência adotada.",
  },
  minicog: {
    code: "minicog",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "Código de inventário histórico. Novas aplicações usam a versão explícita `minicog_freitas`; não criar equivalência silenciosa entre códigos.",
  },
  minicog_freitas: {
    code: "minicog_freitas",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "Mini-Cog do fluxo Freitas/Py implementado com código e versão próprios; o algoritmo de pontuação complementar permanece explicitamente documentado.",
  },
  clock_shulman: {
    code: "clock_shulman",
    coverage: "defines-form-only",
    migrationStatus: "adopted",
    note: "O Freitas/Py fornece a máscara de aplicação; a classificação Shulman 0-5 usa fonte brasileira suplementar versionada e permanece separada do relógio do Mini-Cog e do MoCA.",
  },
  poma: {
    code: "poma",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "O PDF documenta avaliação de equilíbrio e marcha orientada pelo desempenho; a versão histórica não deve ser confundida com a versão Freitas/Py de 57 pontos.",
  },
  poma_freitas: {
    code: "poma_freitas",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "Versão Freitas/Py de 57 pontos implementada com código próprio; não aplicar cortes da versão Tinetti de 28 pontos.",
  },
  iqcode_br: {
    code: "iqcode_br",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "Código de inventário histórico. Novas aplicações usam `iqcode_br_26` com versão explícita e referências brasileiras complementares.",
  },
  iqcode_br_26: {
    code: "iqcode_br_26",
    coverage: "defines-instrument",
    migrationStatus: "adopted",
    note: "IQCODE-Br de 26 itens do Freitas/Py implementado com versão própria; referências brasileiras complementares são mantidas como apoio de rastreio, não como diagnóstico isolado.",
  },
  cesd: {
    code: "cesd",
    coverage: "defines-form-only",
    migrationStatus: "review-required",
    note: "CES-D está presente no PDF; não criar cálculo/faixas ausentes sem fonte complementar validada.",
  },
  mos_sss: {
    code: "mos_sss",
    coverage: "defines-form-only",
    migrationStatus: "review-required",
    note: "MOS Social Support Survey está presente no PDF; cálculo/interpretação exigem fonte complementar antes de automação.",
  },
  zarit_22: {
    code: "zarit_22",
    coverage: "defines-form-only",
    migrationStatus: "review-required",
    note: "O PDF apresenta a Zarit Burden Interview de 22 itens; não confundir com versões reduzidas/institucionais existentes.",
  },
};

export function scaleSourcePolicy(code: string): ScaleSourcePolicy {
  return SCALE_SOURCE_POLICY[code] ?? {
    code,
    coverage: "not-covered",
    migrationStatus: "secondary-source",
    note: "Instrumento não coberto pelo PDF principal; usar fonte secundária explicitamente identificada ou manter pendente de revisão.",
  };
}

export function isPrimaryPdfScale(code: string): boolean {
  return scaleSourcePolicy(code).coverage !== "not-covered";
}
