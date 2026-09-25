export class SensoryObservationError extends Error {
  readonly code: "CONSULTATION_NOT_FOUND" | "CONSULTATION_FINALIZED" | "SENSORY_OBSERVATION_CHANGED";

  constructor(
    code: SensoryObservationError["code"],
    message: string,
  ) {
    super(message);
    this.name = "SensoryObservationError";
    this.code = code;
  }
}
