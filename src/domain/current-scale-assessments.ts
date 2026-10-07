/** Editable answers and completion state belong only to the active consultation. */
export function latestCurrentScaleAssessments<T extends {
  id: string;
  patientId: string;
  consultationId: string;
  scaleCode: string;
  appliedAt: Date | string;
}>(input: {
  patientId: string;
  consultationId: string;
  assessments: readonly T[];
}): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of input.assessments) {
    if (row.patientId !== input.patientId) throw new Error("Escalas de pacientes diferentes não podem ser misturadas.");
    if (row.consultationId !== input.consultationId) continue;
    const previous = latest.get(row.scaleCode);
    const time = new Date(row.appliedAt).getTime();
    const previousTime = previous ? new Date(previous.appliedAt).getTime() : -Infinity;
    if (!previous || time > previousTime || (time === previousTime && row.id > previous.id)) {
      latest.set(row.scaleCode, row);
    }
  }
  return latest;
}
