import { notFound } from "next/navigation";
import { PrintButton } from "@/components/program55/print-button";
import { Program55Nav } from "@/components/program55/program55-nav";
import { program55CheckpointLabel } from "@/domain/program55/checkpoints";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { confirmedGlimSummaryFromStructuredData } from "@/domain/program55/glim";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

function date(value: Date | null | undefined): string { return value ? value.toISOString().slice(0, 10).split("-").reverse().join("/") : "—"; }
function value(raw: { toString(): string } | null | undefined, unit = ""): string { return raw === null || raw === undefined ? "—" : `${raw.toString()}${unit}`; }
const disciplineLabel: Record<string, string> = { PHYSICIAN: "Geriatria", PHYSIOTHERAPY: "Fisioterapia", NUTRITION: "Nutrição", PSYCHOLOGY: "Psicologia" };

export default async function Program55MapaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthenticatedUser("patient.read");
  if (!isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED)) notFound();
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, birthDate: true,
      program55Enrollment: {
        select: {
          startedAt: true,
          coordinatingPhysician: { select: { name: true } },
          checkpoints: {
            orderBy: { referenceDate: "asc" },
            select: {
              id: true, checkpointType: true, referenceDate: true, status: true,
              bodyComposition: { orderBy: { measuredAt: "desc" }, take: 1, select: { measuredAt: true, weightKg: true, bmi: true, waistCm: true, bodyFatPercent: true, fatMassKg: true, fatFreeMassKg: true, muscleMassKg: true, sourceLabel: true } },
              professionalAssessments: { select: { discipline: true, status: true, structuredData: true, sharedSummary: true, assessedAt: true, author: { select: { name: true } } } },
            },
          },
          goals: { orderBy: [{ status: "asc" }, { dueDate: "asc" }], select: { id: true, domain: true, objective: true, indicator: true, baselineValue: true, targetValue: true, dueDate: true, status: true, responsibleDiscipline: true } },
        },
      },
      scaleAssessments: {
        orderBy: { appliedAt: "desc" }, take: 12,
        select: { id: true, scaleCode: true, scaleVersion: true, scoreNumeric: true, scoreText: true, classification: true, appliedAt: true, scaleDefinition: { select: { name: true, dimension: true } } },
      },
    },
  });
  if (!patient || !isProgram55Eligible(patient.birthDate) || !patient.program55Enrollment) notFound();
  const enrollment = patient.program55Enrollment;
  const checkpoints = enrollment.checkpoints;
  const currentCheckpoint = checkpoints.find((item) => item.status !== "REVIEWED") ?? checkpoints.at(-1);
  const nextCheckpoint = checkpoints.find((item) => item.referenceDate >= new Date() && item.status !== "REVIEWED") ?? checkpoints.at(-1);
  const latestBody = [...checkpoints].reverse().find((item) => item.bodyComposition.length)?.bodyComposition[0];
  const latestProfessional = new Map<string, (typeof checkpoints)[number]["professionalAssessments"][number]>();
  for (const checkpoint of checkpoints) for (const assessment of checkpoint.professionalAssessments) latestProfessional.set(assessment.discipline, assessment);
  const confirmedGlimSummary = confirmedGlimSummaryFromStructuredData(latestProfessional.get("NUTRITION")?.structuredData);
  const activeGoals = enrollment.goals.filter((goal) => goal.status === "ACTIVE");
  const achievedGoals = enrollment.goals.filter((goal) => goal.status === "ACHIEVED");

  return (
    <main className="shell clinical-report-shell">
      <div className="no-print"><Program55Nav patientId={patient.id} /></div>
      <header className="hero compact-hero">
        <p className="eyebrow">MAPA 55+</p>
        <h1>Saúde, Longevidade e Autonomia</h1>
        <p>Documento integrado do Programa 55+. Linguagem informativa, sem promessas de rejuvenescimento ou prevenção absoluta.</p>
        <PrintButton />
      </header>

      <section className="panel">
        <h2>Identificação</h2>
        <dl><dt className="muted">Paciente</dt><dd>{patient.fullName}</dd><dt className="muted">Nascimento</dt><dd>{date(patient.birthDate)}</dd><dt className="muted">Entrada no programa</dt><dd>{date(enrollment.startedAt)}</dd><dt className="muted">Coordenação</dt><dd>{enrollment.coordinatingPhysician?.name ?? "Não registrada"}</dd></dl>
      </section>

      <div className="grid" style={{ marginTop: 20 }}>
        <section className="card"><h2>Seus pontos fortes</h2>{achievedGoals.length ? <ul>{achievedGoals.map((goal) => <li key={goal.id}>{goal.objective}</li>)}</ul> : <p>Sem pontos fortes formalmente marcados como meta alcançada. A equipe pode registrar esses destaques na devolutiva.</p>}</section>
        <section className="card"><h2>Áreas que merecem atenção</h2>{activeGoals.length ? <ul>{activeGoals.map((goal) => <li key={goal.id}><strong>{goal.domain}:</strong> {goal.objective}</li>)}</ul> : <p>Sem prioridade ativa registrada no Programa 55+.</p>}</section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}><h2>Indicadores principais</h2>{patient.scaleAssessments.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Avaliação</th><th>Resultado</th><th>Classificação registrada</th><th>Data</th></tr></thead><tbody>{patient.scaleAssessments.map((assessment) => <tr key={assessment.id} style={{ borderTop: "1px solid var(--line)" }}><td style={{ padding: 9 }}>{assessment.scaleDefinition?.name ?? assessment.scaleCode}<div className="muted">{assessment.scaleCode} · v{assessment.scaleVersion}</div></td><td style={{ padding: 9 }}>{assessment.scoreNumeric?.toString() ?? assessment.scoreText ?? "—"}</td><td style={{ padding: 9 }}>{assessment.classification ?? "Sem classificação registrada"}</td><td style={{ padding: 9 }}>{date(assessment.appliedAt)}</td></tr>)}</tbody></table></div> : <p>Sem instrumentos registrados.</p>}</section>

      <section className="panel" style={{ marginTop: 20 }}><h2>Composição corporal</h2>{latestBody ? <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}><div><span className="muted">Peso</span><strong style={{ display: "block" }}>{value(latestBody.weightKg, " kg")}</strong></div><div><span className="muted">IMC</span><strong style={{ display: "block" }}>{value(latestBody.bmi)}</strong></div><div><span className="muted">Cintura</span><strong style={{ display: "block" }}>{value(latestBody.waistCm, " cm")}</strong></div><div><span className="muted">Gordura</span><strong style={{ display: "block" }}>{value(latestBody.bodyFatPercent, "%")}</strong></div><div><span className="muted">Massa muscular</span><strong style={{ display: "block" }}>{value(latestBody.muscleMassKg, " kg")}</strong></div><div><span className="muted">Data/origem</span><strong style={{ display: "block" }}>{date(latestBody.measuredAt)} · {latestBody.sourceLabel ?? "origem não registrada"}</strong></div></div> : <p>Sem composição corporal registrada.</p>}</section>

      {["NUTRITION", "PHYSIOTHERAPY", "PSYCHOLOGY"].map((discipline) => {
        const assessment = latestProfessional.get(discipline);
        const title = discipline === "NUTRITION" ? "Saúde nutricional" : discipline === "PHYSIOTHERAPY" ? "Mobilidade e força" : "Humor e bem-estar";
        return <section className="panel" style={{ marginTop: 20 }} key={discipline}><h2>{title}</h2>{discipline === "NUTRITION" && confirmedGlimSummary ? <div className="notice"><strong>GLIM confirmado pela equipe</strong><span>{confirmedGlimSummary}</span></div> : null}<p>{assessment?.sharedSummary || "Sem resumo compartilhável registrado."}</p>{assessment ? <p className="muted">{disciplineLabel[discipline]} · {assessment.author.name} · {date(assessment.assessedAt)}</p> : null}</section>;
      })}

      <section className="panel" style={{ marginTop: 20 }}><h2>Cognição</h2>{patient.scaleAssessments.filter((assessment) => (assessment.scaleDefinition?.dimension ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("cogni")).length ? <ul>{patient.scaleAssessments.filter((assessment) => (assessment.scaleDefinition?.dimension ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes("cogni")).map((assessment) => <li key={assessment.id}>{assessment.scaleDefinition?.name ?? assessment.scaleCode}: {assessment.scoreNumeric?.toString() ?? assessment.scoreText ?? "—"}{assessment.classification ? ` · ${assessment.classification}` : ""} ({date(assessment.appliedAt)})</li>)}</ul> : <p>Sem avaliação cognitiva registrada nesta visão.</p>}</section>

      <section className="panel" style={{ marginTop: 20 }}><h2>Prioridades para os próximos 90 dias</h2>{activeGoals.length ? <ul>{activeGoals.map((goal) => <li key={goal.id}><strong>{goal.objective}</strong>{goal.indicator ? ` · indicador: ${goal.indicator}` : ""}{goal.targetValue ? ` · meta: ${goal.targetValue}` : ""}{goal.dueDate ? ` · prazo: ${date(goal.dueDate)}` : ""}</li>)}</ul> : <p>Sem metas ativas registradas.</p>}</section>

      <section className="panel" style={{ marginTop: 20 }}><h2>Evolução longitudinal</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th>Checkpoint</th><th>Data prevista</th><th>Status</th><th>Peso registrado</th></tr></thead><tbody>{checkpoints.map((checkpoint) => <tr key={checkpoint.id} style={{ borderTop: "1px solid var(--line)" }}><td style={{ padding: 9 }}>{program55CheckpointLabel(checkpoint.checkpointType)}</td><td style={{ padding: 9 }}>{date(checkpoint.referenceDate)}</td><td style={{ padding: 9 }}>{checkpoint.status}</td><td style={{ padding: 9 }}>{value(checkpoint.bodyComposition[0]?.weightKg, " kg")}</td></tr>)}</tbody></table></div></section>

      <section className="panel" style={{ marginTop: 20 }}><h2>Recomendações registradas pela equipe</h2>{Array.from(latestProfessional.entries()).filter(([, assessment]) => assessment.sharedSummary).length ? <ul>{Array.from(latestProfessional.entries()).filter(([, assessment]) => assessment.sharedSummary).map(([discipline, assessment]) => <li key={discipline}><strong>{disciplineLabel[discipline]}:</strong> {assessment.sharedSummary}</li>)}</ul> : <p>Sem recomendações compartilháveis registradas.</p>}<p className="muted">Notas profissionais restritas de psicologia não são incluídas neste documento.</p></section>

      <section className="panel" style={{ marginTop: 20 }}><h2>Data prevista da próxima avaliação</h2><p><strong>{nextCheckpoint ? `${program55CheckpointLabel(nextCheckpoint.checkpointType)} · ${date(nextCheckpoint.referenceDate)}` : "Não definida"}</strong></p><p className="muted">Checkpoint atual de referência: {currentCheckpoint ? program55CheckpointLabel(currentCheckpoint.checkpointType) : "—"}.</p></section>
    </main>
  );
}
