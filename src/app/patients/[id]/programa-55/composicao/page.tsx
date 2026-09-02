import { notFound } from "next/navigation";
import { BodyCompositionForm } from "@/components/program55/program55-forms";
import { Program55Nav } from "@/components/program55/program55-nav";
import { canWriteProgram55SharedData, type ExistingUserRole, type Program55Discipline } from "@/domain/program55/access";
import { program55CheckpointLabel } from "@/domain/program55/checkpoints";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

function fmt(value: { toString(): string } | null | undefined, unit = ""): string {
  return value === null || value === undefined ? "—" : `${value.toString()}${unit}`;
}
function date(value: Date): string { return value.toISOString().slice(0, 10).split("-").reverse().join("/"); }

export default async function Program55CompositionPage({ params }: { params: Promise<{ id: string }> }) {
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
          checkpoints: {
            orderBy: { referenceDate: "asc" },
            select: {
              id: true, checkpointType: true, referenceDate: true,
              bodyComposition: {
                orderBy: { measuredAt: "asc" },
                select: {
                  id: true, measuredAt: true, weightKg: true, heightCm: true, bmi: true, waistCm: true,
                  bodyFatPercent: true, fatMassKg: true, fatFreeMassKg: true, muscleMassKg: true,
                  sourceLabel: true, deviceLabel: true, notes: true,
                },
              },
            },
          },
          memberships: { where: { userId: user.id, active: true }, select: { discipline: true, active: true } },
        },
      },
    },
  });
  if (!patient || !isProgram55Eligible(patient.birthDate) || !patient.program55Enrollment) notFound();
  const enrollment = patient.program55Enrollment;
  const canWrite = canWriteProgram55SharedData({
    userId: user.id,
    role: user.role as ExistingUserRole,
    memberships: enrollment.memberships.map((item) => ({ discipline: item.discipline as Program55Discipline, active: item.active })),
  });
  const rows = enrollment.checkpoints.flatMap((checkpoint) => checkpoint.bodyComposition.map((record) => ({ checkpoint, record })));

  return (
    <main className="shell">
      <header className="hero compact-hero"><p className="eyebrow">Programa 55+ · Composição corporal</p><h1>{patient.fullName}</h1><p>Entrada manual estruturada. Não há integração automática nem interpretação inventada de equipamento.</p></header>
      <Program55Nav patientId={patient.id} />

      {canWrite ? <section className="panel"><div className="section-heading"><div><p className="eyebrow">Nova medição</p><h2>Registrar composição corporal</h2></div><span className="muted">Somente parâmetros efetivamente disponíveis</span></div><BodyCompositionForm patientId={patient.id} checkpoints={enrollment.checkpoints.map((item) => ({ id: item.id, label: `${program55CheckpointLabel(item.checkpointType)} · ${date(item.referenceDate)}` }))} /></section> : <div className="notice"><strong>Somente leitura</strong><span>Seu perfil pode visualizar esta linha longitudinal, mas não registrar medições.</span></div>}

      <section className="panel" style={{ marginTop: 24 }} aria-labelledby="body-history-title">
        <div className="section-heading"><div><p className="eyebrow">Evolução longitudinal</p><h2 id="body-history-title">Baseline · 90 dias · 180 dias · 12 meses</h2></div><span className="muted">Valores contínuos sem semáforo clínico inventado</span></div>
        {rows.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}><thead><tr><th>Checkpoint/data</th><th>Peso</th><th>IMC</th><th>Cintura</th><th>Gordura %</th><th>Massa gordura</th><th>Massa livre</th><th>Massa muscular</th><th>Origem</th></tr></thead><tbody>{rows.map(({ checkpoint, record }) => <tr key={record.id} style={{ borderTop: "1px solid var(--line)" }}><td style={{ padding: 10 }}><strong>{program55CheckpointLabel(checkpoint.checkpointType)}</strong><div className="muted">{date(record.measuredAt)}</div></td><td style={{ padding: 10 }}>{fmt(record.weightKg, " kg")}</td><td style={{ padding: 10 }}>{fmt(record.bmi)}</td><td style={{ padding: 10 }}>{fmt(record.waistCm, " cm")}</td><td style={{ padding: 10 }}>{fmt(record.bodyFatPercent, "%")}</td><td style={{ padding: 10 }}>{fmt(record.fatMassKg, " kg")}</td><td style={{ padding: 10 }}>{fmt(record.fatFreeMassKg, " kg")}</td><td style={{ padding: 10 }}>{fmt(record.muscleMassKg, " kg")}</td><td style={{ padding: 10 }}>{record.sourceLabel ?? "—"}{record.deviceLabel ? <div className="muted">{record.deviceLabel}</div> : null}</td></tr>)}</tbody></table></div> : <p className="muted">Ainda não há medições de composição corporal.</p>}
      </section>
    </main>
  );
}
