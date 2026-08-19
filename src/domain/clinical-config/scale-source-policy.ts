export const PRIMARY_SCALE_SOURCE_ID = "freitas-py-apendice" as const;
export const PRIMARY_SCALE_SOURCE_LABEL =
  "Freitas e Py — Apêndice: Instrumentos de Avaliação" as const;
export const PRIMARY_SCALE_SOURCE_POLICY_VERSION = "2026-08-15" as const;

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
  moca: {
    code: "moca",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "A versão apresentada no PDF deve ser tratada como versão explícita própria; não substituir a versão histórica já registrada.",
  },
  sppb: {
    code: "sppb",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "O PDF documenta componentes e pontuação por desempenho. A nova versão deve preservar medidas brutas e subescores antes do total.",
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
    migrationStatus: "migration-required",
    note: "O PDF define triagem A-F e avaliação global G-R. A ambiguidade documental de IMC exatamente 23 deve permanecer sem inferência automática até revisão clínica.",
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
    note: "Instrumento presente no PDF e ainda não catalogado como versão clínica aplicável na main atual.",
  },
  poma: {
    code: "poma",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "O PDF documenta avaliação de equilíbrio e marcha orientada pelo desempenho; requer implementação versionada própria.",
  },
  iqcode_br: {
    code: "iqcode_br",
    coverage: "defines-instrument",
    migrationStatus: "migration-required",
    note: "IQCODE-Br presente no PDF; requer definição versionada antes de aplicação automatizada.",
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
