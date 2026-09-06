"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  calculateCarg,
  calculateG8,
  type CargBiologicalSex,
  type CargCancerType,
  type CargHearing,
  type G8FoodIntake,
  type G8HealthStatus,
  type G8Mobility,
  type G8Neuropsychological,
  type G8WeightLoss,
} from "@/domain/oncogeriatria/calculators";
import styles from "./checklist-scales.module.css";

type Choice = { value: string; label: string; points?: number };
type Feedback = { kind: "success" | "error"; text: string } | null;
type InitialAnswers = Record<string, unknown> | null | undefined;

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

const CARG_CANCER_CHOICES: Choice[] = [
  { value: "GI_GU", label: "Gastrointestinal ou geniturinário", points: 2 },
  { value: "OTHER", label: "Outro tipo", points: 0 },
];

const CARG_DOSE_CHOICES: Choice[] = [
  { value: "YES", label: "Dose inicial padrão", points: 2 },
  { value: "NO", label: "Dose inicial reduzida", points: 0 },
];

const CARG_AGENT_CHOICES: Choice[] = [
  { value: "YES", label: "Mais de um quimioterápico", points: 2 },
  { value: "NO", label: "Um quimioterápico", points: 0 },
];

const CARG_SEX_CHOICES: Choice[] = [
  { value: "FEMALE", label: "Feminino" },
  { value: "MALE", label: "Masculino" },
];

const CARG_HEARING_CHOICES: Choice[] = [
  { value: "EXCELLENT_GOOD", label: "Excelente ou boa", points: 0 },
  { value: "FAIR_OR_WORSE", label: "Regular, ruim ou surdez total", points: 2 },
];

function yesNoChoices(yesPoints: number): Choice[] {
  return [
    { value: "YES", label: "Sim", points: yesPoints },
    { value: "NO", label: "Não", points: 0 },
  ];
}

function initialString(answers: InitialAnswers, key: string, fallback = ""): string {
  return typeof answers?.[key] === "string" ? String(answers[key]) : fallback;
}

function initialNumber(answers: InitialAnswers, key: string, fallback?: number): string {
  return typeof answers?.[key] === "number" && Number.isFinite(answers[key]) ? String(answers[key]) : fallback === undefined ? "" : String(fallback);
}

function initialBooleanChoice(answers: InitialAnswers, key: string): string {
  return typeof answers?.[key] === "boolean" ? answers[key] ? "YES" : "NO" : "";
}

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
            {choice.points === undefined ? null : <strong>{choice.points} {choice.points === 1 ? "ponto" : "pontos"}</strong>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ResultBar({ children }: { children: ReactNode }) {
  return <div className={styles.resultBar} role="status">{children}</div>;
}

export function G8ChecklistForm({ patientId, episodeId, checkpointId, initialAgeYears, initialAnswers }: { patientId: string; episodeId: string; checkpointId: string; initialAgeYears?: number; initialAnswers?: InitialAnswers }) {
  const [foodIntake, setFoodIntake] = useState(() => initialString(initialAnswers, "foodIntake"));
  const [weightLoss, setWeightLoss] = useState(() => initialString(initialAnswers, "weightLoss"));
  const [mobility, setMobility] = useState(() => initialString(initialAnswers, "mobility"));
  const [neuropsychological, setNeuropsychological] = useState(() => initialString(initialAnswers, "neuropsychological"));
  const [bmi, setBmi] = useState(() => initialNumber(initialAnswers, "bmi"));
  const [polypharmacy, setPolypharmacy] = useState(() => initialBooleanChoice(initialAnswers, "takesMoreThanThreePrescriptionDrugs"));
  const [health, setHealth] = useState(() => initialString(initialAnswers, "healthStatusComparedWithPeers"));
  const [ageYears, setAgeYears] = useState(() => initialNumber(initialAnswers, "ageYears", initialAgeYears));
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

export function CargChecklistForm({
  patientId,
  episodeId,
  checkpointId,
  initialAgeYears,
  initialBiologicalSex,
  initialAnswers,
}: {
  patientId: string;
  episodeId: string;
  checkpointId: string;
  initialAgeYears?: number;
  initialBiologicalSex?: CargBiologicalSex;
  initialAnswers?: InitialAnswers;
}) {
  const [ageYears, setAgeYears] = useState(() => initialNumber(initialAnswers, "ageYears", initialAgeYears));
  const [cancerType, setCancerType] = useState(() => initialString(initialAnswers, "cancerType"));
  const [standardDose, setStandardDose] = useState(() => initialBooleanChoice(initialAnswers, "standardDose"));
  const [multipleAgents, setMultipleAgents] = useState(() => initialBooleanChoice(initialAnswers, "multipleChemotherapyAgents"));
  const [biologicalSex, setBiologicalSex] = useState(() => initialString(initialAnswers, "biologicalSex", initialBiologicalSex));
  const [hemoglobin, setHemoglobin] = useState(() => initialNumber(initialAnswers, "hemoglobinGdl"));
  const [creatinineClearance, setCreatinineClearance] = useState(() => initialNumber(initialAnswers, "creatinineClearanceMlMin"));
  const [hearing, setHearing] = useState(() => initialString(initialAnswers, "hearing"));
  const [falls, setFalls] = useState(() => initialBooleanChoice(initialAnswers, "oneOrMoreFallsLastSixMonths"));
  const [medicationHelp, setMedicationHelp] = useState(() => initialBooleanChoice(initialAnswers, "needsHelpTakingMedications"));
  const [walkingLimited, setWalkingLimited] = useState(() => initialBooleanChoice(initialAnswers, "limitedWalkingOneBlock"));
  const [socialActivity, setSocialActivity] = useState(() => initialBooleanChoice(initialAnswers, "decreasedSocialActivity"));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const preview = useMemo(() => {
    if (!ageYears || !cancerType || !standardDose || !multipleAgents || !biologicalSex || !hemoglobin || !creatinineClearance || !hearing || !falls || !medicationHelp || !walkingLimited || !socialActivity) return null;
    try {
      return calculateCarg({
        ageYears: Number(ageYears),
        cancerType: cancerType as CargCancerType,
        standardDose: standardDose === "YES",
        multipleChemotherapyAgents: multipleAgents === "YES",
        biologicalSex: biologicalSex as CargBiologicalSex,
        hemoglobinGdl: Number(hemoglobin.replace(",", ".")),
        creatinineClearanceMlMin: Number(creatinineClearance.replace(",", ".")),
        hearing: hearing as CargHearing,
        oneOrMoreFallsLastSixMonths: falls === "YES",
        needsHelpTakingMedications: medicationHelp === "YES",
        limitedWalkingOneBlock: walkingLimited === "YES",
        decreasedSocialActivity: socialActivity === "YES",
      });
    } catch {
      return null;
    }
  }, [ageYears, biologicalSex, cancerType, creatinineClearance, falls, hearing, hemoglobin, medicationHelp, multipleAgents, socialActivity, standardDose, walkingLimited]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) {
      setFeedback({ kind: "error", text: "Preencha os 11 fatores do CARG e o sexo de referência laboratorial antes de registrar." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      await postJson(`/api/oncogeriatria/patients/${patientId}`, {
        action: "CARG_SAVE",
        episodeId,
        checkpointId,
        answers: {
          ageYears: Number(ageYears),
          cancerType,
          standardDose: standardDose === "YES",
          multipleChemotherapyAgents: multipleAgents === "YES",
          biologicalSex,
          hemoglobinGdl: Number(hemoglobin.replace(",", ".")),
          creatinineClearanceMlMin: Number(creatinineClearance.replace(",", ".")),
          hearing,
          oneOrMoreFallsLastSixMonths: falls === "YES",
          needsHelpTakingMedications: medicationHelp === "YES",
          limitedWalkingOneBlock: walkingLimited === "YES",
          decreasedSocialActivity: socialActivity === "YES",
        },
      });
      setFeedback({ kind: "success", text: `CARG registrado: ${preview.score}/23 · ${preview.category === "LOW" ? "baixo risco" : preview.category === "INTERMEDIATE" ? "risco intermediário" : "alto risco"}.` });
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível salvar o CARG." });
    } finally {
      setSaving(false);
    }
  }

  const categoryLabel = preview?.category === "LOW" ? "Baixo risco" : preview?.category === "INTERMEDIATE" ? "Risco intermediário" : "Alto risco";

  return (
    <form className={styles.scaleForm} onSubmit={submit}>
      <header className={styles.scaleHeader}>
        <div>
          <p className="eyebrow">Risco de toxicidade da quimioterapia</p>
          <h3>CARG</h3>
          <p>Preencha os fatores antes do início de um novo esquema de quimioterapia. O cálculo é local, transparente e não define conduta antineoplásica.</p>
        </div>
        <span className={styles.badge}>0–23 pontos</span>
      </header>

      <section className={styles.formSection} aria-labelledby="carg-treatment-data">
        <h4 id="carg-treatment-data">Paciente, tumor e tratamento</h4>
        <div className={styles.numericGrid}>
          <label className={styles.numericField}>
            <span>1. Idade no início do esquema</span>
            <input type="number" min="0" max="130" value={ageYears} disabled={saving} onChange={(event) => setAgeYears(event.target.value)} required />
            <small>72 anos ou mais: 2 pontos.</small>
          </label>
        </div>
        <RadioQuestion legend="2. Tipo de câncer" name="carg-cancer" choices={CARG_CANCER_CHOICES} value={cancerType} disabled={saving} onChange={setCancerType} />
        <RadioQuestion legend="3. Dose planejada para o primeiro ciclo" name="carg-dose" choices={CARG_DOSE_CHOICES} value={standardDose} disabled={saving} onChange={setStandardDose} />
        <RadioQuestion legend="4. Número de quimioterápicos no esquema" name="carg-agents" choices={CARG_AGENT_CHOICES} value={multipleAgents} disabled={saving} onChange={setMultipleAgents} />
      </section>

      <section className={styles.formSection} aria-labelledby="carg-laboratory-data">
        <h4 id="carg-laboratory-data">Dados laboratoriais</h4>
        <RadioQuestion legend="Sexo de referência para o limite da hemoglobina" name="carg-sex" choices={CARG_SEX_CHOICES} value={biologicalSex} disabled={saving} onChange={setBiologicalSex} />
        <div className={styles.numericGrid}>
          <label className={styles.numericField}>
            <span>5. Hemoglobina (g/dL)</span>
            <input inputMode="decimal" value={hemoglobin} disabled={saving} onChange={(event) => setHemoglobin(event.target.value)} placeholder="Ex.: 10,8" required />
            <small>{biologicalSex === "MALE" ? "Abaixo de 11 g/dL: 3 pontos." : biologicalSex === "FEMALE" ? "Abaixo de 10 g/dL: 3 pontos." : "Selecione o sexo de referência para aplicar o limite correto."}</small>
          </label>
          <label className={styles.numericField}>
            <span>6. Depuração de creatinina (mL/min)</span>
            <input inputMode="decimal" value={creatinineClearance} disabled={saving} onChange={(event) => setCreatinineClearance(event.target.value)} placeholder="Ex.: 42" required />
            <small>Use a depuração calculada pelo método adotado no protocolo clínico; abaixo de 34 mL/min: 3 pontos.</small>
          </label>
        </div>
      </section>

      <section className={styles.formSection} aria-labelledby="carg-geriatric-data">
        <h4 id="carg-geriatric-data">Avaliação geriátrica</h4>
        <RadioQuestion legend="7. Audição, com aparelho auditivo se necessário" name="carg-hearing" choices={CARG_HEARING_CHOICES} value={hearing} disabled={saving} onChange={setHearing} />
        <RadioQuestion legend="8. Uma ou mais quedas nos últimos 6 meses?" name="carg-falls" choices={yesNoChoices(3)} value={falls} disabled={saving} onChange={setFalls} />
        <RadioQuestion legend="9. Necessita ajuda para tomar os próprios medicamentos?" name="carg-medication-help" choices={yesNoChoices(1)} value={medicationHelp} disabled={saving} onChange={setMedicationHelp} />
        <RadioQuestion legend="10. A saúde limita caminhar um quarteirão?" name="carg-walking" choices={yesNoChoices(2)} value={walkingLimited} disabled={saving} onChange={setWalkingLimited} />
        <RadioQuestion legend="11. A saúde física ou emocional reduziu atividades sociais ao menos algumas vezes nas últimas 4 semanas?" name="carg-social" choices={yesNoChoices(1)} value={socialActivity} disabled={saving} onChange={setSocialActivity} />
      </section>

      {preview ? (
        <ResultBar>
          <div><span>Prévia do escore</span><strong>{preview.score}/23 · {categoryLabel}</strong></div>
          <p>No estudo de derivação, a faixa correspondente apresentou {preview.observedGradeThreeToFiveToxicityPercent}% de toxicidade grau 3 a 5. Essa é uma frequência observada no grupo, não uma probabilidade individual.</p>
          {preview.populationNote ? <p className={styles.populationNote}>{preview.populationNote}</p> : null}
          <details className={styles.breakdownDetails}>
            <summary>Conferir composição do escore</summary>
            <div className={styles.scoreBreakdown}>
              {preview.components.map((component) => <span key={component.key}>{component.label}<strong>{component.points}</strong></span>)}
            </div>
          </details>
        </ResultBar>
      ) : <p className={styles.hint}>Complete todos os fatores para conferir a pontuação antes de salvar.</p>}

      <div className={styles.actions}>
        <span>Faixas: 0–5 baixo risco; 6–9 intermediário; 10–23 alto. No estudo original, os escores observados variaram de 0 a 19.</span>
        <button type="submit" disabled={saving || !preview}>{saving ? "Salvando…" : "Calcular e registrar CARG"}</button>
      </div>
      {feedback ? <p className={feedback.kind === "success" ? styles.success : styles.error} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
    </form>
  );
}
