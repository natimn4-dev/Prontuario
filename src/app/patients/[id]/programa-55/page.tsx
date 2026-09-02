import { notFound } from "next/navigation";
import { isProgram55Enabled } from "@/domain/program55/feature";
import { requireAuthenticatedUser } from "@/server/auth/require-user";
import { prisma } from "@/server/db";

function formatDate(value: Date | null | undefined): string {
  return value ? value.toISOString().slice(0, 10).split("-").reverse().join("/") : "não registrada";
}

function formatScore(value: { toString(): string } | null, text: string | null): string {
  if (value !== null) return value.toString();
  return text?.trim() || "sem escore numérico";
}

function domainMatches(dimension: string | null, terms: readonly string[]): boolean {
  const normalized = (dimension ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export default async function Program55Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthenticatedUser("patient.read");
  if (!isProgram55Enabled(process.env.FEATURE_PROGRAM_55)) notFound();

  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      problems: {
        select: { id: true, status: true },
      },
      medications: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      consultations: {
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        take: 1,
        select: { id: true, occurredAt: true },
      },
      scaleAssessments: {
        orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
        take: 18,
        select: {
          id: true,
          scaleCode: true,
          scaleVersion: true,
          scoreNumeric: true,
          scoreText: true,
          classification: true,
          interpretation: true,
          appliedAt: true,
          scaleDefinition: {
            select: {
              name: true,
              dimension: true,
              sourceCitation: true,
            },
          },
        },
      },
    },
  });

  if (!patient) notFound();

  const assessments = patient.scaleAssessments;
  const nutrition = assessments.filter((item) => domainMatches(item.scaleDefinition?.dimension ?? null, ["nutri", "sarcopen"]));
  const functionPhysical = assessments.filter((item) => domainMatches(item.scaleDefinition?.dimension ?? null, ["funcional", "mobil", "fragil"]));
  const cognition = assessments.filter((item) => domainMatches(item.scaleDefinition?.dimension ?? null, ["cogni", "delirium"]));
  const mood = assessments.filter((item) => domainMatches(item.scaleDefinition?.dimension ?? null, ["humor"]));

  const activeProblems = patient.problems.filter((problem) => problem.status !== "RESOLVED").length;
  const firstClinicalAssessment = patient.consultations[0]?.occurredAt ?? null;

  const domainCards = [
    {
      title: "Saúde clínica",
      value: `${activeProblems} problema(s) em acompanhamento · ${patient.medications.length} medicamento(s) ativo(s)`,
      note: "Resumo derivado do prontuário longitudinal existente; nenhuma conduta é criada nesta tela.",
    },
    {
      title: "Nutrição e composição corporal",
      value: nutrition.length ? `${nutrition.length} resultado(s) recente(s) já registrado(s)` : "Sem resultado nutricional recente nesta visão",
      note: "Bioimpedância estruturada ainda não é registrada nesta primeira camada de produção.",
    },
    {
      title: "Força, mobilidade e função",
      value: functionPhysical.length ? `${functionPhysical.length} resultado(s) recente(s) já registrado(s)` : "Sem resultado funcional recente nesta visão",
      note: "Os escores existentes são exibidos sem recálculo e preservando versão e data.",
    },
    {
      title: "Cognição",
      value: cognition.length ? `${cognition.length} resultado(s) recente(s) já registrado(s)` : "Sem resultado cognitivo recente nesta visão",
      note: "MEEM, MoCA e demais instrumentos permanecem sob as regras clínicas já consolidadas.",
    },
    {
      title: "Humor e bem-estar",
      value: mood.length ? `${mood.length} resultado(s) recente(s) já registrado(s)` : "Sem resultado de humor recente nesta visão",
      note: "A tela não produz diagnóstico automático nem substitui avaliação profissional.",
    },
  ];

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Programa 55+</p>
        <h1>Saúde, Longevidade e Autonomia</h1>
        <p>
          {patient.fullName} · nascimento {formatDate(patient.birthDate)} · visão integrada dos dados já existentes no prontuário.
        </p>
      </header>

      <div className="notice" role="status">
        <strong>Implantação progressiva e isolada</strong>
        <span>
          Esta primeira camada é somente leitura. Não altera escalas, SOAP, medicamentos, diagnósticos, relatórios ou regras clínicas já aprovadas.
        </span>
      </div>

      <section className="metrics" aria-label="Resumo do ciclo 55+">
        <article>
          <strong>{formatDate(firstClinicalAssessment)}</strong>
          <span>primeiro registro clínico disponível</span>
        </article>
        <article>
          <strong>—</strong>
          <span>baseline 55+ ainda não iniciado</span>
        </article>
        <article>
          <strong>—</strong>
          <span>próximo checkpoint ainda não definido</span>
        </article>
        <article>
          <strong>{assessments.length}</strong>
          <span>resultados recentes de escalas disponíveis</span>
        </article>
      </section>

      <section aria-labelledby="program55-domains-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Visão integrada</p>
            <h2 id="program55-domains-title">Domínios do Programa 55+</h2>
          </div>
          <a href={`/patients/${patient.id}`}>Voltar ao prontuário</a>
        </div>
        <div className="grid">
          {domainCards.map((card) => (
            <article className="card" key={card.title}>
              <h2>{card.title}</h2>
              <p><strong>{card.value}</strong></p>
              <p style={{ marginTop: 10 }}>{card.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginTop: 24 }} aria-labelledby="program55-results-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dados já disponíveis</p>
            <h2 id="program55-results-title">Resultados clínicos recentes</h2>
          </div>
        </div>
        {assessments.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 8px" }}>Instrumento</th>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 8px" }}>Dimensão</th>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 8px" }}>Resultado</th>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 8px" }}>Classificação existente</th>
                  <th scope="col" style={{ textAlign: "left", padding: "10px 8px" }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <strong>{assessment.scaleDefinition?.name ?? assessment.scaleCode}</strong>
                      <div className="muted">{assessment.scaleCode} · versão {assessment.scaleVersion}</div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>{assessment.scaleDefinition?.dimension ?? "Não classificada"}</td>
                    <td style={{ padding: "12px 8px" }}>{formatScore(assessment.scoreNumeric, assessment.scoreText)}</td>
                    <td style={{ padding: "12px 8px" }}>{assessment.classification ?? "Sem classificação registrada"}</td>
                    <td style={{ padding: "12px 8px" }}>{formatDate(assessment.appliedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Sem resultados de escalas registrados.</p>
        )}
      </section>
    </main>
  );
}
