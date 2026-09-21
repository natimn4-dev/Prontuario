import type { DietaryFoodComposition } from "../../domain/dietary-assessment";

type CommercialFood = DietaryFoodComposition & { aliases: string[] };

const foods: CommercialFood[] = [
  {
    provider: "MANUFACTURER_LABEL",
    sourceId: "nutren-senior-sem-sabor-po-740g-2026",
    description: "Nutren Senior Sem Sabor — pó",
    dataType: "Suplemento comercial em pó — confirmar apresentação no rótulo",
    sourceVersion:
      "Rótulo oficial Nestlé Nutre consultado em 2026-09-21: porção de 55 g — https://www.nestlenutre.com.br/nutren-senior-po-lata-740g",
    nutrientBasis: "100g",
    nutrientsPer100g: {
      energyKcal: 410.909,
      proteinG: 36.364,
      carbohydratesG: 40,
      fatG: 10.909,
      fiberG: 4,
      calciumMg: 920,
      sodiumMg: 345.455,
    },
    aliases: ["nutren", "nutren senior", "nutren senior sem sabor", "suplemento nutren"],
  },
  {
    provider: "MANUFACTURER_LABEL",
    sourceId: "nutridrink-protein-chocolate-200ml-2026",
    description: "Nutridrink Protein Chocolate — pronto para beber",
    dataType: "Suplemento comercial líquido 200 mL — confirmar sabor e apresentação",
    sourceVersion:
      "Rótulo oficial Mundo Danone consultado em 2026-09-21: composição por 100 mL — https://www.mundodanone.com.br/nutridrink-protein-chocolate-200ml/p",
    nutrientBasis: "100ml",
    nutrientsPer100g: {
      energyKcal: 150,
      proteinG: 9.2,
      carbohydratesG: 17,
      fatG: 5.2,
      fiberG: 0,
      calciumMg: 216,
      sodiumMg: 60,
    },
    aliases: ["nutridrink", "nutridrink protein", "nutridrink chocolate", "suplemento nutridrink"],
  },
];

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const withoutAliases = ({ aliases: _aliases, ...food }: CommercialFood): DietaryFoodComposition => food;

export function searchCommercialFoods(query: string): DietaryFoodComposition[] {
  const q = normalized(query).slice(0, 120);
  if (q.length < 2) return [];
  return foods
    .filter((food) =>
      [food.description, ...food.aliases].some((value) => {
        const candidate = normalized(value);
        return candidate.includes(q) || q.includes(candidate);
      }),
    )
    .map(withoutAliases);
}

export function getCommercialFood(id: string): DietaryFoodComposition | null {
  const food = foods.find((entry) => entry.sourceId === id);
  return food ? withoutAliases(food) : null;
}
