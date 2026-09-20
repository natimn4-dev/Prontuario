import { notFound } from "next/navigation";
import { CreateConsultationButton } from "@/components/consultations/create-consultation-button";
import { ProblemColumns } from "@/components/problems/problem-columns";
import { CapacityDimensionHistoryChart } from "@/components/reports/capacity-dimension-history-chart";
import {
  buildCapacityDimensionHistory,
  type CapacityTimelineAssessment,
} from "@/domain/capacity-dimension-history";
import { buildProblemCapacityMilestones } from "@/domain/capacity-timeline-milestones";
import { isProblemLogicalDeletionNote, PROBLEM_LOGICAL_DELETION_NOTE } from "@/domain/as-of-consultation";
import type { ClinicalProblem } from "@/domain/problems";
import { isProgram55Eligible } from "@/domain/program55/eligibility";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { hasAccessProfilePermission } from "@/domain/security/auth-policy";
import { requirePatientAccess } from "@/server/auth/patient-access";
import { prisma } from "@/server/db";

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ history?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const historyValue = Array.isArray(query.history) ? query.history[0] : query.history;
  const fullHistory = historyValue === "full";
  const { user } = await requirePatientAccess(id, "patient.read");
  const canWriteConsultation = hasAccessProfilePermission({
    role: user.role,
    professionalRole: user.professionalRole,
    canManageUsers: user.canManageUsers,
  }, "consultation.write");
  const program55Enabled = isProgram55Enabled(process.env.PROGRAM55_EMERGENCY_DISABLED);
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      needsIdentityReview: true,
      baselineConsultationId: true,
      problems: {
        where: { events: { none: { note: { contains: PROBLEM_LOGICAL_DELETION_NOTE } } } },
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
            orderBy: fullHistory ? { createdAt: "asc" } : { createdAt: "desc" },
            ...(fullHistory ? {} : { take: 25 }),
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
        ...(fullHistory ? {} : { take: 24 }),
        select: { id: true, type: true, status: true, occurredAt: true, createdAt: true },
      },
      scaleAssessments: {
        orderBy: fullHistory ? [{ appliedAt: "asc" }, { id: "asc" }] : [{ appliedAt: "desc" }, { id: "desc" }],
        ...(fullHistory ? {} : { take: 250 }),
        select: {
          id: true,
          patientId: true,
          consultationId: true,
          scaleCode: true,
          scaleVersion: true,
          scoreNumeric: true,
          scoreText: true,
          classification: true,
          interpretation: true,
          clinicalColor: true,
          appliedAt: true,
          scaleDefinition: {
            select: {
              sourceCitation: true,
              definitionHash: true,
            },
          },
        },
      },
    },
  });
  if (!patient) notFound();

  const program55Eligible = isProgram55Eligible(patient.birthDate);
  const visibleProblems = patient.problems.filter((problem) =>
    !problem.events.some((event) => isProblemLogicalDeletionNote(event.note)),
  );

  const milestones = buildProblemCapacityMilestones({ patientId: patient.id, problems: visibleProblems });
  const assessmentsForHistory = fullHistory ? patient.scaleAssessments : [...patient.scaleAssessments].reverse();

  const capacityHistory = buildCapacityDimensionHistory({
    patientId: patient.id,
    consultations: patient.consultations.map((consultation) => ({
      id: consultation.id,
      patientId: patient.id,
      occurredAt: consultation.occurredAt,
      createdAt: consultation.createdAt,
    })),
    assessments: assessmentsForHistory.map((assessment): CapacityTimelineAssessment => ({
      id: assessment.id,
      patientId: assessment.patientId,
      consultationId: assessment.consultationId,
      scaleCode: assessment.scaleCode,
      scaleVersion: assessment.scaleVersion,
      scoreNumeric: assessment.scoreNumeric === null ? null : Number(assessment.scoreNumeric),
      scoreText: assessment.scoreText,
      classification: assessment.classification,
      interpretation: assessment.interpretation,
      clinicalColor: assessment.clinicalColor as CapacityTimelineAssessment["clinicalColor"],
      appliedAt: assessment.appliedAt,
      sourceCitation: assessment.scaleDefinition?.sourceCitation,
      definitionHash: assessment.scaleDefinition?.definitionHash,
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
      <ProblemColumns problems={visibleProblems as ClinicalProblem[]} />

      <section className="panel" aria-label="Evolução da capacidade intrínseca e da independência funcional">
        <CapacityDimensionHistoryChart history={capacityHistory} context="patient-home" />
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Consultas</h2>
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, flexWrap: "wrap" }}>
            {program55Enabled && program55Eligible ? <a href={`/patients/${patient.id}/programa-55`}>Programa 55+ · 55–70 anos</a> : null}
            {canWriteConsultation ? (
              <CreateConsultationButton
                patientId={patient.id}
                baselineConsultationId={patient.baselineConsultationId}
              />
            ) : null}
            {fullHistory ? <a href={`/patients/${patient.id}`}>Usar janela recente</a> : <a href={`/patients/${patient.id}?history=full#consultas`}>Carregar histórico completo</a>}
          </div>
        </div>
        <p className="muted">{fullHistory ? "Histórico completo carregado para esta visualização." : "Exibindo as 24 consultas mais recentes e até 250 avaliações; o restante permanece disponível ao carregar o histórico completo."}</p>
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
