"use client";

import { useEffect, useMemo, useState } from "react";
import { MEDICATION_MOMENTS, MEDICATION_MOMENT_LABELS, type MedicationMoment } from "@/domain/medication-plan";
import { MedicationPlanTable } from "./medication-plan-table";
import styles from "./medication-workspace.module.css";

type MedicationStatus = "ACTIVE" | "SUSPENDED" | "FINISHED" | "UNKNOWN";
type Item = { medicationId: string; medicationText: string; name: string; presentation?: string; doseInstruction?: string; route?: string; moments: MedicationMoment[]; continuous: boolean; instructions?: string; status: MedicationStatus; statusSource: "explicit-history" | "current-record-only" | "unknown"; regimenId?: string };
type View = { consultationId: string; consultationStatus: "DRAFT" | "IN_REVIEW" | "FINALIZED"; isLatestConsultation: boolean; items: Item[] };
type Form = { name: string; presentation: string; doseInstruction: string; route: string; moments: MedicationMoment[]; continuous: boolean; instructions: string };
const EMPTY_FORM: Form = { name: "", presentation: "", doseInstruction: "", route: "", moments: [], continuous: false, instructions: "" };
const STATUS_LABEL: Record<MedicationStatus, string> = { ACTIVE: "Em uso", SUSPENDED: "Suspenso", FINISHED: "Finalizado", UNKNOWN: "Status histórico desconhecido" };

function RegimenFields({ form, setForm, includeName }: { form: Form; setForm: (value: Form) => void; includeName: boolean }) {
  function toggle(moment: MedicationMoment) { setForm({ ...form, moments: form.moments.includes(moment) ? form.moments.filter((item) => item !== moment) : [...form.moments, moment] }); }
  return <div className={styles.formGrid}>
    {includeName ? <><label>Medicamento<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Losartana" /></label><label>Dose/apresentação<input value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })} placeholder="50 mg" /></label></> : null}
    <label>Dose em uso<input value={form.doseInstruction} onChange={(e) => setForm({ ...form, doseInstruction: e.target.value })} placeholder="1 comprimido" /></label>
    <label>Via<input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="Oral" /></label>
    <fieldset className={styles.moments}><legend>Horários</legend>{MEDICATION_MOMENTS.map((moment) => <label key={moment}><input type="checkbox" checked={form.moments.includes(moment)} onChange={() => toggle(moment)} />{MEDICATION_MOMENT_LABELS[moment]}</label>)}</fieldset>
    <label className={styles.inline}><input type="checkbox" checked={form.continuous} onChange={(e) => setForm({ ...form, continuous: e.target.checked })} />Uso contínuo</label>
    <label className={styles.wide}>Observações<textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={2} /></label>
  </div>;
}

export function MedicationWorkspace({ consultationId, patientName }: { consultationId: string; patientName: string }) {
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Form>(EMPTY_FORM);
  const [statusChoice, setStatusChoice] = useState<Record<string, Exclude<MedicationStatus, "UNKNOWN">>>({});

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
  const otherItems = useMemo(() => (view?.items ?? []).filter((item) => item.status !== "ACTIVE"), [view]);
  function notify(next: View) { setView(next); setFeedback(null); window.dispatchEvent(new CustomEvent("clinical-medications-changed", { detail: { consultationId } })); }
  async function post(body: unknown): Promise<View> {
    const response = await fetch(`/api/consultations/${consultationId}/medications`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const parsed = await response.json().catch(() => null) as (View & { message?: string }) | null;
    if (!response.ok || !parsed) throw new Error(parsed?.message || "Não foi possível atualizar as medicações.");
    return parsed;
  }

  async function createMedication() {
    if (!editable || !form.name.trim() || saving) return;
    setSaving(true); setFeedback(null);
    try { const next = await post({ action: "create", name: form.name, presentation: form.presentation || undefined, doseInstruction: form.doseInstruction || undefined, route: form.route || undefined, moments: form.moments, continuous: form.continuous, instructions: form.instructions || undefined }); notify(next); setForm(EMPTY_FORM); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível adicionar o medicamento."); }
    finally { setSaving(false); }
  }
  function startRegimen(item: Item) { setEditingId(item.medicationId); setEditingForm({ name: item.name, presentation: item.presentation ?? "", doseInstruction: item.doseInstruction ?? "", route: item.route ?? "", moments: [...item.moments], continuous: item.continuous, instructions: item.instructions ?? "" }); }
  async function saveRegimen() {
    if (!editable || !editingId || saving) return;
    setSaving(true); setFeedback(null);
    try { const next = await post({ action: "regimen", medicationId: editingId, doseInstruction: editingForm.doseInstruction || undefined, route: editingForm.route || undefined, moments: editingForm.moments, continuous: editingForm.continuous, instructions: editingForm.instructions || undefined }); notify(next); setEditingId(null); }
    catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível atualizar dose/horários."); }
    finally { setSaving(false); }
  }
  async function changeStatus(item: Item) {
    if (!editable || saving) return;
    const selected = statusChoice[item.medicationId] ?? (item.status === "UNKNOWN" ? "ACTIVE" : item.status);
    if (selected === item.status && item.statusSource === "explicit-history") return;
    setSaving(true); setFeedback(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/medications/status`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ medicationId: item.medicationId, newStatus: selected }) });
      const body = await response.json().catch(() => null) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message || "Não foi possível alterar o status.");
      await load(); window.dispatchEvent(new CustomEvent("clinical-medications-changed", { detail: { consultationId } }));
    } catch (cause) { setFeedback(cause instanceof Error ? cause.message : "Não foi possível alterar o status."); }
    finally { setSaving(false); }
  }

  if (loading) return <section className={styles.card}><p>Carregando reconciliação medicamentosa…</p></section>;
  if (!view) return <section className={styles.card}><p role="alert">{feedback ?? "Medicações indisponíveis."}</p></section>;

  return <section className={styles.card} aria-labelledby="medication-workspace-title">
    <div className={styles.heading}><div><p className="eyebrow">Segurança medicamentosa</p><h2 id="medication-workspace-title">Reconciliação de medicamentos</h2><p>Nome/dose ficam separados dos horários. Alterar dose ou horários cria um novo registro para esta consulta.</p></div></div>
    {!view.isLatestConsultation ? <p className={styles.notice}>Consulta histórica: alterações retrospectivas estão bloqueadas.</p> : null}{view.consultationStatus === "FINALIZED" ? <p className={styles.notice}>Consulta finalizada: medicações em modo somente leitura.</p> : null}{feedback ? <p className={styles.error} role="alert">{feedback}</p> : null}
    {editable ? <div className={styles.creator}><h3>Adicionar medicamento em uso</h3><RegimenFields form={form} setForm={setForm} includeName={true} /><button type="button" onClick={createMedication} disabled={!form.name.trim() || saving}>{saving ? "Salvando…" : "Adicionar medicamento"}</button></div> : null}
    <MedicationPlanTable patientName={patientName} items={activeItems.map((item) => ({ id: item.medicationId, medicationText: item.medicationText, doseInstruction: item.doseInstruction, route: item.route, moments: item.moments, continuous: item.continuous, instructions: item.instructions }))} />
    <div className={styles.list}><h3>Revisão e histórico de status</h3>{view.items.length === 0 ? <p className={styles.muted}>Nenhum medicamento cadastrado.</p> : view.items.map((item) => <article className={styles.item} key={item.medicationId}>
      <div><strong>{item.medicationText}</strong><span className={styles.status}>{STATUS_LABEL[item.status]}</span>{item.statusSource === "current-record-only" ? <small>Estado atual sem evento histórico anterior; confirme abaixo para iniciar o histórico explícito nesta consulta.</small> : null}{item.statusSource === "unknown" ? <small>Status não inferido para esta consulta histórica.</small> : null}</div>
      {editable ? <div className={styles.itemActions}><button type="button" onClick={() => startRegimen(item)}>Atualizar dose/horários</button><label>Status<select value={statusChoice[item.medicationId] ?? (item.status === "UNKNOWN" ? "ACTIVE" : item.status)} onChange={(e) => setStatusChoice((current) => ({ ...current, [item.medicationId]: e.target.value as Exclude<MedicationStatus, "UNKNOWN"> }))}><option value="ACTIVE">Em uso</option><option value="SUSPENDED">Suspenso</option><option value="FINISHED">Finalizado</option></select></label><button type="button" onClick={() => changeStatus(item)} disabled={saving || (item.statusSource === "explicit-history" && (statusChoice[item.medicationId] ?? item.status) === item.status)}>{item.statusSource === "explicit-history" ? "Confirmar alteração" : "Registrar status explícito"}</button></div> : null}
      {editingId === item.medicationId ? <div className={styles.editRegimen}><RegimenFields form={editingForm} setForm={setEditingForm} includeName={false} /><div className={styles.editActions}><button type="button" onClick={saveRegimen} disabled={saving}>Salvar novo regime</button><button type="button" onClick={() => setEditingId(null)}>Cancelar</button></div></div> : null}
    </article>)}</div>
    {otherItems.length > 0 ? <p className={styles.muted}>Medicamentos suspensos, finalizados ou historicamente incertos permanecem disponíveis acima para rastreabilidade e não entram na tabela “em uso”.</p> : null}
  </section>;
}
