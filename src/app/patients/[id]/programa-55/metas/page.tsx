import { notFound } from "next/navigation";
import { GoalForm } from "@/components/program55/program55-forms";
import { Program55Nav } from "@/components/program55/program55-nav";
import { GoalStatusActions } from "@/components/program55/program55-workflow-actions";
import { canWriteProgram55SharedData, type ExistingUserRole, type Program55Discipline } from "@/domain/program55/access";
import { program55CheckpointLabel } from "@/domain/program55/checkpoints";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

function date(value: Date | null): string { return value ? value.toISOString().slice(0, 10).split("-").reverse().join("/") : "—"; }
const disciplineLabel: Record<string, string> = { PHYSICIAN: "Geriatria", PHYSIOTHERAPY: "Fisioterapia", NUTRITION: "Nutrição", PSYCHOLOGY: "Psicologia" };
const statusLabel: Record<string, string> = { ACTIVE: "Ativa", ACHIEVED: "Alcançada", PAUSED: "Pausada", CANCELLED: "Cancelada" };

export default async function Program55GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAuthenticatedUser("patient.read");
  if (!isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED)) notFound();
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, birthDate: true,
      program55Enrollment: {
        select: {
          id: true,
          checkpoints: { orderBy: { referenceDate: "asc" }, select: { id: true, checkpointType: true, referenceDate: true } },
          memberships: { where: { userId: user.id, active: true }, select: { discipline: true, active: true } },
          goals: { orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }], select: { id: true, domain: true, objective: true, indicator: true, baselineValue: true, targetValue: true, dueDate: true, status: true, responsibleDiscipline: true, notes: true, createdAt: true, createdBy: { select: { name: true } } } },
        },
      },
    },
  });
  if (!patient || !isProgram55Eligible(patient.birthDate) || !patient.program55Enrollment) notFound();
  const enrollment = patient.program55Enrollment;
  const canWrite = canWriteProgram55SharedData({ userId: user.id, role: user.role as ExistingUserRole, memberships: enrollment.memberships.map((item) => ({ discipline: item.discipline as Program55Discipline, active: item.active })) });

  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Programa 55+ · Metas</p><h1>Minhas prioridades para os próximos 90 dias</h1><p>{patient.fullName} · metas pactuadas, nunca geradas automaticamente.</p></header>
      <Program55Nav patientId={patient.id} />
      {canWrite ? <section className="panel"><div className="section-heading"><div><p className="eyebrow">Nova prioridade</p><h2>Adicionar meta</h2></div><span className="muted">Objetivo, indicador, baseline, meta, prazo e responsável</span></div><GoalForm patientId={patient.id} checkpoints={enrollment.checkpoints.map((item) => ({ id: item.id, label: `${program55CheckpointLabel(item.checkpointType)} · ${date(item.referenceDate)}` }))} /></section> : <div className="notice"><strong>Somente leitura</strong><span>Seu perfil não possui escrita compartilhada neste programa.</span></div>}

      <section className="panel" style={{ marginTop: 24 }} aria-labelledby="goals-list-title">
        <div className="section-heading"><div><p className="eyebrow">Objetivos pactuados</p><h2 id="goals-list-title">Metas registradas</h2></div><span className="muted">Status operacional</span></div>
        {enrollment.goals.length ? <div className="grid">{enrollment.goals.map((goal) => <article className="card" key={goal.id}><p className="eyebrow">{goal.domain}</p><h2>{goal.objective}</h2><p><strong>{statusLabel[goal.status] ?? goal.status}</strong>{goal.dueDate ? ` · prazo ${date(goal.dueDate)}` : ""}</p><dl><dt className="muted">Indicador</dt><dd>{goal.indicator ?? "—"}</dd><dt className="muted">Baseline</dt><dd>{goal.baselineValue ?? "—"}</dd><dt className="muted">Meta</dt><dd>{goal.targetValue ?? "—"}</dd><dt className="muted">Responsável</dt><dd>{goal.responsibleDiscipline ? disciplineLabel[goal.responsibleDiscipline] : "Equipe"}</dd></dl>{goal.notes ? <p>{goal.notes}</p> : null}<p className="muted">Registrado por {goal.createdBy.name} em {date(goal.createdAt)}</p>{canWrite ? <GoalStatusActions patientId={patient.id} goalId={goal.id} status={goal.status} /> : null}</article>)}</div> : <p className="muted">Nenhuma meta registrada.</p>}
      </section>
    </main>
  );
}
