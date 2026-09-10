"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./user-management-panel.module.css";

type ProfessionalRole = "MEDICO" | "FISIOTERAPEUTA" | "NUTRICIONISTA" | "PSICOLOGO" | "FONOAUDIOLOGO";
type PatientAccessScope = "ALL_PATIENTS" | "ASSIGNED_PATIENTS";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "PHYSICIAN" | "READ_ONLY";
  active: boolean;
  professionalRole: ProfessionalRole;
  patientAccessScope: PatientAccessScope;
  canManageUsers: boolean;
  accessManaged: boolean;
  _count: { patientAssignments: number };
};

type PendingGrant = {
  id: string;
  email: string;
  name: string | null;
  professionalRole: ProfessionalRole;
  patientAccessScope: PatientAccessScope;
  canManageUsers: boolean;
};

type PatientSearchResult = {
  id: string;
  fullName: string;
  birthDate: string | null;
  needsIdentityReview: boolean;
};

type Assignment = {
  id: string;
  patientId: string;
  patient: PatientSearchResult;
};

type UserDraft = Pick<UserRow, "professionalRole" | "patientAccessScope" | "canManageUsers" | "active">;

const PROFESSIONS: Array<{ value: ProfessionalRole; label: string }> = [
  { value: "MEDICO", label: "Médico(a)" },
  { value: "FISIOTERAPEUTA", label: "Fisioterapeuta" },
  { value: "NUTRICIONISTA", label: "Nutricionista" },
  { value: "PSICOLOGO", label: "Psicólogo(a)" },
  { value: "FONOAUDIOLOGO", label: "Fonoaudiólogo(a)" },
];

const professionLabel = (value: ProfessionalRole) => PROFESSIONS.find((item) => item.value === value)?.label ?? value;
const scopeLabel = (value: PatientAccessScope) => value === "ALL_PATIENTS" ? "Todos os pacientes" : "Somente pacientes vinculados";

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "Não foi possível concluir a operação.");
  return payload;
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pendingGrants, setPendingGrants] = useState<PendingGrant[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    professionalRole: "MEDICO" as ProfessionalRole,
    patientAccessScope: "ALL_PATIENTS" as PatientAccessScope,
    canManageUsers: false,
  });
  const [assignmentOpen, setAssignmentOpen] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [searchText, setSearchText] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, PatientSearchResult[]>>({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await readJson(await fetch("/api/admin/users", { cache: "no-store" }));
      const nextUsers = payload.users as UserRow[];
      setUsers(nextUsers);
      setPendingGrants(payload.pendingGrants as PendingGrant[]);
      setDrafts(Object.fromEntries(nextUsers.map((user) => [user.id, {
        professionalRole: user.professionalRole,
        patientAccessScope: user.patientAccessScope,
        canManageUsers: user.canManageUsers,
        active: user.active,
      }])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function updateDraft<K extends keyof UserDraft>(userId: string, key: K, value: UserDraft[K]) {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...current[userId], [key]: value },
    }));
  }

  async function submitNewUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSavingId("new");
    try {
      await readJson(await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      }));
      setForm({
        name: "",
        email: "",
        professionalRole: "MEDICO",
        patientAccessScope: "ALL_PATIENTS",
        canManageUsers: false,
      });
      setMessage("Profissional pré-autorizado. O primeiro acesso deve ser feito com essa mesma conta Google.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar o profissional.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveUser(user: UserRow) {
    const draft = drafts[user.id];
    if (!draft) return;
    setMessage("");
    setSavingId(user.id);
    try {
      await readJson(await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      }));
      setMessage(`Acesso de ${user.name} atualizado.`);
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o profissional.");
    } finally {
      setSavingId(null);
    }
  }

  async function loadAssignments(userId: string) {
    try {
      const payload = await readJson(await fetch(`/api/admin/users/${userId}/patients`, { cache: "no-store" }));
      setAssignments((current) => ({ ...current, [userId]: payload.assignments as Assignment[] }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar os vínculos.");
    }
  }

  async function toggleAssignments(userId: string) {
    if (assignmentOpen === userId) {
      setAssignmentOpen(null);
      return;
    }
    setAssignmentOpen(userId);
    await loadAssignments(userId);
  }

  async function searchPatient(userId: string) {
    const query = searchText[userId]?.trim() ?? "";
    if (query.length < 2) {
      setMessage("Digite pelo menos 2 caracteres para localizar o paciente.");
      return;
    }
    setMessage("");
    try {
      const payload = await readJson(await fetch("/api/patients/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      }));
      setSearchResults((current) => ({ ...current, [userId]: payload.results as PatientSearchResult[] }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível localizar pacientes.");
    }
  }

  async function setAssignment(userId: string, patientId: string, active: boolean) {
    setSavingId(`${userId}:${patientId}`);
    setMessage("");
    try {
      await readJson(await fetch(`/api/admin/users/${userId}/patients`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ patientId, active }),
      }));
      setMessage(active ? "Paciente vinculado ao profissional." : "Vínculo com o paciente removido.");
      await Promise.all([loadAssignments(userId), loadUsers()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o vínculo.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className={styles.workspace}>
      <section className="panel form-panel" aria-labelledby="new-professional-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Acesso multiprofissional</p>
            <h2 id="new-professional-title">Cadastrar novo profissional</h2>
            <p className="muted">Pré-autorize o e-mail e defina profissão, escopo e permissão administrativa antes do primeiro login.</p>
          </div>
        </div>
        <form className={styles.formGrid} onSubmit={submitNewUser}>
          <label className={styles.field}>Nome
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" />
          </label>
          <label className={styles.field}>E-mail da conta Google
            <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" />
          </label>
          <label className={styles.field}>Perfil profissional
            <select value={form.professionalRole} onChange={(event) => setForm((current) => ({ ...current, professionalRole: event.target.value as ProfessionalRole }))}>
              {PROFESSIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>Escopo de pacientes
            <select value={form.patientAccessScope} onChange={(event) => setForm((current) => ({ ...current, patientAccessScope: event.target.value as PatientAccessScope }))}>
              <option value="ALL_PATIENTS">Todos os pacientes</option>
              <option value="ASSIGNED_PATIENTS">Somente pacientes vinculados</option>
            </select>
          </label>
          <label className={`${styles.checkRow} ${styles.full}`}>
            <input type="checkbox" checked={form.canManageUsers} onChange={(event) => setForm((current) => ({ ...current, canManageUsers: event.target.checked }))} />
            Pode gerenciar usuários
          </label>
          <div className={`${styles.actions} ${styles.full}`}>
            <button type="submit" disabled={savingId === "new"}>{savingId === "new" ? "Salvando…" : "Pré-autorizar acesso"}</button>
            <span className={styles.muted}>Não é criada senha. O profissional usa a própria conta Google previamente autorizada.</span>
          </div>
        </form>
      </section>

      {message ? <p className={styles.status} role="status">{message}</p> : null}

      {pendingGrants.length > 0 ? (
        <section className="panel" aria-labelledby="pending-access-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Aguardando primeiro acesso</p>
              <h2 id="pending-access-title">Pré-autorizações pendentes</h2>
            </div>
          </div>
          <ul className={styles.pendingList}>
            {pendingGrants.map((grant) => (
              <li className={styles.pendingItem} key={grant.id}>
                <div>
                  <strong>{grant.name || grant.email}</strong>
                  <div className={styles.muted}>{grant.email} · {professionLabel(grant.professionalRole)} · {scopeLabel(grant.patientAccessScope)}</div>
                </div>
                {grant.canManageUsers ? <span className={styles.badge}>Gestão de usuários</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel" aria-labelledby="active-users-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Controle de acesso</p>
            <h2 id="active-users-title">Profissionais cadastrados</h2>
            <p className="muted">Desativar preserva autoria e histórico clínico. Alterações de privilégio invalidam sessões ativas.</p>
          </div>
        </div>
        {loading ? <p className="muted">Carregando usuários…</p> : null}
        {!loading && users.length === 0 ? <p className="muted">Nenhum usuário encontrado.</p> : null}
        <div className={styles.userList}>
          {users.map((user) => {
            const draft = drafts[user.id];
            if (!draft) return null;
            return (
              <article className={styles.userCard} key={user.id}>
                <div className={styles.userHeader}>
                  <div>
                    <h3>{user.name}</h3>
                    <p className={styles.muted}>{user.email}</p>
                  </div>
                  <div className={styles.badges}>
                    <span className={styles.badge}>{user.active ? "Ativo" : "Inativo"}</span>
                    <span className={styles.badge}>{professionLabel(user.professionalRole)}</span>
                    {user.role === "ADMIN" || user.canManageUsers ? <span className={styles.badge}>Gestão de usuários</span> : null}
                    {!user.accessManaged ? <span className={styles.badge}>Acesso legado protegido</span> : null}
                  </div>
                </div>

                <div className={styles.editor}>
                  <label className={styles.field}>Perfil profissional
                    <select value={draft.professionalRole} onChange={(event) => updateDraft(user.id, "professionalRole", event.target.value as ProfessionalRole)}>
                      {PROFESSIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>Escopo de pacientes
                    <select value={draft.patientAccessScope} onChange={(event) => updateDraft(user.id, "patientAccessScope", event.target.value as PatientAccessScope)}>
                      <option value="ALL_PATIENTS">Todos os pacientes</option>
                      <option value="ASSIGNED_PATIENTS">Somente pacientes vinculados</option>
                    </select>
                  </label>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => void saveUser(user)} disabled={savingId === user.id}>Salvar acesso</button>
                  </div>
                  <label className={styles.checkRow}>
                    <input type="checkbox" checked={draft.canManageUsers} onChange={(event) => updateDraft(user.id, "canManageUsers", event.target.checked)} />
                    Pode gerenciar usuários
                  </label>
                  <label className={styles.checkRow}>
                    <input type="checkbox" checked={draft.active} onChange={(event) => updateDraft(user.id, "active", event.target.checked)} />
                    Usuário ativo
                  </label>
                  <div className={styles.muted}>{user._count.patientAssignments} paciente(s) vinculado(s)</div>
                </div>

                {draft.patientAccessScope === "ASSIGNED_PATIENTS" ? (
                  <div className={styles.assignmentBox}>
                    <div className={styles.actions}>
                      <button type="button" onClick={() => void toggleAssignments(user.id)}>
                        {assignmentOpen === user.id ? "Fechar pacientes vinculados" : "Gerenciar pacientes vinculados"}
                      </button>
                    </div>
                    {assignmentOpen === user.id ? (
                      <>
                        <div className={styles.searchRow}>
                          <input
                            aria-label={`Localizar paciente para ${user.name}`}
                            placeholder="Buscar paciente pelo nome"
                            value={searchText[user.id] ?? ""}
                            onChange={(event) => setSearchText((current) => ({ ...current, [user.id]: event.target.value }))}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void searchPatient(user.id);
                              }
                            }}
                          />
                          <button type="button" onClick={() => void searchPatient(user.id)}>Buscar paciente</button>
                        </div>
                        {(searchResults[user.id] ?? []).length > 0 ? (
                          <ul className={styles.resultList} aria-label="Resultados da busca de pacientes">
                            {(searchResults[user.id] ?? []).map((patient) => (
                              <li className={styles.resultItem} key={patient.id}>
                                <span>{patient.fullName}{patient.birthDate ? ` · ${patient.birthDate}` : ""}</span>
                                <button type="button" disabled={savingId === `${user.id}:${patient.id}`} onClick={() => void setAssignment(user.id, patient.id, true)}>Vincular</button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <ul className={styles.assignmentList} aria-label="Pacientes já vinculados">
                          {(assignments[user.id] ?? []).map((assignment) => (
                            <li className={styles.assignmentItem} key={assignment.id}>
                              <span>{assignment.patient.fullName}{assignment.patient.birthDate ? ` · ${String(assignment.patient.birthDate).slice(0, 10)}` : ""}</span>
                              <button className={styles.dangerButton} type="button" disabled={savingId === `${user.id}:${assignment.patientId}`} onClick={() => void setAssignment(user.id, assignment.patientId, false)}>Remover vínculo</button>
                            </li>
                          ))}
                        </ul>
                        {(assignments[user.id] ?? []).length === 0 ? <p className={styles.muted}>Nenhum paciente vinculado.</p> : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
