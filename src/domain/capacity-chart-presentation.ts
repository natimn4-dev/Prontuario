import type { CapacityDimensionRow, CapacityDimensionStatus } from "./capacity-dimension-history.ts";
import { proportionalAxisPosition } from "./chart-geometry.ts";

export const CAPACITY_STATUS_LABEL: Record<CapacityDimensionStatus, string> = {
  "not-assessed": "Não avaliada", recorded: "Registrada sem estado de domínio",
  indeterminate: "Indeterminada / discordante", preserved: "Sem redução detectada",
  attention: "Sinal de atenção", altered: "Redução identificada",
};

/** Graph selection only: sensory findings remain in the clinical record. */
export function capacityChartDimensions(dimensions: readonly CapacityDimensionRow[]): CapacityDimensionRow[] {
  return ["funcionalidade", "cognicao", "locomocao", "psicologico", "vitalidade"].flatMap((code) => {
    const dimension = dimensions.find((item) => item.code === code);
    return dimension ? [{ ...dimension, label: code === "psicologico" ? "Humor" : code === "funcionalidade" ? "Funcionalidade" : dimension.label }] : [];
  });
}

function presentationKey(cell: CapacityDimensionRow["cells"][number]): string | undefined {
  if (cell.comparabilityKey) return cell.comparabilityKey;
  // Convergent ABVD/AIVD (or other co-selected instruments) previously had no
  // single key, so every segment was suppressed. Require the exact same set
  // and versions; this connects recorded categories without a composite score
  // or changing the clinical model's inflection/comparison rules.
  const selected = cell.assessments.filter((item) => item.selectedForDomainState);
  if (selected.length < 2) return undefined;
  return selected.map((item) => `${item.scaleCode}@${item.scaleVersion}`).sort().join("|");
}

/** Presentation shared by HTML and PDF: never interpolate an unmeasured visit. */
export function capacityChartSegments(dimension: CapacityDimensionRow) {
  const segments: Array<{ from: string; to: string; crossesUnassessedVisit: boolean }> = [];
  let previous: CapacityDimensionRow["cells"][number] | undefined;
  let gap = false;
  for (const cell of dimension.cells) {
    if (cell.status === "not-assessed") { if (previous) gap = true; continue; }
    const key = presentationKey(cell);
    if (!["preserved", "attention", "altered"].includes(cell.status) || !key) {
      previous = undefined; gap = false; continue;
    }
    if (previous && presentationKey(previous) === key) {
      segments.push({ from: previous.consultationId, to: cell.consultationId, crossesUnassessedVisit: gap });
    }
    previous = cell; gap = false;
  }
  return segments;
}

/** Keep the true temporal anchor; offset colliding markers only, with a leader. */
export function capacityChartPositions(consultations: readonly { id: string; occurredAt: string }[], start: number, end: number) {
  if (!consultations.length) return [];
  const times = consultations.map((item) => new Date(item.occurredAt).getTime());
  const min = Math.min(...times), max = Math.max(...times);
  const spacing = Math.min(18, (end - start) / Math.max(consultations.length - 1, 1));
  const positions = consultations.map((item, index) => ({ id: item.id, anchor: proportionalAxisPosition({ value: times[index]!, min, max, start, end }), x: 0 }));
  positions.forEach((item, index) => { item.x = Math.max(item.anchor, index ? positions[index - 1]!.x + spacing : start); });
  for (let index = positions.length - 1; index >= 0; index--) {
    positions[index]!.x = Math.min(positions[index]!.x, index === positions.length - 1 ? end : positions[index + 1]!.x - spacing);
  }
  return positions;
}

export function capacityRecordedResults(cell: CapacityDimensionRow["cells"][number]): string[] {
  return cell.assessments.map((item) => {
    const value = item.scoreText?.trim() || (item.scoreNumeric === null || item.scoreNumeric === undefined ? "sem escore numérico" : String(item.scoreNumeric));
    return `${item.scaleName} (${item.scaleVersion}): ${value}${item.classification ? ` · ${item.classification}` : ""}`;
  });
}
