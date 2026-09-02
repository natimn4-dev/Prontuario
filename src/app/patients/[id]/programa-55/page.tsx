import { notFound } from "next/navigation";
import { StartProgram55Button } from "@/components/program55/program55-forms";
import { Program55Nav } from "@/components/program55/program55-nav";
import { CheckpointStatusActions } from "@/components/program55/program55-workflow-actions";
import { program55CheckpointLabel } from "@/domain/program55/checkpoints";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

function formatDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10).split("-").reverse().join("/") : "—";
}

const disciplineLabel: Record<string, string> = {
  PHYSICIAN: "Geriatria",
  PHYSIOTHERAPY: "Fisioterapia",
  NUTRITION: "Nutrição",
  PSYCHOLOGY: "Psicologia",
};

const workflowLabel: Record<string, string> = {
  NOT_STARTED: "Não iniciado",
  IN_PROGRESS: "Em preenchimento",
  COMPLETED: "Concluído",
  REVIEWED: "Revisado",
};

export default async function Program55Page({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireAuthenticatedUser("patient.read");
  if (!isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED)) notFound();
  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      problems: { where: { status: { not: "RESOLVED" } }, select: { id: true } },
      medications: { where: { status: "ACTIVE" }, select: { id: true } },
      scaleAssessments: {
        orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
        take: 8,
        select: {
          id: true, scaleCode: true, scaleVersion: true, scoreNumeric: true, scoreText: true,
          classification: true, appliedAt: true,
          scaleDefinition: { select: { name: true, dimension: true } },
        },
      },
      program55Enrollment: {
        select: {
          id: true, status: true, startedAt: true,
          coordinatingPhysician: { select: { id: true, name: true } },
          checkpoints: {
            orderBy: { referenceDate: "asc" },
            select: {
              id: true, checkpointType: true, referenceDate: true, status: true,
              professionalAssessments: { select: { discipline: true, status: true, updatedAt: true } },
              bodyComposition: { select: { id: true }, take: 1, orderBy: { measuredAt: "desc" } },
            },
          },
          memberships: {
            where: { active: true },
            select: { id: true, discipline: true, user: { select: { id: true, name: true } } },
          },
          goals: { where: { status: "ACTIVE" }, select: { id: true } },
        },
      },
    },
  });

  if (!patient || !isProgram55Eligible(patient.birthDate)) notFound();
  const enrollment = patient.program55Enrollment;
  const canManageCycle = user.role === "ADMIN" || user.role === "PHYSICIAN";
  const nextCheckpoint = enrollment?.checkpoints.find((checkpoint) => checkpoint.status !== "REVIEWED") ?? enrollment?.checkpoints.at(-1);
  const latestAssessmentByDiscipline = new Map<string, { status: string; updatedAt: Date }>();
  for (const checkpoint of enrollment?.checkpoints ?? []) {
    for (const assessment of checkpoint.professionalAssessments) {
      const previous = latestAssessmentByDiscipline.get(assessment.discipline);
      if (!previous || assessment.updatedAt > previous.updatedAt) latestAssessmentByDiscipline.set(assessment.discipline, assessment);
    }
  }

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Programa 55+ · 55 a 70 anos</p>
        <h1>Saúde, Longevidade e Autonomia</h1>
        <p>{patient.fullName} · nascimento {formatDate(patient.birthDate)} · mesma identidade do prontuário longitudinal.</p>
      </header>

      {enrollment ? <Program55Nav patientId={patient.id} /> : null}

      {!enrollment ? (
        <section className="panel" aria-labelledby="program55-start-title">
          <p className="eyebrow">Entrada no programa</p>
          <h2 id="program55-start-title">Iniciar ciclo longitudinal</h2>
          <p>Serão criados, de forma aditiva, os checkpoints Baseline, 90 dias, 180 dias e 12 meses. Nenhuma consulta, escala ou documento existente será duplicado.</p>
          {canManageCycle ? <StartProgram55Button patientId={patient.id} /> : <p className="muted">Somente a coordenação médica autorizada pode iniciar o ciclo.</p>}
        </section>
      ) : (
        <>
          <section className="metrics" aria-label="Resumo do ciclo 55+">
            <article><strong>{formatDate(enrollment.startedAt)}</strong><span>baseline do programa</span></article>
            <article><strong>{nextCheckpoint ? program55CheckpointLabel(nextCheckpoint.checkpointType) : "—"}</strong><span>próximo checkpoint · {formatDate(nextCheckpoint?.referenceDate)}</span></article>
            <article><strong>{enrollment.goals.length}</strong><span>metas ativas</span></article>
            <article><strong>{enrollment.memberships.length}</strong><span>participações registradas</span></article>
          </section>

          <section className="panel" aria-labelledby="program55-cycle-title">
            <div className="section-heading"><div><p className="eyebrow">Ciclo longitudinal</p><h2 id="program55-cycle-title">Checkpoints</h2></div><span className="muted">Status operacional, não classificação clínica</span></div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              {enrollment.checkpoints.map((checkpoint) => (
                <article className="card" key={checkpoint.id}>
                  <h2>{program55CheckpointLabel(checkpoint.checkpointType)}</h2>
                  <p><strong>{formatDate(checkpoint.referenceDate)}</strong></p>
                  <p className="muted">{workflowLabel[checkpoint.status] ?? checkpoint.status}</p>
                  <p className="muted">Composição corporal: {checkpoint.bodyComposition.length ? "registrada" : "pendente"}</p>
                  {canManageCycle ? <CheckpointStatusActions patientId={patient.id} checkpointId={checkpoint.id} status={checkpoint.status} /> : null}
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="program55-domains-title" style={{ marginTop: 24 }}>
            <div className="section-heading"><div><p className="eyebrow">Resumo da avaliação</p><h2 id="program55-domains-title">Domínios</h2></div><a href={`/patients/${patient.id}`}>Voltar ao prontuário</a></div>
            <div className="grid">
              <article className="card"><h2>Saúde clínica</h2><p><strong>{patient.problems.length} problema(s) em acompanhamento</strong></p><p>{patient.medications.length} medicamento(s) ativo(s). Dados consumidos do prontuário, sem duplicação.</p></article>
              {["NUTRITION", "PHYSIOTHERAPY", "PSYCHOLOGY"].map((discipline) => {
                const latest = latestAssessmentByDiscipline.get(discipline);
                return <article className="card" key={discipline}><h2>{disciplineLabel[discipline]}</h2><p><strong>{latest ? workflowLabel[latest.status] ?? latest.status : "Pendente"}</strong></p><p className="muted">{latest ? `Última atualização ${formatDate(latest.updatedAt)}` : "Ainda sem avaliação profissional neste ciclo."}</p></article>;
              })}
              <article className="card"><h2>Cognição</h2><p><strong>{patient.scaleAssessments.filter((item) => (item.scaleDefinition?.dimension ?? "").toLowerCase().includes("cogni")).length} resultado(s) recente(s)</strong></p><p>As escalas continuam no motor clínico existente.</p></article>
            </div>
          </section>

          <section className="panel" style={{ marginTop: 24 }} aria-labelledby="program55-results-title">
            <div className="section-heading"><div><p className="eyebrow">Dados já disponíveis</p><h2 id="program55-results-title">Escalas recentes</h2></div><span className="muted">Escolha dos instrumentos permanece do geriatra</span></div>
            {patient.scaleAssessments.length ? (
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Instrumento</th><th>Resultado</th><th>Classificação existente</th><th>Data</th></tr></thead><tbody>{patient.scaleAssessments.map((assessment) => <tr key={assessment.id} style={{ borderTop: "1px solid var(--line)" }}><td style={{ padding: 10 }}><strong>{assessment.scaleDefinition?.name ?? assessment.scaleCode}</strong><div className="muted">{assessment.scaleCode} · v{assessment.scaleVersion}</div></td><td style={{ padding: 10 }}>{assessment.scoreNumeric?.toString() ?? assessment.scoreText ?? "—"}</td><td style={{ padding: 10 }}>{assessment.classification ?? "Sem classificação registrada"}</td><td style={{ padding: 10 }}>{formatDate(assessment.appliedAt)}</td></tr>)}</tbody></table></div>
            ) : <p className="muted">Sem resultados de escalas registrados.</p>}
          </section>

          <section className="notice" style={{ marginTop: 24 }}><strong>Proteção clínica</strong><span>O Programa 55+ agrega dados; não altera SOAP, medicamentos, problemas, vacinação, escalas, gráficos existentes ou assinatura digital. Usuário autenticado: {user.name}.</span></section>
        </>
      )}
    </main>
  );
}
