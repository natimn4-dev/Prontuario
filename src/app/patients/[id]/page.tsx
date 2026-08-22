import { notFound } from "next/navigation";
import { CreateConsultationButton } from "@/components/consultations/create-consultation-button";
import { ProblemColumns } from "@/components/problems/problem-columns";
import { CapacityDimensionHistoryChart } from "@/components/reports/capacity-dimension-history-chart";
import {
  buildCapacityDimensionHistory,
  type CapacityTimelineAssessment,
  type CapacityTimelineMilestone,
} from "@/domain/capacity-dimension-history";
import type { ClinicalProblem } from "@/domain/problems";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

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
        select: {
          id: true,
          patientId: true,
          type: true,
          status: true,
          title: true,
          description: true,
          priority: true,
          originConsultationId: true,
          createdAt: true,
          events: {
            orderBy: { createdAt: "asc" },
            select: {
              patientId: true,
              consultationId: true,
              note: true,
              createdAt: true,
            },
          },
        },
      },
      consultations: {
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: { id: true, type: true, status: true, occurredAt: true, createdAt: true },
      },
      scaleAssessments: {
        orderBy: { appliedAt: "asc" },
        select: {
          patientId: true,
          consultationId: true,
          scaleCode: true,
          clinicalColor: true,
          appliedAt: true,
        },
      },
    },
  });
  if (!patient) notFound();

  const milestones: CapacityTimelineMilestone[] = patient.problems.flatMap((problem) => {
    const items: CapacityTimelineMilestone[] = [];
    const originNote = problem.description?.trim();
    if (originNote) {
      items.push({
        patientId: problem.patientId,
        consultationId: problem.originConsultationId,
        title: problem.title,
        note: originNote,
        recordedAt: problem.createdAt,
        source: "problem-origin",
      });
    }
    for (const event of problem.events) {
      const eventNote = event.note?.trim();
      if (!eventNote) continue;
      items.push({
        patientId: event.patientId,
        consultationId: event.consultationId,
        title: problem.title,
        note: eventNote,
        recordedAt: event.createdAt,
        source: "problem-event",
      });
    }
    return items;
  });

  const capacityHistory = buildCapacityDimensionHistory({
    patientId: patient.id,
    consultations: patient.consultations.map((consultation) => ({
      id: consultation.id,
      patientId: patient.id,
      occurredAt: consultation.occurredAt,
      createdAt: consultation.createdAt,
    })),
    assessments: patient.scaleAssessments.map((assessment) => ({
      ...assessment,
      clinicalColor: assessment.clinicalColor as CapacityTimelineAssessment["clinicalColor"],
    })),
    milestones,
    targetConsultationId: patient.consultations[0]?.id,
    includeTargetWhenEmpty: false,
  });

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Cadastro existente</p>
        <h1>{patient.fullName}</h1>
        <p>Data de nascimento: {patient.birthDate?.toISOString().slice(0, 10) ?? "não registrada"}</p>
        {patient.needsIdentityReview ? <strong className="draft-watermark">Identidade/homônimo pendente de revisão</strong> : null}
      </header>
      <ProblemColumns problems={patient.problems as ClinicalProblem[]} />

      <section className="panel" aria-labelledby="capacity-history-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Evolução longitudinal</p>
            <h2 id="capacity-history-title">Capacidade intrínseca e funcional</h2>
          </div>
        </div>
        <CapacityDimensionHistoryChart history={capacityHistory} context="patient-home" />
      </section>

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
