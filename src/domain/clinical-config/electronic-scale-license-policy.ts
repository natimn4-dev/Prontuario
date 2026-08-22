export type ElectronicScaleLicenseFlags = {
  mnaEhrConfirmed: boolean;
  mmseElectronicConfirmed: boolean;
  mocaElectronicConfirmed: boolean;
};

export type LicensedElectronicScaleCode = "mna_full" | "meem_freitas" | "moca_br_freitas";

export type ElectronicScaleRestriction = {
  code: LicensedElectronicScaleCode;
  name: string;
  envVar: string;
  reason: string;
};

type EnvironmentLike = Readonly<Record<string, string | undefined>>;

const RESTRICTIONS: Record<LicensedElectronicScaleCode, Omit<ElectronicScaleRestriction, "code"> & { flag: keyof ElectronicScaleLicenseFlags }> = {
  mna_full: {
    name: "MNA completa",
    envVar: "CLINICAL_LICENSE_MNA_EHR_CONFIRMED",
    flag: "mnaEhrConfirmed",
    reason: "A incorporação eletrônica da MNA® ao prontuário exige permissão/licenciamento aplicável do titular/distribuidor.",
  },
  meem_freitas: {
    name: "MEEM / MMSE",
    envVar: "CLINICAL_LICENSE_MMSE_ELECTRONIC_CONFIRMED",
    flag: "mmseElectronicConfirmed",
    reason: "A reprodução eletrônica/formatada do MMSE em português requer autorização aplicável do titular/licenciante.",
  },
  moca_br_freitas: {
    name: "MoCA-BR",
    envVar: "CLINICAL_LICENSE_MOCA_ELECTRONIC_CONFIRMED",
    flag: "mocaElectronicConfirmed",
    reason: "O MoCA® restringe desenvolvimento/reprodução eletrônica sem autorização/licença apropriada.",
  },
};

export function electronicScaleLicenseFlagsFromEnvironment(env: EnvironmentLike): ElectronicScaleLicenseFlags {
  const confirmed = (value: string | undefined) => value?.trim().toLowerCase() === "true";
  return {
    mnaEhrConfirmed: confirmed(env.CLINICAL_LICENSE_MNA_EHR_CONFIRMED),
    mmseElectronicConfirmed: confirmed(env.CLINICAL_LICENSE_MMSE_ELECTRONIC_CONFIRMED),
    mocaElectronicConfirmed: confirmed(env.CLINICAL_LICENSE_MOCA_ELECTRONIC_CONFIRMED),
  };
}

export function electronicScaleRestriction(code: string, flags: ElectronicScaleLicenseFlags): ElectronicScaleRestriction | null {
  if (!(code in RESTRICTIONS)) return null;
  const typedCode = code as LicensedElectronicScaleCode;
  const restriction = RESTRICTIONS[typedCode];
  if (flags[restriction.flag]) return null;
  return { code: typedCode, name: restriction.name, envVar: restriction.envVar, reason: restriction.reason };
}

export function isElectronicScaleLicensed(code: string, flags: ElectronicScaleLicenseFlags): boolean {
  return electronicScaleRestriction(code, flags) === null;
}

export function unconfirmedElectronicScaleRestrictions(flags: ElectronicScaleLicenseFlags): ElectronicScaleRestriction[] {
  return (Object.keys(RESTRICTIONS) as LicensedElectronicScaleCode[])
    .map((code) => electronicScaleRestriction(code, flags))
    .filter((item): item is ElectronicScaleRestriction => item !== null);
}
