export type StructuredEntryChoice = { value: number | string; label: string };
export type StructuredEntryNumericRule = {
  min: number;
  max: number;
  step: number;
  unit?: string;
  help?: string;
};
export type StructuredEntryField = {
  id: string;
  label: string;
  number?: StructuredEntryNumericRule;
  choices?: readonly StructuredEntryChoice[];
  display?: "checkbox" | "score10";
};
export type StructuredEntryDefinition = {
  code: string;
  fields: readonly StructuredEntryField[];
};
export type StructuredEntryResult<T extends StructuredEntryDefinition> = Omit<T, "fields"> & {
  fields: readonly StructuredEntryField[];
};

const RAW_NUMERIC_ENTRY_CODES = new Set([
  "preensao",
  "velocidade_marcha",
  "sentar_levantar_5x",
  "g8",
  "esas",
]);

function decimalPlaces(value: number): number {
  const text = String(value);
  const index = text.indexOf(".");
  return index === -1 ? 0 : text.length - index - 1;
}

function numericChoices(rule: StructuredEntryNumericRule): StructuredEntryChoice[] {
  const precision = decimalPlaces(rule.step);
  const count = Math.floor(((rule.max - rule.min) / rule.step) + 1e-9);
  const choices: StructuredEntryChoice[] = [];

  for (let index = 0; index <= count; index += 1) {
    const raw = rule.min + (index * rule.step);
    const value = Number(raw.toFixed(precision));
    const label = `${value}${rule.unit ? ` ${rule.unit}` : ""}`;
    choices.push({ value, label });
  }

  const last = choices.at(-1)?.value;
  if (typeof last === "number" && Math.abs(last - rule.max) > 1e-9) {
    choices.push({ value: rule.max, label: `${rule.max}${rule.unit ? ` ${rule.unit}` : ""}` });
  }

  return choices;
}

/**
 * Converte escores numéricos discretos em listas de seleção para a interface clínica.
 *
 * A regra não altera o algoritmo de pontuação: o valor selecionado continua chegando
 * ao servidor como número. Medidas físicas contínuas, campos numéricos estruturais
 * do G8 e os nove itens 0–10 da ESAS permanecem numéricos porque o valor bruto é o
 * dado clínico necessário para o histórico longitudinal.
 *
 * MEEM, MoCA e ISI não passam por este adaptador: seus registros rápidos são anexados
 * separadamente no endpoint e permanecem score-only por regra de licenciamento/UX.
 */
export function withStructuredScaleEntry<T extends StructuredEntryDefinition>(definition: T): StructuredEntryResult<T> {
  if (RAW_NUMERIC_ENTRY_CODES.has(definition.code)) {
    return definition as StructuredEntryResult<T>;
  }

  const fields: readonly StructuredEntryField[] = definition.fields.map((field) => {
    if (!field.number || field.choices) return field;
    return {
      ...field,
      choices: numericChoices(field.number),
    };
  });

  return { ...definition, fields };
}

export function usesContinuousMeasurementEntry(code: string): boolean {
  return RAW_NUMERIC_ENTRY_CODES.has(code);
}
