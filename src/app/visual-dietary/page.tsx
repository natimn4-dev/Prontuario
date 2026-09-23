"use client";

import { useEffect, useState } from "react";
import { DietaryAssessmentWorkspace } from "@/components/dietary/dietary-assessment-workspace";
import {
  DEFAULT_MEALS,
  buildDietaryOrientation,
  buildDietaryPriorities,
  buildProteinComparison,
  nutrientsForGrams,
  portionMetadata,
  summarizeDietaryAssessment,
  type DietaryAssessmentInput,
  type DietaryAssessmentSnapshot,
  type DietaryClinicalContext,
  type DietaryConfirmedMeal,
  type DietaryFoodDraft,
  type DietaryFoodComposition,
} from "@/domain/dietary-assessment";

const previewFood: DietaryFoodComposition = {
  provider: "TBCA",
  sourceId: "preview-chicken-breast",
  description: "Frango grelhado sem pele (demonstração)",
  dataType: "Alimento sintético para inspeção visual",
  sourceVersion: "preview-only",
  nutrientsPer100g: {
    energyKcal: 165,
    proteinG: 31,
    carbohydratesG: 0,
    fatG: 3.6,
    fiberG: 0,
    calciumMg: 15,
    sodiumMg: 74,
  },
};

const previewRice: DietaryFoodComposition = {
  provider: "TBCA",
  sourceId: "preview-rice",
  description: "Arroz cozido (demonstração)",
  dataType: "Alimento sintético para inspeção visual",
  sourceVersion: "preview-only",
  nutrientsPer100g: {
    energyKcal: 130,
    proteinG: 2.7,
    carbohydratesG: 28.2,
    fatG: 0.3,
    fiberG: 1.6,
    calciumMg: 10,
    sodiumMg: 1,
  },
};

const previewContext: DietaryClinicalContext = {
  ageYears: 78,
  sex: "feminino",
  weightKg: 62,
  weightSource: "clinician",
  ckd: true,
  renalEgfrMlMinPer1_73: 38,
  diabetes: false,
  sarcopenia: true,
};

function createPreviewSnapshot(): DietaryAssessmentSnapshot {
  const chickenGrams = 90;
  const riceGrams = 120;
  const chicken = {
    id: "preview-chicken",
    label: previewFood.description,
    quantity: chickenGrams,
    measure: "g" as const,
    grams: chickenGrams,
    gramsSource: "direct-grams" as const,
    estimated: false,
    quantitySource: "peso informado" as const,
    uncertainty: "baixa" as const,
    food: previewFood,
    qualityFlags: ["whole-food" as const],
    composition: previewFood,
    nutrients: nutrientsForGrams(previewFood.nutrientsPer100g, chickenGrams),
  };
  const rice = {
    id: "preview-rice",
    label: previewRice.description,
    quantity: riceGrams,
    measure: "g" as const,
    grams: riceGrams,
    gramsSource: "direct-grams" as const,
    estimated: false,
    quantitySource: "peso informado" as const,
    uncertainty: "baixa" as const,
    food: previewRice,
    qualityFlags: ["whole-food" as const],
    composition: previewRice,
    nutrients: nutrientsForGrams(previewRice.nutrientsPer100g, riceGrams),
  };
  const meals: DietaryConfirmedMeal[] = DEFAULT_MEALS.map((meal) => ({
    ...meal,
    items: meal.id === "lunch" ? [chicken, rice] : [],
  }));
  const targets = {
    proteinGPerKgMin: 0.8,
    proteinGPerKgMax: 1,
    calciumMg: 1200,
    fiberG: 21,
    proteinTargetSource: "reference-suggestion" as const,
    proteinTargetReference: "DRC G3b — referência inicial; revisar risco nutricional",
  };
  const summarized = summarizeDietaryAssessment(meals, previewContext.weightKg);
  const proteinComparison = buildProteinComparison(
    summarized.summary,
    targets,
    previewContext,
  );
  const priorities = buildDietaryPriorities({
    summary: summarized.summary,
    proteinByMeal: summarized.proteinByMeal,
    targets,
    context: previewContext,
    meals,
  });
  const orientation = buildDietaryOrientation({
    priorities,
    context: previewContext,
    meals,
    summary: summarized.summary,
  });
  return {
    schemaVersion: "dietary-assessment-v1",
    meals,
    targets,
    clinicalContext: previewContext,
    summary: summarized.summary,
    proteinByMeal: summarized.proteinByMeal,
    proteinComparison,
    priorities,
    generatedOrientation: orientation,
    orientationDraft: orientation,
    orientationReviewed: false,
    includeInReport: false,
    includeInSoap: false,
    confirmedBy: { userId: "preview-user", name: "Paciente sintética" },
    confirmedAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
    ruleTrace: [],
    assessmentStatus: "DRAFT",
    conditionalGuidance: [],
  };
}

function previewPayload() {
  const assessment = createPreviewSnapshot();
  return {
    consultationId: "preview-consultation",
    status: "DRAFT",
    updatedAt: assessment.updatedAt,
    clinicalContext: previewContext,
    references: { calciumMg: 1200, fiberG: 21 },
    assessment,
    history: [],
  };
}

function previewPayloadFromInput(
  previous: ReturnType<typeof previewPayload>,
  input: DietaryAssessmentInput,
) {
  if (!previous.assessment) return previous;
  const meals = input.meals.map((meal) => ({
    ...meal,
    items: meal.items.map((item) => {
      const withComposition = item as DietaryFoodDraft & {
        composition?: DietaryFoodComposition | null;
      };
      const composition = withComposition.composition ?? null;
      const grams = item.measure === "g" ? item.quantity : item.grams;
      return {
        ...item,
        grams: grams ?? null,
        ...portionMetadata(item.measure, grams ?? null),
        composition,
        nutrients:
          composition && grams != null && grams > 0
            ? nutrientsForGrams(composition.nutrientsPer100g, grams)
            : null,
      };
    }),
  })) as DietaryConfirmedMeal[];
  const summarized = summarizeDietaryAssessment(
    meals,
    input.clinicalContext.weightKg,
  );
  const updatedAt = new Date().toISOString();
  const assessment = {
    ...previous.assessment,
    meals,
    targets: input.targets,
    clinicalContext: input.clinicalContext,
    ...(input.entryDraft ? { entryDraft: input.entryDraft } : {}),
    summary: summarized.summary,
    proteinByMeal: summarized.proteinByMeal,
    proteinComparison: buildProteinComparison(
      summarized.summary,
      input.targets,
      input.clinicalContext,
    ),
    orientationDraft:
      input.orientationDraft ?? previous.assessment.orientationDraft,
    orientationReviewed: Boolean(input.orientationReviewed),
    includeInReport: Boolean(input.includeInReport),
    includeInSoap: Boolean(input.includeInSoap),
    updatedAt,
  };
  return { ...previous, updatedAt, assessment };
}

const searchResults = (query: string) => {
  const normalized = query.toLowerCase();
  const foods = [previewFood, previewRice];
  return foods.filter((food) =>
    `${food.description} ${food.sourceId}`.toLowerCase().includes(normalized),
  );
};

export default function VisualDietaryPreviewPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let payload = previewPayload();
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      if (url.endsWith("/dietary-assessment") && !init?.method) {
        return new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/dietary-assessment/foods")) {
        const query = new URL(url, window.location.origin).searchParams.get("q") ?? "";
        return new Response(JSON.stringify({ foods: searchResults(query) }), {
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/dietary-assessment") && init?.method === "PUT") {
        const body =
          typeof init.body === "string"
            ? (JSON.parse(init.body) as { assessment?: DietaryAssessmentInput })
            : null;
        if (body?.assessment) {
          payload = previewPayloadFromInput(payload, body.assessment);
        }
        return new Response(JSON.stringify(payload), {
          headers: { "content-type": "application/json" },
        });
      }
      return originalFetch(input, init);
    };
    setReady(true);
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (!ready) {
    return <main style={{ padding: 32 }}>Preparando inspeção visual…</main>;
  }

  return (
    <main>
      <DietaryAssessmentWorkspace
        consultationId="preview-consultation"
        patientName="Paciente sintética · somente demonstração"
      />
    </main>
  );
}
