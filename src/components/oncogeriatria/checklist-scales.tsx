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

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(data?.message ?? "Não foi possível salvar a avaliação.");
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

      <label className={styles.numericField}>
        <span>5. IMC</span>
        <input inputMode="decimal" value={bmi} disabled={saving} onChange={(event) => setBmi(event.target.value)} placeholder="Ex.: 22,4" required />
        <small>A pontuação é calculada automaticamente pelas faixas do G8.</small>
      </label>

      <RadioQuestion legend="6. Mais de 3 medicamentos prescritos por dia?" name="g8-meds" choices={MEDICATION_CHOICES} value={polypharmacy} disabled={saving} onChange={setPolypharmacy} />
      <RadioQuestion legend="7. Saúde comparada a pessoas da mesma idade" name="g8-health" choices={HEALTH_CHOICES} value={health} disabled={saving} onChange={setHealth} />

      <label className={styles.numericField}>
        <span>8. Idade</span>
        <input type="number" min="0" max="130" value={ageYears} disabled={saving} onChange={(event) => setAgeYears(event.target.value)} required />
        <small>Use a idade atual do paciente.</small>
      </label>

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
