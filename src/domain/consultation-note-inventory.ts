import {
  parseObjectiveNote,
  parsePlanNote,
  parseSubjectiveNote,
} from "./consultation-note-contract.ts";

export type NoteSectionInventoryStatus = "empty" | "contract-v1" | "incompatible";

export interface NoteSectionInventoryCounts {
  empty: number;
  contractV1: number;
  incompatible: number;
}

export interface UnsupportedSectionInventoryCounts {
  empty: number;
  presentUnsupported: number;
}

export interface ConsultationNoteShapeInventory {
  totalConsultations: number;
  subjective: NoteSectionInventoryCounts;
  objective: NoteSectionInventoryCounts;
  plan: NoteSectionInventoryCounts;
  assessment: UnsupportedSectionInventoryCounts;
  safeToEnableV1ReadPath: boolean;
}

export interface ConsultationNoteShapeRow {
  subjective: unknown;
  objective: unknown;
  assessment: unknown;
  plan: unknown;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null;
}

function classify(
  value: unknown,
  parser: (value: unknown) => unknown,
): NoteSectionInventoryStatus {
  if (isEmpty(value)) return "empty";
  try {
    parser(value);
    return "contract-v1";
  } catch {
    return "incompatible";
  }
}

export function classifySubjectiveNoteShape(value: unknown): NoteSectionInventoryStatus {
  return classify(value, parseSubjectiveNote);
}

export function classifyObjectiveNoteShape(value: unknown): NoteSectionInventoryStatus {
  return classify(value, parseObjectiveNote);
}

export function classifyPlanNoteShape(value: unknown): NoteSectionInventoryStatus {
  return classify(value, parsePlanNote);
}

function emptySectionCounts(): NoteSectionInventoryCounts {
  return { empty: 0, contractV1: 0, incompatible: 0 };
}

function incrementSection(
  counts: NoteSectionInventoryCounts,
  status: NoteSectionInventoryStatus,
): void {
  if (status === "empty") counts.empty += 1;
  else if (status === "contract-v1") counts.contractV1 += 1;
  else counts.incompatible += 1;
}

/**
 * Audita somente a forma dos JSON da consulta. Nenhum texto clínico, identificador
 * de paciente ou identificador de consulta é incluído no resultado.
 *
 * `assessment` é deliberadamente tratado como não suportado no contrato v1.
 * Qualquer conteúdo ali torna a ativação automática do read path insegura até
 * revisão/migração explícita, para evitar ignorar uma anotação clínica existente.
 */
export function buildConsultationNoteShapeInventory(
  rows: readonly ConsultationNoteShapeRow[],
): ConsultationNoteShapeInventory {
  const subjective = emptySectionCounts();
  const objective = emptySectionCounts();
  const plan = emptySectionCounts();
  const assessment: UnsupportedSectionInventoryCounts = {
    empty: 0,
    presentUnsupported: 0,
  };

  for (const row of rows) {
    incrementSection(subjective, classifySubjectiveNoteShape(row.subjective));
    incrementSection(objective, classifyObjectiveNoteShape(row.objective));
    incrementSection(plan, classifyPlanNoteShape(row.plan));
    if (isEmpty(row.assessment)) assessment.empty += 1;
    else assessment.presentUnsupported += 1;
  }

  const safeToEnableV1ReadPath =
    subjective.incompatible === 0
    && objective.incompatible === 0
    && plan.incompatible === 0
    && assessment.presentUnsupported === 0;

  return {
    totalConsultations: rows.length,
    subjective,
    objective,
    plan,
    assessment,
    safeToEnableV1ReadPath,
  };
}
