const FAST_STAGE_LABELS: Readonly<Record<string, string>> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6.1": "6A",
  "6.2": "6B",
  "6.3": "6C",
  "6.4": "6D",
  "6.5": "6E",
  "7.1": "7A",
  "7.2": "7B",
  "7.3": "7C",
  "7.4": "7D",
  "7.5": "7E",
  "7.6": "7F",
};

/** Converts the legacy ordinal encoding to the clinical FAST stage label. */
export function canonicalFastStageLabel(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return FAST_STAGE_LABELS[String(value)];
  }
  if (typeof value !== "string") return undefined;

  const text = value.trim().replace(",", ".");
  const stageCode = text.match(/(?:FAST\s*)?\b([1-7])\s*([a-f])\b/i);
  if (stageCode) return `${stageCode[1]}${stageCode[2]!.toUpperCase()}`;
  return FAST_STAGE_LABELS[text];
}

function explicitFastStageLabel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const stageCode = value.trim().match(/(?:FAST\s*)?\b([1-7])\s*([a-f])\b/i);
  return stageCode ? `${stageCode[1]}${stageCode[2]!.toUpperCase()}` : undefined;
}

/** Formats scores for display while keeping the numeric ordinal for calculations. */
export function displayScaleScore(input: {
  scaleCode: string;
  score?: number | null;
  scoreText?: string | null;
}): string | undefined {
  if (input.scaleCode === "fast") {
    return explicitFastStageLabel(input.scoreText)
      ?? canonicalFastStageLabel(input.score)
      ?? canonicalFastStageLabel(input.scoreText)
      ?? input.scoreText?.trim()
      ?? (input.score == null ? undefined : String(input.score));
  }
  return input.scoreText?.trim() || (input.score == null ? undefined : String(input.score));
}

/** Normalizes a legacy FAST label embedded in a classification for display. */
export function canonicalFastClassification(
  value: string | null | undefined,
  input: { score?: number | null; scoreText?: string | null },
): string | undefined {
  const classification = value?.trim();
  if (!classification) return undefined;
  const stage = displayScaleScore({ scaleCode: "fast", ...input });
  if (!stage) return classification;
  return classification.replace(
    /\bFAST\s+[1-7](?:\s*[.,]\s*[1-6]|\s*[A-F])\b/gi,
    `FAST ${stage}`,
  );
}
