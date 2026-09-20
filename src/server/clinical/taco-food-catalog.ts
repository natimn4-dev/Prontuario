import catalog from "../../data/taco-foods.json" with { type: "json" };
import type { DietaryFoodComposition } from "../../domain/dietary-assessment";

export const TACO_SOURCE_VERSION =
  "TACO 4ª edição revisada e ampliada — NEPA/UNICAMP, 2011";

type TacoFoodRow = {
  id: string;
  description: string;
  category: string;
  nutrientsPer100g: DietaryFoodComposition["nutrientsPer100g"];
};

const rows = catalog as TacoFoodRow[];
const byId = new Map(rows.map((row) => [row.id, row]));

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const composition = (row: TacoFoodRow): DietaryFoodComposition => ({
  provider: "TACO",
  sourceId: row.id,
  description: row.description,
  dataType: row.category,
  sourceVersion: TACO_SOURCE_VERSION,
  nutrientsPer100g: row.nutrientsPer100g,
});

function score(description: string, query: string, tokens: string[]) {
  const value = normalized(description);
  if (value === query) return 1_000;
  if (value.startsWith(`${query} `)) return 900;
  if (tokens.every((token) => value.includes(token)) && value.startsWith(tokens[0]))
    return 850;
  if (value.includes(query)) return 800;
  if (tokens.every((token) => value.includes(token))) return 600;
  return 0;
}

export function searchTacoFoods(
  query: string,
  limit = 8,
): DietaryFoodComposition[] {
  const q = normalized(query).slice(0, 120);
  if (q.length < 2) return [];
  const tokens = q.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return [];
  return rows
    .map((row) => ({ row, score: score(row.description, q, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.row.description.localeCompare(b.row.description, "pt-BR"),
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => composition(entry.row));
}

export function getTacoFood(id: string): DietaryFoodComposition | null {
  const row = byId.get(id);
  return row ? composition(row) : null;
}

export function tacoFoodCount() {
  return rows.length;
}
