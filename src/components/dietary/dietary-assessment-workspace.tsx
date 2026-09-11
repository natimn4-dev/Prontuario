"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MEALS,
  HOUSEHOLD_MEASURES,
  parseDietaryNaturalLanguage,
  roundForDisplay,
  type DietaryAssessmentInput,
  type DietaryAssessmentSnapshot,
  type DietaryClinicalContext,
  type DietaryFoodDraft,
  type DietaryFoodReference,
  type DietaryMeal,
  type DietaryTargets,
  type HouseholdMeasure,
} from "@/domain/dietary-assessment";
import { crossCheckDietaryEnergy } from "@/domain/dietary-assessment-quality";
import styles from "./dietary-assessment-workspace.module.css";

type UiDietaryItem = DietaryFoodDraft & { observation?: string };
type UiDietaryMeal = Omit<DietaryMeal, "items"> & { items: UiDietaryItem[] };
type FoodResult = DietaryFoodReference & { sourceVersion?: string };
type LoadPayload = {
  consultationId: string;
  status: string;
  updatedAt: string;
  clinicalContext: DietaryClinicalContext;
  references: { calciumMg: number | null; fiberG: number | null };
  assessment: DietaryAssessmentSnapshot | null;
  history: Array<{ occurredAt: string; summary: DietaryAssessmentSnapshot["summary"] }>;
};

type TargetKey = keyof Pick<
  DietaryTargets,
  "energyKcalPerKgMin" | "energyKcalPerKgMax" | "proteinGPerKgMin" | "proteinGPerKgMax" | "calciumMg" | "fiberG"
>;

const MEASURE_LABELS: Record<HouseholdMeasure, string> = {
  g: "g",
  ml: "mL",
  "colher-cha": "colher de chá",
  "colher-sobremesa": "colher de sobremesa",
  "colher-sopa": "colher de sopa",
  concha: "concha",
  escumadeira: "escumadeira",
  xicara: "xícara",
  copo: "copo",
  prato: "prato",
  fatia: "fatia",
  unidade: "unidade",
  porcao: "porção",
  "file-pequeno": "filé pequeno",
  "file-medio": "filé médio",
  "file-grande": "filé grande",
};

function freshMeals(): UiDietaryMeal[] {
  return DEFAULT_MEALS.map((meal) => ({ ...meal, items: [] }));
}

function draftMeals(snapshot: DietaryAssessmentSnapshot | null): UiDietaryMeal[] {
  if (!snapshot) return freshMeals();
  return snapshot.meals.map((meal) => ({
    id: meal.id,
    label: meal.label,
    items: meal.items.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
      measure: item.measure,
      grams: item.grams,
      gramsSource: item.gramsSource,
      estimated: item.estimated,
      food: item.food,
      qualityFlags: item.qualityFlags,
      observation: (item as UiDietaryItem).observation,
    })),
  }));
}

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function format(value: number | null | undefined, digits = 1): string {
  const rounded = value == null ? null : roundForDisplay(value, digits);
  if (rounded == null) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(rounded);
}

function targetValue(targets: DietaryTargets, key: TargetKey): string {
  const value = targets[key];
  return value == null ? "" : String(value);
}

function contextLabels(context: DietaryClinicalContext | null): string[] {
  if (!context) return [];
  const labels: string[] = [];
  if (context.ckd) labels.push("Doença renal crônica");
  if (context.diabetes) labels.push("Diabetes");
  if (context.sarcopenia) labels.push("Sarcopenia");
  if (context.frailty) labels.push("Fragilidade");
  if (context.cancer) labels.push("Câncer");
  if (context.dementia) labels.push("Comprometimento cognitivo/demência");
  if (context.dysphagia) labels.push("Disfagia");
  return labels;
}

export function DietaryAssessmentWorkspace({ consultationId }: { consultationId: string }) {
  const [data, setData] = useState<LoadPayload | null>(null);
  const [meals, setMeals] = useState<UiDietaryMeal[]>(freshMeals);
  const [targets, setTargets] = useState<DietaryTargets>({});
  const [weightOverride, setWeightOverride] = useState("");
  const [orientationDraft, setOrientationDraft] = useState("");
  const [orientationReviewed, setOrientationReviewed] = useState(false);
  const [includeInSoap, setIncludeInSoap] = useState(false);
  const [includeInReport, setIncludeInReport] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [mealId, setMealId] = useState("lunch");
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState<FoodResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [measure, setMeasure] = useState<HouseholdMeasure>("g");
  const [grams, setGrams] = useState("");
  const [observation, setObservation] = useState("");
  const [qualityFlags, setQualityFlags] = useState<UiDietaryItem["qualityFlags"]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPhrases = useMemo(() => parseDietaryNaturalLanguage(freeText), [freeText]);
  const assessment = data?.assessment ?? null;
  const energyCheck = assessment ? crossCheckDietaryEnergy(assessment.summary) : null;
  const activeContexts = contextLabels(data?.clinicalContext ?? null);
  const totalItems = meals.reduce((sum, meal) => sum + meal.items.length, 0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/dietary-assessment`, { cache: "no-store" });
      const body = await response.json() as LoadPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar a avaliação alimentar.");
      setData(body);
      setMeals(draftMeals(body.assessment));
      setTargets(body.assessment?.targets ?? {});
      setWeightOverride(body.assessment?.clinicalContext.weightSource === "clinician" && body.assessment.clinicalContext.weightKg
        ? String(body.assessment.clinicalContext.weightKg)
        : "");
      setOrientationDraft(body.assessment?.orientationDraft ?? "");
      setOrientationReviewed(Boolean(body.assessment?.orientationReviewed));
      setIncludeInSoap(Boolean(body.assessment?.includeInSoap));
      setIncludeInReport(Boolean(body.assessment?.includeInReport));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar avaliação alimentar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [consultationId]);

  function patchTarget(key: TargetKey, value: string) {
    setTargets((current) => ({ ...current, [key]: numberOrNull(value) }));
  }

  function patchItem(targetMealId: string, itemId: string, patch: Partial<UiDietaryItem>) {
    setMeals((current) => current.map((meal) => {
      if (meal.id !== targetMealId) return meal;
      return { ...meal, items: meal.items.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, ...patch };
        if (patch.measure === "g") {
          next.grams = next.quantity;
          next.gramsSource = "direct-grams";
          next.estimated = false;
        }
        if (patch.measure && patch.measure !== "g") {
          next.grams = null;
          next.gramsSource = null;
          next.estimated = true;
        }
        if (patch.quantity != null && next.measure === "g") next.grams = patch.quantity;
        return next;
      }) };
    }));
  }

  function removeItem(targetMealId: string, itemId: string) {
    setMeals((current) => current.map((meal) => meal.id === targetMealId
      ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) }
      : meal));
  }

  async function searchFoods(query = foodQuery) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setSearching(true);
    setError(null);
    setSelectedFood(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/dietary-assessment/foods?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const body = await response.json() as { foods?: FoodResult[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "A base de alimentos não respondeu.");
      setFoodResults(body.foods ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao buscar alimentos.");
    } finally {
      setSearching(false);
    }
  }

  async function useParsedPhrase(index: number) {
    const parsed = parsedPhrases[index];
    if (!parsed) return;
    if (parsed.quantity != null) setQuantity(String(parsed.quantity));
    if (parsed.measure) setMeasure(parsed.measure);
    setFoodQuery(parsed.foodQuery);
    await searchFoods(parsed.foodQuery);
  }

  function toggleQualityFlag(flag: "refined" | "ultraprocessed" | "free-sugar" | "whole-food") {
    setQualityFlags((current = []) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  }

  function addFood() {
    setError(null);
    if (!selectedFood) return setError("Selecione a correspondência do alimento antes de adicionar.");
    const parsedQuantity = numberOrNull(quantity);
    if (!parsedQuantity) return setError("Informe uma quantidade válida.");
    const parsedGrams = measure === "g" ? parsedQuantity : numberOrNull(grams);
    const item: UiDietaryItem = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      label: selectedFood.description,
      quantity: parsedQuantity,
      measure,
      grams: parsedGrams,
      gramsSource: measure === "g" ? "direct-grams" : parsedGrams ? "clinician-estimate" : null,
      estimated: measure !== "g",
      food: {
        provider: selectedFood.provider,
        sourceId: selectedFood.sourceId,
        description: selectedFood.description,
        dataType: selectedFood.dataType,
      },
      qualityFlags,
      observation: observation.trim() || undefined,
    };
    setMeals((current) => current.map((meal) => meal.id === mealId ? { ...meal, items: [...meal.items, item] } : meal));
    setSelectedFood(null);
    setFoodResults([]);
    setFoodQuery("");
    setQuantity("100");
    setMeasure("g");
    setGrams("");
    setObservation("");
    setQualityFlags([]);
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    const clinicianWeight = numberOrNull(weightOverride);
    const clinicalContext: DietaryClinicalContext = {
      ...data.clinicalContext,
      weightKg: clinicianWeight ?? data.clinicalContext.weightKg,
      weightSource: clinicianWeight ? "clinician" : data.clinicalContext.weightSource,
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
      const response = await fetch(`/api/consultations/${consultationId}/dietary-assessment`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt: data.updatedAt, assessment: payload }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar a avaliação alimentar.");
      setMessage("Avaliação alimentar salva. Os nutrientes foram recalculados no servidor com a fonte confirmada.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar avaliação alimentar.");
    } finally {
      setSaving(false);
    }
  }

  async function copySummary() {
    if (!assessment) return;
    const text = [
      "AVALIAÇÃO ALIMENTAR — estimativa a partir do relato",
      `Energia: ${format(assessment.summary.energyKcal, 0)} kcal (${format(assessment.summary.energyKcalPerKg, 1)} kcal/kg/d)`,
      `Proteína: ${format(assessment.summary.proteinG, 1)} g (${format(assessment.summary.proteinGPerKg, 2)} g/kg/d)`,
      `Carboidratos: ${format(assessment.summary.carbohydratesG, 1)} g (${format(assessment.summary.carbohydrateEnergyPercent, 0)}% do valor energético estimado)`,
      `Fibras: ${format(assessment.summary.fiberG, 1)} g`,
      `Cálcio: ${format(assessment.summary.calciumMg, 0)} mg`,
      `Sódio: ${format(assessment.summary.sodiumMg, 0)} mg`,
      "",
      assessment.orientationDraft || assessment.generatedOrientation,
      "",
      "Estimativa sujeita às limitações do relato, porções e base de composição. Requer revisão clínica.",
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setMessage("Síntese copiada para a área de transferência.");
  }

  if (loading) return <div className={styles.loading} role="status">Carregando avaliação alimentar…</div>;

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Recordatório alimentar e apoio à decisão</span>
          <h3>Avaliação alimentar</h3>
          <p>Registre o relato, confirme a correspondência dos alimentos e revise as estimativas antes de usar a orientação na consulta.</p>
        </div>
        <div className={styles.headerMeta}>
          <strong>{totalItems} alimento{totalItems === 1 ? "" : "s"}</strong>
          <span>{data?.clinicalContext.weightKg ? `Peso disponível: ${format(data.clinicalContext.weightKg, 1)} kg` : "Sem peso disponível"}</span>
        </div>
      </header>

      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      {message ? <div className={styles.success} role="status">{message}</div> : null}

      <section className={styles.card} aria-labelledby="dietary-entry-title">
        <div className={styles.sectionHeading}>
          <div><span>1</span><h4 id="dietary-entry-title">Relato alimentar</h4></div>
          <small>O texto livre apenas prepara candidatos; nenhum alimento é confirmado automaticamente.</small>
        </div>
        <textarea
          className={styles.textarea}
          value={freeText}
          onChange={(event) => setFreeText(event.target.value)}
          placeholder="Ex.: café da manhã: 1 copo de leite; almoço: 3 colheres de arroz, 1 concha de feijão e 100 g de frango"
          rows={3}
        />
        {parsedPhrases.length ? (
          <div className={styles.parsedList}>
            {parsedPhrases.map((parsed, index) => (
              <button key={`${parsed.raw}-${index}`} type="button" onClick={() => void useParsedPhrase(index)}>
                <strong>{parsed.foodQuery || parsed.raw}</strong>
                <span>{parsed.quantity ?? "?"} {parsed.measure ? MEASURE_LABELS[parsed.measure] : "medida a confirmar"}</span>
              </button>
            ))}
          </div>
        ) : null}

        <div className={styles.addGrid}>
          <label>Refeição<select value={mealId} onChange={(event) => setMealId(event.target.value)}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.label}</option>)}</select></label>
          <label className={styles.foodSearch}>Buscar alimento<div className={styles.inline}><input value={foodQuery} onChange={(event) => setFoodQuery(event.target.value)} placeholder="Arroz cozido, leite, frango…" /><button type="button" onClick={() => void searchFoods()} disabled={searching}>{searching ? "Buscando…" : "Buscar"}</button></div></label>
          <label>Quantidade<input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label>Medida<select value={measure} onChange={(event) => { setMeasure(event.target.value as HouseholdMeasure); setGrams(""); }}>{HOUSEHOLD_MEASURES.map((item) => <option key={item} value={item}>{MEASURE_LABELS[item]}</option>)}</select></label>
          {measure !== "g" ? <label>Equivalente em gramas <small>somente se conhecido/confiável</small><input inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} placeholder="opcional" /></label> : null}
          <label>Observação<input value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="marca, preparo, consistência…" /></label>
        </div>

        {foodResults.length ? (
          <div className={styles.searchResults} aria-label="Resultados da busca de alimentos">
            {foodResults.map((food) => (
              <button key={`${food.provider}-${food.sourceId}`} type="button" className={selectedFood?.sourceId === food.sourceId ? styles.selected : undefined} onClick={() => setSelectedFood(food)}>
                <strong>{food.description}</strong><span>{food.provider === "USDA_FDC" ? "USDA FoodData Central" : "TBCA"} · {food.dataType ?? "tipo não informado"}</span>
              </button>
            ))}
          </div>
        ) : null}

        <fieldset className={styles.flags}>
          <legend>Marcadores de qualidade (opcional)</legend>
          {([['whole-food','alimento in natura/minimamente processado'],['refined','refinado'],['ultraprocessed','ultraprocessado'],['free-sugar','açúcar livre']] as const).map(([flag, label]) => (
            <label key={flag}><input type="checkbox" checked={qualityFlags?.includes(flag) ?? false} onChange={() => toggleQualityFlag(flag)} />{label}</label>
          ))}
        </fieldset>
        <div className={styles.addAction}><span>{selectedFood ? `Selecionado: ${selectedFood.description}` : "Escolha um resultado da busca para confirmar o alimento."}</span><button type="button" onClick={addFood}>Adicionar alimento</button></div>
      </section>

      <section className={styles.card} aria-labelledby="dietary-meals-title">
        <div className={styles.sectionHeading}><div><span>2</span><h4 id="dietary-meals-title">Refeições registradas</h4></div><small>Medidas caseiras sem conversão confiável permanecem pendentes e não entram no cálculo.</small></div>
        <div className={styles.mealGrid}>
          {meals.map((meal) => (
            <article key={meal.id} className={styles.mealCard}>
              <header><strong>{meal.label}</strong><span>{meal.items.length} item(ns)</span></header>
              {!meal.items.length ? <p className={styles.empty}>Nenhum alimento registrado.</p> : meal.items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemIdentity}><strong>{item.label}</strong><small>{item.food ? `${item.food.provider === "USDA_FDC" ? "USDA FDC" : "TBCA"} #${item.food.sourceId}` : "Sem alimento confirmado"}</small></div>
                  <label>Qtd.<input inputMode="decimal" value={item.quantity} onChange={(event) => { const value = numberOrNull(event.target.value); if (value) patchItem(meal.id, item.id, { quantity: value }); }} /></label>
                  <label>Medida<select value={item.measure} onChange={(event) => patchItem(meal.id, item.id, { measure: event.target.value as HouseholdMeasure })}>{HOUSEHOLD_MEASURES.map((option) => <option key={option} value={option}>{MEASURE_LABELS[option]}</option>)}</select></label>
                  {item.measure !== "g" ? <label>g equivalentes<input inputMode="decimal" value={item.grams ?? ""} onChange={(event) => { const value = numberOrNull(event.target.value); patchItem(meal.id, item.id, { grams: value, gramsSource: value ? "clinician-estimate" : null, estimated: true }); }} /></label> : <span className={styles.grams}>{format(item.grams, 0)} g</span>}
                  <label className={styles.itemObservation}>Observação<input value={item.observation ?? ""} onChange={(event) => patchItem(meal.id, item.id, { observation: event.target.value } as Partial<UiDietaryItem>)} /></label>
                  <button className={styles.remove} type="button" onClick={() => removeItem(meal.id, item.id)}>Remover</button>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.card} aria-labelledby="dietary-targets-title">
        <div className={styles.sectionHeading}><div><span>3</span><h4 id="dietary-targets-title">Contexto e metas para comparação</h4></div><small>As metas são apoio configurável e não substituem decisão clínica.</small></div>
        <div className={styles.contextBar}>
          {activeContexts.length ? activeContexts.map((label) => <span key={label}>{label}</span>) : <span>Nenhum contexto automático adicional identificado</span>}
        </div>
        <div className={styles.targetGrid}>
          <label>Peso clínico, kg <small>opcional; substitui o peso do Programa 55+ nesta avaliação</small><input inputMode="decimal" value={weightOverride} onChange={(event) => setWeightOverride(event.target.value)} placeholder={data?.clinicalContext.weightKg ? format(data.clinicalContext.weightKg, 1) : "não disponível"} /></label>
          <label>Energia mínima, kcal/kg/d<input inputMode="decimal" value={targetValue(targets, "energyKcalPerKgMin")} onChange={(event) => patchTarget("energyKcalPerKgMin", event.target.value)} /></label>
          <label>Energia máxima, kcal/kg/d<input inputMode="decimal" value={targetValue(targets, "energyKcalPerKgMax")} onChange={(event) => patchTarget("energyKcalPerKgMax", event.target.value)} /></label>
          <label>Proteína mínima, g/kg/d<input inputMode="decimal" value={targetValue(targets, "proteinGPerKgMin")} onChange={(event) => patchTarget("proteinGPerKgMin", event.target.value)} /></label>
          <label>Proteína máxima, g/kg/d<input inputMode="decimal" value={targetValue(targets, "proteinGPerKgMax")} onChange={(event) => patchTarget("proteinGPerKgMax", event.target.value)} /></label>
          <label>Cálcio, mg/d <small>referência automática: {data?.references.calciumMg ?? "—"} mg</small><input inputMode="decimal" value={targetValue(targets, "calciumMg")} onChange={(event) => patchTarget("calciumMg", event.target.value)} placeholder={data?.references.calciumMg ? String(data.references.calciumMg) : ""} /></label>
          <label>Fibras, g/d <small>referência automática: {data?.references.fiberG ?? "—"} g</small><input inputMode="decimal" value={targetValue(targets, "fiberG")} onChange={(event) => patchTarget("fiberG", event.target.value)} placeholder={data?.references.fiberG ? String(data.references.fiberG) : ""} /></label>
        </div>
      </section>

      <div className={styles.saveBar}>
        <div><strong>Salvar e recalcular</strong><span>A fonte e os nutrientes de cada alimento são revalidados no servidor; valores calculados no navegador não são persistidos como verdade clínica.</span></div>
        <button type="button" onClick={() => void save()} disabled={saving || data?.status === "FINALIZED"}>{saving ? "Salvando…" : data?.status === "FINALIZED" ? "Consulta finalizada" : "Salvar avaliação"}</button>
      </div>

      {assessment ? (
        <>
          <section className={styles.card} aria-labelledby="dietary-summary-title">
            <div className={styles.sectionHeading}><div><span>4</span><h4 id="dietary-summary-title">Resumo nutricional estimado</h4></div><small>Resultados da última gravação validada no servidor.</small></div>
            <div className={styles.metrics}>
              <div><span>Energia</span><strong>{format(assessment.summary.energyKcal, 0)} kcal</strong><small>{format(assessment.summary.energyKcalPerKg, 1)} kcal/kg/d</small></div>
              <div><span>Proteína</span><strong>{format(assessment.summary.proteinG, 1)} g</strong><small>{format(assessment.summary.proteinGPerKg, 2)} g/kg/d</small></div>
              <div><span>Carboidratos</span><strong>{format(assessment.summary.carbohydratesG, 1)} g</strong><small>{format(assessment.summary.carbohydrateEnergyPercent, 0)}% da energia estimada</small></div>
              <div><span>Fibras</span><strong>{format(assessment.summary.fiberG, 1)} g</strong><small>gramas/dia</small></div>
              <div><span>Cálcio</span><strong>{format(assessment.summary.calciumMg, 0)} mg</strong><small>miligramas/dia</small></div>
              <div><span>Sódio</span><strong>{format(assessment.summary.sodiumMg, 0)} mg</strong><small>miligramas/dia</small></div>
            </div>
            {assessment.summary.incompleteItems ? <div className={styles.warning}>{assessment.summary.incompleteItems} item(ns) sem massa/composição confirmada não foram incluídos no total.</div> : null}
            <details className={styles.technical}>
              <summary>Detalhes técnicos e checagem de consistência</summary>
              <div className={styles.technicalGrid}>
                <div><span>Energia da fonte</span><strong>{format(energyCheck?.sourceEnergyKcal, 0)} kcal</strong></div>
                <div><span>4P + 4C + 9G</span><strong>{format(energyCheck?.macroEnergyKcal, 0)} kcal</strong></div>
                <div><span>Diferença</span><strong>{format(energyCheck?.differencePercent, 1)}%</strong></div>
              </div>
              <p className={energyCheck?.status === "review" ? styles.warning : styles.ok}>{energyCheck?.note}</p>
              <p className={styles.sourceNote}>Fonte operacional do MVP: USDA FoodData Central. TBCA permanece fonte brasileira prioritária para futura integração licenciada; dados TBCA não são reproduzidos automaticamente neste módulo.</p>
            </details>
          </section>

          <section className={styles.card} aria-labelledby="dietary-priorities-title">
            <div className={styles.sectionHeading}><div><span>5</span><h4 id="dietary-priorities-title">Prioridades e orientação</h4></div><small>Edite o texto e confirme a revisão clínica antes de disponibilizá-lo para outros documentos.</small></div>
            {assessment.priorities.length ? <div className={styles.priorityList}>{assessment.priorities.map((priority) => <article key={priority.code}><strong>{priority.title}</strong><p>{priority.rationale}</p></article>)}</div> : <p className={styles.empty}>Nenhuma prioridade automática foi identificada a partir das metas e referências registradas.</p>}
            <label className={styles.orientation}>Orientação clínica editável<textarea rows={8} value={orientationDraft} onChange={(event) => { setOrientationDraft(event.target.value); setOrientationReviewed(false); setIncludeInSoap(false); setIncludeInReport(false); }} /></label>
            <div className={styles.reviewRow}>
              <label><input type="checkbox" checked={orientationReviewed} onChange={(event) => { setOrientationReviewed(event.target.checked); if (!event.target.checked) { setIncludeInSoap(false); setIncludeInReport(false); } }} />Revisei clinicamente esta orientação</label>
              <label><input type="checkbox" disabled={!orientationReviewed} checked={includeInSoap} onChange={(event) => setIncludeInSoap(event.target.checked)} />Marcar para uso na evolução/SOAP</label>
              <label><input type="checkbox" disabled={!orientationReviewed} checked={includeInReport} onChange={(event) => setIncludeInReport(event.target.checked)} />Marcar para uso no relatório</label>
            </div>
            <div className={styles.actionRow}><button type="button" onClick={() => void copySummary()}>Copiar síntese revisável</button><button type="button" className={styles.primary} onClick={() => void save()} disabled={saving}>{saving ? "Salvando…" : "Salvar revisão"}</button></div>
            <p className={styles.disclaimer}>Estimativa baseada no relato, nas porções confirmadas e na composição da fonte selecionada. Não constitui prescrição dietética automática; metas, restrições, consistência e orientações exigem revisão profissional individualizada.</p>
          </section>

          {data?.history.length ? (
            <section className={styles.history} aria-label="Histórico alimentar recente">
              <strong>Comparações anteriores</strong>
              <div>{data.history.map((entry) => <span key={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleDateString("pt-BR")}: {format(entry.summary.energyKcal, 0)} kcal · {format(entry.summary.proteinG, 1)} g proteína</span>)}</div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
