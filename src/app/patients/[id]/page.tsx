import { notFound } from "next/navigation";
import { ProblemColumns } from "@/components/problems/problem-columns";
import type { ClinicalProblem } from "@/domain/problems";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";
import { CreateConsultationButton } from "@/components/consultations/create-consultation-button";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthenticatedUser("patient.read");
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      needsIdentityReview: true,
      baselineConsultationId: true,
      problems: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        select: { id: true, patientId: true, type: true, status: true, title: true, description: true, priority: true },
      },
      consultations: {
        orderBy: { occurredAt: "desc" },
        select: { id: true, type: true, status: true, occurredAt: true },
      },
    },
  });
  if (!patient) notFound();

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Cadastro existente</p>
        <h1>{patient.fullName}</h1>
        <p>Data de nascimento: {patient.birthDate?.toISOString().slice(0, 10) ?? "não registrada"}</p>
        {patient.needsIdentityReview ? <strong className="draft-watermark">Identidade/homônimo pendente de revisão</strong> : null}
      </header>
      <ProblemColumns problems={patient.problems as ClinicalProblem[]} />
      <section className="panel">
        <div className="section-heading">
          <h2>Consultas</h2>
          <CreateConsultationButton
            patientId={patient.id}
            baselineConsultationId={patient.baselineConsultationId}
          />
        </div>
        {patient.consultations.length ? (
          <ul className="clean-list">
            {patient.consultations.map((consultation) => (
              <li key={consultation.id}>
                <a href={`/consultations/${consultation.id}`}>{consultation.type} · {consultation.occurredAt.toISOString().slice(0, 10)}</a>
                <span>{consultation.status}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Sem consultas registradas.</p>}
      </section>
    </main>
  );
}
