export type PatientIdentifierType = "CPF" | "CNS" | "MEDICAL_RECORD" | "OTHER";

export interface PatientIdentifierInput {
  type: PatientIdentifierType;
  value: string;
}

export interface PatientIdentityInput {
  fullName: string;
  birthDate?: Date | string | null;
  identifiers?: readonly PatientIdentifierInput[];
}

export type DuplicateCandidateReason =
  | "strong-identifier"
  | "same-name-and-birth-date"
  | "same-name-insufficient-data";

export interface PatientIdentityCandidate extends PatientIdentityInput {
  id: string;
}

export interface DuplicateCandidate {
  patientId: string;
  reason: DuplicateCandidateReason;
  blocksAutomaticCreation: boolean;
}

export function normalizePersonName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function normalizePatientIdentifier(
  type: PatientIdentifierType,
  value: string,
): string {
  const trimmed = value.trim().toUpperCase();
  if (type === "CPF" || type === "CNS") return trimmed.replace(/\D/g, "");
  return trimmed.replace(/\s+/g, " ");
}

export function assertPatientIdentifierFormat(input: PatientIdentifierInput): void {
  const normalized = normalizePatientIdentifier(input.type, input.value);
  if (!normalized) throw new Error("Identificador do paciente vazio.");
  if (input.type === "CPF" && !/^\d{11}$/.test(normalized)) {
    throw new Error("CPF deve conter 11 dígitos.");
  }
  if (input.type === "CNS" && !/^\d{15}$/.test(normalized)) {
    throw new Error("CNS deve conter 15 dígitos.");
  }
}

export function normalizedBirthDate(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Data de nascimento inválida.");
  return date.toISOString().slice(0, 10);
}

export function patientIdentityFingerprint(input: PatientIdentityInput): string {
  const name = normalizePersonName(input.fullName);
  if (!name) throw new Error("Nome do paciente é obrigatório.");
  return `${name}::${normalizedBirthDate(input.birthDate) ?? "unknown"}`;
}

function normalizedIdentifiers(input: PatientIdentityInput): Set<string> {
  return new Set(
    (input.identifiers ?? [])
      .map(({ type, value }) => `${type}::${normalizePatientIdentifier(type, value)}`)
      .filter((value) => !value.endsWith("::")),
  );
}

export function findDuplicateCandidates(input: {
  incoming: PatientIdentityInput;
  existing: readonly PatientIdentityCandidate[];
}): DuplicateCandidate[] {
  const incomingName = normalizePersonName(input.incoming.fullName);
  const incomingBirthDate = normalizedBirthDate(input.incoming.birthDate);
  const incomingIdentifiers = normalizedIdentifiers(input.incoming);

  return input.existing.flatMap((patient): DuplicateCandidate[] => {
    const sharedStrongIdentifier = [...normalizedIdentifiers(patient)].some((identifier) =>
      incomingIdentifiers.has(identifier),
    );
    if (sharedStrongIdentifier) {
      return [{
        patientId: patient.id,
        reason: "strong-identifier",
        blocksAutomaticCreation: true,
      }];
    }

    if (normalizePersonName(patient.fullName) !== incomingName) return [];
    const existingBirthDate = normalizedBirthDate(patient.birthDate);
    if (incomingBirthDate && existingBirthDate && incomingBirthDate !== existingBirthDate) return [];

    return [{
      patientId: patient.id,
      reason: incomingBirthDate && existingBirthDate
        ? "same-name-and-birth-date"
        : "same-name-insufficient-data",
      blocksAutomaticCreation: true,
    }];
  });
}

/**
 * Mantém uma única política de precedência para conflitos de identidade.
 * Identificador forte sempre prevalece sobre coincidências por nome/data.
 */
export function preferredDuplicateCandidate(
  candidates: readonly DuplicateCandidate[],
): DuplicateCandidate | undefined {
  return candidates.find((candidate) => candidate.reason === "strong-identifier") ?? candidates[0];
}
