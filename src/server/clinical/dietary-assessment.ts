import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import {
  DIETARY_CLINICAL_REFERENCES,
  buildDietaryOrientation,
  buildDietaryPriorities,
  buildProteinComparison,
  calciumReferenceMg,
  fiberReferenceG,
  nutrientsForGrams,
  portionMetadata,
  renalProteinReference,
  summarizeDietaryAssessment,
  validateDietaryInput,
  type DietaryAssessmentInput,
  type DietaryAssessmentSnapshot,
  type DietaryClinicalContext,
  type DietaryConfirmedMeal,
  type DietaryFoodComposition,
} from "../../domain/dietary-assessment";
import { requireConsultationAccess } from "../auth/patient-access";
import { prisma } from "../db";

export class DietaryAssessmentError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "DietaryAssessmentError";
  }
}

const plain = (value: Prisma.JsonValue | null): value is Prisma.JsonObject => value !== null && typeof value === "object" && !Array.isArray(value);
const age = (birth: Date | null, at: Date) => {
  if (!birth) return null;
  let n = at.getUTCFullYear() - birth.getUTCFullYear();
  if (at.getUTCMonth() < birth.getUTCMonth() || (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() < birth.getUTCDate())) n--;
  return n >= 0 ? n : null;
};
const norm = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const has = (titles: string[], patterns: RegExp[]) => titles.some((title) => patterns.some((pattern) => pattern.test(norm(title))));
const snapshot = (value: Prisma.JsonValue | null): DietaryAssessmentSnapshot | null => {
  if (!plain(value)) return null;
  const dietary = value.dietaryAssessment;
  if (!dietary || typeof dietary !== "object" || Array.isArray(dietary) || (dietary as { schemaVersion?: string }).schemaVersion !== "dietary-assessment-v1") return null;
  return dietary as unknown as DietaryAssessmentSnapshot;
};

const FDC = "https://api.nal.usda.gov/fdc/v1";
const TYPES = new Set(["Foundation", "SR Legacy", "Survey (FNDDS)"]);
type FN = { nutrientId?: number; nutrientName?: string; value?: number; amount?: number; nutrient?: { id?: number; name?: string } };
type FF = { fdcId?: number; description?: string; dataType?: string; publicationDate?: string; foodNutrients?: FN[] };
const val = (food: FF, ids: number[], re: RegExp) => {
  const row = (food.foodNutrients ?? []).find((nutrient) => {
    const id = nutrient.nutrientId ?? nutrient.nutrient?.id;
    const name = nutrient.nutrientName ?? nutrient.nutrient?.name ?? "";
    return (id != null && ids.includes(id)) || re.test(name);
  });
  const value = row?.value ?? row?.amount ?? 0;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
};
const normalizeFood = (food: FF): DietaryFoodComposition => {
  if (!food.fdcId || !food.description) throw new DietaryAssessmentError("FOOD_SOURCE", "Alimento USDA sem identificação suficiente.");
  return {
    provider: "USDA_FDC",
    sourceId: String(food.fdcId),
    description: food.description,
    dataType: food.dataType,
    sourceVersion: food.publicationDate ?? food.dataType ?? "USDA FoodData Central",
    nutrientsPer100g: {
      energyKcal: val(food, [1008], /^energy$/i),
      proteinG: val(food, [1003], /^protein$/i),
      carbohydratesG: val(food, [1005], /carbohydrate.*difference/i),
      fatG: val(food, [1004], /total lipid|total fat/i),
      fiberG: val(food, [1079], /fiber.*dietary/i),
      calciumMg: val(food, [1087], /^calcium/i),
      sodiumMg: val(food, [1093], /^sodium/i),
    },
  };
};
async function fdc(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    return await fetch(`${FDC}${path}`, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}
export async function searchDietaryFoods(query: string) {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const key = process.env.USDA_FDC_API_KEY?.trim() || "DEMO_KEY";
  const response = await fdc(`/foods/search?api_key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: q, pageSize: 8, dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"] }),
  });
  if (!response.ok) throw new DietaryAssessmentError("FOOD_SOURCE", `USDA FoodData Central indisponível (${response.status}).`);
  const body = await response.json() as { foods?: FF[] };
  return (body.foods ?? []).filter((food) => food.fdcId && food.description && (!food.dataType || TYPES.has(food.dataType))).map(normalizeFood);
}
async function getFood(id: string) {
  if (!/^\d{1,12}$/.test(id)) throw new DietaryAssessmentError("FOOD_SOURCE", "Identificador USDA inválido.");
  const key = process.env.USDA_FDC_API_KEY?.trim() || "DEMO_KEY";
  const response = await fdc(`/food/${id}?api_key=${encodeURIComponent(key)}`);
  if (!response.ok) throw new DietaryAssessmentError("FOOD_SOURCE", `Não foi possível validar o alimento USDA (${response.status}).`);
  const food = normalizeFood(await response.json() as FF);
  if (food.dataType && !TYPES.has(food.dataType)) throw new DietaryAssessmentError("FOOD_SOURCE", "Tipo de dado alimentar não habilitado neste MVP.");
  return food;
}

async function core(id: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    select: { id: true, patientId: true, status: true, occurredAt: true, updatedAt: true, assessment: true, patient: { select: { birthDate: true, sex: true } } },
  });
  if (!consultation) throw new DietaryAssessmentError("NOT_FOUND", "Consulta não encontrada.");
  const [problems, body] = await Promise.all([
    prisma.clinicalProblem.findMany({ where: { patientId: consultation.patientId, status: "ACTIVE" }, select: { title: true } }),
    prisma.program55BodyComposition.findFirst({ where: { patientId: consultation.patientId, measuredAt: { lte: consultation.occurredAt } }, orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }], select: { weightKg: true } }),
  ]);
  const titles = problems.map((problem) => problem.title);
  const context: DietaryClinicalContext = {
    ageYears: age(consultation.patient.birthDate, consultation.occurredAt),
    sex: consultation.patient.sex,
    weightKg: body?.weightKg == null ? null : Number(body.weightKg),
    weightSource: body?.weightKg == null ? null : "program55",
    ckd: has(titles, [/\bdrc\b/, /doenca renal cronica/, /insuficiencia renal cronica/]),
    diabetes: has(titles, [/\bdiabetes\b/, /\bdm2?\b/]),
    sarcopenia: has(titles, [/sarcopen/]),
    frailty: has(titles, [/fragil/]),
    malnutrition: has(titles, [/desnutr/, /malnutri/]),
    involuntaryWeightLoss: has(titles, [/perda.*peso/, /emagrec/]),
    cancer: has(titles, [/cancer/, /neoplas/, /oncol/]),
    dementia: has(titles, [/demenc/, /transtorno neurocognitivo/]),
    dysphagia: has(titles, [/disfag/]),
  };
  return { consultation, context };
}

export async function getDietaryAssessment(id: string) {
  await requireConsultationAccess(id, "patient.read");
  const { consultation, context } = await core(id);
  const prior = await prisma.consultation.findMany({
    where: { patientId: consultation.patientId, occurredAt: { lt: consultation.occurredAt } },
    orderBy: { occurredAt: "desc" }, take: 8, select: { occurredAt: true, assessment: true },
  });
  return {
    consultationId: id,
    status: consultation.status,
    updatedAt: consultation.updatedAt.toISOString(),
    clinicalContext: context,
    references: { calciumMg: calciumReferenceMg(context.ageYears, context.sex), fiberG: fiberReferenceG(context.ageYears, context.sex) },
    assessment: snapshot(consultation.assessment),
    history: prior.map((entry) => ({ occurredAt: entry.occurredAt.toISOString(), assessment: snapshot(entry.assessment) })).filter((entry) => entry.assessment).slice(0, 3).map((entry) => ({ occurredAt: entry.occurredAt, summary: entry.assessment!.summary })),
  };
}

async function hydrate(input: DietaryAssessmentInput): Promise<DietaryConfirmedMeal[]> {
  const ids = [...new Set(input.meals.flatMap((meal) => meal.items).map((item) => item.food).filter(Boolean).map((food) => {
    if (food!.provider !== "USDA_FDC") throw new DietaryAssessmentError("SOURCE_NOT_AVAILABLE", "TBCA permanece prioritária, mas requer integração licenciada antes do uso automático.");
    return food!.sourceId;
  }))];
  const entries = await Promise.all(ids.map(async (id) => [id, await getFood(id)] as const));
  const compositionMap = new Map(entries);
  return input.meals.map((meal) => ({
    id: meal.id,
    label: meal.label.trim(),
    items: meal.items.map((item) => {
      const composition = item.food ? compositionMap.get(item.food.sourceId) ?? null : null;
      const grams = item.measure === "g" ? item.quantity : item.grams;
      const metadata = portionMetadata(item.measure, grams ?? null);
      const calculable = Boolean(composition && grams != null && grams > 0);
      return {
        ...item,
        label: item.label.trim() || composition?.description || "Alimento",
        grams: grams ?? null,
        gramsSource: metadata.gramsSource,
        estimated: metadata.estimated,
        quantitySource: metadata.quantitySource,
        uncertainty: metadata.uncertainty,
        composition,
        nutrients: calculable ? nutrientsForGrams(composition!.nutrientsPer100g, grams!) : null,
      };
    }),
  }));
}

export async function saveDietaryAssessment(args: { consultationId: string; expectedUpdatedAt: string; assessment: DietaryAssessmentInput; requestId?: string }) {
  const auth = await requireConsultationAccess(args.consultationId, "consultation.write");
  const errors = validateDietaryInput(args.assessment);
  if (errors.length) throw new DietaryAssessmentError("INVALID_INPUT", errors[0]);
  const expected = new Date(args.expectedUpdatedAt);
  if (!Number.isFinite(expected.getTime())) throw new DietaryAssessmentError("INVALID_VERSION", "Versão da consulta inválida.");
  const meals = await hydrate(args.assessment);

  return prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.findUnique({
      where: { id: args.consultationId },
      select: { id: true, patientId: true, status: true, occurredAt: true, updatedAt: true, assessment: true, patient: { select: { birthDate: true, sex: true } } },
    });
    if (!consultation) throw new DietaryAssessmentError("NOT_FOUND", "Consulta não encontrada.");
    if (consultation.status === "FINALIZED") throw new DietaryAssessmentError("FINALIZED", "Consulta finalizada é imutável.");
    if (consultation.assessment !== null && !plain(consultation.assessment)) throw new DietaryAssessmentError("LEGACY_ASSESSMENT", "Avaliação em formato legado requer revisão antes de incluir alimentação.");

    const latest = await tx.program55BodyComposition.findFirst({
      where: { patientId: consultation.patientId, measuredAt: { lte: consultation.occurredAt } },
      orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }], select: { weightKg: true },
    });
    const context: DietaryClinicalContext = {
      ...args.assessment.clinicalContext,
      ageYears: age(consultation.patient.birthDate, consultation.occurredAt),
      sex: consultation.patient.sex,
    };
    if ((context.weightKg == null || context.weightSource !== "clinician") && latest?.weightKg != null) {
      context.weightKg = Number(latest.weightKg);
      context.weightSource = "program55";
    }

    const { summary, proteinByMeal } = summarizeDietaryAssessment(meals, context.weightKg);
    const priorities = buildDietaryPriorities({ summary, proteinByMeal, targets: args.assessment.targets, context, meals });
    const generatedOrientation = buildDietaryOrientation({ priorities, context, meals, summary });
    const renalReference = renalProteinReference(context);
    const proteinComparison = buildProteinComparison(summary, args.assessment.targets, context);
    const now = new Date().toISOString();
    const evidenceBundle = DIETARY_CLINICAL_REFERENCES.map((source) => `${source.id} ${source.version}: ${source.url}`).join(" | ");

    const ruleTrace = [
      { rule: "nutrient_calculation_v2", reference: "USDA FoodData Central + quantidade confirmada", version: "2", condition: "alimento validado e gramas disponíveis", result: "quantidade × composição por 100 g; item sem gramas não entra no total" },
      { rule: "portion_uncertainty_v2", reference: "PMID 8429287 + PMID 33650974 + PMID 32153884", version: "2026-09", condition: "recordatório alimentar autorreferido", result: "medidas caseiras e estimativas visuais mantêm origem e incerteza; nenhum peso universal é presumido" },
      { rule: "calcium_reference_v1", reference: "NIH ODS / NASEM DRI", version: "2026-06", condition: "idade e sexo disponíveis", result: String(calciumReferenceMg(context.ageYears, context.sex) ?? "sem referência automática") },
      { rule: "fiber_reference_v1", reference: "NASEM DRI", version: "DRI", condition: "idade >= 51 e sexo disponível", result: String(fiberReferenceG(context.ageYears, context.sex) ?? "sem referência automática") },
      { rule: "protein_target_v2", reference: "ESPEN 2022 PMID 35306388 + KDOQI 2020 PMID 32829751", version: "2026-09", condition: args.assessment.targets.proteinTargetSource === "reference-suggestion" ? "referência sugerida e explicitamente aplicada pela médica" : "meta definida/revisada manualmente", result: "comparação registrada; sem meta universal para toda pessoa idosa" },
      ...(renalReference ? [{ rule: "renal_protein_target_by_egfr_v2", reference: "KDOQI 2020 PMID 32829751 + BRASPEN/SBN/ASBRAN 2021 + KDIGO 2024", version: "2026-09", condition: renalReference.label, result: renalReference.note }] : []),
      ...(context.renalVeryLowProteinDiet ? [{ rule: "renal_very_low_protein_explicit_confirmation_v1", reference: "KDOQI 2020 + KDIGO 2024 + BRASPEN/SBN/ASBRAN 2021", version: "2026-09", condition: "DRC, TFG <30, sem diálise", result: context.renalVeryLowProteinDietConfirmed ? "decisão confirmada explicitamente; exige supervisão nefrológica e nutricional" : "não confirmado" }] : []),
      { rule: "dietary_evidence_bundle_v1", reference: evidenceBundle, version: "2026-09", condition: "rastreabilidade documental", result: "síntese clínica e versões das fontes registradas; sem reprodução extensa de conteúdo" },
    ];

    const record: DietaryAssessmentSnapshot = {
      schemaVersion: "dietary-assessment-v1",
      meals,
      targets: args.assessment.targets,
      clinicalContext: context,
      summary,
      proteinByMeal,
      proteinComparison,
      priorities,
      generatedOrientation,
      orientationDraft: args.assessment.orientationDraft?.trim() || generatedOrientation,
      orientationReviewed: Boolean(args.assessment.orientationReviewed),
      includeInReport: Boolean(args.assessment.includeInReport && args.assessment.orientationReviewed),
      includeInSoap: Boolean(args.assessment.includeInSoap && args.assessment.orientationReviewed),
      confirmedBy: { userId: auth.user.id, name: auth.user.name },
      confirmedAt: now,
      updatedAt: now,
      ruleTrace,
    };

    const base = consultation.assessment === null ? {} : consultation.assessment as Prisma.JsonObject;
    const count = await tx.consultation.updateMany({
      where: { id: consultation.id, patientId: consultation.patientId, status: { not: "FINALIZED" }, updatedAt: expected },
      data: { assessment: { ...base, dietaryAssessment: record } as unknown as Prisma.InputJsonValue },
    });
    if (count.count !== 1) throw new DietaryAssessmentError("CONCURRENT_CHANGE", "A consulta mudou em outra sessão. Recarregue antes de salvar.");
    await tx.auditEvent.create({ data: { userId: auth.user.id, entityType: "Consultation", entityId: consultation.id, action: "consultation.dietary-assessment.update", requestId: args.requestId, outcome: "success", reasonCode: "dietary-assessment-v1" } });
    return { consultationId: consultation.id, updatedAt: now, assessment: record };
  }, { isolationLevel: "Serializable" });
}
