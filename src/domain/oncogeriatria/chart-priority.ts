const PRIMARY_PRIORITY: Readonly<Record<string, number>> = {
  CARG: 0,
  G8: 10,
  ECOG: 20,
  KPS: 21,
  ESAS: 30,
  KATZ: 50,
  LAWTON: 51,
  BARTHEL: 52,
};

export function oncogeriatricScaleChartPriority(scaleCode: string): number {
  return PRIMARY_PRIORITY[scaleCode.toUpperCase()] ?? 100;
}

export function sortOncogeriatricScaleGroups<T extends { code: string; version: string }>(groups: readonly T[]): T[] {
  return [...groups].sort((left, right) =>
    oncogeriatricScaleChartPriority(left.code) - oncogeriatricScaleChartPriority(right.code)
    || left.code.localeCompare(right.code, "pt-BR")
    || left.version.localeCompare(right.version, "pt-BR"));
}

export function isPrimaryOncogeriatricScale(scaleCode: string): boolean {
  return oncogeriatricScaleChartPriority(scaleCode) < 100;
}
