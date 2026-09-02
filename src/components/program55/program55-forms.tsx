"use client";

import { useState, type FormEvent } from "react";
import type { Program55Discipline } from "@/domain/program55/access";

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveFeedback({ state, message }: { state: SaveState; message: string }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Salvando..." : state === "saved" ? "Salvo" : message || "Erro ao salvar — tentar novamente";
  return <span role={state === "error" ? "alert" : "status"} className="muted">{text}</span>;
}

async function postProgram55(patientId: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/program55/patients/${patientId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(result?.message ?? "Não foi possível salvar.");
  return result;
}

function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  async function run(operation: () => Promise<unknown>, reload = true) {
    setState("saving");
    setMessage("");
    try {
      await operation();
      setState("saved");
      if (reload) window.location.reload();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro ao salvar — tentar novamente");
    }
  }
  return { state, message, run };
}

export function StartProgram55Button({ patientId }: { patientId: string }) {
  const save = useSaveState();
  return (
    <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button type="button" onClick={() => void save.run(() => postProgram55(patientId, { action: "START" }))} disabled={save.state === "saving"}>
        Iniciar Programa 55+
      </button>
      <SaveFeedback state={save.state} message={save.message} />
    </div>
  );
}

export interface CheckpointOption { id: string; label: string; }

export function BodyCompositionForm({ patientId, checkpoints }: { patientId: string; checkpoints: CheckpointOption[] }) {
  const save = useSaveState();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) ?? "").trim() || null;
    await save.run(() => postProgram55(patientId, {
      action: "BODY_COMPOSITION",
      checkpointId: field("checkpointId"),
      measuredAt: field("measuredAt"),
      weightKg: field("weightKg"),
      heightCm: field("heightCm"),
      bmi: field("bmi"),
      waistCm: field("waistCm"),
      bodyFatPercent: field("bodyFatPercent"),
      fatMassKg: field("fatMassKg"),
      fatFreeMassKg: field("fatFreeMassKg"),
      muscleMassKg: field("muscleMassKg"),
      sourceLabel: field("sourceLabel"),
      deviceLabel: field("deviceLabel"),
      notes: field("notes"),
    }));
  }
  return (
    <form className="patient-form" onSubmit={submit}>
      <label>Checkpoint<select name="checkpointId" required>{checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Data da medição<input name="measuredAt" type="date" required /></label>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>Peso (kg)<input name="weightKg" type="number" min="0" step="0.01" /></label>
        <label>Altura (cm)<input name="heightCm" type="number" min="0" step="0.01" /></label>
        <label>IMC<input name="bmi" type="number" min="0" step="0.01" /></label>
        <label>Circunferência abdominal (cm)<input name="waistCm" type="number" min="0" step="0.01" /></label>
        <label>Gordura corporal (%)<input name="bodyFatPercent" type="number" min="0" step="0.01" /></label>
        <label>Massa de gordura (kg)<input name="fatMassKg" type="number" min="0" step="0.01" /></label>
        <label>Massa livre de gordura (kg)<input name="fatFreeMassKg" type="number" min="0" step="0.01" /></label>
        <label>Massa muscular (kg), se fornecida<input name="muscleMassKg" type="number" min="0" step="0.01" /></label>
      </div>
      <label>Origem<input name="sourceLabel" placeholder="Ex.: Tera Science b.IA / relatório externo / manual" /></label>
      <label>Equipamento, quando documentado<input name="deviceLabel" /></label>
      <label>Observações<textarea name="notes" rows={3} /></label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><button type="submit" disabled={save.state === "saving"}>Salvar medição</button><SaveFeedback state={save.state} message={save.message} /></div>
    </form>
  );
}

const ASSESSMENT_FIELDS: Record<Program55Discipline, readonly [string, string][]> = {
  PHYSICIAN: [["clinicalContext", "Síntese clínica / contexto coordenador"]],
  PHYSIOTHERAPY: [
    ["mobility", "Mobilidade"], ["balance", "Equilíbrio"], ["strength", "Força"], ["falls", "Histórico de quedas"],
    ["physicalPerformance", "Desempenho físico / teste utilizado"], ["physicalActivity", "Atividade física"], ["functionalLimitations", "Limitações funcionais"],
  ],
  NUTRITION: [
    ["nutritionAssessment", "Avaliação nutricional"], ["foodPattern", "Alimentação"], ["proteinIntake", "Ingestão proteica quando registrada"],
    ["hydration", "Hidratação"], ["anthropometry", "Antropometria"], ["nutritionGoals", "Objetivos nutricionais"],
    ["glimClinicianConclusion", "GLIM — conclusão registrada pelo profissional (sem cálculo automático)"],
  ],
  PSYCHOLOGY: [
    ["mood", "Humor"], ["anxiety", "Ansiedade quando avaliada"], ["healthPerception", "Percepção de saúde"],
    ["adaptation", "Adaptação às mudanças"], ["qualityOfLife", "Qualidade de vida"],
  ],
};

export function ProfessionalAssessmentForm({ patientId, checkpointId, discipline, initialSummary = "", initialData = {}, initialStatus = "IN_PROGRESS" }: {
  patientId: string;
  checkpointId: string;
  discipline: Program55Discipline;
  initialSummary?: string;
  initialData?: Record<string, unknown>;
  initialStatus?: string;
}) {
  const save = useSaveState();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const structuredData = Object.fromEntries(ASSESSMENT_FIELDS[discipline].map(([key]) => [key, String(form.get(key) ?? "").trim()]).filter(([, value]) => value));
    await save.run(() => postProgram55(patientId, {
      action: "ASSESSMENT",
      checkpointId,
      discipline,
      status: String(form.get("status") ?? "IN_PROGRESS"),
      structuredData,
      sharedSummary: String(form.get("sharedSummary") ?? "").trim(),
    }));
  }
  return (
    <form className="patient-form" onSubmit={submit}>
      {ASSESSMENT_FIELDS[discipline].map(([key, label]) => (
        <label key={key}>{label}<textarea name={key} rows={2} defaultValue={typeof initialData[key] === "string" ? String(initialData[key]) : ""} /></label>
      ))}
      <label>Resumo compartilhável com a equipe<textarea name="sharedSummary" rows={4} defaultValue={initialSummary} /></label>
      <label>Status operacional<select name="status" defaultValue={initialStatus}><option value="IN_PROGRESS">Em preenchimento</option><option value="COMPLETED">Concluído</option><option value="REVIEWED">Revisado</option></select></label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><button type="submit" disabled={save.state === "saving"}>Salvar avaliação</button><SaveFeedback state={save.state} message={save.message} /></div>
    </form>
  );
}

export function PsychologyRestrictedNoteForm({ patientId, assessmentId, initialContent = "" }: { patientId: string; assessmentId: string; initialContent?: string }) {
  const save = useSaveState();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await save.run(() => postProgram55(patientId, { action: "PSYCHOLOGY_NOTE", assessmentId, content: String(form.get("content") ?? "") }));
  }
  return (
    <form className="patient-form" onSubmit={submit}>
      <div className="notice"><strong>Nota profissional restrita</strong><span>Não integra o resumo compartilhável nem o MAPA 55+. A autoria é auditada separadamente.</span></div>
      <label>Nota restrita<textarea name="content" rows={6} defaultValue={initialContent} required /></label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><button type="submit" disabled={save.state === "saving"}>Salvar nota restrita</button><SaveFeedback state={save.state} message={save.message} /></div>
    </form>
  );
}

export function GoalForm({ patientId, checkpoints }: { patientId: string; checkpoints: CheckpointOption[] }) {
  const save = useSaveState();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    await save.run(() => postProgram55(patientId, {
      action: "GOAL",
      checkpointId: text("checkpointId"), domain: text("domain"), objective: text("objective"), indicator: text("indicator"),
      baselineValue: text("baselineValue"), targetValue: text("targetValue"), dueDate: text("dueDate"), responsibleDiscipline: text("responsibleDiscipline"), notes: text("notes"),
    }));
  }
  return (
    <form className="patient-form" onSubmit={submit}>
      <label>Checkpoint de origem<select name="checkpointId"><option value="">Sem vínculo específico</option>{checkpoints.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Domínio<input name="domain" required placeholder="Ex.: mobilidade, nutrição, bem-estar" /></label>
      <label>Objetivo<textarea name="objective" rows={2} required /></label>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>Indicador<input name="indicator" /></label><label>Baseline<input name="baselineValue" /></label><label>Meta<input name="targetValue" /></label><label>Prazo<input name="dueDate" type="date" /></label>
      </div>
      <label>Responsável<select name="responsibleDiscipline"><option value="">Equipe</option><option value="PHYSICIAN">Geriatria</option><option value="PHYSIOTHERAPY">Fisioterapia</option><option value="NUTRITION">Nutrição</option><option value="PSYCHOLOGY">Psicologia</option></select></label>
      <label>Observação<textarea name="notes" rows={2} /></label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><button type="submit" disabled={save.state === "saving"}>Adicionar meta</button><SaveFeedback state={save.state} message={save.message} /></div>
    </form>
  );
}

export function MembershipForm({ patientId }: { patientId: string }) {
  const save = useSaveState();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await save.run(() => postProgram55(patientId, { action: "MEMBERSHIP", email: String(form.get("email") ?? ""), discipline: String(form.get("discipline") ?? "") }));
  }
  return (
    <form className="patient-form" onSubmit={submit}>
      <label>E-mail de usuário já autorizado<input name="email" type="email" required /></label>
      <label>Profissão/domínio<select name="discipline" required><option value="PHYSIOTHERAPY">Fisioterapia</option><option value="NUTRITION">Nutrição</option><option value="PSYCHOLOGY">Psicologia</option><option value="PHYSICIAN">Geriatria</option></select></label>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><button type="submit" disabled={save.state === "saving"}>Vincular profissional</button><SaveFeedback state={save.state} message={save.message} /></div>
    </form>
  );
}
