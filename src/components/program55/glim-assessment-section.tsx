"use client";

import { useMemo, useState } from "react";
import {
  evaluateGlim,
  GLIM_SOURCE_CITATION,
  storedGlimRecordFromStructuredData,
  type GlimClinicianDecision,
  type GlimTriState,
  type GlimWeightLossPeriod,
} from "@/domain/program55/glim";

const triStateOptions: { value: GlimTriState; label: string }[] = [
  { value: "NOT_ASSESSED", label: "Não avaliado" },
  { value: "NO", label: "Não" },
  { value: "YES", label: "Sim" },
];

const clinicianDecisionOptions: { value: GlimClinicianDecision; label: string }[] = [
  { value: "PENDING", label: "Pendente de revisão profissional" },
  { value: "CONFIRMED", label: "Confirmado após revisão profissional" },
  { value: "NOT_CONFIRMED", label: "Não confirmado após revisão profissional" },
];

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function GlimAssessmentSection({ ageYears, initialBmi = null, initialData = {} }: {
  ageYears: number;
  initialBmi?: number | null;
  initialData?: Record<string, unknown>;
}) {
  const stored = storedGlimRecordFromStructuredData(initialData);
  const [screeningRisk, setScreeningRisk] = useState<GlimTriState>(stored?.screeningRisk ?? "NOT_ASSESSED");
  const [weightLossPercent, setWeightLossPercent] = useState(stored?.weightLossPercent?.toString() ?? "");
  const [weightLossPeriod, setWeightLossPeriod] = useState<GlimWeightLossPeriod>(stored?.weightLossPeriod ?? "NOT_ASSESSED");
  const [bmi, setBmi] = useState(stored?.bmi?.toString() ?? initialBmi?.toString() ?? "");
  const [reducedMuscleMass, setReducedMuscleMass] = useState<GlimTriState>(stored?.reducedMuscleMass ?? "NOT_ASSESSED");
  const [reducedFoodIntakeOrAssimilation, setReducedFoodIntakeOrAssimilation] = useState<GlimTriState>(stored?.reducedFoodIntakeOrAssimilation ?? "NOT_ASSESSED");
  const [inflammationOrDiseaseBurden, setInflammationOrDiseaseBurden] = useState<GlimTriState>(stored?.inflammationOrDiseaseBurden ?? "NOT_ASSESSED");
  const [clinicianDecision, setClinicianDecision] = useState<GlimClinicianDecision>(stored?.clinicianDecision ?? "PENDING");

  const result = useMemo(() => evaluateGlim({
    ageYears,
    weightLossPercent: numberOrNull(weightLossPercent),
    weightLossPeriod,
    bmi: numberOrNull(bmi),
    reducedMuscleMass,
    reducedFoodIntakeOrAssimilation,
    inflammationOrDiseaseBurden,
  }), [ageYears, bmi, inflammationOrDiseaseBurden, reducedFoodIntakeOrAssimilation, reducedMuscleMass, weightLossPercent, weightLossPeriod]);

  return (
    <fieldset style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, margin: 0 }}>
      <legend style={{ padding: "0 8px", fontWeight: 700 }}>GLIM — diagnóstico de desnutrição</legend>
      <div className="notice" style={{ marginBottom: 16 }}>
        <strong>Apoio à decisão clínica</strong>
        <span>O sistema verifica os critérios GLIM e sugere a classificação. A conclusão só é compartilhada no MAPA 55+ após confirmação profissional explícita. Massa muscular reduzida pode confirmar o fenótipo, mas não gradua automaticamente a gravidade.</span>
      </div>

      <label>Triagem nutricional prévia identificou risco?<select name="glimScreeningRisk" value={screeningRisk} onChange={(event) => setScreeningRisk(event.target.value as GlimTriState)}>{triStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <label>Perda de peso involuntária (%)<input name="glimWeightLossPercent" type="number" min="0" step="0.1" value={weightLossPercent} onChange={(event) => setWeightLossPercent(event.target.value)} /></label>
        <label>Período da perda de peso<select name="glimWeightLossPeriod" value={weightLossPeriod} onChange={(event) => setWeightLossPeriod(event.target.value as GlimWeightLossPeriod)}><option value="NOT_ASSESSED">Não avaliado</option><option value="WITHIN_6_MONTHS">Até 6 meses</option><option value="BEYOND_6_MONTHS">Mais de 6 meses</option></select></label>
        <label>IMC usado no GLIM<input name="glimBmi" type="number" min="0.1" step="0.01" value={bmi} onChange={(event) => setBmi(event.target.value)} /><span className="muted">Faixa etária neste checkpoint: {ageYears} anos.</span></label>
      </div>

      <label>Massa muscular reduzida?<select name="glimReducedMuscleMass" value={reducedMuscleMass} onChange={(event) => setReducedMuscleMass(event.target.value as GlimTriState)}>{triStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Método/referência para massa muscular<input name="glimMuscleMassMethod" defaultValue={stored?.muscleMassMethod ?? ""} placeholder="Ex.: BIA, DXA, TC, RM ou outro método documentado" /></label>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <label>Redução da ingestão ou assimilação?<select name="glimReducedFoodIntakeOrAssimilation" value={reducedFoodIntakeOrAssimilation} onChange={(event) => setReducedFoodIntakeOrAssimilation(event.target.value as GlimTriState)}>{triStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="muted">≤50% das necessidades por &gt;1 semana, qualquer redução por &gt;2 semanas ou condição GI que prejudique assimilação/absorção.</span></label>
        <label>Inflamação ou carga da doença?<select name="glimInflammationOrDiseaseBurden" value={inflammationOrDiseaseBurden} onChange={(event) => setInflammationOrDiseaseBurden(event.target.value as GlimTriState)}>{triStateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="muted">Pode ser estabelecida por julgamento clínico. Marcadores como PCR podem apoiar, mas não são requisito obrigatório.</span></label>
      </div>
      <label>Observações etiológicas<textarea name="glimEtiologicNotes" rows={2} defaultValue={stored?.etiologicNotes ?? ""} /></label>

      <div className="card" aria-live="polite" style={{ marginTop: 16 }}>
        <p className="eyebrow">Resultado calculado</p>
        <p><strong>{result.decisionSupportLabel}</strong></p>
        <p className="muted">Fenotípicos presentes: {result.phenotypeCount} · Etiológicos presentes: {result.etiologicCount}.</p>
        {result.severityBasis.length ? <p className="muted">Gravidade baseada em: {result.severityBasis.map((item) => item === "WEIGHT_LOSS" ? "perda de peso" : "IMC").join(" e ")}.</p> : null}
        {result.boundaryReviewRequired ? <p role="alert"><strong>Revisão necessária:</strong> valor exatamente no limite inferior da tabela de gravidade; a tabela diagnóstica publicada usa sinal de “maior que”. Não confirmar automaticamente sem julgamento profissional.</p> : null}
      </div>

      <label style={{ marginTop: 16 }}>Decisão profissional<select name="glimClinicianDecision" value={clinicianDecision} onChange={(event) => setClinicianDecision(event.target.value as GlimClinicianDecision)}>{clinicianDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Nota da revisão profissional<textarea name="glimClinicianNote" rows={2} defaultValue={stored?.clinicianNote ?? ""} /></label>
      <p className="muted">Referência implementada: {GLIM_SOURCE_CITATION}. Atualização de 5 anos; sem graduação automática de massa muscular.</p>
    </fieldset>
  );
}
