"use client";

import { useMemo, useState } from "react";
import type { AgaReportModel, AgaScaleReportSection, AgaScaleTrend } from "@/domain/aga-report";
import { buildChangeSummaryDashboard } from "@/domain/change-summary-dashboard";
import { ProblemColumns } from "@/components/problems/problem-columns";

interface GeneratedReportResponse {
  report: AgaReportModel;
  text: string;
  snapshot: { id: string; version: number };
}

const DIMENSION_LABELS: Record<string, string> = {
  funcionalidade: "Funcionalidade",
  cognicao: "Cognição",
  humor: "Humor",
  fragilidade: "Fragilidade",
  mobilidade: "Mobilidade e risco de quedas",
  nutricao: "Nutrição",
  medicamentos: "Medicamentos",
  "suporte-social": "Suporte social e cuidador",
  oncogeriatria: "Oncogeriatria",
  prognostico: "Prognóstico e transição de cuidado",
  sintomas: "Sintomas",
  outros: "Outras avaliações",
};

const DIMENSION_ORDER = [
  "funcionalidade",
  "cognicao",
  "humor",
  "fragilidade",
  "mobilidade",
  "nutricao",
  "medicamentos",
  "suporte-social",
  "oncogeriatria",
  "prognostico",
  "sintomas",
  "outros",
];

const TREND_LABEL: Record<AgaScaleTrend, string> = {
  favorable: "Favorável",
  unfavorable: "Desfavorável",
  stable: "Estável",
  "not-comparable": "Não comparável",
  "insufficient-data": "Dados insuficientes",
};

function displayResult(scale: AgaScaleReportSection): string {
  return scale.result.scoreText ?? (scale.result.score === null ? "—" : String(scale.result.score));
}

function displayPoint(value: number | null, version: string | null): string {
  const score = value === null ? "—" : String(value);
  return version ? `${score} (v${version})` : score;
}

function displayAssessmentDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function CareList({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="care-plan-block">
      <h3>{title}</h3>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  );
}

function ScaleTable({ scales }: { scales: AgaScaleReportSection[] }) {
  return (
    <div className="clinical-table-wrap">
      <table className="clinical-table">
        <thead>
          <tr>
            <th scope="col">Instrumento</th>
            <th scope="col">Resultado</th>
            <th scope="col">Trajetória</th>
            <th scope="col">Interpretação registrada</th>
          </tr>
        </thead>
        <tbody>
          {scales.map((scale) => (
            <tr key={`${scale.code}-${scale.version}`}>
              <th scope="row">
                <span className="scale-name">{scale.name}</span>
                <span className="scale-version">{scale.code} · v{scale.version}</span>
              </th>
              <td>
                <strong>{displayResult(scale)}</strong>
                <span>{scale.result.classification ?? "Sem classificação registrada"}</span>
                <span className="scale-assessment-status">
                  {scale.assessedInTargetConsultation
                    ? "Avaliado nesta consulta"
                    : "Último valor conhecido — não avaliado nesta consulta"}
                </span>
                {!scale.assessedInTargetConsultation ? (
                  <span>Consulta {scale.lastKnown.consultationId} · {displayAssessmentDate(scale.lastKnown.appliedAt)}</span>
                ) : null}
              </td>
              <td>
                <span className={`trend-badge trend-${scale.evolution.trend}`}>
                  {TREND_LABEL[scale.evolution.trend]}
                </span>
                <span className="trajectory">
                  baseline {displayPoint(scale.evolution.baseline, scale.evolution.baselineVersion)} → anterior {displayPoint(scale.evolution.previous, scale.evolution.previousVersion)} → {scale.assessedInTargetConsultation
                    ? `atual ${displayPoint(scale.evolution.current, scale.evolution.currentVersion)}`
                    : `último conhecido ${displayPoint(scale.lastKnown.score, scale.lastKnown.version)}`}
                </span>
              </td>
              <td>{scale.interpretation ?? "Sem interpretação registrada"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgaReportPreview({ consultationId }: { consultationId: string }) {
  const [generated, setGenerated] = useState<GeneratedReportResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [clinicalReviewConfirmed, setClinicalReviewConfirmed] = useState(false);

  const groupedScales = useMemo(() => {
    if (!generated) return [];
    const groups = new Map<string, AgaScaleReportSection[]>();
    for (const scale of generated.report.assessedScales) {
      const items = groups.get(scale.dimension) ?? [];
      items.push(scale);
      groups.set(scale.dimension, items);
    }
    return DIMENSION_ORDER
      .filter((dimension) => groups.has(dimension))
      .map((dimension) => ({
        dimension,
        label: DIMENSION_LABELS[dimension] ?? dimension,
        scales: groups.get(dimension) ?? [],
      }));
  }, [generated]);

  const dashboardCards = useMemo(
    () => generated ? buildChangeSummaryDashboard(generated.report.changeSummary) : [],
    [generated],
  );

  async function generate() {
    setLoading(true);
    setError("");
    setClinicalReviewConfirmed(false);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/reports/aga`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível gerar o relatório.");
      setGenerated(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  function exportText() {
    if (!generated || !clinicalReviewConfirmed) return;
    const url = URL.createObjectURL(new Blob([generated.text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-aga-${consultationId}-v${generated.snapshot.version}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    if (!generated || !clinicalReviewConfirmed) return;
    window.print();
  }

  return (
    <section
      className="report-workspace"
      data-clinical-review={clinicalReviewConfirmed ? "confirmed" : "pending"}
    >
      <div className="report-toolbar no-print" aria-label="Ações do relatório">
        <div>
          <p className="eyebrow">Relatório compartilhado de cuidado</p>
          <h2>Prévia longitudinal</h2>
          <p className="muted">Gerar uma prévia cria um snapshot versionado, mas não finaliza a consulta.</p>
        </div>
        <div className="report-actions">
          <button type="button" onClick={() => void generate()} disabled={loading}>
            {loading ? "Gerando snapshot…" : generated ? "Atualizar prévia" : "Gerar prévia"}
          </button>
          <button type="button" className="secondary-button" onClick={printReport} disabled={!generated || !clinicalReviewConfirmed}>
            Imprimir
          </button>
          <button type="button" className="secondary-button" onClick={exportText} disabled={!generated || !clinicalReviewConfirmed}>
            Exportar texto
          </button>
        </div>
      </div>

      {error ? <p className="field-error no-print" role="alert">{error}</p> : null}

      <p className="print-review-blocker">
        Relatório não liberado para impressão — revisão clínica pendente.
      </p>

      {generated ? (
        <>
          <div className="report-review-gate no-print">
            <label className="review-confirmation">
              <input
                type="checkbox"
                checked={clinicalReviewConfirmed}
                onChange={(event) => setClinicalReviewConfirmed(event.target.checked)}
              />
              <span>
                <strong>Revisão clínica antes de compartilhar</strong>
                <small>Confirmo que revisei problemas, resultados, alertas e sugestões deste relatório.</small>
              </span>
            </label>
            <label className="inline-check technical-toggle">
              <input type="checkbox" checked={showTechnical} onChange={(event) => setShowTechnical(event.target.checked)} />
              Incluir apêndice técnico
            </label>
          </div>

          <article className="aga-report care-report">
            <header className="care-report-header">
              <div>
                <p className="eyebrow">Avaliação Geriátrica Ampla</p>
                <h1>Relatório longitudinal de cuidado</h1>
                <p className="report-purpose">Síntese clínica para apoiar paciente, família, cuidadores e equipe assistencial.</p>
              </div>
              <dl className="report-identity">
                <div><dt>Paciente</dt><dd>{generated.report.patientName}</dd></div>
                <div><dt>Consulta</dt><dd>{generated.report.consultationId}</dd></div>
                <div><dt>Snapshot</dt><dd>v{generated.snapshot.version}</dd></div>
              </dl>
              {generated.report.draftContext ? (
                <strong className="draft-watermark">Consulta ainda não finalizada</strong>
              ) : null}
            </header>

            <section className="change-summary-section">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Evolução</p>
                  <h2>O que mudou?</h2>
                </div>
                <p className="summary-headline">{generated.report.changeSummary.headline}</p>
              </div>

              <div className="report-metrics" aria-label="Resumo de tendências">
                {dashboardCards.map((card) => (
                  <article
                    key={card.key}
                    data-tone={card.tone}
                    title={card.explanation}
                    aria-label={`${card.label}: ${card.value}`}
                  >
                    <strong>{card.value}</strong>
                    <span>{card.label}</span>
                  </article>
                ))}
              </div>

              {generated.report.changeSummary.narrative.length > 0 ? (
                <ul className="change-narrative">
                  {generated.report.changeSummary.narrative.slice(0, 8).map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : <p className="muted">Ainda não há comparação longitudinal suficiente para destacar mudanças.</p>}
            </section>

            {generated.report.alerts.length > 0 ? (
              <section className="visible-alerts report-alerts" aria-labelledby="alertas-title">
                <div>
                  <p className="eyebrow">Segurança</p>
                  <h2 id="alertas-title">Pontos que exigem atenção</h2>
                </div>
                <ul>{generated.report.alerts.map((alert, index) => <li key={`${alert.severity}-${index}`}>{alert.message}</li>)}</ul>
              </section>
            ) : null}

            <section className="report-section">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Problemas longitudinais</p>
                  <h2>Lista de problemas</h2>
                </div>
                <p className="muted">Inclui problemas ativos e históricos preservados.</p>
              </div>
              <ProblemColumns problems={[...generated.report.clinicalProblems, ...generated.report.geriatricProblems]} />
            </section>

            <section className="report-section">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Dimensões avaliadas</p>
                  <h2>Resultados das escalas</h2>
                </div>
                <p className="muted">{generated.report.assessedScales.length} instrumento(s) com resultado longitudinal disponível.</p>
              </div>

              <div className="dimension-list">
                {groupedScales.length > 0 ? groupedScales.map((group) => (
                  <section className="care-dimension" key={group.dimension}>
                    <header>
                      <h3>{group.label}</h3>
                      <span>{group.scales.length} avaliação(ões)</span>
                    </header>
                    <ScaleTable scales={group.scales} />
                  </section>
                )) : <p className="muted">Não avaliado nesta consulta.</p>}
              </div>
            </section>

            <section className="report-section care-plan-section">
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Continuidade do cuidado</p>
                  <h2>Plano de cuidado</h2>
                </div>
                <p className="review-note">Sugestões derivadas das avaliações — exigem revisão médica antes do compartilhamento.</p>
              </div>
              <div className="care-plan-grid">
                <CareList title="O que priorizar agora" items={generated.report.carePlan.now} />
                <CareList title="Próximos passos" items={generated.report.carePlan.mediumTerm} />
                <CareList title="Família e cuidador" items={generated.report.carePlan.caregiver} />
                <CareList title="Equipe e encaminhamentos" items={generated.report.carePlan.referrals} />
                <CareList title="Quando entrar em contato" items={generated.report.carePlan.contact} />
                <CareList title="Situações de urgência" items={generated.report.carePlan.urgent} />
              </div>
            </section>

            {showTechnical ? (
              <section className="report-section technical-appendix">
                <div className="section-title-row">
                  <div>
                    <p className="eyebrow">Apêndice</p>
                    <h2>Rastreabilidade técnica</h2>
                  </div>
                  <p className="muted">Versão, fonte e dados registrados em cada instrumento.</p>
                </div>
                {generated.report.assessedScales.map((scale) => (
                  <article className="technical-scale" key={`technical-${scale.code}-${scale.version}`}>
                    <h3>{scale.name}</h3>
                    <dl>
                      <dt>Código / versão</dt><dd>{scale.code} / {scale.version}</dd>
                      <dt>Fonte / status</dt><dd>{scale.source.status}{scale.source.citation ? ` · ${scale.source.citation}` : ""}</dd>
                      <dt>Dados coletados</dt><dd>{scale.collectedData.length ? scale.collectedData.map((item) => `${item.field}: ${item.value}`).join("; ") : "Sem respostas detalhadas registradas"}</dd>
                      <dt>Problemas propostos</dt><dd>{scale.relatedProblemProposals.map((problem) => problem.title).join("; ") || "Nenhum problema proposto automaticamente"}</dd>
                    </dl>
                  </article>
                ))}
              </section>
            ) : null}

            <footer className="care-report-footer">
              <p>Documento de apoio à continuidade do cuidado. Interpretar em conjunto com avaliação clínica e prontuário completo.</p>
              <p>Snapshot {generated.snapshot.version} · schema {generated.report.schemaVersion}</p>
            </footer>
          </article>
        </>
      ) : null}
    </section>
  );
}
