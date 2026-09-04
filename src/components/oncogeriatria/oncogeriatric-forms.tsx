"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ONCOGERIATRIC_COURSE_STATUS_OPTIONS,
  ONCOGERIATRIC_INTENT_OPTIONS,
  ONCOGERIATRIC_INTERVENTION_DOMAIN_OPTIONS,
  ONCOGERIATRIC_INTERVENTION_STATUS_OPTIONS,
  ONCOGERIATRIC_MODALITY_OPTIONS,
  ONCOGERIATRIC_RECOVERY_DOMAIN_OPTIONS,
  ONCOGERIATRIC_RECOVERY_STATUS_OPTIONS,
} from "@/domain/oncogeriatria/presentation-labels";

async function postAction(patientId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json() as { message?: string };
  if (!response.ok) throw new Error(data.message ?? "Não foi possível salvar.");
  return data;
}

function useSubmission() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setMessage(null);
    try {
      await fn();
      setMessage("Salvo com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }
  return { pending, message, run };
}

function text(form: FormData, key: string): string | null {
  const value = String(form.get(key) ?? "").trim();
  return value || null;
}

function numberOrNull(form: FormData, key: string): number | null {
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function Feedback({ message }: { message: string | null }) {
  return message ? <p role="status" className="muted">{message}</p> : null;
}

export function StartEpisodeForm({ patientId }: { patientId: string }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await state.run(() => postAction(patientId, {
      action: "EPISODE_CREATE",
      diagnosis: text(form, "diagnosis"),
      primarySite: text(form, "primarySite"),
      histology: text(form, "histology"),
      stage: text(form, "stage"),
      diagnosedAt: text(form, "diagnosedAt"),
      diseaseStatus: text(form, "diseaseStatus"),
      notes: text(form, "notes"),
    }));
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>Diagnóstico oncológico<input name="diagnosis" required /></label>
      <label>Sítio primário<input name="primarySite" /></label>
      <label>Histologia<input name="histology" /></label>
      <label>Estágio<input name="stage" /></label>
      <label>Data do diagnóstico<input name="diagnosedAt" type="date" /></label>
      <label>Situação da doença<input name="diseaseStatus" /></label>
      <label>Observações<textarea name="notes" rows={3} /></label>
      <button type="submit" disabled={state.pending}>{state.pending ? "Salvando…" : "Iniciar acompanhamento oncogeriátrico"}</button>
      <Feedback message={state.message} />
    </form>
  );
}

export function TreatmentCourseForm({ patientId, episodeId }: { patientId: string; episodeId: string }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const riskFlags = ["neuro", "cardio", "nephro", "oto", "hema", "gi", "nutrition"].filter((key) => form.get(key) === "on");
    await state.run(() => postAction(patientId, {
      action: "TREATMENT_COURSE_CREATE", episodeId,
      modality: text(form, "modality"), intent: text(form, "intent"), therapyLine: text(form, "therapyLine"),
      regimenName: text(form, "regimenName"), plannedCycles: numberOrNull(form, "plannedCycles"),
      plannedStartAt: text(form, "plannedStartAt"), actualStartAt: text(form, "actualStartAt"), status: text(form, "status"),
      riskFlags: { selected: riskFlags }, notes: text(form, "notes"),
    }));
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>Modalidade<select name="modality" defaultValue="SYSTEMIC">{ONCOGERIATRIC_MODALITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Intenção do tratamento<select name="intent" defaultValue="CURATIVE">{ONCOGERIATRIC_INTENT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label>Linha terapêutica<input name="therapyLine" /></label>
      <label>Esquema<input name="regimenName" required /></label>
      <label>Ciclos previstos<input name="plannedCycles" type="number" min="0" /></label>
      <label>Início previsto<input name="plannedStartAt" type="date" /></label>
      <label>Início realizado<input name="actualStartAt" type="date" /></label>
      <label>Situação do tratamento<select name="status" defaultValue="PLANNED">{ONCOGERIATRIC_COURSE_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <fieldset><legend>Riscos relevantes selecionados pelo médico</legend>
        <label><input type="checkbox" name="neuro" /> Neurotoxicidade</label>
        <label><input type="checkbox" name="cardio" /> Cardiotoxicidade</label>
        <label><input type="checkbox" name="nephro" /> Nefrotoxicidade</label>
        <label><input type="checkbox" name="oto" /> Ototoxicidade</label>
        <label><input type="checkbox" name="hema" /> Toxicidade hematológica</label>
        <label><input type="checkbox" name="gi" /> Toxicidade gastrointestinal</label>
        <label><input type="checkbox" name="nutrition" /> Risco nutricional</label>
      </fieldset>
      <label>Observações<textarea name="notes" rows={3} /></label>
      <button disabled={state.pending} type="submit">{state.pending ? "Salvando…" : "Registrar tratamento"}</button>
      <Feedback message={state.message} />
    </form>
  );
}

export interface SelectOption { id: string; label: string }

export function BaselineCheckpointForm({ patientId, episodeId, consultations, courses }: { patientId: string; episodeId: string; consultations: SelectOption[]; courses: SelectOption[] }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await state.run(() => postAction(patientId, {
      action: "CHECKPOINT_CREATE", episodeId, type: "PRE_TREATMENT", consultationId: text(form, "consultationId"), treatmentCourseId: text(form, "treatmentCourseId"),
      occurredAt: text(form, "occurredAt"), structuredData: { ecogKps: text(form, "ecogKps"), whatMatters: text(form, "whatMatters") },
    }));
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>Data da avaliação inicial<input type="date" name="occurredAt" required /></label>
      <label>Consulta existente para aplicar e recuperar escalas<select name="consultationId" defaultValue=""><option value="">Sem vínculo por enquanto</option>{consultations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <p className="muted">Vincule uma consulta para usar as mesmas escalas do prontuário geral e manter um único resultado por instrumento.</p>
      <label>Tratamento relacionado<select name="treatmentCourseId" defaultValue=""><option value="">Ainda não definido</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>ECOG/KPS informado pelo médico<input name="ecogKps" /></label>
      <label>O que importa para o paciente<textarea name="whatMatters" rows={3} /></label>
      <button disabled={state.pending} type="submit">Criar avaliação inicial</button>
      <Feedback message={state.message} />
    </form>
  );
}

export function QuickCheckForm({ patientId, episodeId, courses }: { patientId: string; episodeId: string; courses: SelectOption[] }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bool = (name: string) => form.get(name) === "on";
    await state.run(() => postAction(patientId, {
      action: "CHECKPOINT_CREATE", episodeId, type: "CYCLE", treatmentCourseId: text(form, "treatmentCourseId"), cycleNumber: numberOrNull(form, "cycleNumber"), occurredAt: text(form, "occurredAt"),
      structuredData: {
        functional: { newIadlHelp: bool("newIadlHelp"), newAdlHelp: bool("newAdlHelp") },
        mobility: { fall: bool("fall"), nearFall: bool("nearFall"), newWalkingAid: bool("newWalkingAid"), worsenedMobility: bool("worsenedMobility") },
        nutrition: { weightKg: numberOrNull(form, "weightKg"), reducedIntake: bool("reducedIntake"), anorexia: bool("anorexia"), nausea: bool("nausea"), dysphagia: bool("dysphagia"), mucositis: bool("mucositis") },
        cognition: { confusion: bool("confusion"), delirium: bool("delirium"), perceivedDecline: bool("perceivedDecline"), medicationDifficulty: bool("medicationDifficulty") },
        careEvents: { emergency: bool("emergency"), hospitalization: bool("hospitalization"), infection: bool("infection"), treatmentInterruption: bool("treatmentInterruption"), cycleDelay: bool("cycleDelay"), doseReductionRecorded: bool("doseReductionRecorded") },
        notes: text(form, "notes"),
      },
    }));
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label>Data<input name="occurredAt" type="date" required /></label>
      <label>Tratamento relacionado<select name="treatmentCourseId" defaultValue=""><option value="">Sem tratamento vinculado</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Ciclo<input name="cycleNumber" type="number" min="0" /></label>
      <fieldset><legend>Funcionalidade</legend><label><input name="newIadlHelp" type="checkbox" /> Nova ajuda em AIVD</label><label><input name="newAdlHelp" type="checkbox" /> Nova ajuda em ABVD</label></fieldset>
      <fieldset><legend>Mobilidade</legend><label><input name="fall" type="checkbox" /> Queda</label><label><input name="nearFall" type="checkbox" /> Quase queda</label><label><input name="newWalkingAid" type="checkbox" /> Novo dispositivo de marcha</label><label><input name="worsenedMobility" type="checkbox" /> Piora de mobilidade</label></fieldset>
      <fieldset><legend>Nutrição</legend><label>Peso (kg)<input name="weightKg" inputMode="decimal" /></label><label><input name="reducedIntake" type="checkbox" /> Redução da ingestão</label><label><input name="anorexia" type="checkbox" /> Anorexia</label><label><input name="nausea" type="checkbox" /> Náusea</label><label><input name="dysphagia" type="checkbox" /> Disfagia</label><label><input name="mucositis" type="checkbox" /> Mucosite</label></fieldset>
      <fieldset><legend>Cognição</legend><label><input name="confusion" type="checkbox" /> Confusão</label><label><input name="delirium" type="checkbox" /> Delirium</label><label><input name="perceivedDecline" type="checkbox" /> Piora percebida</label><label><input name="medicationDifficulty" type="checkbox" /> Nova dificuldade com medicamentos</label></fieldset>
      <fieldset><legend>Eventos assistenciais</legend><label><input name="emergency" type="checkbox" /> Emergência</label><label><input name="hospitalization" type="checkbox" /> Hospitalização</label><label><input name="infection" type="checkbox" /> Infecção</label><label><input name="treatmentInterruption" type="checkbox" /> Interrupção registrada</label><label><input name="cycleDelay" type="checkbox" /> Atraso de ciclo registrado</label><label><input name="doseReductionRecorded" type="checkbox" /> Redução de dose registrada pelo oncologista</label></fieldset>
      <label>Observações<textarea name="notes" rows={3} /></label>
      <button disabled={state.pending} type="submit">Registrar reavaliação durante o tratamento</button>
      <Feedback message={state.message} />
    </form>
  );
}

export function G8Form({ patientId, episodeId, checkpointId }: { patientId: string; episodeId: string; checkpointId: string }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await state.run(() => postAction(patientId, { action: "G8_SAVE", episodeId, checkpointId, answers: {
      foodIntake: text(form, "foodIntake"), weightLoss: text(form, "weightLoss"), mobility: text(form, "mobility"), neuropsychological: text(form, "neuropsychological"),
      bmi: numberOrNull(form, "bmi"), takesMoreThanThreePrescriptionDrugs: form.get("polypharmacy") === "YES", healthStatusComparedWithPeers: text(form, "health"), ageYears: numberOrNull(form, "ageYears"),
    }}));
  }
  return (
    <form className="stack" onSubmit={submit}>
      <h3>G8 — triagem geriátrica</h3>
      <label>Ingestão nos últimos 3 meses<select name="foodIntake"><option value="SEVERE_DECREASE">Redução importante</option><option value="MODERATE_DECREASE">Redução moderada</option><option value="NO_DECREASE">Sem redução</option></select></label>
      <label>Perda de peso<select name="weightLoss"><option value="GT_3_KG">Mais de 3 kg</option><option value="UNKNOWN">Não sabe</option><option value="BETWEEN_1_AND_3_KG">1 a 3 kg</option><option value="NONE">Sem perda</option></select></label>
      <label>Mobilidade<select name="mobility"><option value="BED_OR_CHAIR">Restrito ao leito/cadeira</option><option value="GETS_UP_DOES_NOT_GO_OUT">Levanta, mas não sai</option><option value="GOES_OUT">Sai de casa</option></select></label>
      <label>Problemas neuropsicológicos<select name="neuropsychological"><option value="SEVERE">Graves</option><option value="MILD">Leves</option><option value="NONE">Ausentes</option></select></label>
      <label>IMC<input name="bmi" required inputMode="decimal" /></label>
      <label>Mais de 3 medicamentos prescritos/dia?<select name="polypharmacy"><option value="YES">Sim</option><option value="NO">Não</option></select></label>
      <label>Saúde comparada a pessoas da mesma idade<select name="health"><option value="WORSE">Pior</option><option value="UNKNOWN">Não sabe</option><option value="SAME">Igual</option><option value="BETTER">Melhor</option></select></label>
      <label>Idade<input name="ageYears" type="number" min="0" required /></label>
      <button disabled={state.pending} type="submit">Calcular e registrar G8</button><Feedback message={state.message} />
    </form>
  );
}

export function InterventionForm({ patientId, episodeId }: { patientId: string; episodeId: string }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await state.run(() => postAction(patientId, {
    action: "INTERVENTION_CREATE", episodeId, domain: text(form, "domain"), description: text(form, "description"), intervention: text(form, "intervention"), responsibleProfessional: text(form, "responsibleProfessional"), dueAt: text(form, "dueAt"), status: text(form, "status"), result: text(form, "result"),
  })); }
  return <form className="stack" onSubmit={submit}><label>Domínio<select name="domain">{ONCOGERIATRIC_INTERVENTION_DOMAIN_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Vulnerabilidade<textarea name="description" required /></label><label>Intervenção revisada pelo profissional<textarea name="intervention" /></label><label>Responsável<input name="responsibleProfessional" /></label><label>Data prevista<input type="date" name="dueAt" /></label><label>Situação<select name="status">{ONCOGERIATRIC_INTERVENTION_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Resultado<textarea name="result" /></label><button disabled={state.pending}>Registrar intervenção</button><Feedback message={state.message} /></form>;
}

export function ToxicityForm({ patientId, episodeId, courses }: { patientId: string; episodeId: string; courses: SelectOption[] }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await state.run(() => postAction(patientId, {
    action: "TOXICITY_CREATE", episodeId, treatmentCourseId: text(form, "treatmentCourseId"), occurredAt: text(form, "occurredAt"), toxicityType: text(form, "toxicityType"), grade: text(form, "grade"), consequences: text(form, "consequences"), hospitalizationAssociated: form.get("hospitalizationAssociated") === "on", cycleDelayAssociated: form.get("cycleDelayAssociated") === "on", treatmentModificationRecorded: text(form, "treatmentModificationRecorded"),
  })); }
  return <form className="stack" onSubmit={submit}><label>Data<input type="date" name="occurredAt" required /></label><label>Tratamento relacionado<select name="treatmentCourseId"><option value="">Sem tratamento vinculado</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>Tipo de toxicidade<input name="toxicityType" required /></label><label>Grau informado pelo médico<input name="grade" /></label><label>Consequências<textarea name="consequences" /></label><label><input type="checkbox" name="hospitalizationAssociated" /> Hospitalização associada</label><label><input type="checkbox" name="cycleDelayAssociated" /> Atraso de ciclo associado</label><label>Modificação do tratamento já registrada pelo oncologista<textarea name="treatmentModificationRecorded" /></label><button disabled={state.pending}>Registrar toxicidade</button><Feedback message={state.message} /></form>;
}

export function RecoveryForm({ patientId, episodeId }: { patientId: string; episodeId: string }) {
  const state = useSubmission();
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await state.run(() => postAction(patientId, { action: "RECOVERY_CREATE", episodeId, domain: text(form, "domain"), status: text(form, "status"), assessedAt: text(form, "assessedAt"), notes: text(form, "notes") })); }
  return <form className="stack" onSubmit={submit}><label>Domínio<select name="domain">{ONCOGERIATRIC_RECOVERY_DOMAIN_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Situação<select name="status">{ONCOGERIATRIC_RECOVERY_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Data<input type="date" name="assessedAt" required /></label><label>Observações<textarea name="notes" /></label><button disabled={state.pending}>Registrar recuperação</button><Feedback message={state.message} /></form>;
}

export function ReportSnapshotButton({ patientId, episodeId, content }: { patientId: string; episodeId: string; content: Record<string, unknown> }) {
  const state = useSubmission();
  return <div><button disabled={state.pending} onClick={() => state.run(() => postAction(patientId, { action: "REPORT_SNAPSHOT", episodeId, content }))}>{state.pending ? "Gerando…" : "Arquivar versão do relatório"}</button><Feedback message={state.message} /></div>;
}
