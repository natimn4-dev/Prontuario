import type { DietaryNutrients } from "./dietary-assessment.js";

export type DietaryEnergyCrossCheck = {
  sourceEnergyKcal: number;
  macroEnergyKcal: number;
  differenceKcal: number;
  differencePercent: number | null;
  status: "consistent" | "review";
  note: string;
};

export function crossCheckDietaryEnergy(
  nutrients: Pick<DietaryNutrients, "energyKcal" | "proteinG" | "carbohydratesG" | "fatG">,
  tolerancePercent = 12,
): DietaryEnergyCrossCheck {
  const macroEnergyKcal = nutrients.proteinG * 4 + nutrients.carbohydratesG * 4 + nutrients.fatG * 9;
  const differenceKcal = nutrients.energyKcal - macroEnergyKcal;
  const differencePercent = nutrients.energyKcal > 0
    ? Math.abs(differenceKcal) * 100 / nutrients.energyKcal
    : null;
  const status = differencePercent != null && differencePercent > tolerancePercent ? "review" : "consistent";
  return {
    sourceEnergyKcal: nutrients.energyKcal,
    macroEnergyKcal,
    differenceKcal,
    differencePercent,
    status,
    note: status === "review"
      ? "Diferença relevante entre a energia informada pela fonte e 4P + 4C + 9G. Revise fibra, álcool, polióis, arredondamentos e a compatibilidade da composição selecionada antes de interpretar clinicamente."
      : "A energia informada pela fonte é compatível com a checagem aproximada por macronutrientes dentro da tolerância configurada.",
  };
}

export type DietaryNutrientKey = keyof DietaryNutrients;

export function dietaryNutrientUnit(key: DietaryNutrientKey): "kcal" | "g" | "mg" {
  if (key === "energyKcal") return "kcal";
  if (key === "calciumMg" || key === "sodiumMg") return "mg";
  return "g";
}
