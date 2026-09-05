"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  calculateG8,
  type G8FoodIntake,
  type G8HealthStatus,
  type G8Mobility,
  type G8Neuropsychological,
  type G8WeightLoss,
} from "@/domain/oncogeriatria/calculators";
import styles from "./checklist-scales.module.css";

type Choice = { value: string; label: string; points: number };

type Feedback = { kind: "success" | "error"; text: string } | null;

const FOOD_CHOICES: Choice[] = [
  { value: "SEVERE_DECREASE", label: "Redução importante da ingestão", points: 0 },
  { value: "MODERATE_DECREASE", label: "Redução moderada da ingestão", points: 1 },
  { value: "NO_DECREASE", label: "Sem redução da ingestão", points: 2 },
];

const WEIGHT_CHOICES: Choice[] = [
  { value: "GT_3_KG", label: "Perda maior que 3 kg", points: 0 },
  { value: "UNKNOWN", label: "Não sabe informar", points: 1 },
  { value: "BETWEEN_1_AND_3_KG", label: "Perda entre 1 e 3 kg", points: 2 },
  { value: "NONE", label: "Sem perda de peso", points: 3 },
];

const MOBILITY_CHOICES: Choice[] = [
  { value: "BED_OR_CHAIR", label: "Restrito ao leito ou cadeira", points: 0 },
  { value: "GETS_UP_DOES_NOT_GO_OUT", label: "Levanta, mas não sai de casa", points: 1 },
  { value: "GOES_OUT", label: "Sai de casa", points: 2 },
];

const NEURO_CHOICES: Choice[] = [
  { value: "SEVERE", label: "Problemas neuropsicológicos graves", points: 0 },
  { value: "MILD", label: "Problemas neuropsicológicos leves", points: 1 },
  { value: "NONE", label: "Ausentes", points: 2 },
];

const MEDICATION_CHOICES: Choice[] = [
  { value: "YES", label: "Sim, usa mais de 3 medicamentos prescritos/dia", points: 0 },
  { value: "NO", label: "Não", points: 1 },
];

const HEALTH_CHOICES: Choice[] = [
  { value: "WORSE", label: "Pior", points: 0 },
  { value: "UNKNOWN", label: "Não sabe informar", points: 0.5 },
  { value: "SAME", label: "Igual", points: 1 },
  { value: "BETTER", label: "Melhor", points: 2 },
];

const CHARLSON_CHECKS = [
  { id: "mi", label: "Infarto do miocárdio", points: 1 },
  { id: "heartFailure", label: "Insuficiência cardíaca", points: 1 },
  { id: "peripheralVascular", label: "Doença vascular periférica", points: 1 },
  { id: "cerebrovascular", label: "Doença cerebrovascular", points: 1 },
  { id: "dementia", label: "Demência", points: 1 },
  { id: "chronicPulmonary", label: "Doença pulmonar crônica", points: 1 },
  { id: "connectiveTissue", label: "Doença do tecido conjuntivo", points: 1 },
  { id: "pepticUlcer", label: "Doença ulcerosa péptica", points: 1 },
  { id: "hemiplegia", label: "Hemiplegia", points: 2 },
  { id: "renal", label: "Doença renal moderada/grave", points: 2 },
  { id: "leukemia", label: "Leucemia", points: 2 },
  { id: "lymphoma", label: "Linfoma", points: 2 },
  { id: "aids", label: "AIDS", points: 6 },
] as const;

type CharlsonCheckId = typeof CHARLSON_CHECKS[number]["id"];

const DIABETES_CHOICES: Choice[] = [
  { value: "0", label: "Ausente", points: 0 },
  { value: "1", label: "Diabetes sem lesão de órgão-alvo", points: 1 },
  { value: "2", label: "Diabetes com lesão de órgão-alvo", points: 2 },
];

const LIVER_CHOICES: Choice[] = [
  { value: "0", label: "Ausente", points: 0 },
  { value: "1", label: "Doença hepática leve", points: 1 },
  { value: "3", label: "Doença hepática moderada/grave", points: 3 },
];

const TUMOR_CHOICES: Choice[] = [
  { value: "0", label: "Ausente", points: 0 },
  { value: "2", label: "Tumor sólido sem metástase", points: 2 },
  { value: "6", label: "Tumor sólido metastático", points: 6 },
];

const AGE_CHOICES: Choice[] = [
  { value: "0", label: "Menos de 50 anos", points: 0 },
  { value: "1", label: "50–59 anos", points: 1 },
  { value: "2", label: "60–69 anos", points: 2 },
  { value: "3", label: "70–79 anos", points: 3 },
  { value: "4", label: "80 anos ou mais", points: 4 },
];

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null) as { message?: string; result?: { score?: number; scoreText?: string; classification?: string } } | null;
  if (!response.ok) throw new Error(data?.message ?? "Não foi possível salvar a avaliação.");
  return data;
}

function RadioQuestion({
  legend,
  name,
  choices,
  value,
  disabled,
  onChange,
}: {
  legend: string;
  name: string;
  choices: Choice[];
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className={styles.question} disabled={disabled}>
      <legend>{legend}</legend>
      <div className={styles.optionGrid} role="radiogroup" aria-label={legend}>
        {choices.map((choice) => (
          <label className={value === choice.value ? styles.optionSelected : styles.optionCard} key={`${name}-${choice.value}`}>
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{choice.label}</span>
            <strong>{choice.points} {choice.points === 1 ? "ponto" : "pontos"}</strong>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ResultBar({ children }: { children: ReactNode }) {
  return <div className={styles.resultBar} role="status">{children}</div>;
}

export function G8ChecklistForm({ patientId, episodeId, checkpointId }: { patientId: string; episodeId: string; checkpointId: string }) {
  const [foodIntake, setFoodIntake] = useState("");
  const [weightLoss, setWeightLoss] = useState("");
  const [mobility, setMobility] = useState("");
  const [neuropsychological, setNeuropsychological] = useState("");
  const [bmi, setBmi] = useState("");
  const [polypharmacy, setPolypharmacy] = useState("");
  const [health, setHealth] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const preview = useMemo(() => {
    if (!foodIntake || !weightLoss || !mobility || !neuropsychological || !bmi || !polypharmacy || !health || !ageYears) return null;
    try {
      return calculateG8({
        foodIntake: foodIntake as G8FoodIntake,
        weightLoss: weightLoss as G8WeightLoss,
        mobility: mobility as G8Mobility,
        neuropsychological: neuropsychological as G8Neuropsychological,
        bmi: Number(bmi.replace(",", ".")),
        takesMoreThanThreePrescriptionDrugs: polypharmacy === "YES",
        healthStatusComparedWithPeers: health as G8HealthStatus,
        ageYears: Number(ageYears),
      });
    } catch {
      return null;
    }
  }, [foodIntake, weightLoss, mobility, neuropsychological, bmi, polypharmacy, health, ageYears]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      setFeedback({ kind: "error", text: "Preencha todos os itens do G8 antes de registrar." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await postJson(`/api/oncogeriatria/patients/${patientId}`, {
        action: "G8_SAVE",
        episodeId,
        checkpointId,
        answers: {
          foodIntake,
          weightLoss,
          mobility,
          neuropsychological,
          bmi: Number(bmi.replace(",", ".")),
          takesMoreThanThreePrescriptionDrugs: polypharmacy === "YES",
          healthStatusComparedWithPeers: health,
          ageYears: Number(ageYears),
        },
      });
      setFeedback({ kind: "success", text: `G8 registrado: ${preview.score}/17.` });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar o G8." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.scaleForm} onSubmit={submit}>
      <header className={styles.scaleHeader}>
        <div>
          <p className="eyebrow">Triagem oncogeriátrica</p>
          <h3>G8</h3>
          <p>As alternativas ficam visíveis para reduzir cliques e erros de seleção. Cada item aceita uma única resposta.</p>
        </div>
        <span className={styles.badge}>0–17 pontos</span>
      </header>

      <RadioQuestion legend="1. Ingestão alimentar nos últimos 3 meses" name="g8-food" choices={FOOD_CHOICES} value={foodIntake} disabled={saving} onChange={setFoodIntake} />
      <RadioQuestion legend="2. Perda de peso nos últimos 3 meses" name="g8-weight" choices={WEIGHT_CHOICES} value={weightLoss} disabled={saving} onChange={setWeightLoss} />
      <RadioQuestion legend="3. Mobilidade" name="g8-mobility" choices={MOBILITY_CHOICES} value={mobility} disabled={saving} onChange={setMobility} />
      <RadioQuestion legend="4. Problemas neuropsicológicos" name="g8-neuro" choices={NEURO_CHOICES} value={neuropsychological} disabled={saving} onChange={setNeuropsychological} />

      <div className={styles.numericGrid}>
        <label className={styles.numericField}>
          <span>5. IMC</span>
          <input inputMode="decimal" value={bmi} disabled={saving} onChange={(event) => setBmi(event.target.value)} placeholder="Ex.: 22,4" required />
          <small>A pontuação é calculada automaticamente pelas faixas do G8.</small>
        </label>
        <label className={styles.numericField}>
          <span>8. Idade</span>
          <input type="number" min="0" max="130" value={ageYears} disabled={saving} onChange={(event) => setAgeYears(event.target.value)} required />
          <small>Use a idade atual do paciente.</small>
        </label>
      </div>

      <RadioQuestion legend="6. Mais de 3 medicamentos prescritos por dia?" name="g8-meds" choices={MEDICATION_CHOICES} value={polypharmacy} disabled={saving} onChange={setPolypharmacy} />
      <RadioQuestion legend="7. Saúde comparada a pessoas da mesma idade" name="g8-health" choices={HEALTH_CHOICES} value={health} disabled={saving} onChange={setHealth} />

      {preview ? (
        <ResultBar>
          <div><span>Prévia do escore</span><strong>{preview.score}/17</strong></div>
          <p>{preview.classification === "VULNERABLE_SCREEN" ? "Rastreio positivo para vulnerabilidade (≤14)." : "Rastreio negativo para vulnerabilidade (>14)."} O resultado não substitui a avaliação geriátrica clínica.</p>
        </ResultBar>
      ) : <p className={styles.hint}>Complete os 8 itens para visualizar a pontuação antes de salvar.</p>}

      <div className={styles.actions}>
        <span>Seleção única por item; pontuação recalculada no servidor ao salvar.</span>
        <button type="submit" disabled={saving || !preview}>{saving ? "Salvando…" : "Calcular e registrar G8"}</button>
      </div>
      {feedback ? <p className={feedback.kind === "success" ? styles.success : styles.error} role="status">{feedback.text}</p> : null}
    </form>
  );
}

export function CharlsonChecklistForm({ consultationId }: { consultationId: string }) {
  const [checks, setChecks] = useState<Record<CharlsonCheckId, boolean>>(() => Object.fromEntries(CHARLSON_CHECKS.map((item) => [item.id, false])) as Record<CharlsonCheckId, boolean>);
  const [diabetes, setDiabetes] = useState("0");
  const [liver, setLiver] = useState("0");
  const [tumor, setTumor] = useState("0");
  const [includeAge, setIncludeAge] = useState(false);
  const [ageBand, setAgeBand] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const comorbidityScore = useMemo(() => {
    const independent = CHARLSON_CHECKS.reduce((sum, item) => sum + (checks[item.id] ? item.points : 0), 0);
    return independent + Number(diabetes) + Number(liver) + Number(tumor);
  }, [checks, diabetes, liver, tumor]);
  const ageScore = includeAge ? Number(ageBand || 0) : 0;
  const total = comorbidityScore + ageScore;
  const classification = total <= 2 ? "Baixa carga" : total <= 4 ? "Carga moderada" : "Alta carga";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (includeAge && ageBand === "") {
      setFeedback({ kind: "error", text: "Selecione a faixa etária ou desative o ajuste por idade." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const response = await postJson(`/api/consultations/${consultationId}/scales/complementary`, {
        scaleCode: "charlson",
        answers: { score: total },
      });
      const scoreText = response?.result?.scoreText ?? String(total);
      setFeedback({ kind: "success", text: `Charlson registrado: ${scoreText}.` });
      window.dispatchEvent(new CustomEvent("clinical-scales-changed", { detail: { consultationId } }));
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar o Charlson." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.scaleForm} onSubmit={submit}>
      <header className={styles.scaleHeader}>
        <div>
          <p className="eyebrow">Prognóstico e carga de comorbidades</p>
          <h3>Índice de Charlson</h3>
          <p>Marque somente as condições presentes. Os pesos aparecem ao lado e o total é calculado automaticamente.</p>
        </div>
        <span className={styles.badge}>Cálculo automático</span>
      </header>

      <fieldset className={styles.question} disabled={saving}>
        <legend>Comorbidades independentes</legend>
        <div className={styles.checkboxGrid}>
          {CHARLSON_CHECKS.map((item) => (
            <label className={checks[item.id] ? styles.checkboxSelected : styles.checkboxCard} key={item.id}>
              <input
                type="checkbox"
                checked={checks[item.id]}
                onChange={(event) => setChecks((current) => ({ ...current, [item.id]: event.target.checked }))}
              />
              <span>{item.label}</span>
              <strong>+{item.points}</strong>
            </label>
          ))}
        </div>
      </fieldset>

      <RadioQuestion legend="Diabetes — marque apenas a maior gravidade aplicável" name="charlson-diabetes" choices={DIABETES_CHOICES} value={diabetes} disabled={saving} onChange={setDiabetes} />
      <RadioQuestion legend="Doença hepática — marque apenas a maior gravidade aplicável" name="charlson-liver" choices={LIVER_CHOICES} value={liver} disabled={saving} onChange={setLiver} />
      <RadioQuestion legend="Tumor sólido — não some doença localizada e metastática" name="charlson-tumor" choices={TUMOR_CHOICES} value={tumor} disabled={saving} onChange={setTumor} />

      <fieldset className={styles.question} disabled={saving}>
        <legend>Ajuste por idade</legend>
        <label className={includeAge ? styles.ageToggleSelected : styles.ageToggle}>
          <input type="checkbox" checked={includeAge} onChange={(event) => { setIncludeAge(event.target.checked); if (!event.target.checked) setAgeBand(""); }} />
          <span><strong>Incluir ajuste etário clássico</strong><small>Ative somente quando o protocolo usado nesta avaliação incluir idade.</small></span>
        </label>
        {includeAge ? <div className={styles.ageOptions}><RadioQuestion legend="Faixa etária" name="charlson-age" choices={AGE_CHOICES} value={ageBand} disabled={saving} onChange={setAgeBand} /></div> : null}
      </fieldset>

      <ResultBar>
        <div className={styles.scoreBreakdown}>
          <span>Comorbidades <strong>{comorbidityScore}</strong></span>
          <span>Idade <strong>+{ageScore}</strong></span>
          <span>Total <strong>{total}</strong></span>
        </div>
        <p>{classification}. A faixa interpretativa é a regra local histórica do prontuário; o índice deve ser integrado à funcionalidade, fragilidade e metas de cuidado.</p>
      </ResultBar>

      <div className={styles.actions}>
        <span>Gravidades mutuamente exclusivas evitam dupla contagem.</span>
        <button type="submit" disabled={saving || (includeAge && ageBand === "")}>{saving ? "Salvando…" : "Registrar Charlson"}</button>
      </div>
      {feedback ? <p className={feedback.kind === "success" ? styles.success : styles.error} role="status">{feedback.text}</p> : null}
    </form>
  );
}
