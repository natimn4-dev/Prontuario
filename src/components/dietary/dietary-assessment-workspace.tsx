"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_MEALS,
  HOUSEHOLD_MEASURES,
  confirmDietaryDraftItem,
  dietarySnapshotNeedsRuleReview,
  nutrientsForGrams,
  parseDietaryNaturalLanguage,
  portionMetadata,
  renalProteinReference,
  roundForDisplay,
  summarizeDietaryAssessment,
  type DietaryAssessmentInput,
  type DietaryAssessmentSnapshot,
  type DietaryClinicalContext,
  type DietaryFoodDraft,
  type DietaryFoodComposition,
  type DietaryFoodItem,
  type DietaryMeal,
  type DietaryTargets,
  type HouseholdMeasure,
} from "@/domain/dietary-assessment";
import { DIETARY_PORTION_DEFINITIONS } from "@/domain/dietary-guidance";
import { crossCheckDietaryEnergy } from "@/domain/dietary-assessment-quality";
import { CLINICAL_RELEASE_ID } from "@/domain/clinical-release";
import styles from "./dietary-assessment-workspace.module.css";

type UiDietaryItem = DietaryFoodDraft & {
  observation?: string;
  composition?: DietaryFoodComposition | null;
  nutrients?: DietaryFoodItem["nutrients"];
};
type UiDietaryMeal = Omit<DietaryMeal, "items"> & { items: UiDietaryItem[] };
type FoodResult = DietaryFoodComposition;
type LoadPayload = {
  consultationId: string;
  status: string;
  updatedAt: string;
  clinicalContext: DietaryClinicalContext;
  references: { calciumMg: number | null; fiberG: number | null };
  assessment: DietaryAssessmentSnapshot | null;
  history: Array<{
    occurredAt: string;
    summary: DietaryAssessmentSnapshot["summary"];
  }>;
};
type TargetKey = keyof Pick<
  DietaryTargets,
  | "energyKcalPerKgMin"
  | "energyKcalPerKgMax"
  | "proteinGPerKgMin"
  | "proteinGPerKgMax"
  | "calciumMg"
  | "fiberG"
>;

const MEASURE_LABELS: Record<HouseholdMeasure, string> = {
  g: "g — peso informado",
  ml: "mL — volume informado",
  "colher-cha": "colher de chá — confirmar",
  "colher-sobremesa": "colher de sobremesa — confirmar",
  "colher-sopa": "colher de sopa — confirmar",
  concha: "concha — confirmar",
  escumadeira: "escumadeira — confirmar",
  xicara: "xícara — confirmar",
  copo: "copo — confirmar",
  prato: "prato — descrever",
  fatia: "fatia — confirmar",
  unidade: "unidade — confirmar",
  porcao: "porção — descrever",
  file: "filé — confirmar peso",
  bife: "bife — confirmar peso",
  pedaco: "pedaço — confirmar corte",
  "palma-mao": "palma da mão — estimativa",
  "file-pequeno": "filé pequeno — estimativa",
  "file-medio": "filé médio — estimativa",
  "file-grande": "filé grande — estimativa",
};
const freshMeals = (): UiDietaryMeal[] =>
  DEFAULT_MEALS.map((meal) => ({ ...meal, items: [] }));
const draftMeals = (
  snapshot: DietaryAssessmentSnapshot | null,
): UiDietaryMeal[] =>
  snapshot
    ? snapshot.meals.map((meal) => ({
        id: meal.id,
        label: meal.label,
        items: meal.items.map((item) => ({
          ...item,
          observation: (item as UiDietaryItem).observation,
        })),
      }))
    : freshMeals();
const numberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};
const nonNegativeNumberOrNull = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const format = (value: number | null | undefined, digits = 1) => {
  const rounded = value == null ? null : roundForDisplay(value, digits);
  return rounded == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(rounded);
};
const portionNutrients = (
  composition: DietaryFoodComposition | null | undefined,
  grams: number | null | undefined,
) =>
  composition && grams
    ? nutrientsForGrams(composition.nutrientsPer100g, grams)
    : null;
function PortionNutrientLine({
  composition,
  grams,
}: {
  composition?: DietaryFoodComposition | null;
  grams?: number | null;
}) {
  const nutrients = portionNutrients(composition, grams);
  return nutrients ? (
    <small className={styles.itemNutrients}>
      {format(nutrients.energyKcal, 0)} kcal · P {format(nutrients.proteinG, 1)}{" "}
      g · C {format(nutrients.carbohydratesG, 1)} g · G{" "}
      {format(nutrients.fatG, 1)} g · Ca {format(nutrients.calciumMg, 0)} mg
    </small>
  ) : null;
}
const targetValue = (targets: DietaryTargets, key: TargetKey) =>
  targets[key] == null ? "" : String(targets[key]);
const weightSourceLabel = (source: DietaryClinicalContext["weightSource"]) =>
  source === "clinician"
    ? "confirmado pelo médico"
    : source === "program55"
      ? "bioimpedância/Programa 55+"
      : "não informado";
const uncertaintyLabel = (value?: string) =>
  value ? `incerteza ${value}` : "incerteza não classificada";

function contextLabels(context: DietaryClinicalContext | null) {
  if (!context) return [];
  return [
    context.ckd && "Doença renal crônica",
    context.diabetes && "Diabetes",
    context.sarcopenia && "Sarcopenia",
    context.frailty && "Fragilidade",
    context.malnutrition && "Desnutrição",
    context.involuntaryWeightLoss && "Perda de peso",
    context.acuteIllness && "Doença aguda",
    context.cancer && "Câncer",
    context.dementia && "Demência",
    context.dysphagia && "Disfagia",
  ].filter(Boolean) as string[];
}

export function DietaryAssessmentWorkspace({
  consultationId,
  patientName,
  onDirtyChange,
}: {
  consultationId: string;
  patientName?: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [data, setData] = useState<LoadPayload | null>(null);
  const [meals, setMeals] = useState<UiDietaryMeal[]>(freshMeals);
  const [targets, setTargets] = useState<DietaryTargets>({});
  const [weightOverride, setWeightOverride] = useState("");
  const [renalEgfr, setRenalEgfr] = useState("");
  const [renalDialysis, setRenalDialysis] = useState(false);
  const [dialysisModality, setDialysisModality] =
    useState<DietaryClinicalContext["renalDialysisModality"]>(null);
  const [renalVeryLowProteinDiet, setRenalVeryLowProteinDiet] = useState(false);
  const [vlpdConfirmed, setVlpdConfirmed] = useState(false);
  const [malnutrition, setMalnutrition] = useState(false);
  const [involuntaryWeightLoss, setInvoluntaryWeightLoss] = useState(false);
  const [acuteIllness, setAcuteIllness] = useState(false);
  const [renalPotassium, setRenalPotassium] = useState("");
  const [renalPhosphorus, setRenalPhosphorus] = useState("");
  const [bicarbonate, setBicarbonate] = useState("");
  const [appetiteReduced, setAppetiteReduced] = useState(false);
  const [reducedIntake, setReducedIntake] = useState(false);
  const [hydrationMl, setHydrationMl] = useState("");
  const [edema, setEdema] = useState(false);
  const [heartFailure, setHeartFailure] = useState(false);
  const [reducedUrineOutput, setReducedUrineOutput] = useState(false);
  const [hyponatremia, setHyponatremia] = useState(false);
  const [orientationDraft, setOrientationDraft] = useState("");
  const [orientationReviewed, setOrientationReviewed] = useState(false);
  const [includeInSoap, setIncludeInSoap] = useState(false);
  const [includeInReport, setIncludeInReport] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [mealId, setMealId] = useState("lunch");
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState<FoodResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [measure, setMeasure] = useState<HouseholdMeasure>("g");
  const [grams, setGrams] = useState("");
  const [observation, setObservation] = useState("");
  const [qualityFlags, setQualityFlags] = useState<
    UiDietaryItem["qualityFlags"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [foodSearchAttempted, setFoodSearchAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const foodSearchController = useRef<AbortController | null>(null);
  const parsedPhrases = useMemo(
    () => parseDietaryNaturalLanguage(freeText),
    [freeText],
  );
  const assessment = data?.assessment ?? null;
  const snapshotNeedsReview = dietarySnapshotNeedsRuleReview(assessment);
  const renalContext: DietaryClinicalContext = {
    ...(data?.clinicalContext ?? {}),
    renalEgfrMlMinPer1_73: nonNegativeNumberOrNull(renalEgfr),
    renalDialysis,
    renalDialysisModality: dialysisModality,
    renalVeryLowProteinDiet,
    renalVeryLowProteinDietConfirmed: vlpdConfirmed,
    malnutrition,
    involuntaryWeightLoss,
    acuteIllness,
    renalPotassiumMmolL: nonNegativeNumberOrNull(renalPotassium),
    renalPhosphorusMgDl: nonNegativeNumberOrNull(renalPhosphorus),
    serumBicarbonateMmolL: nonNegativeNumberOrNull(bicarbonate),
    appetiteReduced,
    reducedIntake,
    hydrationMl: nonNegativeNumberOrNull(hydrationMl),
    edema,
    heartFailure,
    reducedUrineOutput,
    hyponatremia,
  };
  const renalReference = useMemo(
    () => renalProteinReference(renalContext),
    [
      data?.clinicalContext,
      renalEgfr,
      renalDialysis,
      dialysisModality,
      renalVeryLowProteinDiet,
      vlpdConfirmed,
      malnutrition,
      involuntaryWeightLoss,
      acuteIllness,
    ],
  );
  const activeContexts = contextLabels(renalContext);
  const totalItems = meals.reduce((sum, meal) => sum + meal.items.length, 0);
  const comparison = assessment?.proteinComparison;
  const isFinalized = data?.status === "FINALIZED";
  const draftCalculation = useMemo(
    () =>
      summarizeDietaryAssessment(
        meals.map((meal) => ({
          ...meal,
          items: meal.items.map((item) => ({
            ...item,
            composition: item.composition ?? null,
            nutrients:
              item.composition && item.grams != null
                ? nutrientsForGrams(
                    item.composition.nutrientsPer100g,
                    item.grams,
                  )
                : item.nutrients ?? null,
          })),
        })),
        renalContext.weightKg,
      ),
    [meals, renalContext.weightKg],
  );
  const displayedSummary = assessment
    ? dirty
      ? draftCalculation.summary
      : assessment.summary
    : dirty && totalItems
      ? draftCalculation.summary
      : null;
  const displayedItems: Array<
    Pick<
      DietaryFoodDraft,
      "id" | "label" | "quantity" | "measure" | "grams" | "uncertainty"
    >
  > = dirty
    ? meals.flatMap((meal) => meal.items).map((item) => ({
        id: item.id,
        label: item.label,
        quantity: item.quantity,
        measure: item.measure,
        grams: item.grams,
        uncertainty: item.uncertainty,
      }))
    : (assessment?.meals.flatMap((meal) => meal.items) ?? []).map((item) => ({
        id: item.id,
        label: item.label,
        quantity: item.quantity,
        measure: item.measure,
        grams: item.grams,
        uncertainty: item.uncertainty,
      }));
  const energyCheck = displayedSummary
    ? crossCheckDietaryEnergy(displayedSummary)
    : null;
  const previewGrams =
    measure === "g" ? numberOrNull(quantity) : numberOrNull(grams);
  const selectedNutrients = portionNutrients(selectedFood, previewGrams);
  const mark = () => setDirty(true);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/dietary-assessment`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as LoadPayload & { error?: string };
      if (!response.ok)
        throw new Error(
          body.error ?? "Não foi possível carregar a avaliação alimentar.",
        );
      const saved = body.assessment?.clinicalContext;
      const nextMeals = draftMeals(body.assessment);
      setData(body);
      setMeals(nextMeals);
      setMealId((current) =>
        nextMeals.some((meal) => meal.id === current)
          ? current
          : (nextMeals[0]?.id ?? "lunch"),
      );
      setTargets(body.assessment?.targets ?? {});
      setDirty(false);
      setWeightOverride(
        saved?.weightSource === "clinician" && saved.weightKg
          ? String(saved.weightKg)
          : "",
      );
      setRenalEgfr(
        saved?.renalEgfrMlMinPer1_73 == null
          ? ""
          : String(saved.renalEgfrMlMinPer1_73),
      );
      setRenalDialysis(Boolean(saved?.renalDialysis));
      setDialysisModality(saved?.renalDialysisModality ?? null);
      setRenalVeryLowProteinDiet(Boolean(saved?.renalVeryLowProteinDiet));
      setVlpdConfirmed(Boolean(saved?.renalVeryLowProteinDietConfirmed));
      setMalnutrition(
        Boolean(saved?.malnutrition ?? body.clinicalContext.malnutrition),
      );
      setInvoluntaryWeightLoss(
        Boolean(
          saved?.involuntaryWeightLoss ??
            body.clinicalContext.involuntaryWeightLoss,
        ),
      );
      setAcuteIllness(Boolean(saved?.acuteIllness));
      setRenalPotassium(
        saved?.renalPotassiumMmolL == null
          ? ""
          : String(saved.renalPotassiumMmolL),
      );
      setRenalPhosphorus(
        saved?.renalPhosphorusMgDl == null
          ? ""
          : String(saved.renalPhosphorusMgDl),
      );
      setBicarbonate(
        saved?.serumBicarbonateMmolL == null
          ? ""
          : String(saved.serumBicarbonateMmolL),
      );
      setAppetiteReduced(Boolean(saved?.appetiteReduced));
      setReducedIntake(Boolean(saved?.reducedIntake));
      setHydrationMl(
        saved?.hydrationMl == null ? "" : String(saved.hydrationMl),
      );
      setEdema(Boolean(saved?.edema));
      setHeartFailure(Boolean(saved?.heartFailure));
      setReducedUrineOutput(Boolean(saved?.reducedUrineOutput));
      setHyponatremia(Boolean(saved?.hyponatremia));
      setOrientationDraft(body.assessment?.orientationDraft ?? "");
      setOrientationReviewed(Boolean(body.assessment?.orientationReviewed));
      setIncludeInSoap(Boolean(body.assessment?.includeInSoap));
      setIncludeInReport(Boolean(body.assessment?.includeInReport));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao carregar avaliação alimentar.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [consultationId]);
  useEffect(() => {
    const trimmed = foodQuery.trim();
    if (trimmed.length < 2) {
      foodSearchController.current?.abort();
      setFoodResults([]);
      setFoodSearchAttempted(false);
      setSelectedFood(null);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(() => void searchFoods(trimmed), 450);
    return () => window.clearTimeout(timer);
  }, [foodQuery, consultationId]);
  useEffect(() => () => foodSearchController.current?.abort(), []);
  useEffect(() => {
    if (!dirty || !data || loading || saving || isFinalized) return;
    const timer = window.setTimeout(() => void save({ silent: true }), 1200);
    return () => window.clearTimeout(timer);
  }, [
    dirty,
    data,
    loading,
    saving,
    isFinalized,
    meals,
    targets,
    weightOverride,
    renalEgfr,
    renalDialysis,
    dialysisModality,
    renalVeryLowProteinDiet,
    vlpdConfirmed,
    malnutrition,
    involuntaryWeightLoss,
    acuteIllness,
    renalPotassium,
    renalPhosphorus,
    bicarbonate,
    appetiteReduced,
    reducedIntake,
    hydrationMl,
    edema,
    heartFailure,
    reducedUrineOutput,
    hyponatremia,
    orientationDraft,
    orientationReviewed,
    includeInSoap,
    includeInReport,
  ]);
  function patchTarget(key: TargetKey, value: string) {
    mark();
    setTargets((current) => ({
      ...current,
      [key]: numberOrNull(value),
      ...(key.startsWith("protein")
        ? {
            proteinTargetSource: "clinician-manual" as const,
            proteinTargetReference: null,
          }
        : {}),
    }));
  }
  function applyRenalReference() {
    if (
      renalReference?.proteinGPerKgMin == null ||
      renalReference.proteinGPerKgMax == null
    )
      return;
    mark();
    setTargets((current) => ({
      ...current,
      proteinGPerKgMin: renalReference.proteinGPerKgMin,
      proteinGPerKgMax: renalReference.proteinGPerKgMax,
      proteinTargetSource: "reference-suggestion",
      proteinTargetReference: renalReference.label,
    }));
  }
  function patchItem(
    targetMealId: string,
    itemId: string,
    patch: Partial<UiDietaryItem>,
  ) {
    mark();
    setMeals((current) =>
      current.map((meal) =>
        meal.id !== targetMealId
          ? meal
          : {
              ...meal,
              items: meal.items.map((item) => {
                if (item.id !== itemId) return item;
                const next = { ...item, ...patch };
                if (patch.measure === "g") next.grams = next.quantity;
                if (patch.measure && patch.measure !== "g") next.grams = null;
                if (patch.quantity != null && next.measure === "g")
                  next.grams = patch.quantity;
                return {
                  ...next,
                  ...portionMetadata(next.measure, next.grams ?? null),
                };
              }),
            },
      ),
    );
  }
  function removeItem(targetMealId: string, itemId: string) {
    mark();
    setMeals((current) =>
      current.map((meal) =>
        meal.id === targetMealId
          ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) }
          : meal,
      ),
    );
  }
  async function searchFoods(query = foodQuery) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    foodSearchController.current?.abort();
    const controller = new AbortController();
    foodSearchController.current = controller;
    setSearching(true);
    setFoodSearchAttempted(false);
    setError(null);
    setSelectedFood(null);
    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/dietary-assessment/foods?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store", signal: controller.signal },
      );
      const body = (await response.json()) as {
        foods?: FoodResult[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "A base de alimentos não respondeu.");
      if (!controller.signal.aborted) {
        setFoodResults(body.foods ?? []);
        setFoodSearchAttempted(true);
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(
        cause instanceof Error ? cause.message : "Falha ao buscar alimentos.",
      );
    } finally {
      if (foodSearchController.current === controller) {
        foodSearchController.current = null;
        setSearching(false);
      }
    }
  }
  async function useParsedPhrase(index: number) {
    const parsed = parsedPhrases[index];
    if (!parsed) return;
    setQuantity(parsed.quantity == null ? "" : String(parsed.quantity));
    setMeasure(parsed.measure ?? "g");
    setGrams("");
    setFoodQuery(parsed.foodQuery);
    if (parsed.foodQuery.length >= 2) await searchFoods(parsed.foodQuery);
  }
  function addFood() {
    setError(null);
    if (!selectedFood)
      return setError(
        "Selecione a correspondência do alimento antes de adicionar.",
      );
    const parsedQuantity = numberOrNull(quantity);
    if (!parsedQuantity)
      return setError(
        "Informe uma quantidade válida; dados ausentes não são convertidos em zero.",
      );
    const targetMealId =
      meals.find((meal) => meal.id === mealId)?.id ?? meals[0]?.id;
    if (!targetMealId)
      return setError("Nenhuma refeição disponível para receber o alimento.");
    const draft: DietaryFoodDraft = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      label: selectedFood.description,
      quantity: parsedQuantity,
      measure,
      grams: measure === "g" ? parsedQuantity : numberOrNull(grams),
      gramsSource: null,
      estimated: false,
      food: {
        provider: selectedFood.provider,
        sourceId: selectedFood.sourceId,
        description: selectedFood.description,
        dataType: selectedFood.dataType,
      },
      qualityFlags,
    };
    const item: UiDietaryItem = {
      ...confirmDietaryDraftItem(draft, selectedFood),
      observation: observation.trim() || undefined,
    };
    mark();
    setMealId(targetMealId);
    setMeals((current) =>
      current.map((meal) =>
        meal.id === targetMealId
          ? { ...meal, items: [...meal.items, item] }
          : meal,
      ),
    );
    setSelectedFood(null);
    setFoodResults([]);
    setFoodQuery("");
    setQuantity("");
    setMeasure("g");
    setGrams("");
    setObservation("");
    setQualityFlags([]);
  }
  async function save(options: { silent?: boolean } = {}) {
    if (!data) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const clinicianWeight = numberOrNull(weightOverride);
    const clinicalContext: DietaryClinicalContext = {
      ...data.clinicalContext,
      weightKg: clinicianWeight ?? data.clinicalContext.weightKg,
      weightSource: clinicianWeight
        ? "clinician"
        : data.clinicalContext.weightSource,
      renalEgfrMlMinPer1_73: nonNegativeNumberOrNull(renalEgfr),
      renalDialysis,
      renalDialysisModality: renalDialysis ? dialysisModality : null,
      renalVeryLowProteinDiet,
      renalVeryLowProteinDietConfirmed: vlpdConfirmed,
      malnutrition,
      involuntaryWeightLoss,
      acuteIllness,
      renalPotassiumMmolL: nonNegativeNumberOrNull(renalPotassium),
      renalPhosphorusMgDl: nonNegativeNumberOrNull(renalPhosphorus),
      serumBicarbonateMmolL: nonNegativeNumberOrNull(bicarbonate),
      appetiteReduced,
      reducedIntake,
      hydrationMl: nonNegativeNumberOrNull(hydrationMl),
      edema,
      heartFailure,
      reducedUrineOutput,
      hyponatremia,
    };
    const payload: DietaryAssessmentInput = {
      schemaVersion: "dietary-assessment-v1",
      meals: meals as DietaryMeal[],
      targets,
      clinicalContext,
      orientationDraft,
      orientationReviewed,
      includeInSoap,
      includeInReport,
    };
    try {
      const response = await fetch(
        `/api/consultations/${consultationId}/dietary-assessment`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            expectedUpdatedAt: data.updatedAt,
            assessment: payload,
          }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        consultationId?: string;
        updatedAt?: string;
        assessment?: DietaryAssessmentSnapshot;
      };
      if (!response.ok)
        throw new Error(
          body.error ?? "Não foi possível salvar a avaliação alimentar.",
        );
      setDirty(false);
      if (body.assessment && body.updatedAt && body.consultationId) {
        setData((current) => current ? {
          ...current,
          consultationId: body.consultationId!,
          updatedAt: body.updatedAt!,
          clinicalContext: body.assessment!.clinicalContext,
          assessment: body.assessment!,
        } : current);
      }
      if (!options.silent)
        setMessage("Avaliação salva e recalculada no servidor.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao salvar avaliação alimentar.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function copySummary() {
    if (!assessment) return;
    const text = [
      "AVALIAÇÃO ALIMENTAR — estimativa a partir do relato",
      `Proteína: ${format(assessment.summary.proteinG, 1)} g (${format(assessment.summary.proteinGPerKg, 2)} g/kg/d)`,
      `Cálcio: ${format(assessment.summary.calciumMg, 0)} mg`,
      `Carboidratos: ${format(assessment.summary.carbohydratesG, 1)} g`,
      "",
      assessment.orientationDraft || assessment.generatedOrientation,
      "",
      "Resultado estimado; revisar porções e contexto antes de usar clinicamente.",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setMessage("Síntese copiada.");
  }
  function continueToNextStep() {
    if (step === 1 && totalItems === 0) {
      setError("Adicione pelo menos um alimento antes de conferir porções e preparo.");
      return;
    }
    setError(null);
    setStep((current) => (current + 1) as 1 | 2 | 3 | 4);
  }
  if (loading)
    return (
      <div className={styles.loading} role="status">
        Carregando avaliação alimentar…
      </div>
    );
  const steps = [
    { id: 1 as const, label: "Registrar", hint: "Alimentos do dia" },
    { id: 2 as const, label: "Conferir", hint: "Porções e preparo" },
    { id: 3 as const, label: "Contextualizar", hint: "Condições e metas" },
    { id: 4 as const, label: "Revisar", hint: "Resultado e orientação" },
  ];
  const statusLabel =
    assessment?.assessmentStatus === "IN_REVIEW"
      ? "Em revisão"
      : assessment?.assessmentStatus === "DRAFT"
        ? "Rascunho"
        : assessment
          ? "Registrada"
          : "Não iniciada";
  const currentStep = steps[step - 1];
  return (
    <div
      className={styles.workspace}
      data-calculator-release={CLINICAL_RELEASE_ID}
    >
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.eyebrow}>Avaliação alimentar clínica</span>
          <h3>Calculadora alimentar</h3>
          <p className={styles.patientContext}>
            Paciente:{" "}
            <strong>
              {patientName ?? "Identificação vinculada à consulta"}
            </strong>
          </p>
          <p className={styles.lede}>
            Quatro etapas curtas para registrar o consumo, conferir porções e
            revisar a orientação.
          </p>
          <span className={styles.releaseTag}>
            Interface {CLINICAL_RELEASE_ID}
          </span>
        </div>
        <div className={styles.headerMeta}>
          <strong>{statusLabel}</strong>
          <span>
            {totalItems} alimento{totalItems === 1 ? "" : "s"} registrado
            {totalItems === 1 ? "" : "s"}
          </span>
          <span>
            {data?.clinicalContext.weightKg
              ? `Peso: ${format(data.clinicalContext.weightKg, 1)} kg`
              : "Peso não informado"}
          </span>
        </div>
      </header>
      {snapshotNeedsReview ? (
        <div className={styles.legacyNotice} role="status">
          <div>
            <strong>Registro anterior às regras atuais</strong>
            <span>
              O histórico está preservado. Recalcule apenas após revisar o
              relato e confirmar a atualização.
            </span>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || isFinalized}
          >
            {saving ? "Atualizando…" : "Recalcular com regras atuais"}
          </button>
        </div>
      ) : null}
      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className={styles.success} role="status">
          {message}
        </div>
      ) : null}
      <section
        className={styles.progressPanel}
        aria-label={`Etapa ${step} de 4`}
      >
        <div>
          <span>Etapa {step} de 4</span>
          <strong>{currentStep.label}</strong>
          <small>{currentStep.hint}</small>
        </div>
        <progress value={step} max={4}>
          {step} de 4
        </progress>
      </section>
      <nav
        className={styles.stepper}
        aria-label="Etapas da avaliação alimentar"
      >
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            className={step === item.id ? styles.stepActive : undefined}
            aria-current={step === item.id ? "step" : undefined}
            onClick={() => setStep(item.id)}
          >
            <span>{item.id}</span>
            <strong>{item.label}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </nav>
      <div className={styles.saveBar}>
        <span>
          {dirty
            ? "Há alterações ainda não salvas."
            : `${totalItems} alimento${totalItems === 1 ? "" : "s"} no registro.`}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || isFinalized}
        >
          {saving
            ? "Salvando…"
            : isFinalized
              ? "Consulta finalizada"
              : assessment
                ? "Salvar e recalcular"
                : "Salvar avaliação"}
        </button>
      </div>
      <div className={styles.contentGrid}>
        <main className={styles.mainContent}>
          {step === 1 ? (
            <section
              className={styles.card}
              aria-labelledby="dietary-entry-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span>1</span>
                  <h4 id="dietary-entry-title">
                    O que a paciente consumiu neste dia
                  </h4>
                </div>
                <small>Adicione um alimento por vez.</small>
              </div>
              <div className={styles.instruction}>
                <strong>Escolha a refeição e procure o alimento</strong>
                <p>Depois confirme a quantidade e a medida usada no relato.</p>
              </div>
              <div
                className={styles.mealChoice}
                role="group"
                aria-label="Escolha a refeição"
              >
                {meals.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    className={
                      mealId === meal.id ? styles.mealSelected : undefined
                    }
                    aria-pressed={mealId === meal.id}
                    onClick={() => setMealId(meal.id)}
                  >
                    <strong>{meal.label}</strong>
                    <span>
                      {meal.items.length
                        ? `${meal.items.length} item${meal.items.length === 1 ? "" : "s"}`
                        : "vazia"}
                    </span>
                  </button>
                ))}
              </div>
              <label className={styles.foodSearch}>
                Qual alimento foi consumido{" "}
                <small>busca automática após digitar</small>
                <div className={styles.inline}>
                  <input
                    value={foodQuery}
                    onChange={(event) => {
                      setFoodQuery(event.target.value);
                      setFoodSearchAttempted(false);
                      setSelectedFood(null);
                    }}
                    placeholder="Ex.: ovo, arroz cozido, frango…"
                  />
                  <button
                    type="button"
                    onClick={() => void searchFoods()}
                    disabled={searching}
                  >
                    {searching ? "Buscando…" : "Buscar"}
                  </button>
                </div>
              </label>
              {foodResults.length ? (
                <div
                  className={styles.searchResults}
                  aria-label="Resultados da busca de alimentos"
                >
                  {foodResults.map((food) => (
                    <button
                      key={`${food.provider}-${food.sourceId}`}
                      type="button"
                      className={
                        selectedFood?.sourceId === food.sourceId
                          ? styles.selected
                          : undefined
                      }
                      onClick={() => setSelectedFood(food)}
                    >
                      <strong>{food.description}</strong>
                      <span>
                        {food.provider === "TACO"
                          ? "TACO — NEPA/UNICAMP"
                          : food.provider === "USDA_FDC"
                            ? "USDA FoodData Central"
                            : "TBCA"}{" "}
                        · {food.dataType ?? "tipo não informado"}
                      </span>
                      <span className={styles.nutrientLine}>
                        Por 100 g: {format(food.nutrientsPer100g.energyKcal, 0)}{" "}
                        kcal · P {format(food.nutrientsPer100g.proteinG, 1)} g ·
                        C {format(food.nutrientsPer100g.carbohydratesG, 1)} g ·
                        G {format(food.nutrientsPer100g.fatG, 1)} g
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {!searching && foodSearchAttempted && foodResults.length === 0 ? (
                <p className={styles.searchEmpty} role="status">
                  Nenhuma correspondência foi encontrada. Revise o nome do
                  alimento ou tente um termo mais simples.
                </p>
              ) : null}
              {selectedFood ? (
                <div className={styles.portionPanel}>
                  <div className={styles.selectedFood}>
                    <span>Alimento selecionado</span>
                    <strong>{selectedFood.description}</strong>
                  </div>
                  <div className={styles.formGrid}>
                    <label>
                      Quantidade <small>sem valor padrão</small>
                      <input
                        inputMode="decimal"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        placeholder="informar"
                      />
                    </label>
                    <label>
                      Medida
                      <select
                        value={measure}
                        onChange={(event) => {
                          setMeasure(event.target.value as HouseholdMeasure);
                          setGrams("");
                        }}
                      >
                        {HOUSEHOLD_MEASURES.map((item) => (
                          <option key={item} value={item}>
                            {MEASURE_LABELS[item]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {measure !== "g" ? (
                      <label>
                        Gramas <small>necessários para calcular</small>
                        <input
                          inputMode="decimal"
                          value={grams}
                          onChange={(event) => setGrams(event.target.value)}
                          placeholder="confirmar ou estimar"
                        />
                      </label>
                    ) : null}
                    <label className={styles.spanTwo}>
                      Observação do preparo <small>opcional</small>
                      <input
                        value={observation}
                        onChange={(event) => setObservation(event.target.value)}
                        placeholder="corte, tamanho, preparo…"
                      />
                    </label>
                  </div>
                  {
                    <div className={styles.nutrientPreview} aria-live="polite">
                      <div>
                        <strong>Valor nutricional estimado</strong>
                        <span>{selectedFood.description}</span>
                      </div>
                      {selectedNutrients ? (
                        <div className={styles.nutrientMetrics}>
                          <span>
                            <b>{format(selectedNutrients.energyKcal, 0)}</b>{" "}
                            kcal
                          </span>
                          <span>
                            <b>{format(selectedNutrients.proteinG, 1)}</b> g
                            proteína
                          </span>
                          <span>
                            <b>{format(selectedNutrients.carbohydratesG, 1)}</b>{" "}
                            g carboidratos
                          </span>
                          <span>
                            <b>{format(selectedNutrients.fatG, 1)}</b> g
                            gorduras
                          </span>
                          <span>
                            <b>{format(selectedNutrients.fiberG, 1)}</b> g
                            fibras
                          </span>
                          <span>
                            <b>{format(selectedNutrients.calciumMg, 0)}</b> mg
                            cálcio
                          </span>
                          <span>
                            <b>{format(selectedNutrients.sodiumMg, 0)}</b> mg
                            sódio
                          </span>
                        </div>
                      ) : (
                        <p>
                          Composição disponível por 100 g. Informe a quantidade
                          em gramas para calcular esta porção.
                        </p>
                      )}
                    </div>
                  }
                  <div className={styles.addAction}>
                    <span>
                      Destino:{" "}
                      {meals.find((meal) => meal.id === mealId)?.label ??
                        "refeição selecionada"}
                    </span>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      onClick={addFood}
                    >
                      Adicionar alimento
                    </button>
                  </div>
                </div>
              ) : (
                <p className={styles.selectionHint}>
                  Selecione uma opção da busca para informar a porção.
                </p>
              )}
              <details className={styles.advanced}>
                <summary>Opções adicionais do relato</summary>
                <div className={styles.advancedBody}>
                  <label className={styles.fieldWide}>
                    Colar relato livre
                    <textarea
                      className={styles.textarea}
                      value={freeText}
                      onChange={(event) => setFreeText(event.target.value)}
                      placeholder="Ex.: 2 ovos; 1 filé de peixe; 3 colheres de arroz…"
                      rows={3}
                    />
                  </label>
                  {parsedPhrases.length ? (
                    <div
                      className={styles.parsedList}
                      aria-label="Itens identificados no relato"
                    >
                      {parsedPhrases.map((parsed, index) => (
                        <button
                          key={`${parsed.raw}-${index}`}
                          type="button"
                          onClick={() => void useParsedPhrase(index)}
                        >
                          <strong>{parsed.foodQuery || parsed.raw}</strong>
                          <span>
                            {parsed.quantity ?? "?"}{" "}
                            {parsed.measure
                              ? MEASURE_LABELS[parsed.measure]
                              : "medida a confirmar"}
                            {parsed.issue ? ` · ${parsed.issue}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <fieldset className={styles.flags}>
                    <legend>Qualidade do alimento</legend>
                    {(
                      [
                        ["whole-food", "in natura/minimamente processado"],
                        ["refined", "refinado"],
                        ["ultraprocessed", "ultraprocessado"],
                        ["free-sugar", "açúcar livre"],
                      ] as const
                    ).map(([flag, label]) => (
                      <label key={flag}>
                        <input
                          type="checkbox"
                          checked={qualityFlags?.includes(flag) ?? false}
                          onChange={() => {
                            mark();
                            setQualityFlags((current = []) =>
                              current.includes(flag)
                                ? current.filter((item) => item !== flag)
                                : [...current, flag],
                            );
                          }}
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  <div
                    className={styles.portionDefinitions}
                    aria-label="Referências práticas de porção"
                  >
                    <strong>Referências rápidas</strong>
                    {DIETARY_PORTION_DEFINITIONS.map((item) => (
                      <span key={item.id}>
                        <b>{item.label}:</b> {item.description}
                      </span>
                    ))}
                  </div>
                </div>
              </details>
            </section>
          ) : null}
          {step === 2 ? (
            <section
              className={styles.card}
              aria-labelledby="dietary-meals-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span>2</span>
                  <h4 id="dietary-meals-title">Conferir porções e preparo</h4>
                </div>
                <small>Confirme cada item antes de calcular.</small>
              </div>
              <div className={styles.reviewHint}>
                Itens sem gramas confirmados permanecem visíveis, mas não entram
                silenciosamente no total.
              </div>
              <div className={styles.mealGrid}>
                {meals.map((meal) => (
                  <article key={meal.id} className={styles.mealCard}>
                    <header>
                      <div>
                        <strong>{meal.label}</strong>
                        <span>
                          {meal.items.length} item
                          {meal.items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMealId(meal.id);
                          setStep(1);
                        }}
                      >
                        Adicionar item
                      </button>
                    </header>
                    {!meal.items.length ? (
                      <p className={styles.empty}>
                        Nenhum alimento registrado nesta refeição.
                      </p>
                    ) : (
                      meal.items.map((item) => (
                        <div key={item.id} className={styles.itemRow}>
                          <div className={styles.itemIdentity}>
                            <strong>{item.label}</strong>
                            <small>
                              {item.quantity} × {MEASURE_LABELS[item.measure]} ·{" "}
                              {item.grams == null
                                ? "gramas não confirmados"
                                : `${format(item.grams, 0)} g ${item.estimated ? "estimados" : "confirmados"}`}{" "}
                              · {uncertaintyLabel(item.uncertainty)}
                            </small>
                            <PortionNutrientLine
                              composition={item.composition}
                              grams={item.grams}
                            />
                            {item.estimated || item.grams == null ? (
                              <small className={styles.attentionText}>
                                Revisar quantidade antes do cálculo.
                              </small>
                            ) : null}
                          </div>
                          <label>
                            Qtd.
                            <input
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(event) => {
                                const value = numberOrNull(event.target.value);
                                if (value)
                                  patchItem(meal.id, item.id, {
                                    quantity: value,
                                  });
                              }}
                            />
                          </label>
                          <label>
                            Medida
                            <select
                              value={item.measure}
                              onChange={(event) =>
                                patchItem(meal.id, item.id, {
                                  measure: event.target
                                    .value as HouseholdMeasure,
                                })
                              }
                            >
                              {HOUSEHOLD_MEASURES.map((option) => (
                                <option key={option} value={option}>
                                  {MEASURE_LABELS[option]}
                                </option>
                              ))}
                            </select>
                          </label>
                          {item.measure !== "g" ? (
                            <label>
                              g equivalentes
                              <input
                                inputMode="decimal"
                                value={item.grams ?? ""}
                                onChange={(event) =>
                                  patchItem(meal.id, item.id, {
                                    grams: numberOrNull(event.target.value),
                                  })
                                }
                              />
                            </label>
                          ) : (
                            <span className={styles.grams}>
                              {format(item.grams, 0)} g
                            </span>
                          )}
                          <label className={styles.itemObservation}>
                            Observação
                            <input
                              value={item.observation ?? ""}
                              onChange={(event) =>
                                patchItem(meal.id, item.id, {
                                  observation: event.target.value,
                                } as Partial<UiDietaryItem>)
                              }
                            />
                          </label>
                          <button
                            className={styles.remove}
                            type="button"
                            onClick={() => removeItem(meal.id, item.id)}
                          >
                            Remover
                          </button>
                        </div>
                      ))
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
          {step === 3 ? (
            <section
              className={styles.card}
              aria-labelledby="dietary-context-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span>3</span>
                  <h4 id="dietary-context-title">
                    Há condições que mudam a interpretação
                  </h4>
                </div>
                <small>Marque somente o que está documentado.</small>
              </div>
              <div className={styles.contextBar}>
                {activeContexts.length ? (
                  activeContexts.map((label) => (
                    <span key={label}>{label}</span>
                  ))
                ) : (
                  <span>Nenhum contexto adicional identificado</span>
                )}
              </div>
              <fieldset className={styles.choiceGrid}>
                <legend>Fatores que exigem individualização</legend>
                {(
                  [
                    [malnutrition, setMalnutrition, "Desnutrição"],
                    [
                      involuntaryWeightLoss,
                      setInvoluntaryWeightLoss,
                      "Perda de peso involuntária",
                    ],
                    [acuteIllness, setAcuteIllness, "Doença aguda"],
                    [appetiteReduced, setAppetiteReduced, "Apetite reduzido"],
                    [reducedIntake, setReducedIntake, "Ingestão reduzida"],
                  ] as const
                ).map(([checked, setter, label]) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        mark();
                        setter(event.target.checked);
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              {data?.clinicalContext.ckd ? (
                <section
                  className={styles.renalReference}
                  aria-labelledby="renal-protein-reference-title"
                >
                  <div>
                    <strong id="renal-protein-reference-title">
                      Função renal
                    </strong>
                    <span>Não há exclusão automática de alimentos.</span>
                  </div>
                  <div className={styles.formGrid}>
                    <label>
                      TFG, mL/min/1,73 m²
                      <input
                        inputMode="decimal"
                        value={renalEgfr}
                        onChange={(event) => {
                          mark();
                          setRenalEgfr(event.target.value);
                          setRenalVeryLowProteinDiet(false);
                          setVlpdConfirmed(false);
                        }}
                        placeholder="informar"
                        disabled={renalDialysis}
                      />
                    </label>
                    <label className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={renalDialysis}
                        onChange={(event) => {
                          mark();
                          setRenalDialysis(event.target.checked);
                          if (!event.target.checked) setDialysisModality(null);
                          setRenalVeryLowProteinDiet(false);
                          setVlpdConfirmed(false);
                        }}
                      />
                      Em diálise
                    </label>
                    {renalDialysis ? (
                      <label>
                        Modalidade
                        <select
                          value={dialysisModality ?? ""}
                          onChange={(event) => {
                            mark();
                            setDialysisModality(
                              (event.target.value ||
                                null) as DietaryClinicalContext["renalDialysisModality"],
                            );
                          }}
                        >
                          <option value="">confirmar</option>
                          <option value="hemodialysis">Hemodiálise</option>
                          <option value="peritoneal">Diálise peritoneal</option>
                          <option value="other">Outra</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {renalReference ? (
                    <div className={styles.renalResult} role="status">
                      <strong>{renalReference.label}</strong>
                      <span>
                        {renalReference.proteinGPerKgMin == null
                          ? "Sem meta automática"
                          : `${format(renalReference.proteinGPerKgMin, 1)}–${format(renalReference.proteinGPerKgMax, 1)} g/kg/dia`}
                      </span>
                      <p>{renalReference.note}</p>
                      {renalReference.proteinGPerKgMin != null ? (
                        <button type="button" onClick={applyRenalReference}>
                          Usar como meta inicial
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : (
                <div className={styles.reviewHint}>
                  DRC não identificada nesta consulta. Registre somente dados
                  documentados.
                </div>
              )}
              <details className={styles.advanced}>
                <summary>Exames e sinais relevantes</summary>
                <div className={styles.advancedBody}>
                  <div className={styles.formGrid}>
                    <label>
                      Potássio, mmol/L
                      <input
                        inputMode="decimal"
                        value={renalPotassium}
                        onChange={(event) => {
                          mark();
                          setRenalPotassium(event.target.value);
                        }}
                        placeholder="não informado"
                      />
                    </label>
                    <label>
                      Fósforo, mg/dL
                      <input
                        inputMode="decimal"
                        value={renalPhosphorus}
                        onChange={(event) => {
                          mark();
                          setRenalPhosphorus(event.target.value);
                        }}
                        placeholder="não informado"
                      />
                    </label>
                    <label>
                      Bicarbonato, mmol/L
                      <input
                        inputMode="decimal"
                        value={bicarbonate}
                        onChange={(event) => {
                          mark();
                          setBicarbonate(event.target.value);
                        }}
                        placeholder="não informado"
                      />
                    </label>
                    <label>
                      Hidratação relatada, mL/dia
                      <input
                        inputMode="decimal"
                        value={hydrationMl}
                        onChange={(event) => {
                          mark();
                          setHydrationMl(event.target.value);
                        }}
                        placeholder="não informado"
                      />
                    </label>
                  </div>
                  <div className={styles.checkGrid}>
                    <label>
                      <input
                        type="checkbox"
                        checked={edema}
                        onChange={(event) => {
                          mark();
                          setEdema(event.target.checked);
                        }}
                      />
                      Edema
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={heartFailure}
                        onChange={(event) => {
                          mark();
                          setHeartFailure(event.target.checked);
                        }}
                      />
                      Insuficiência cardíaca
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={reducedUrineOutput}
                        onChange={(event) => {
                          mark();
                          setReducedUrineOutput(event.target.checked);
                        }}
                      />
                      Diurese reduzida
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={hyponatremia}
                        onChange={(event) => {
                          mark();
                          setHyponatremia(event.target.checked);
                        }}
                      />
                      Hiponatremia
                    </label>
                  </div>
                </div>
              </details>
              <details className={styles.advanced}>
                <summary>Metas nutricionais editáveis</summary>
                <div className={`${styles.advancedBody} ${styles.formGrid}`}>
                  <label>
                    Peso utilizado, kg{" "}
                    <small>
                      {weightOverride
                        ? "confirmado pelo médico"
                        : weightSourceLabel(data?.clinicalContext.weightSource)}
                    </small>
                    <input
                      inputMode="decimal"
                      value={weightOverride}
                      onChange={(event) => {
                        mark();
                        setWeightOverride(event.target.value);
                      }}
                      placeholder={
                        data?.clinicalContext.weightKg
                          ? format(data.clinicalContext.weightKg, 1)
                          : "não disponível"
                      }
                    />
                  </label>
                  <label>
                    Energia mínima, kcal/kg/d
                    <input
                      inputMode="decimal"
                      value={targetValue(targets, "energyKcalPerKgMin")}
                      onChange={(event) =>
                        patchTarget("energyKcalPerKgMin", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Energia máxima, kcal/kg/d
                    <input
                      inputMode="decimal"
                      value={targetValue(targets, "energyKcalPerKgMax")}
                      onChange={(event) =>
                        patchTarget("energyKcalPerKgMax", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Proteína mínima, g/kg/d
                    <input
                      inputMode="decimal"
                      value={targetValue(targets, "proteinGPerKgMin")}
                      onChange={(event) =>
                        patchTarget("proteinGPerKgMin", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Proteína máxima, g/kg/d
                    <input
                      inputMode="decimal"
                      value={targetValue(targets, "proteinGPerKgMax")}
                      onChange={(event) =>
                        patchTarget("proteinGPerKgMax", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Cálcio, mg/d{" "}
                    <small>
                      referência: {data?.references.calciumMg ?? "—"} mg
                    </small>
                    <input
                      inputMode="decimal"
                      value={targetValue(targets, "calciumMg")}
                      onChange={(event) =>
                        patchTarget("calciumMg", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Fibras, g/d{" "}
                    <small>
                      referência: {data?.references.fiberG ?? "—"} g
                    </small>
                    <input
                      inputMode="decimal"
                      value={targetValue(targets, "fiberG")}
                      onChange={(event) =>
                        patchTarget("fiberG", event.target.value)
                      }
                    />
                  </label>
                </div>
              </details>
            </section>
          ) : null}
          {step === 4 ? (
            <section
              className={styles.card}
              aria-labelledby="dietary-review-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <span>4</span>
                  <h4 id="dietary-review-title">Resultado e orientação</h4>
                </div>
                <small>Revisão médica antes do uso em SOAP/relatório.</small>
              </div>
              {displayedSummary ? (
                <>
                  {dirty ? (
                    <div className={styles.reviewHint}>
                      Estimativa atualizada com o rascunho local. Salve e recalcule
                      para confirmar o resultado no servidor.
                    </div>
                  ) : null}
                  <div className={styles.metrics}>
                    <div>
                      <span>Proteína</span>
                      <strong>
                        {format(displayedSummary.proteinG, 1)} g
                      </strong>
                      <small>
                        {format(displayedSummary.proteinGPerKg, 2)} g/kg/d
                      </small>
                    </div>
                    <div>
                      <span>Cálcio</span>
                      <strong>
                        {format(displayedSummary.calciumMg, 0)} mg
                      </strong>
                      <small>miligramas/dia</small>
                    </div>
                    <div>
                      <span>Carboidratos</span>
                      <strong>
                        {format(displayedSummary.carbohydratesG, 1)} g
                      </strong>
                      <small>
                        {format(
                          displayedSummary.carbohydrateEnergyPercent,
                          0,
                        )}
                        % da energia
                      </small>
                    </div>
                    <div>
                      <span>Energia</span>
                      <strong>
                        {format(displayedSummary.energyKcal, 0)} kcal
                      </strong>
                      <small>
                        {format(displayedSummary.energyKcalPerKg, 1)}{" "}
                        kcal/kg/d
                      </small>
                    </div>
                  </div>
                  {displayedSummary.incompleteItems ? (
                    <div className={styles.warning}>
                      <strong>Dados insuficientes:</strong>{" "}
                      {displayedSummary.incompleteItems} item(ns) não entraram
                      no total.
                    </div>
                  ) : null}
                  <div className={styles.comparisonPanel}>
                    <strong>Comparação proteica</strong>
                    <span>
                      {comparison?.targetGPerKgMin == null
                        ? "Meta não definida"
                        : `${format(comparison.targetGPerKgMin, 1)}–${format(comparison.targetGPerKgMax, 1)} g/kg/d · ${format(comparison.targetTotalGMin, 1)}–${format(comparison.targetTotalGMax, 1)} g/d`}
                    </span>
                    <small>
                      {comparison?.weightKg
                        ? `Peso: ${format(comparison.weightKg, 1)} kg (${weightSourceLabel(comparison.weightSource)})`
                        : "Peso não disponível"}
                    </small>
                  </div>
                  {assessment?.conditionalGuidance?.length ? (
                    <div
                      className={styles.priorityList}
                      aria-label="Orientações condicionais para revisão clínica"
                    >
                      {assessment.conditionalGuidance.map((item) => (
                        <article key={item.code} data-severity={item.severity}>
                          <strong>{item.title}</strong>
                          <p>{item.text}</p>
                          <small>
                            Referências: {item.evidenceRefs.join(", ")}
                          </small>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  <details className={styles.technical}>
                    <summary>Detalhes técnicos e rastreabilidade</summary>
                    {displayedItems.map((item) => (
                        <div key={item.id} className={styles.technicalItem}>
                          <strong>{item.label}</strong>
                          <span>
                            {item.quantity} × {MEASURE_LABELS[item.measure]} ·{" "}
                            {item.grams == null
                              ? "gramas não confirmados"
                              : `${format(item.grams, 0)} g`}{" "}
                            · {uncertaintyLabel(item.uncertainty)}
                          </span>
                        </div>
                      ))}
                    <p
                      className={
                        energyCheck?.status === "review"
                          ? styles.warning
                          : styles.ok
                      }
                    >
                      {energyCheck?.note}
                    </p>
                    <p className={styles.sourceNote}>
                      Fonte principal: TACO — NEPA/UNICAMP, 4ª edição. A USDA
                      FoodData Central é usada somente quando a TACO não contém
                      correspondência. Medidas caseiras e estimativas visuais
                      permanecem marcadas para revisão.
                    </p>
                  </details>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <strong>Ainda não há cálculo.</strong>
                  <span>
                    Registre alimentos, confirme porções e salve a avaliação.
                  </span>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setStep(1)}
                  >
                    Voltar ao registro
                  </button>
                </div>
              )}
              <label className={styles.orientation}>
                Orientação clínica editável
                <textarea
                  rows={9}
                  value={orientationDraft}
                  onChange={(event) => {
                    mark();
                    setOrientationDraft(event.target.value);
                    setOrientationReviewed(false);
                    setIncludeInSoap(false);
                    setIncludeInReport(false);
                  }}
                  placeholder="O texto gerado aparecerá após salvar."
                />
              </label>
              {assessment ? (
                <>
                  <div className={styles.reviewRow}>
                    <label>
                      <input
                        type="checkbox"
                        checked={orientationReviewed}
                        onChange={(event) => {
                          mark();
                          setOrientationReviewed(event.target.checked);
                          if (!event.target.checked) {
                            setIncludeInSoap(false);
                            setIncludeInReport(false);
                          }
                        }}
                      />
                      Revisei clinicamente
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!orientationReviewed}
                        checked={includeInSoap}
                        onChange={(event) => {
                          mark();
                          setIncludeInSoap(event.target.checked);
                        }}
                      />
                      Usar na evolução/SOAP
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!orientationReviewed}
                        checked={includeInReport}
                        onChange={(event) => {
                          mark();
                          setIncludeInReport(event.target.checked);
                        }}
                      />
                      Usar no relatório
                    </label>
                  </div>
                  <div className={styles.actionRow}>
                    <button type="button" onClick={() => void copySummary()}>
                      Copiar síntese
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => void save()}
                      disabled={saving || isFinalized}
                    >
                      {saving
                        ? "Salvando…"
                        : isFinalized
                          ? "Consulta finalizada"
                          : "Salvar revisão"}
                    </button>
                  </div>
                </>
              ) : null}
              <p className={styles.disclaimer}>
                Recordatório autorreferido, sujeito a incerteza de quantidade e
                preparo. Não constitui prescrição dietética automática.
              </p>
            </section>
          ) : null}
          <div className={styles.navigationRow}>
            <button
              type="button"
              onClick={() =>
                setStep((current) =>
                  current > 1 ? ((current - 1) as 1 | 2 | 3 | 4) : current,
                )
              }
              disabled={step === 1}
            >
              Voltar
            </button>
            {step < 4 ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={continueToNextStep}
              >
                Continuar
              </button>
            ) : null}
          </div>
        </main>
      </div>
      {data?.history.length ? (
        <section
          className={styles.history}
          aria-label="Histórico alimentar recente"
        >
          <strong>Histórico preservado</strong>
          <div>
            {data.history.map((entry) => (
              <span key={entry.occurredAt}>
                {new Date(entry.occurredAt).toLocaleDateString("pt-BR")}:{" "}
                {format(entry.summary.energyKcal, 0)} kcal ·{" "}
                {format(entry.summary.proteinG, 1)} g proteína
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
