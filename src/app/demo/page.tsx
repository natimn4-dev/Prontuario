import { buildConsultationOutputs } from "@/domain/consultation-output.ts";
import { DEMO_ASSESSMENTS, DEMO_MEDICATIONS, DEMO_PATIENT, DEMO_PROBLEMS } from "@/domain/demo-case.ts";
import { MedicationPlanTable } from "@/components/medications/medication-plan-table";
import { ProblemColumns } from "@/components/problems/problem-columns";

export const dynamic = "force-dynamic";

const outputs = buildConsultationOutputs({
  patientId: DEMO_PATIENT.id,
  consultationId: "demo-follow-2",
  patientName: DEMO_PATIENT.name,
  longitudinalAssessments: DEMO_ASSESSMENTS,
  longitudinalProblems: DEMO_PROBLEMS,
  subjective: "Caso inteiramente sintético usado apenas para demonstração da arquitetura longitudinal.",
  medicationPlan: DEMO_MEDICATIONS,
  contactPhone: "71 99992-1416",
});

function trendClass(trend: string) {
  if (trend === "unfavorable") return "trend trend-bad";
  if (trend === "favorable") return "trend trend-good";
  if (trend === "stable") return "trend trend-stable";
  return "trend";
}

export default function DemoPage() {
  const summary = outputs.followUpContext.changeSummary;
  const proposals = outputs.followUpContext.proposedProblems;

  return (
    <main className="shell">
      <header className="hero compact-hero">
        <p className="eyebrow">Demonstração sintética · nenhum dado real</p>
        <h1>O que mudou?</h1>
        <p>{summary.headline}</p>
      </header>

      <section className="metrics" aria-label="Resumo da evolução">
        <article><strong>{summary.counts.unfavorable}</strong><span>Tendências desfavoráveis</span></article>
        <article><strong>{summary.counts.favorable}</strong><span>Tendências favoráveis</span></article>
        <article><strong>{summary.counts.stable}</strong><span>Estáveis</span></article>
        <article><strong>{summary.counts.urgentAlerts}</strong><span>Alertas urgentes</span></article>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Evolução longitudinal</p>
            <h2>Escalas prioritárias</h2>
          </div>
          <span className="muted">Atual × consulta anterior × baseline</span>
        </div>
        <div className="evolution-list">
          {summary.cards.map((card) => (
            <article className="evolution-card" key={`${card.scaleId}-${card.scaleVersion}`}>
              <div>
                <p className="dimension">{card.dimension}</p>
                <h3>{card.name}</h3>
                <p className={trendClass(card.vsPrevious.trend)}>{card.trendLabel}</p>
              </div>
              <div className="score-block">
                <span>Anterior</span>
                <strong>{card.vsPrevious.fromScore ?? "—"}</strong>
              </div>
              <div className="score-arrow">→</div>
              <div className="score-block current-score">
                <span>Atual</span>
                <strong>{card.vsPrevious.toScore ?? card.current.score ?? "—"}</strong>
              </div>
              <div className="score-block">
                <span>Baseline</span>
                <strong>{card.baseline.score ?? "—"}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <ProblemColumns problems={DEMO_PROBLEMS} />

      <MedicationPlanTable patientName={DEMO_PATIENT.name} items={DEMO_MEDICATIONS} />

      <section className="two-columns">
        <article className="panel">
          <p className="eyebrow">Revisão médica obrigatória</p>
          <h2>Problemas sugeridos</h2>
          <p className="muted">Nenhuma sugestão abaixo é incorporada automaticamente ao prontuário.</p>
          <ul className="clean-list">
            {proposals.map((proposal) => (
              <li key={proposal.key}>
                <strong>{proposal.title}</strong>
                <span>{proposal.evidence.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <p className="eyebrow">Plano integrado</p>
          <h2>Intervenções sugeridas</h2>
          <ul className="clean-list">
            {summary.combinedPlan.agora.slice(0, 6).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      </section>

      <section className="two-columns documents-preview">
        <article className="panel mono-panel">
          <p className="eyebrow">Prévia SOAP</p>
          <pre>{outputs.soapText}</pre>
        </article>
        <article className="panel mono-panel">
          <p className="eyebrow">Prévia família</p>
          <pre>{outputs.familyReportText}</pre>
        </article>
      </section>
    </main>
  );
}
