import { notFound } from "next/navigation";
import { MembershipForm, ProfessionalAssessmentForm, PsychologyRestrictedNoteForm } from "@/components/program55/program55-forms";
import { Program55Nav } from "@/components/program55/program55-nav";
import {
  canManageProgram55,
  canReadRestrictedPsychologyNote,
  canWriteProgram55Discipline,
  type ExistingUserRole,
  type Program55ActorAccess,
  type Program55Discipline,
} from "@/domain/program55/access";
import { program55CheckpointLabel } from "@/domain/program55/checkpoints";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

const disciplines: Program55Discipline[] = ["PHYSICIAN", "NUTRITION", "PHYSIOTHERAPY", "PSYCHOLOGY"];
const labels: Record<Program55Discipline, string> = { PHYSICIAN: "Geriatria", NUTRITION: "Nutrição", PHYSIOTHERAPY: "Fisioterapia", PSYCHOLOGY: "Psicologia" };
const statusLabels: Record<string, string> = { NOT_STARTED: "Não iniciado", IN_PROGRESS: "Em preenchimento", COMPLETED: "Concluído", REVIEWED: "Revisado" };
function formatDate(value: Date): string { return value.toISOString().slice(0, 10).split("-").reverse().join("/"); }
function objectData(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export default async function Program55TeamPage({ params }: { params: Promise<{ id: string }> }) {
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
          memberships: { where: { active: true }, select: { id: true, userId: true, discipline: true, active: true, user: { select: { name: true, email: true } } } },
          checkpoints: {
            orderBy: { referenceDate: "asc" },
            select: {
              id: true, checkpointType: true, referenceDate: true, status: true,
              professionalAssessments: {
                select: { id: true, discipline: true, status: true, structuredData: true, sharedSummary: true, authorUserId: true, assessedAt: true, updatedAt: true, author: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!patient || !isProgram55Eligible(patient.birthDate) || !patient.program55Enrollment) notFound();
  const enrollment = patient.program55Enrollment;
  const actor: Program55ActorAccess = {
    userId: user.id,
    role: user.role as ExistingUserRole,
    memberships: enrollment.memberships.filter((item) => item.userId === user.id).map((item) => ({ discipline: item.discipline as Program55Discipline, active: item.active })),
  };
  const currentCheckpoint = enrollment.checkpoints.find((item) => item.status !== "REVIEWED") ?? enrollment.checkpoints[0];
  if (!currentCheckpoint) notFound();
  const byDiscipline = new Map(currentCheckpoint.professionalAssessments.map((assessment) => [assessment.discipline as Program55Discipline, assessment]));
  const psychAssessment = byDiscipline.get("PSYCHOLOGY");
  const canReadPsychRestricted = psychAssessment ? canReadRestrictedPsychologyNote(actor, psychAssessment.authorUserId) : false;
  const restrictedPsychologyNote = psychAssessment && canReadPsychRestricted
    ? await prisma.program55RestrictedPsychologyNote.findUnique({ where: { assessmentId: psychAssessment.id }, select: { content: true, authorUserId: true } })
    : null;

  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Programa 55+ · Equipe multiprofissional</p><h1>{patient.fullName}</h1><p>{program55CheckpointLabel(currentCheckpoint.checkpointType)} · {formatDate(currentCheckpoint.referenceDate)}. Cada profissional edita apenas o domínio autorizado.</p></header>
      <Program55Nav patientId={patient.id} />

      <section className="panel" aria-labelledby="team-status-title">
        <div className="section-heading"><div><p className="eyebrow">Status do workflow</p><h2 id="team-status-title">Dados disponíveis e pendências</h2></div><span className="muted">Pendente não significa alterado</span></div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {disciplines.map((discipline) => {
            const assessment = byDiscipline.get(discipline);
            return <article className="card" key={discipline}><h2>{labels[discipline]}</h2><p><strong>{assessment ? statusLabels[assessment.status] ?? assessment.status : "Pendente"}</strong></p><p className="muted">{assessment ? `Responsável: ${assessment.author.name} · ${formatDate(assessment.updatedAt)}` : "Sem registro neste checkpoint"}</p></article>;
          })}
        </div>
      </section>

      {canManageProgram55(actor) ? <section className="panel" style={{ marginTop: 24 }}><div className="section-heading"><div><p className="eyebrow">Participação profissional</p><h2>Vincular usuário já autorizado</h2></div><span className="muted">Não cria conta nem altera allowlist/login</span></div><MembershipForm patientId={patient.id} /><div style={{ marginTop: 18 }}><strong>Participantes ativos</strong><ul className="clean-list">{enrollment.memberships.map((membership) => <li key={membership.id}><span>{membership.user.name} · {membership.user.email}</span><strong>{labels[membership.discipline as Program55Discipline]}</strong></li>)}</ul></div></section> : null}

      {disciplines.map((discipline) => {
        const assessment = byDiscipline.get(discipline);
        const writable = canWriteProgram55Discipline(actor, discipline);
        return (
          <section className="panel" style={{ marginTop: 24 }} key={discipline} aria-labelledby={`domain-${discipline}`}>
            <div className="section-heading"><div><p className="eyebrow">Domínio profissional</p><h2 id={`domain-${discipline}`}>{labels[discipline]}</h2></div><span className="muted">{assessment ? `${statusLabels[assessment.status] ?? assessment.status} · ${formatDate(assessment.assessedAt)}` : "Pendente"}</span></div>
            {writable ? <ProfessionalAssessmentForm patientId={patient.id} checkpointId={currentCheckpoint.id} discipline={discipline} initialSummary={assessment?.sharedSummary ?? ""} initialData={objectData(assessment?.structuredData)} initialStatus={assessment?.status ?? "IN_PROGRESS"} /> : assessment ? <div><p><strong>Resumo compartilhável</strong></p><p>{assessment.sharedSummary || "Sem resumo compartilhável registrado."}</p><p className="muted">Responsável: {assessment.author.name}</p></div> : <p className="muted">Seu perfil pode visualizar o status, mas não editar este domínio.</p>}

            {discipline === "PSYCHOLOGY" && psychAssessment && canWriteProgram55Discipline(actor, "PSYCHOLOGY") ? <div style={{ marginTop: 20 }}><PsychologyRestrictedNoteForm patientId={patient.id} assessmentId={psychAssessment.id} initialContent={restrictedPsychologyNote?.authorUserId === user.id ? restrictedPsychologyNote.content : ""} /></div> : null}
            {discipline === "PSYCHOLOGY" && psychAssessment && canReadPsychRestricted && restrictedPsychologyNote && restrictedPsychologyNote.authorUserId !== user.id ? <div className="notice" style={{ marginTop: 20 }}><strong>Nota restrita de psicologia disponível</strong><span>Visível somente a profissional(is) de psicologia autorizada(s). Conteúdo: {restrictedPsychologyNote.content}</span></div> : null}
          </section>
        );
      })}
    </main>
  );
}
