"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export interface OncogeriatricSelectOption {
  id: string;
  label: string;
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

export function DomainLinkedOncogeriatricCheckForm({
  patientId,
  episodeId,
  courses,
  consultations,
}: {
  patientId: string;
  episodeId: string;
  courses: OncogeriatricSelectOption[];
  consultations: OncogeriatricSelectOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bool = (name: string) => form.get(name) === "on";
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/oncogeriatria/patients/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHECKPOINT_CREATE",
          episodeId,
          type: "CYCLE",
          consultationId: text(form, "consultationId"),
          treatmentCourseId: text(form, "treatmentCourseId"),
          cycleNumber: numberOrNull(form, "cycleNumber"),
          occurredAt: text(form, "occurredAt"),
          structuredData: {
            functional: { newIadlHelp: bool("newIadlHelp"), newAdlHelp: bool("newAdlHelp") },
            mobility: { fall: bool("fall"), nearFall: bool("nearFall"), newWalkingAid: bool("newWalkingAid"), worsenedMobility: bool("worsenedMobility") },
            nutrition: { weightKg: numberOrNull(form, "weightKg"), reducedIntake: bool("reducedIntake"), anorexia: bool("anorexia"), nausea: bool("nausea"), dysphagia: bool("dysphagia"), mucositis: bool("mucositis") },
            cognition: { confusion: bool("confusion"), delirium: bool("delirium"), perceivedDecline: bool("perceivedDecline"), medicationDifficulty: bool("medicationDifficulty") },
            careEvents: { emergency: bool("emergency"), hospitalization: bool("hospitalization"), infection: bool("infection"), treatmentInterruption: bool("treatmentInterruption"), cycleDelay: bool("cycleDelay"), doseReductionRecorded: bool("doseReductionRecorded") },
            notes: text(form, "notes"),
          },
        }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não foi possível salvar a reavaliação.");
      setMessage("Reavaliação salva. Quando vinculada a uma consulta, os domínios e escalas registrados nessa consulta passam a integrar a trajetória oncogeriátrica.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a reavaliação.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label>Data da reavaliação<input name="occurredAt" type="date" required /></label>
      <label>Consulta existente para escalas e avaliação por domínio
        <select name="consultationId" defaultValue="">
          <option value="">Sem vínculo por enquanto</option>
          {consultations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="muted">O vínculo é explícito: a oncogeriatria reutiliza os resultados já registrados no prontuário geral, sem copiar, recalcular ou preencher escalas automaticamente.</p>
      <label>Tratamento relacionado<select name="treatmentCourseId" defaultValue=""><option value="">Sem tratamento vinculado</option>{courses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Ciclo<input name="cycleNumber" type="number" min="0" /></label>
      <fieldset><legend>Funcionalidade</legend><label><input name="newIadlHelp" type="checkbox" /> Nova ajuda em AIVD</label><label><input name="newAdlHelp" type="checkbox" /> Nova ajuda em ABVD</label></fieldset>
      <fieldset><legend>Mobilidade</legend><label><input name="fall" type="checkbox" /> Queda</label><label><input name="nearFall" type="checkbox" /> Quase queda</label><label><input name="newWalkingAid" type="checkbox" /> Novo dispositivo de marcha</label><label><input name="worsenedMobility" type="checkbox" /> Piora de mobilidade</label></fieldset>
      <fieldset><legend>Nutrição</legend><label>Peso (kg)<input name="weightKg" inputMode="decimal" /></label><label><input name="reducedIntake" type="checkbox" /> Redução da ingestão</label><label><input name="anorexia" type="checkbox" /> Anorexia</label><label><input name="nausea" type="checkbox" /> Náusea</label><label><input name="dysphagia" type="checkbox" /> Disfagia</label><label><input name="mucositis" type="checkbox" /> Mucosite</label></fieldset>
      <fieldset><legend>Cognição</legend><label><input name="confusion" type="checkbox" /> Confusão</label><label><input name="delirium" type="checkbox" /> Delirium</label><label><input name="perceivedDecline" type="checkbox" /> Piora percebida</label><label><input name="medicationDifficulty" type="checkbox" /> Nova dificuldade com medicamentos</label></fieldset>
      <fieldset><legend>Eventos assistenciais</legend><label><input name="emergency" type="checkbox" /> Emergência</label><label><input name="hospitalization" type="checkbox" /> Hospitalização</label><label><input name="infection" type="checkbox" /> Infecção</label><label><input name="treatmentInterruption" type="checkbox" /> Interrupção registrada</label><label><input name="cycleDelay" type="checkbox" /> Atraso de ciclo registrado</label><label><input name="doseReductionRecorded" type="checkbox" /> Redução de dose registrada pelo oncologista</label></fieldset>
      <label>Observações<textarea name="notes" rows={3} /></label>
      <button disabled={pending} type="submit">{pending ? "Salvando…" : "Registrar reavaliação durante o tratamento"}</button>
      {message ? <p role="status" className="muted">{message}</p> : null}
    </form>
  );
}
