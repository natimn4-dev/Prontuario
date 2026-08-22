import { SOURCE_PROVENANCE, type SourceValidationStatus } from "./clinical-config/source-provenance.ts";
import { LEGACY_CONFIG_VERSION } from "./clinical-config/legacy-core.ts";
import {
  PRIMARY_SCALE_SOURCE_LABEL,
  scaleSourcePolicy,
  type PrimarySourceCoverage,
  type SourceMigrationStatus,
} from "./clinical-config/scale-source-policy.ts";
import { LEGACY_INTERVENTIONS } from "./interventions.ts";
import { ISI_VERSION } from "./isi.ts";
import { CRASH_MNA_SF_VERSION, ECOG_VERSION } from "./oncogeriatric-scales.ts";

export type GeriatricDimension =
  | "funcionalidade"
  | "cognicao"
  | "humor"
  | "fragilidade"
  | "mobilidade"
  | "nutricao"
  | "medicamentos"
  | "suporte-social"
  | "sono"
  | "oncogeriatria"
  | "prognostico"
  | "sintomas"
  | "outros";

export interface ScaleCatalogEntry {
  code: string;
  version: string;
  name: string;
  shortName: string;
  dimension: GeriatricDimension;
  sourceStatus: SourceValidationStatus;
  source?: string;
  sourceNote: string;
  primarySourceAuthority?: string;
  primarySourceCoverage: PrimarySourceCoverage;
  sourceMigrationStatus: SourceMigrationStatus;
  interpretationPolicy: "stored-assessment-result";
  hasAssociatedInterventions: boolean;
}

const METADATA = {
  katz: ["Katz — ABVD", "Katz", "funcionalidade"],
  lawton: ["Lawton — AIVD", "Lawton", "funcionalidade"],
  barthel: ["Índice de Barthel", "Barthel", "funcionalidade"],
  pfeffer: ["Questionário de Pfeffer", "Pfeffer", "funcionalidade"],
  gds15: ["GDS-15", "GDS-15", "humor"],
  cornell: ["Cornell", "Cornell", "humor"],
  cam: ["Confusion Assessment Method", "CAM", "cognicao"],
  moca: ["MoCA", "MoCA", "cognicao"],
  meem: ["MEEM", "MEEM", "cognicao"],
  dez_cs: ["10-CS", "10-CS", "cognicao"],
  frail_br: ["FRAIL-BR", "FRAIL-BR", "fragilidade"],
  sarcf: ["SARC-F", "SARC-F", "mobilidade"],
  preensao: ["Força de preensão", "Preensão", "mobilidade"],
  velocidade_marcha: ["Velocidade de marcha", "Marcha", "mobilidade"],
  sentar_levantar_5x: ["Sentar-levantar 5x", "5x cadeira", "mobilidade"],
  sppb: ["SPPB", "SPPB", "mobilidade"],
  polifarmacia: ["Polifarmácia / MPI", "Polifarmácia", "medicamentos"],
  stoppfall: ["STOPPFall", "STOPPFall", "medicamentos"],
  isi: ["ISI — Índice de Gravidade de Insônia", "ISI", "sono"],
  kps: ["Karnofsky Performance Status", "KPS", "prognostico"],
  lace: ["LACE", "LACE", "prognostico"],
  g8: ["G8", "G8", "oncogeriatria"],
  ecog: ["Escala de Estado de Desempenho ECOG", "ECOG", "oncogeriatria"],
  crash_mna_sf: ["CRASH adaptada — MNA-SF", "CRASH–MNA-SF", "oncogeriatria"],
  apgar_familiar: ["APGAR familiar", "APGAR", "suporte-social"],
  zarit_reduzida: ["Zarit reduzida", "Zarit", "suporte-social"],
  zarit_paliativo_7_ms2013: ["Zarit 7 itens — MS", "Zarit 7", "suporte-social"],
  charlson: ["Índice de Charlson", "Charlson", "prognostico"],
  ves13: ["VES-13", "VES-13", "fragilidade"],
  mna_sf: ["MNA-SF", "MNA-SF", "nutricao"],
  fast: ["FAST", "FAST", "cognicao"],
  pps: ["Palliative Performance Scale", "PPS", "prognostico"],
  esas: ["ESAS", "ESAS", "sintomas"],
} as const satisfies Record<string, readonly [string, string, GeriatricDimension]>;

export const SCALE_CATALOG: Readonly<Record<string, ScaleCatalogEntry>> = Object.fromEntries(
  Object.entries(METADATA).map(([code, [name, shortName, dimension]]) => {
    const provenance = SOURCE_PROVENANCE[code];
    const sourcePolicy = scaleSourcePolicy(code);
    return [code, {
      code,
      version: code === "zarit_paliativo_7_ms2013"
        ? "MS-AD-CP-2013-7i-1to5"
        : code === "ecog"
          ? ECOG_VERSION
          : code === "crash_mna_sf"
            ? CRASH_MNA_SF_VERSION
            : code === "isi"
              ? ISI_VERSION
              : LEGACY_CONFIG_VERSION,
      name,
      shortName,
      dimension,
      sourceStatus: provenance?.status ?? "needs-review",
      source: provenance?.primaryReference,
      sourceNote: provenance?.note ?? "Regra preservada do golden master; procedência bibliográfica ainda não catalogada neste módulo.",
      primarySourceAuthority: sourcePolicy.coverage === "not-covered" ? undefined : PRIMARY_SCALE_SOURCE_LABEL,
      primarySourceCoverage: sourcePolicy.coverage,
      sourceMigrationStatus: sourcePolicy.migrationStatus,
      interpretationPolicy: "stored-assessment-result",
      hasAssociatedInterventions: Boolean(LEGACY_INTERVENTIONS[code]),
    } satisfies ScaleCatalogEntry];
  }),
);

export function scaleCatalogEntry(code: string): ScaleCatalogEntry {
  const sourcePolicy = scaleSourcePolicy(code);
  return SCALE_CATALOG[code] ?? {
    code,
    version: "unknown",
    name: code,
    shortName: code,
    dimension: "outros",
    sourceStatus: "needs-review",
    sourceNote: "Escala sem definição catalogada; não interpretar automaticamente.",
    primarySourceAuthority: sourcePolicy.coverage === "not-covered" ? undefined : PRIMARY_SCALE_SOURCE_LABEL,
    primarySourceCoverage: sourcePolicy.coverage,
    sourceMigrationStatus: sourcePolicy.migrationStatus,
    interpretationPolicy: "stored-assessment-result",
    hasAssociatedInterventions: false,
  };
}
