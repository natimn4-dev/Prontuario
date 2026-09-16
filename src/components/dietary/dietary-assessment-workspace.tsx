"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_MEALS,
  HOUSEHOLD_MEASURES,
  parseDietaryNaturalLanguage,
  portionMetadata,
  renalProteinReference,
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
import { DIETARY_PORTION_DEFINITIONS } from "@/domain/dietary-guidance";
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
type TargetKey = keyof Pick<DietaryTargets, "energyKcalPerKgMin" | "energyKcalPerKgMax" | "proteinGPerKgMin" | "proteinGPerKgMax" | "calciumMg" | "fiberG">;

const MEASURE_LABELS: Record<HouseholdMeasure, string> = {
  g: "g — peso informado",
  ml: "mL — volume informado",
  "colher-cha": "colher de chá — confirmar equivalência",
  "colher-sobremesa": "colher de sobremesa — confirmar equivalência",
  "colher-sopa": "colher de sopa — confirmar equivalência",
  concha: "concha — confirmar equivalência",
  escumadeira: "escumadeira — confirmar equivalência",
  xicara: "xícara — confirmar equivalência",
  copo: "copo — confirmar equivalência",
  prato: "prato — descrever e confirmar",
  fatia: "fatia — confirmar tamanho/peso",
  unidade: "unidade — confirmar tamanho/peso",
  porcao: "porção — descrever equivalência",
  file: "filé — confirmar peso",
  bife: "bife — confirmar peso",
  pedaco: "pedaço — identificar corte e peso",
  "palma-mao": "palma da mão — estimativa visual",
  "file-pequeno": "filé pequeno — estimativa legado",
  "file-medio": "filé médio — estimativa legado",
  "file-grande": "filé grande — estimativa legado",
};

const freshMeals = (): UiDietaryMeal[] => DEFAULT_MEALS.map((meal) => ({ ...meal, items: [] }));
const draftMeals = (snapshot: DietaryAssessmentSnapshot | null): UiDietaryMeal[] => snapshot ? snapshot.meals.map((meal) => ({ id: meal.id, label: meal.label, items: meal.items.map((item) => ({ ...item, observation: (item as UiDietaryItem).observation })) })) : freshMeals();
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
  if (rounded == null) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(rounded);
};
const targetValue = (targets: DietaryTargets, key: TargetKey) => targets[key] == null ? "" : String(targets[key]);
const weightSourceLabel = (source: DietaryClinicalContext["weightSource"]) => source === "clinician" ? "informado/confirmado pelo médico" : source === "program55" ? "avaliação antropométrica registrada" : "não informada";
const uncertaintyLabel = (value?: string) => value ? `incerteza ${value}` : "incerteza não classificada";

function contextLabels(context: DietaryClinicalContext | null) {
  if (!context) return [];
  const labels: string[] = [];
  if (context.ckd) labels.push("Doença renal crônica");
  if (context.diabetes) labels.push("Diabetes");
  if (context.sarcopenia) labels.push("Sarcopenia");
  if (context.frailty) labels.push("Fragilidade");
  if (context.malnutrition) labels.push("Desnutrição");
  if (context.involuntaryWeightLoss) labels.push("Perda de peso involuntária");
  if (context.acuteIllness) labels.push("Doença aguda");
  if (context.cancer) labels.push("Câncer");
  if (context.dementia) labels.push("Comprometimento cognitivo/demência");
  if (context.dysphagia) labels.push("Disfagia");
  return labels;
}

export function DietaryAssessmentWorkspace({ consultationId, patientName }: { consultationId: string; patientName?: string }) {
  const [data, setData] = useState<LoadPayload | null>(null);
  const [meals, setMeals] = useState<UiDietaryMeal[]>(freshMeals);
  const [targets, setTargets] = useState<DietaryTargets>({});
  const [weightOverride, setWeightOverride] = useState("");
  const [renalEgfr, setRenalEgfr] = useState("");
  const [renalDialysis, setRenalDialysis] = useState(false);
  const [dialysisModality, setDialysisModality] = useState<DietaryClinicalContext["renalDialysisModality"]>(null);
  const [renalVeryLowProteinDiet, setRenalVeryLowProteinDiet] = useState(false);
  const [vlpdConfirmed, setVlpdConfirmed] = useState(false);
  const [malnutrition, setMalnutrition] = useState(false);
  const [involuntaryWeightLoss, setInvoluntaryWeightLoss] = useState(false);
  const [acuteIllness, setAcuteIllness] = useState(false);
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
  const [qualityFlags, setQualityFlags] = useState<UiDietaryItem["qualityFlags"]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPhrases = useMemo(() => parseDietaryNaturalLanguage(freeText), [freeText]);
  const assessment = data?.assessment ?? null;
  const energyCheck = assessment ? crossCheckDietaryEnergy(assessment.summary) : null;
  const renalContext: DietaryClinicalContext = {
    ...(data?.clinicalContext ?? {}),
    renalEgfrMlMinPer1_73: nonNegativeNumberOrNull(renalEgfr), renalDialysis,
    renalDialysisModality: dialysisModality,
    renalVeryLowProteinDiet, renalVeryLowProteinDietConfirmed: vlpdConfirmed,
    malnutrition, involuntaryWeightLoss, acuteIllness,
  };
  const renalReference = useMemo(() => renalProteinReference(renalContext), [data?.clinicalContext, renalEgfr, renalDialysis, dialysisModality, renalVeryLowProteinDiet, vlpdConfirmed, malnutrition, involuntaryWeightLoss, acuteIllness]);
  const activeContexts = contextLabels(renalContext);
  const totalItems = meals.reduce((sum, meal) => sum + meal.items.length, 0);

  async function load() {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/dietary-assessment`, { cache: "no-store" });
      const body = await response.json() as LoadPayload & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível carregar a avaliação alimentar.");
      const saved = body.assessment?.clinicalContext;
      setData(body); setMeals(draftMeals(body.assessment)); setTargets(body.assessment?.targets ?? {});
      setWeightOverride(saved?.weightSource === "clinician" && saved.weightKg ? String(saved.weightKg) : "");
      setRenalEgfr(saved?.renalEgfrMlMinPer1_73 == null ? "" : String(saved.renalEgfrMlMinPer1_73));
      setRenalDialysis(Boolean(saved?.renalDialysis)); setDialysisModality(saved?.renalDialysisModality ?? null);
      setRenalVeryLowProteinDiet(Boolean(saved?.renalVeryLowProteinDiet)); setVlpdConfirmed(Boolean(saved?.renalVeryLowProteinDietConfirmed));
      setMalnutrition(Boolean(saved?.malnutrition ?? body.clinicalContext.malnutrition));
      setInvoluntaryWeightLoss(Boolean(saved?.involuntaryWeightLoss ?? body.clinicalContext.involuntaryWeightLoss));
      setAcuteIllness(Boolean(saved?.acuteIllness));
      setOrientationDraft(body.assessment?.orientationDraft ?? ""); setOrientationReviewed(Boolean(body.assessment?.orientationReviewed));
      setIncludeInSoap(Boolean(body.assessment?.includeInSoap)); setIncludeInReport(Boolean(body.assessment?.includeInReport));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar avaliação alimentar."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [consultationId]);

  function patchTarget(key: TargetKey, value: string) {
    setTargets((current) => ({ ...current, [key]: numberOrNull(value), ...(key.startsWith("protein") ? { proteinTargetSource: "clinician-manual" as const, proteinTargetReference: null } : {}) }));
  }
  function applyRenalReference() {
    if (renalReference?.proteinGPerKgMin == null || renalReference.proteinGPerKgMax == null) return;
    setTargets((current) => ({ ...current, proteinGPerKgMin: renalReference.proteinGPerKgMin, proteinGPerKgMax: renalReference.proteinGPerKgMax, proteinTargetSource: "reference-suggestion", proteinTargetReference: renalReference.label }));
  }
  function patchItem(targetMealId: string, itemId: string, patch: Partial<UiDietaryItem>) {
    setMeals((current) => current.map((meal) => meal.id !== targetMealId ? meal : ({ ...meal, items: meal.items.map((item) => {
      if (item.id !== itemId) return item;
      const next = { ...item, ...patch };
      if (patch.measure === "g") next.grams = next.quantity;
      if (patch.measure && patch.measure !== "g") next.grams = null;
      if (patch.quantity != null && next.measure === "g") next.grams = patch.quantity;
      const metadata = portionMetadata(next.measure, next.grams ?? null);
      return { ...next, ...metadata };
    }) })));
  }
  const removeItem = (targetMealId: string, itemId: string) => setMeals((current) => current.map((meal) => meal.id === targetMealId ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) } : meal));

  async function searchFoods(query = foodQuery) {
    const trimmed = query.trim(); if (trimmed.length < 2) return;
    setSearching(true); setError(null); setSelectedFood(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/dietary-assessment/foods?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" });
      const body = await response.json() as { foods?: FoodResult[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "A base de alimentos não respondeu.");
      setFoodResults(body.foods ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao buscar alimentos."); }
    finally { setSearching(false); }
  }
  async function useParsedPhrase(index: number) {
    const parsed = parsedPhrases[index]; if (!parsed) return;
    setQuantity(parsed.quantity == null ? "" : String(parsed.quantity)); setMeasure(parsed.measure ?? "g"); setGrams("");
    setFoodQuery(parsed.foodQuery); setMessage(parsed.issue);
    if (parsed.foodQuery.length >= 2) await searchFoods(parsed.foodQuery);
  }
  function toggleQualityFlag(flag: "refined" | "ultraprocessed" | "free-sugar" | "whole-food") {
    setQualityFlags((current = []) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  }
  function addFood() {
    setError(null);
    if (!selectedFood) return setError("Selecione a correspondência do alimento antes de adicionar.");
    const parsedQuantity = numberOrNull(quantity); if (!parsedQuantity) return setError("Informe uma quantidade válida; dados ausentes não são convertidos em zero.");
    const parsedGrams = measure === "g" ? parsedQuantity : numberOrNull(grams);
    const metadata = portionMetadata(measure, parsedGrams);
    const item: UiDietaryItem = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      label: selectedFood.description, quantity: parsedQuantity, measure, grams: parsedGrams, ...metadata,
      food: { provider: selectedFood.provider, sourceId: selectedFood.sourceId, description: selectedFood.description, dataType: selectedFood.dataType },
      qualityFlags, observation: observation.trim() || undefined,
    };
    setMeals((current) => current.map((meal) => meal.id === mealId ? { ...meal, items: [...meal.items, item] } : meal));
    setSelectedFood(null); setFoodResults([]); setFoodQuery(""); setQuantity(""); setMeasure("g"); setGrams(""); setObservation(""); setQualityFlags([]);
  }

  async function save() {
    if (!data) return;
    setSaving(true); setError(null); setMessage(null);
    const clinicianWeight = numberOrNull(weightOverride);
    const clinicalContext: DietaryClinicalContext = {
      ...data.clinicalContext,
      weightKg: clinicianWeight ?? data.clinicalContext.weightKg,
      weightSource: clinicianWeight ? "clinician" : data.clinicalContext.weightSource,
      renalEgfrMlMinPer1_73: nonNegativeNumberOrNull(renalEgfr), renalDialysis,
      renalDialysisModality: renalDialysis ? dialysisModality : null,
      renalVeryLowProteinDiet, renalVeryLowProteinDietConfirmed: vlpdConfirmed,
      malnutrition, involuntaryWeightLoss, acuteIllness,
    };
    const payload: DietaryAssessmentInput = { schemaVersion: "dietary-assessment-v1", meals: meals as DietaryMeal[], targets, clinicalContext, orientationDraft, orientationReviewed, includeInSoap, includeInReport };
    try {
      const response = await fetch(`/api/consultations/${consultationId}/dietary-assessment`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedUpdatedAt: data.updatedAt, assessment: payload }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Não foi possível salvar a avaliação alimentar.");
      setMessage("Avaliação alimentar salva. Nutrientes e metadados de porção foram revalidados no servidor."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao salvar avaliação alimentar."); }
    finally { setSaving(false); }
  }

  async function copySummary() {
    if (!assessment) return;
    const comparison = assessment.proteinComparison;
    const text = ["AVALIAÇÃO ALIMENTAR — estimativa a partir do relato", `Peso utilizado: ${format(comparison?.weightKg, 1)} kg — fonte: ${weightSourceLabel(comparison?.weightSource)}`, `Proteína: ${format(assessment.summary.proteinG, 1)} g (${format(assessment.summary.proteinGPerKg, 2)} g/kg/d)`, comparison?.targetGPerKgMin != null ? `Meta registrada: ${format(comparison.targetGPerKgMin, 1)}–${format(comparison.targetGPerKgMax, 1)} g/kg/d; faixa diária ${format(comparison.targetTotalGMin, 1)}–${format(comparison.targetTotalGMax, 1)} g` : "Meta proteica: não definida", `Cálcio: ${format(assessment.summary.calciumMg, 0)} mg`, "", assessment.orientationDraft || assessment.generatedOrientation, "", "Resultado estimado: depende da completude e precisão do relato e das porções confirmadas."].join("\n");
    await navigator.clipboard.writeText(text); setMessage("Síntese copiada para a área de transferência.");
  }

  if (loading) return <div className={styles.loading} role="status">Carregando avaliação alimentar…</div>;
  const comparison = assessment?.proteinComparison;

  return <div className={styles.workspace}>
    <header className={styles.header}><div><span className={styles.eyebrow}>Recordatório alimentar e apoio à decisão</span><h3>Avaliação alimentar</h3><p className={styles.patientContext}>Paciente: <strong>{patientName ?? "Identificação vinculada à consulta"}</strong></p><p>O relato é autorreferido. Confirme alimento, quantidade, unidade e preparo antes de interpretar nutrientes.</p></div><div className={styles.headerMeta}><strong>{totalItems} alimento{totalItems === 1 ? "" : "s"}</strong><span>Status: {assessment?.assessmentStatus === "IN_REVIEW" ? "Em revisão" : assessment?.assessmentStatus === "DRAFT" ? "Rascunho" : "Não iniciado"}</span><span>{data?.clinicalContext.weightKg ? `Peso disponível: ${format(data.clinicalContext.weightKg, 1)} kg` : "Sem peso disponível"}</span></div></header>
    {error ? <div className={styles.error} role="alert">{error}</div> : null}{message ? <div className={styles.success} role="status">{message}</div> : null}

    <section className={styles.card} aria-labelledby="dietary-entry-title">
      <div className={styles.sectionHeading}><div><span>1</span><h4 id="dietary-entry-title">Relato alimentar</h4></div><small>Ausência não é zero e nenhuma porção recebe peso universal.</small></div>
      <div className={styles.warning}><strong>Como registrar porções</strong><p>Ovos: registre unidades consumidas; para a referência de porção do módulo, 1 porção = 3 ovos. Não presumir que uma unidade corresponda à porção completa.</p><p>Carne, frango ou peixe: informe o número de pedaços ou o peso. “1 palmo” é apenas uma estimativa visual e deve ser confirmado quando possível. Leite, iogurte e queijo devem usar, respectivamente, 1 copo, 1 unidade e 2 fatias como referências de porção.</p><p>Exemplos: 1 filé de peixe = confirmar peso · 1 pedaço de frango = informar corte · 1 bife = confirmar peso · palma da mão = estimativa, não medida exata.</p></div>
      <textarea className={styles.textarea} value={freeText} onChange={(event) => setFreeText(event.target.value)} placeholder="Ex.: 2 ovos; 1 filé de peixe; 3 colheres de arroz…" rows={3} />
      {parsedPhrases.length ? <div className={styles.parsedList}>{parsedPhrases.map((parsed, index) => <button key={`${parsed.raw}-${index}`} type="button" onClick={() => void useParsedPhrase(index)}><strong>{parsed.foodQuery || parsed.raw}</strong><span>{parsed.quantity ?? "?"} {parsed.measure ? MEASURE_LABELS[parsed.measure] : "medida a confirmar"}{parsed.issue ? ` · ${parsed.issue}` : ""}</span></button>)}</div> : null}
      <div className={styles.addGrid}>
        <label>Refeição<select value={mealId} onChange={(event) => setMealId(event.target.value)}>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.label}</option>)}</select></label>
        <label className={styles.foodSearch}>Buscar alimento<div className={styles.inline}><input value={foodQuery} onChange={(event) => setFoodQuery(event.target.value)} placeholder="Arroz cozido, ovo, frango…" /><button type="button" onClick={() => void searchFoods()} disabled={searching}>{searching ? "Buscando…" : "Buscar"}</button></div></label>
        <label>Quantidade <small>sem valor padrão</small><input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="informar" /></label>
        <label>Medida<select value={measure} onChange={(event) => { setMeasure(event.target.value as HouseholdMeasure); setGrams(""); }}>{HOUSEHOLD_MEASURES.map((item) => <option key={item} value={item}>{MEASURE_LABELS[item]}</option>)}</select></label>
        {measure !== "g" ? <label>Gramas estimados ou confirmados <small>deixe vazio se desconhecido; não inferir peso universal</small><input inputMode="decimal" value={grams} onChange={(event) => setGrams(event.target.value)} placeholder="opcional" /></label> : null}
        <label>Observação<input value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="preparo, corte, tamanho, pessoas da preparação…" /></label>
      </div>
      {foodResults.length ? <div className={styles.searchResults} aria-label="Resultados da busca de alimentos">{foodResults.map((food) => <button key={`${food.provider}-${food.sourceId}`} type="button" className={selectedFood?.sourceId === food.sourceId ? styles.selected : undefined} onClick={() => setSelectedFood(food)}><strong>{food.description}</strong><span>{food.provider === "USDA_FDC" ? "USDA FoodData Central" : "TBCA"} · {food.dataType ?? "tipo não informado"}</span></button>)}</div> : null}
      <fieldset className={styles.flags}><legend>Marcadores de qualidade (opcional)</legend>{([['whole-food','alimento in natura/minimamente processado'],['refined','refinado'],['ultraprocessed','ultraprocessado'],['free-sugar','açúcar livre']] as const).map(([flag, label]) => <label key={flag}><input type="checkbox" checked={qualityFlags?.includes(flag) ?? false} onChange={() => toggleQualityFlag(flag)} />{label}</label>)}</fieldset>
      <div className={styles.addAction}><span>{selectedFood ? `Selecionado: ${selectedFood.description}` : "Escolha um resultado da busca para confirmar o alimento."}</span><button type="button" onClick={addFood}>Adicionar alimento</button></div>
    </section>

    <section className={styles.card} aria-labelledby="dietary-meals-title"><div className={styles.sectionHeading}><div><span>2</span><h4 id="dietary-meals-title">Refeições registradas</h4></div><small>Itens sem conversão confiável permanecem como dados insuficientes e não entram no cálculo.</small></div><div className={styles.mealGrid}>{meals.map((meal) => <article key={meal.id} className={styles.mealCard}><header><strong>{meal.label}</strong><span>{meal.items.length} item(ns)</span></header>{!meal.items.length ? <p className={styles.empty}>Nenhum alimento registrado.</p> : meal.items.map((item) => <div key={item.id} className={styles.itemRow}><div className={styles.itemIdentity}><strong>{item.label}</strong><small>{item.quantity} × {MEASURE_LABELS[item.measure]} · {item.grams == null ? "gramas não confirmados" : `${format(item.grams, 0)} g ${item.estimated ? "estimados" : "confirmados"}`} · origem: {item.quantitySource ?? "dado ausente"} · {uncertaintyLabel(item.uncertainty)}</small>{item.estimated ? <small><strong>Estimativa — confirmar quantidade.</strong></small> : null}{item.grams == null ? <small>Dados insuficientes para cálculo nutricional.</small> : null}</div><label>Qtd.<input inputMode="decimal" value={item.quantity} onChange={(event) => { const value = numberOrNull(event.target.value); if (value) patchItem(meal.id, item.id, { quantity: value }); }} /></label><label>Medida<select value={item.measure} onChange={(event) => patchItem(meal.id, item.id, { measure: event.target.value as HouseholdMeasure })}>{HOUSEHOLD_MEASURES.map((option) => <option key={option} value={option}>{MEASURE_LABELS[option]}</option>)}</select></label>{item.measure !== "g" ? <label>g equivalentes<input inputMode="decimal" value={item.grams ?? ""} onChange={(event) => patchItem(meal.id, item.id, { grams: numberOrNull(event.target.value) })} /></label> : <span className={styles.grams}>{format(item.grams, 0)} g</span>}<label className={styles.itemObservation}>Observação<input value={item.observation ?? ""} onChange={(event) => patchItem(meal.id, item.id, { observation: event.target.value } as Partial<UiDietaryItem>)} /></label><button className={styles.remove} type="button" onClick={() => removeItem(meal.id, item.id)}>Remover</button></div>)}</article>)}</div></section>

    <section className={styles.card} aria-labelledby="dietary-targets-title">
      <div className={styles.sectionHeading}><div><span>3</span><h4 id="dietary-targets-title">Contexto e metas para comparação</h4></div><small>Referências são sugestões iniciais e nunca substituem decisão clínica.</small></div>
      <div className={styles.contextBar}>{activeContexts.length ? activeContexts.map((label) => <span key={label}>{label}</span>) : <span>Nenhum contexto automático adicional identificado</span>}</div>
      <fieldset className={styles.flags}><legend>Risco nutricional que exige individualização</legend><label><input type="checkbox" checked={malnutrition} onChange={(event) => setMalnutrition(event.target.checked)} />Desnutrição</label><label><input type="checkbox" checked={involuntaryWeightLoss} onChange={(event) => setInvoluntaryWeightLoss(event.target.checked)} />Perda de peso involuntária</label><label><input type="checkbox" checked={acuteIllness} onChange={(event) => setAcuteIllness(event.target.checked)} />Doença aguda</label></fieldset>
      {data?.clinicalContext.ckd ? <section className={styles.renalReference} aria-labelledby="renal-protein-reference-title"><div><strong id="renal-protein-reference-title">Referência renal por TFG</strong><span>A meta só muda após ação explícita “Usar como meta inicial”.</span></div><div className={styles.renalControls}><label>TFG atual, mL/min/1,73 m²<input inputMode="decimal" value={renalEgfr} onChange={(event) => { setRenalEgfr(event.target.value); setRenalVeryLowProteinDiet(false); setVlpdConfirmed(false); }} placeholder="informar" disabled={renalDialysis} /></label><label className={styles.checkLabel}><input type="checkbox" checked={renalDialysis} onChange={(event) => { setRenalDialysis(event.target.checked); if (!event.target.checked) setDialysisModality(null); setRenalVeryLowProteinDiet(false); setVlpdConfirmed(false); }} />Em diálise</label>{renalDialysis ? <label>Modalidade<select value={dialysisModality ?? ""} onChange={(event) => setDialysisModality((event.target.value || null) as DietaryClinicalContext["renalDialysisModality"])}><option value="">confirmar</option><option value="hemodialysis">Hemodiálise</option><option value="peritoneal">Diálise peritoneal</option><option value="other">Outra</option></select></label> : null}{renalReference?.code === "g4-g5" || renalReference?.code === "g4-g5-vlpd" ? <><label className={styles.checkLabel}><input type="checkbox" checked={renalVeryLowProteinDiet} onChange={(event) => { setRenalVeryLowProteinDiet(event.target.checked); if (!event.target.checked) setVlpdConfirmed(false); }} />Dieta muito baixa em proteína, caso selecionado</label>{renalVeryLowProteinDiet ? <label className={styles.checkLabel}><input type="checkbox" checked={vlpdConfirmed} onChange={(event) => setVlpdConfirmed(event.target.checked)} />Confirmo decisão clínica explícita e supervisão nefrológica/nutricional</label> : null}</> : null}</div>{renalReference ? <div className={styles.renalResult} role="status"><strong>{renalReference.label}</strong><span>{renalReference.proteinGPerKgMin == null ? "Sem meta automática" : `${format(renalReference.proteinGPerKgMin, 1)}–${format(renalReference.proteinGPerKgMax, 1)} g/kg/dia`}</span><p>{renalReference.note}</p>{renalReference.proteinGPerKgMin != null ? <button type="button" onClick={applyRenalReference}>Usar como meta inicial</button> : null}</div> : null}</section> : null}
      <div className={styles.targetGrid}><label>Peso utilizado, kg <small>origem atual: {weightOverride ? "informado/confirmado pelo médico" : weightSourceLabel(data?.clinicalContext.weightSource)}</small><input inputMode="decimal" value={weightOverride} onChange={(event) => setWeightOverride(event.target.value)} placeholder={data?.clinicalContext.weightKg ? format(data.clinicalContext.weightKg, 1) : "não disponível"} /></label><label>Energia mínima, kcal/kg/d<input inputMode="decimal" value={targetValue(targets, "energyKcalPerKgMin")} onChange={(event) => patchTarget("energyKcalPerKgMin", event.target.value)} /></label><label>Energia máxima, kcal/kg/d<input inputMode="decimal" value={targetValue(targets, "energyKcalPerKgMax")} onChange={(event) => patchTarget("energyKcalPerKgMax", event.target.value)} /></label><label>Proteína mínima, g/kg/d <small>{targets.proteinTargetSource === "reference-suggestion" ? `sugestão: ${targets.proteinTargetReference}` : "meta médica editável"}</small><input inputMode="decimal" value={targetValue(targets, "proteinGPerKgMin")} onChange={(event) => patchTarget("proteinGPerKgMin", event.target.value)} /></label><label>Proteína máxima, g/kg/d<input inputMode="decimal" value={targetValue(targets, "proteinGPerKgMax")} onChange={(event) => patchTarget("proteinGPerKgMax", event.target.value)} /></label><label>Cálcio, mg/d <small>referência automática: {data?.references.calciumMg ?? "—"} mg</small><input inputMode="decimal" value={targetValue(targets, "calciumMg")} onChange={(event) => patchTarget("calciumMg", event.target.value)} /></label><label>Fibras, g/d <small>referência automática: {data?.references.fiberG ?? "—"} g</small><input inputMode="decimal" value={targetValue(targets, "fiberG")} onChange={(event) => patchTarget("fiberG", event.target.value)} /></label></div>
    </section>

    <div className={styles.saveBar}><div><strong>Salvar e recalcular</strong><span>Alimento, composição, fonte, quantidade, incerteza e nutrientes são revalidados no servidor.</span></div><button type="button" onClick={() => void save()} disabled={saving || data?.status === "FINALIZED"}>{saving ? "Salvando…" : data?.status === "FINALIZED" ? "Consulta finalizada" : "Salvar avaliação"}</button></div>

    {assessment ? <><section className={styles.card} aria-labelledby="dietary-summary-title"><div className={styles.sectionHeading}><div><span>4</span><h4 id="dietary-summary-title">Resumo nutricional estimado</h4></div><small>Resultado depende da completude e precisão do relato.</small></div><div className={styles.metrics}><div><span>Peso utilizado</span><strong>{format(comparison?.weightKg, 1)} kg</strong><small>{weightSourceLabel(comparison?.weightSource)}</small></div><div><span>Proteína</span><strong>{format(assessment.summary.proteinG, 1)} g</strong><small>{format(assessment.summary.proteinGPerKg, 2)} g/kg/d</small></div><div><span>Meta proteica</span><strong>{comparison?.targetGPerKgMin == null ? "—" : `${format(comparison.targetGPerKgMin, 1)}–${format(comparison.targetGPerKgMax, 1)} g/kg/d`}</strong><small>{comparison?.targetTotalGMin == null ? "faixa diária não calculável" : `${format(comparison.targetTotalGMin, 1)}–${format(comparison.targetTotalGMax, 1)} g/d`}</small></div><div><span>Diferença para a faixa</span><strong>{comparison?.differenceToMinG == null ? "—" : `${format(comparison.differenceToMinG, 1)} / ${format(comparison.differenceToMaxG, 1)} g`}</strong><small>ingestão menos limite mínimo / máximo</small></div><div><span>Cálcio</span><strong>{format(assessment.summary.calciumMg, 0)} mg</strong><small>miligramas/dia</small></div><div><span>Carboidratos</span><strong>{format(assessment.summary.carbohydratesG, 1)} g</strong><small>{format(assessment.summary.carbohydrateEnergyPercent, 0)}% da energia estimada</small></div></div>{assessment.summary.incompleteItems ? <div className={styles.warning}>{assessment.summary.incompleteItems} item(ns) com dados insuficientes não foram incluídos no total.</div> : null}<details className={styles.technical}><summary>Quantidades utilizadas, origem e incerteza</summary><div className={styles.technicalGrid}>{assessment.meals.flatMap((meal) => meal.items).map((item) => <div key={item.id}><span>{item.label}</span><strong>{item.quantity} × {MEASURE_LABELS[item.measure]}</strong><small>{item.grams == null ? "gramas não confirmados" : `${format(item.grams, 0)} g ${item.estimated ? "estimados" : "confirmados"}`} · {item.quantitySource ?? "dado ausente"} · {uncertaintyLabel(item.uncertainty)}</small>{item.estimated ? <small>Estimativa — confirmar quantidade.</small> : null}</div>)}</div><div className={styles.technicalGrid}><div><span>Energia da fonte</span><strong>{format(energyCheck?.sourceEnergyKcal, 0)} kcal</strong></div><div><span>4P + 4C + 9G</span><strong>{format(energyCheck?.macroEnergyKcal, 0)} kcal</strong></div><div><span>Diferença</span><strong>{format(energyCheck?.differencePercent, 1)}%</strong></div></div><p className={energyCheck?.status === "review" ? styles.warning : styles.ok}>{energyCheck?.note}</p><p className={styles.sourceNote}>Fonte operacional: USDA FoodData Central, com identificador e versão persistidos por alimento. Estimativas de porção permanecem explicitamente marcadas; TBCA requer integração licenciada antes do uso automático.</p></details></section>
      <section className={styles.card} aria-labelledby="dietary-priorities-title"><div className={styles.sectionHeading}><div><span>5</span><h4 id="dietary-priorities-title">Prioridades e orientação</h4></div><small>O texto é editável e só pode seguir para SOAP/relatório após revisão clínica explícita.</small></div>{assessment.conditionalGuidance?.length ? <div className={styles.priorityList} aria-label="Orientações condicionais para revisão clínica">{assessment.conditionalGuidance.map((item) => <article key={item.code} data-severity={item.severity}><strong>{item.title}</strong><p>{item.text}</p><small>Referências: {item.evidenceRefs.join(", ")}</small></article>)}</div> : null}{assessment.priorities.length ? <div className={styles.priorityList}>{assessment.priorities.map((priority) => <article key={priority.code}><strong>{priority.title}</strong><p>{priority.rationale}</p></article>)}</div> : <p className={styles.empty}>Nenhuma prioridade automática foi identificada.</p>}<label className={styles.orientation}>Orientação clínica editável<textarea rows={12} value={orientationDraft} onChange={(event) => { setOrientationDraft(event.target.value); setOrientationReviewed(false); setIncludeInSoap(false); setIncludeInReport(false); }} /></label><div className={styles.reviewRow}><label><input type="checkbox" checked={orientationReviewed} onChange={(event) => { setOrientationReviewed(event.target.checked); if (!event.target.checked) { setIncludeInSoap(false); setIncludeInReport(false); } }} />Revisei clinicamente esta orientação</label><label><input type="checkbox" disabled={!orientationReviewed} checked={includeInSoap} onChange={(event) => setIncludeInSoap(event.target.checked)} />Marcar para uso na evolução/SOAP</label><label><input type="checkbox" disabled={!orientationReviewed} checked={includeInReport} onChange={(event) => setIncludeInReport(event.target.checked)} />Marcar para uso no relatório</label></div><div className={styles.actionRow}><button type="button" onClick={() => void copySummary()}>Copiar síntese revisável</button><button type="button" className={styles.primary} onClick={() => void save()} disabled={saving}>{saving ? "Salvando…" : "Salvar revisão"}</button></div><p className={styles.disclaimer}>Recordatório autorreferido, sujeito a incerteza de quantidade e preparo. Não constitui prescrição dietética automática.</p></section>
      {data?.history.length ? <section className={styles.history} aria-label="Histórico alimentar recente"><strong>Comparações anteriores</strong><div>{data.history.map((entry) => <span key={entry.occurredAt}>{new Date(entry.occurredAt).toLocaleDateString("pt-BR")}: {format(entry.summary.energyKcal, 0)} kcal · {format(entry.summary.proteinG, 1)} g proteína</span>)}</div></section> : null}</> : null}
  </div>;
}
