export const CONSULTATION_NOTE_SCHEMA_VERSION = "1.0" as const;

type ConsultationNoteSchemaVersion = typeof CONSULTATION_NOTE_SCHEMA_VERSION;

type JsonRecord = Record<string, unknown>;

export interface SubjectiveNoteV1 {
  schemaVersion: ConsultationNoteSchemaVersion;
  kind: "subjective";
  text?: string;
}

export interface ObjectiveNoteV1 {
  schemaVersion: ConsultationNoteSchemaVersion;
  kind: "objective";
  physicalExam?: string;
  vitalSigns?: string;
  anthropometry?: string;
}

export interface PlanNoteV1 {
  schemaVersion: ConsultationNoteSchemaVersion;
  kind: "plan";
  byProblem?: Readonly<Record<string, readonly string[]>>;
}

export interface PersistedConsultationNoteJson {
  subjective: unknown;
  objective: unknown;
  plan: unknown;
}

export interface SoapDraftFields {
  subjective?: string;
  physicalExam?: string;
  vitalSigns?: string;
  anthropometry?: string;
  planByProblem?: Readonly<Record<string, readonly string[]>>;
}

export interface SerializedConsultationNoteJson {
  subjective: SubjectiveNoteV1;
  objective: ObjectiveNoteV1;
  plan: PlanNoteV1;
}

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} deve ser um objeto JSON versionado.`);
  }
  return value as JsonRecord;
}

function assertOnlyKeys(record: JsonRecord, allowed: readonly string[], label: string): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(record).filter((key) => !allowedSet.has(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} contém campo(s) não reconhecido(s): ${unexpected.join(", ")}.`);
  }
}

function assertHeader(record: JsonRecord, kind: string, label: string): void {
  if (record.schemaVersion !== CONSULTATION_NOTE_SCHEMA_VERSION) {
    throw new Error(`${label} usa versão de schema não suportada.`);
  }
  if (record.kind !== kind) {
    throw new Error(`${label} possui tipo de seção incompatível.`);
  }
}

function optionalString(record: JsonRecord, key: string, label: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${label}.${key} deve ser texto.`);
  }
  return value;
}

function normalizedOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function parseSubjectiveNote(value: unknown): SubjectiveNoteV1 | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "subjective");
  assertOnlyKeys(record, ["schemaVersion", "kind", "text"], "subjective");
  assertHeader(record, "subjective", "subjective");
  return {
    schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
    kind: "subjective",
    text: optionalString(record, "text", "subjective"),
  };
}

export function parseObjectiveNote(value: unknown): ObjectiveNoteV1 | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "objective");
  assertOnlyKeys(
    record,
    ["schemaVersion", "kind", "physicalExam", "vitalSigns", "anthropometry"],
    "objective",
  );
  assertHeader(record, "objective", "objective");
  return {
    schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
    kind: "objective",
    physicalExam: optionalString(record, "physicalExam", "objective"),
    vitalSigns: optionalString(record, "vitalSigns", "objective"),
    anthropometry: optionalString(record, "anthropometry", "objective"),
  };
}

function parsePlanByProblem(value: unknown): Readonly<Record<string, readonly string[]>> | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "plan.byProblem");
  const parsed: Record<string, readonly string[]> = {};

  for (const [problemId, actionsValue] of Object.entries(record)) {
    if (!problemId.trim()) {
      throw new Error("plan.byProblem contém problemId vazio.");
    }
    if (!Array.isArray(actionsValue)) {
      throw new Error(`plan.byProblem.${problemId} deve ser uma lista de textos.`);
    }
    const actions = actionsValue.map((action, index) => {
      if (typeof action !== "string" || !action.trim()) {
        throw new Error(`plan.byProblem.${problemId}[${index}] deve ser texto não vazio.`);
      }
      return action;
    });
    parsed[problemId] = actions;
  }

  return parsed;
}

export function parsePlanNote(value: unknown): PlanNoteV1 | undefined {
  if (value === undefined || value === null) return undefined;
  const record = asRecord(value, "plan");
  assertOnlyKeys(record, ["schemaVersion", "kind", "byProblem"], "plan");
  assertHeader(record, "plan", "plan");
  return {
    schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
    kind: "plan",
    byProblem: parsePlanByProblem(record.byProblem),
  };
}

/**
 * Converte somente os campos JSON persistidos que já possuem correspondência
 * explícita no renderer SOAP atual. Avaliação e medicações permanecem derivadas
 * das suas fontes longitudinais próprias e não são duplicadas neste contrato.
 *
 * O parser falha fechado para versões, tipos ou campos desconhecidos. Isso evita
 * que a interface interprete silenciosamente JSON legado/ambíguo como nota clínica.
 */
export function consultationNoteJsonToSoapDraft(
  input: PersistedConsultationNoteJson,
): SoapDraftFields {
  const subjective = parseSubjectiveNote(input.subjective);
  const objective = parseObjectiveNote(input.objective);
  const plan = parsePlanNote(input.plan);

  return {
    subjective: subjective?.text,
    physicalExam: objective?.physicalExam,
    vitalSigns: objective?.vitalSigns,
    anthropometry: objective?.anthropometry,
    planByProblem: plan?.byProblem,
  };
}

/**
 * Serializa apenas o contrato v1 conhecido. O chamador nunca envia `assessment`:
 * avaliação clínica continua derivada da lista longitudinal de problemas.
 */
export function soapDraftToConsultationNoteJson(
  input: SoapDraftFields,
): SerializedConsultationNoteJson {
  const subjectiveText = normalizedOptionalText(input.subjective);
  const physicalExam = normalizedOptionalText(input.physicalExam);
  const vitalSigns = normalizedOptionalText(input.vitalSigns);
  const anthropometry = normalizedOptionalText(input.anthropometry);
  const byProblem: Record<string, readonly string[]> = {};

  for (const [problemId, actions] of Object.entries(input.planByProblem ?? {})) {
    const normalizedId = problemId.trim();
    if (!normalizedId) throw new Error("Plano contém problemId vazio.");
    const normalizedActions = actions.map((action) => action.trim()).filter(Boolean);
    if (normalizedActions.length > 0) byProblem[normalizedId] = normalizedActions;
  }

  return {
    subjective: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "subjective",
      ...(subjectiveText ? { text: subjectiveText } : {}),
    },
    objective: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "objective",
      ...(physicalExam ? { physicalExam } : {}),
      ...(vitalSigns ? { vitalSigns } : {}),
      ...(anthropometry ? { anthropometry } : {}),
    },
    plan: {
      schemaVersion: CONSULTATION_NOTE_SCHEMA_VERSION,
      kind: "plan",
      ...(Object.keys(byProblem).length > 0 ? { byProblem } : {}),
    },
  };
}
