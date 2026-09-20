"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MEDICATION_DAY_OF_WEEK_LABELS,
  MEDICATION_FREQUENCY_LABELS,
  MEDICATION_MOMENTS,
  MEDICATION_MOMENT_LABELS,
  type MedicationFrequency,
  type MedicationMoment,
  type MedicationSchedule,
} from "@/domain/medication-plan";
import { canSubmitMedicationStatusChange } from "@/domain/medication-workspace";
import { MedicationPlanTable } from "./medication-plan-table";
import styles from "./medication-workspace.module.css";

type MedicationStatus = "ACTIVE" | "SUSPENDED" | "FINISHED" | "UNKNOWN";
type Item = {
  medicationId: string;
  medicationText: string;
  name: string;
  presentation?: string;
  doseInstruction?: string;
  route?: string;
  frequency: MedicationFrequency;
  schedule?: MedicationSchedule;
  needsScheduleReview: boolean;
  moments: MedicationMoment[];
  continuous: boolean;
  instructions?: string;
  status: MedicationStatus;
  statusSource: "explicit-history" | "current-record-only" | "unknown";
  regimenId?: string;
};
type SuspendedHistoryItem = {
  medicationId: string;
  medicationText: string;
  suspendedAt: string;
};
type View = {
  consultationId: string;
  consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED";
  isLatestConsultation: boolean;
  items: Item[];
  suspendedHistory: SuspendedHistoryItem[];
};
type RouteChoice = "" | "Via oral" | "Via subcutânea" | "Via intravenosa" | "Via gastrostomia" | "Outra via";
type Form = {
  name: string;
  presentation: string;
  doseInstruction: string;
  routeChoice: RouteChoice;
  otherRoute: string;
  frequency: MedicationFrequency;
  dayOfWeek: string;
  dayOfMonth: string;
  monthlyNote: string;
  moments: MedicationMoment[];
  continuous: boolean;
  instructions: string;
};
const EMPTY_FORM: Form = {
  name: "",
  presentation: "",
  doseInstruction: "",
  routeChoice: "",
  otherRoute: "",
  frequency: "DAILY",
  dayOfWeek: "",
  dayOfMonth: "",
  monthlyNote: "",
  moments: [],
  continuous: false,
  instructions: "",
};
const STATUS_LABEL: Record<MedicationStatus, string> = { ACTIVE: "Em uso", SUSPENDED: "Suspenso", FINISHED: "Finalizado", UNKNOWN: "Status histórico desconhecido" };
const ROUTES: readonly Exclude<RouteChoice, "">[] = ["Via oral", "Via subcutânea", "Via intravenosa", "Via gastrostomia", "Outra via"];
const FREQUENCIES: readonly MedicationFrequency[] = ["DAILY", "WEEKLY", "MONTHLY", "AS_NEEDED"];

function formatSuspensionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não disponível";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function routeFromForm(form: Form): string | undefined {
  if (!form.routeChoice) return undefined;
  if (form.routeChoice !== "Outra via") return form.routeChoice;
  const value = form.otherRoute.trim();
  return value ? `Outra via: ${value}` : undefined;
}

function routeFormState(route?: string): Pick<Form, "routeChoice" | "otherRoute"> {
  const normalized = route?.trim();
  if (!normalized) return { routeChoice: "", otherRoute: "" };
  const exact = ROUTES.find((option) => option !== "Outra via" && option.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR"));
  if (exact) return { routeChoice: exact, otherRoute: "" };
  if (normalized.toLocaleLowerCase("pt-BR").startsWith("outra via:")) {
    return { routeChoice: "Outra via", otherRoute: normalized.slice(normalized.indexOf(":") + 1).trim() };
  }
  return { routeChoice: "Outra via", otherRoute: normalized };
}

function scheduleFromForm(form: Form): MedicationSchedule | undefined {
  if (form.frequency === "WEEKLY") {
    const dayOfWeek = form.dayOfWeek === "" ? undefined : Number(form.dayOfWeek);
    return { kind: "WEEKLY", dayOfWeek: dayOfWeek !== undefined && Number.isInteger(dayOfWeek) ? dayOfWeek : undefined };
  }
  if (form.frequency === "MONTHLY") {
    const dayOfMonth = form.dayOfMonth === "" ? undefined : Number(form.dayOfMonth);
    return {
      kind: "MONTHLY",
      dayOfMonth: dayOfMonth !== undefined && Number.isInteger(dayOfMonth) ? dayOfMonth : undefined,
      note: form.monthlyNote.trim() || undefined,
    };
  }
  return undefined;
}

function formFromItem(item: Item): Form {
  const route = routeFormState(item.route);
  return {
    name: item.name,
    presentation: item.presentation ?? "",
    doseInstruction: item.doseInstruction ?? "",
    ...route,
    frequency: item.frequency,
    dayOfWeek: item.schedule?.kind === "WEEKLY" && item.schedule.dayOfWeek !== undefined ? String(item.schedule.dayOfWeek) : "",
    dayOfMonth: item.schedule?.kind === "MONTHLY" && item.schedule.dayOfMonth !== undefined ? String(item.schedule.dayOfMonth) : "",
    monthlyNote: item.schedule?.kind === "MONTHLY" ? item.schedule.note ?? "" : "",
    moments: [...item.moments],
    continuous: item.continuous,
    instructions: item.instructions ?? "",
  };
}

function RegimenFields({ form, setForm, includeName, onDirtyChange }: { form: Form; setForm: (value: Form) => void; includeName: boolean; onDirtyChange?: () => void }) {
  function update(next: Form) { onDirtyChange?.(); setForm(next); }
  function toggle(moment: MedicationMoment) { update({ ...form, moments: form.moments.includes(moment) ? form.moments.filter((item) => item !== moment) : [...form.moments, moment] }); }
  function setFrequency(frequency: MedicationFrequency) {
    const moments = frequency === "AS_NEEDED"
      ? ["se_necessario" as MedicationMoment]
      : form.frequency === "AS_NEEDED"
        ? []
        : form.moments;
    update({ ...form, frequency, moments });
  }

  return <div className={styles.formGrid}>
    {includeName ? <><label>Medicamento<input value={form.name} onChange={(e) => update({ ...form, name: e.target.value })} placeholder="Losartana" /></label><label>Dose/apresentação<input value={form.presentation} onChange={(e) => update({ ...form, presentation: e.target.value })} placeholder="50 mg" /></label></> : null}
    <label>Dose em uso<input value={form.doseInstruction} onChange={(e) => update({ ...form, doseInstruction: e.target.value })} placeholder="1 comprimido" /></label>
    <label>Frequência<select value={form.frequency} onChange={(e) => setFrequency(e.target.value as MedicationFrequency)}>{FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{MEDICATION_FREQUENCY_LABELS[frequency]}</option>)}</select></label>

    <fieldset className={styles.moments}>
      <legend>Via de administração</legend>
      {ROUTES.map((route) => <label key={route}><input type="radio" name={`${includeName ? "new" : "edit"}-medication-route`} checked={form.routeChoice === route} onChange={() => update({ ...form, routeChoice: route })} />{route}</label>)}
      {form.routeChoice === "Outra via" ? <label>Especifique<input value={form.otherRoute} onChange={(e) => update({ ...form, otherRoute: e.target.value })} placeholder="Ex.: inalatória" maxLength={120} /></label> : null}
    </fieldset>

    {form.frequency === "WEEKLY" ? <label>Dia da semana (opcional ao cadastrar)<select value={form.dayOfWeek} onChange={(e) => update({ ...form, dayOfWeek: e.target.value })}><option value="">Revisar depois</option>{Object.entries(MEDICATION_DAY_OF_WEEK_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label> : null}
    {form.frequency === "MONTHLY" ? <><label>Dia do mês (opcional)<input type="number" min={1} max={31} value={form.dayOfMonth} onChange={(e) => update({ ...form, dayOfMonth: e.target.value })} placeholder="1–31" /></label><label>Ou detalhe seguro da programação<input value={form.monthlyNote} onChange={(e) => update({ ...form, monthlyNote: e.target.value })} placeholder="Ex.: primeiro dia útil" maxLength={160} /></label></> : null}

    {form.frequency !== "AS_NEEDED" ? <fieldset className={styles.moments}><legend>{form.frequency === "DAILY" ? "Horários" : "Horário no dia (opcional)"}</legend>{MEDICATION_MOMENTS.filter((moment) => moment !== "se_necessario").map((moment) => <label key={moment}><input type="checkbox" checked={form.moments.includes(moment)} onChange={() => toggle(moment)} />{MEDICATION_MOMENT_LABELS[moment]}</label>)}</fieldset> : <p className={styles.wide}>“Se necessário” é registrado como frequência estruturada e não como horário diário.</p>}
    <label className={styles.inline}><input type="checkbox" checked={form.continuous} onChange={(e) => update({ ...form, continuous: e.target.checked })} />Uso contínuo</label>
    <label className={styles.wide}>Observações<textarea value={form.instructions} onChange={(e) => update({ ...form, instructions: e.target.value })} rows={2} /></label>
    {(form.frequency === "WEEKLY" && !form.dayOfWeek) || (form.frequency === "MONTHLY" && !form.dayOfMonth && !form.monthlyNote.trim()) ? <p className={styles.wide} role="status">A programação pode ser salva para revisão, mas o plano não será liberado para impressão até o dia/programação ser completado.</p> : null}
  </div>;
}

function canSaveRegimen(form: Form): boolean {
  if (form.frequency === "DAILY" && form.moments.length === 0) return false;
  if (form.routeChoice === "Outra via" && !form.otherRoute.trim()) return false;
  return true;
}

export function MedicationWorkspace({ consultationId, patientName, onDirtyChange }: { consultationId: string; patientName: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Form>(EMPTY_FORM);
  const [statusChoice, setStatusChoice] = useState<Record<string, Exclude<MedicationStatus, "UNKNOWN">>>({});
  const [statusConfirmed, setStatusConfirmed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM)
      || editingId !== null
      || Object.keys(statusChoice).length > 0
      || Object.keys(statusConfirmed).length > 0;
    onDirtyChange?.(dirty);
  }, [editingId, form, onDirtyChange, statusChoice, statusConfirmed]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/medications`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (View & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message || "Não foi possível carregar as medicações.");
      setView(body); setFeedback(null);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível carregar as medicações."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [consultationId]);

  const editable = Boolean(view && view.isLatestConsultation && view.consultationStatus !== "FINALIZED");
  const activeItems = useMemo(() => (view?.items ?? []).filter((item) => item.status === "ACTIVE"), [view]);
  function notify(next: View) { setView(next); setFeedback(null); window.dispatchEvent(new CustomEvent("clinical-medications-changed", { detail: { consultationId } })); }
  async function post(body: unknown): Promise<View> {
    const response = await fetch(`/api/consultations/${consultationId}/medications`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const parsed = await response.json().catch(() => null) as (View & { message?: string }) | null;
    if (!response.ok || !parsed) throw new Error(parsed?.message || "Não foi possível atualizar as medicações.");
    return parsed;
  }

  async function createMedication() {
    if (!editable || !form.name.trim() || !canSaveRegimen(form) || saving) return;
    setSaving(true); setFeedback(null);
    try {
      const next = await post({ action: "create", name: form.name, presentation: form.presentation || undefined, doseInstruction: form.doseInstruction || undefined, route: routeFromForm(form), frequency: form.frequency, schedule: scheduleFromForm(form), moments: form.moments, continuous: form.continuous, instructions: form.instructions || undefined });
      notify(next); setForm(EMPTY_FORM);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível adicionar o medicamento."); }
    finally { setSaving(false); }
  }
  function startRegimen(item: Item) { setEditingId(item.medicationId); setEditingForm(formFromItem(item)); }
  async function saveRegimen() {
    if (!editable || !editingId || !canSaveRegimen(editingForm) || saving) return;
    setSaving(true); setFeedback(null);
    try {
      const next = await post({ action: "regimen", medicationId: editingId, doseInstruction: editingForm.doseInstruction || undefined, route: routeFromForm(editingForm), frequency: editingForm.frequency, schedule: scheduleFromForm(editingForm), moments: editingForm.moments, continuous: editingForm.continuous, instructions: editingForm.instructions || undefined });
      notify(next); setEditingId(null);
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível atualizar dose/horários."); }
    finally { setSaving(false); }
  }
  async function changeStatus(item: Item) {
    if (!editable || saving) return;
    const selected = statusChoice[item.medicationId] ?? (item.status === "UNKNOWN" ? "ACTIVE" : item.status);
    const confirmed = statusConfirmed[item.medicationId] === true;
    if (!canSubmitMedicationStatusChange({ confirmed, currentStatus: item.status, selectedStatus: selected, statusSource: item.statusSource })) return;
    setSaving(true); setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/medications/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ medicationId: item.medicationId, newStatus: selected }) });
      const body = await response.json().catch(() => null) as { message?: string; medicationId?: string; newStatus?: MedicationStatus; createdAt?: string } | null;
      if (!response.ok) throw new Error(body?.message || "Não foi possível alterar o status.");
      setStatusConfirmed((current) => ({ ...current, [item.medicationId]: false }));
      setStatusChoice((current) => { const next = { ...current }; delete next[item.medicationId]; return next; });
      setView((current) => current ? {
        ...current,
        items: current.items.map((candidate) => candidate.medicationId === item.medicationId
          ? { ...candidate, status: body?.newStatus ?? selected, statusSource: "explicit-history" as const }
          : candidate),
        suspendedHistory: selected === "SUSPENDED"
          ? [...current.suspendedHistory, { medicationId: item.medicationId, medicationText: item.medicationText, suspendedAt: body?.createdAt ?? new Date().toISOString() }]
          : current.suspendedHistory,
      } : current);
      window.dispatchEvent(new CustomEvent("clinical-medications-changed", { detail: { consultationId } }));
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível alterar o status."); }
    finally { setSaving(false); }
  }

  if (loading) return <section className={styles.card}><p>Carregando reconciliação medicamentosa…</p></section>;
  if (!view) return <section className={styles.card}><p role="alert">{feedback ?? "Medicações indisponíveis."}</p></section>;

  return <section className={styles.card} aria-labelledby="medication-workspace-title">
    <div className={styles.heading}><div><p className="eyebrow">Segurança medicamentosa</p><h2 id="medication-workspace-title">Reconciliação de medicamentos</h2><p>Via e frequência ficam estruturadas. Alterar dose, via, frequência ou horários cria um novo registro para esta consulta.</p></div></div>
    {!view.isLatestConsultation ? <p className={styles.notice}>Consulta histórica: alterações retrospectivas estão bloqueadas.</p> : null}{view.consultationStatus === "FINALIZED" ? <p className={styles.notice}>Consulta finalizada: medicações em modo somente leitura.</p> : null}{feedback ? <p className={styles.error} role="alert">{feedback}</p> : null}
    {editable ? <div className={styles.creator}><h3>Adicionar medicamento em uso</h3><RegimenFields form={form} setForm={setForm} includeName={true} /><button type="button" onClick={createMedication} disabled={!form.name.trim() || !canSaveRegimen(form) || saving}>{saving ? "Salvando…" : "Adicionar e continuar"}</button></div> : null}
    <MedicationPlanTable patientName={patientName} items={activeItems.map((item) => ({ id: item.medicationId, medicationText: item.medicationText, doseInstruction: item.doseInstruction, route: item.route, frequency: item.frequency, schedule: item.schedule, needsScheduleReview: item.needsScheduleReview, moments: item.moments, continuous: item.continuous, instructions: item.instructions }))} />

    {editable ? <div className={styles.list}><h3>Revisar status e atualizar medicação</h3>{view.items.length === 0 ? <p className={styles.muted}>Nenhum medicamento cadastrado.</p> : view.items.map((item) => {
      const selectedStatus = statusChoice[item.medicationId] ?? (item.status === "UNKNOWN" ? "ACTIVE" : item.status);
      const confirmed = statusConfirmed[item.medicationId] === true;
      const canSubmitStatus = canSubmitMedicationStatusChange({ confirmed, currentStatus: item.status, selectedStatus, statusSource: item.statusSource });
      return <article className={styles.item} key={item.medicationId}>
      <div><strong>{item.medicationText}</strong><span className={styles.status}>{STATUS_LABEL[item.status]}</span>{item.statusSource === "current-record-only" ? <small>Estado atual sem evento histórico anterior; confirme abaixo para iniciar o histórico explícito nesta consulta.</small> : null}{item.statusSource === "unknown" ? <small>Status não inferido para esta consulta histórica.</small> : null}</div>
      <div className={styles.itemActions}><button type="button" onClick={() => startRegimen(item)}>Atualizar dose/via/frequência</button><label>Status<select value={selectedStatus} onChange={(e) => { setStatusChoice((current) => ({ ...current, [item.medicationId]: e.target.value as Exclude<MedicationStatus, "UNKNOWN"> })); setStatusConfirmed((current) => ({ ...current, [item.medicationId]: false })); }}><option value="ACTIVE">Em uso</option><option value="SUSPENDED">Suspenso</option><option value="FINISHED">Finalizado</option></select></label><label className={styles.inline}><input type="checkbox" checked={confirmed} onChange={(e) => setStatusConfirmed((current) => ({ ...current, [item.medicationId]: e.target.checked }))} />Confirmo que revisei clinicamente esta alteração de status.</label><button type="button" onClick={() => changeStatus(item)} disabled={saving || !canSubmitStatus}>{item.statusSource === "explicit-history" ? "Registrar alteração" : "Registrar status explícito"}</button></div>
      {editingId === item.medicationId ? <div className={styles.editRegimen}><RegimenFields form={editingForm} setForm={setEditingForm} includeName={false} /><div className={styles.editActions}><button type="button" onClick={saveRegimen} disabled={saving || !canSaveRegimen(editingForm)}>Salvar novo regime</button><button type="button" onClick={() => setEditingId(null)}>Cancelar</button></div></div> : null}
    </article>})}</div> : null}

    <div className={styles.list}>
      <h3>Revisão e histórico de status</h3>
      {view.suspendedHistory.length === 0 ? <p className={styles.muted}>Nenhum medicamento com suspensão registrada até esta consulta.</p> : view.suspendedHistory.map((item) => <article className={styles.item} key={`${item.medicationId}-${item.suspendedAt}`}>
        <div><strong>{item.medicationText}</strong><small>Suspenso em {formatSuspensionDate(item.suspendedAt)}</small></div>
      </article>)}
    </div>
  </section>;
}
