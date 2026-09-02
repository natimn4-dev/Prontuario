export type Program55CheckpointType = "BASELINE" | "DAY_90" | "DAY_180" | "YEAR_1";

export interface Program55CheckpointPlanItem {
  checkpointType: Program55CheckpointType;
  referenceDate: Date;
}

function addUtcDays(value: Date, days: number): Date {
  const date = new Date(value.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function buildProgram55CheckpointPlan(startedAt: Date): Program55CheckpointPlanItem[] {
  if (Number.isNaN(startedAt.getTime())) throw new Error("Data inicial inválida para o Programa 55+.");
  return [
    { checkpointType: "BASELINE", referenceDate: new Date(startedAt.getTime()) },
    { checkpointType: "DAY_90", referenceDate: addUtcDays(startedAt, 90) },
    { checkpointType: "DAY_180", referenceDate: addUtcDays(startedAt, 180) },
    { checkpointType: "YEAR_1", referenceDate: addUtcDays(startedAt, 365) },
  ];
}

export function program55CheckpointLabel(type: string): string {
  const labels: Record<string, string> = {
    BASELINE: "Baseline",
    DAY_90: "90 dias",
    DAY_180: "180 dias",
    YEAR_1: "12 meses",
    CUSTOM: "Adicional",
  };
  return labels[type] ?? type;
}
