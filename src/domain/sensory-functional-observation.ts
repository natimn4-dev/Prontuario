export const SENSORY_OBSERVATION_STATUS = {
  ASSESSED: "ASSESSED",
  NOT_ASSESSED: "NOT_ASSESSED",
} as const;

export type SensoryObservationStatus = typeof SENSORY_OBSERVATION_STATUS[keyof typeof SENSORY_OBSERVATION_STATUS];

export interface SensoryFunctionalObservationValues {
  assessmentStatus: SensoryObservationStatus;
  multisensoryDysfunction: boolean;
  usesCorrectiveLenses: boolean;
}

export interface SensoryFunctionOverview {
  assessmentStatus: SensoryObservationStatus;
  label: string;
  multisensoryDysfunction?: boolean;
  usesCorrectiveLenses?: boolean;
}

export function buildSensoryFunctionOverview(
  observation: SensoryFunctionalObservationValues | null | undefined,
): SensoryFunctionOverview | undefined {
  if (!observation) return undefined;
  if (observation.assessmentStatus === SENSORY_OBSERVATION_STATUS.NOT_ASSESSED) {
    return {
      assessmentStatus: SENSORY_OBSERVATION_STATUS.NOT_ASSESSED,
      label: "Avaliação sensorial não realizada nesta consulta.",
    };
  }

  return {
    assessmentStatus: SENSORY_OBSERVATION_STATUS.ASSESSED,
    label: "Avaliação realizada nesta consulta.",
    multisensoryDysfunction: observation.multisensoryDysfunction,
    usesCorrectiveLenses: observation.usesCorrectiveLenses,
  };
}
