"use client";

import { useMemo, useState } from "react";
import type { AgaReportModel, AgaScaleReportSection } from "@/domain/aga-report";
import type { CapacityDimensionHistory } from "@/domain/capacity-dimension-history";
import { CapacityDimensionHistoryChart } from "@/components/reports/capacity-dimension-history-chart";
import styles from "./aga-report-document-preview.module.css";

interface GeneratedReportResponse {
  report: AgaReportModel & { capacityHistory: CapacityDimensionHistory };
  text: string;
  snapshot: { id: string; version: number };
}

const DIMENSION_LABELS: Record<string, string> = {
  funcionalidade: "Funcionalidade",
  cognicao: "Cognição",
  humor: "Humor e saúde mental",
  fragilidade: "Fragilidade",
  mobilidade: "Locomoção e equilíbrio",
  nutricao: "Nutrição e vitalidade",
  medicamentos: "Medicamentos",
  "suporte-social": "Família e rede de apoio",
  oncogeriatria: "Oncogeriatria",
  prognostico: "Prognóstico e cuidados paliativos",
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

const BRAND_LOGO_PATH = "/brand/natalia-mendes-logo.svg";

function formatDate(value?: string): string {
  if (!value) return "Data não registrada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function displayResult(scale: AgaScaleReportSection): string {
  return scale.result.scoreText ?? (scale.result.score === null ? "—" : String(scale.result.score));
}

function ProblemList({ items }: { items: AgaReportModel["clinicalProblems"] }) {
  if (items.length === 0) return <p className={styles.empty}>Sem problemas registrados.</p>;
  return (
    <ul className={styles.problemList}>
      {items.map((problem) => (
        <li key={problem.id}>
          <span>{problem.title}</span>
          {problem.status !== "ACTIVE" ? <small>{problem.status === "STABLE" ? "Estável" : problem.status === "MONITORING" ? "Em acompanhamento" : "Resolvido"}</small> : null}
        </li>
      ))}
    </ul>
  );
}

function CareList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className={styles.careCard}>
      <h3>{title}</h3>
      {items.length > 0 ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.empty}>Sem orientação registrada.</p>}
    </section>
  );
}

function ScaleDomain({ label, scales }: { label: string; scales: AgaScaleReportSection[] }) {
  return (
    <section className={styles.scaleDomain}>
      <h3>{label}</h3>
      <div className={styles.tableWrap}>
        <table className={styles.scaleTable}>
          <thead>
            <tr>
              <th scope="col">Escala</th>
              <th scope="col">Resultado</th>
              <th scope="col">Interpretação</th>
              <th scope="col">Significado prático</th>
            </tr>
          </thead>
          <tbody>
            {scales.map((scale) => (
              <tr key={`${scale.code}-${scale.version}`}>
                <th scope="row">{scale.name}</th>
                <td>
                  <strong>{displayResult(scale)}</strong>
                  <small>{scale.result.classification ?? "Sem classificação registrada"}</small>
                </td>
                <td>{scale.interpretation ?? "Sem interpretação registrada"}</td>
                <td>{scale.interventionSuggestions[0]?.text ?? "Acompanhar conforme avaliação clínica."}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PhysicianSignature() {
  return (
    <div className={styles.signature} aria-label="Identificação profissional e espaço para assinatura">
      <span className={styles.signatureLine} aria-hidden="true" />
      <strong>Dra. Natalia Mendes</strong>
      <span>CRM-BA 27416 · RQE 24673</span>
      <small>Assinatura e carimbo</small>
    </div>
  );
}

export function AgaReportDocumentPreview({ consultationId }: { consultationId: string }) {
  const [generated, setGenerated] = useState<GeneratedReportResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clinicalReviewConfirmed, setClinicalReviewConfirmed] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);

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

  function printReport() {
    if (!generated || !clinicalReviewConfirmed) return;
    window.print();
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

  const targetConsultationDate = generated?.report.capacityHistory.consultations.find((item) => item.isTarget)?.occurredAt;
  const attentionItems = generated?.report.alerts.slice(0, 5) ?? [];
  const recommendation = generated?.report.carePlan.now[0] ?? generated?.report.carePlan.mediumTerm[0] ?? "Manter acompanhamento e revisar o plano de cuidados conforme evolução clínica.";

  return (
    <section className={styles.workspace} data-review={clinicalReviewConfirmed ? "confirmed" : "pending"}>
      <div className={`${styles.toolbar} no-print`}>
        <div>
          <p className={styles.eyebrow}>Documento para paciente, família e cuidadores</p>
          <h2>Prévia do relatório final</h2>
          <p>O relatório só pode ser impresso ou exportado após revisão clínica explícita.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" onClick={() => void generate()} disabled={loading}>{loading ? "Gerando…" : generated ? "Atualizar prévia" : "Gerar prévia"}</button>
          <button type="button" className={styles.secondaryButton} onClick={printReport} disabled={!generated || !clinicalReviewConfirmed}>Imprimir relatório</button>
          <button type="button" className={styles.secondaryButton} onClick={exportText} disabled={!generated || !clinicalReviewConfirmed}>Exportar texto</button>
        </div>
      </div>

      {error ? <p className={`${styles.error} no-print`} role="alert">{error}</p> : null}

      {generated ? (
        <>
          <div className={`${styles.reviewGate} no-print`}>
            <label>
              <input type="checkbox" checked={clinicalReviewConfirmed} onChange={(event) => setClinicalReviewConfirmed(event.target.checked)} />
              <span><strong>Revisão clínica antes de compartilhar</strong><small>Confirmo que revisei problemas, escalas, alertas, orientações e contexto desta consulta.</small></span>
            </label>
            <label className={styles.technicalToggle}>
              <input type="checkbox" checked={showTechnical} onChange={(event) => setShowTechnical(event.target.checked)} />
              Incluir apêndice técnico
            </label>
          </div>

          <article className={styles.document}>
            <header className={styles.header}>
              <div className={styles.brandBlock}>
                <img src={BRAND_LOGO_PATH} alt="Natalia Mendes — Médica Geriatra" />
                <div>
                  <strong>Dra. Natalia Mendes</strong>
                  <span>Médica Geriatra</span>
                </div>
              </div>
              <div className={styles.titleBlock}>
                <p>Avaliação Geriátrica Ampla</p>
                <h1>Relatório de Avaliação Geriátrica</h1>
                <span>Informações para paciente, família e cuidadores</span>
              </div>
              <dl className={styles.identity}>
                <div><dt>Paciente</dt><dd>{generated.report.patientName}</dd></div>
                <div><dt>Data da consulta</dt><dd>{formatDate(targetConsultationDate)}</dd></div>
              </dl>
              {generated.report.draftContext ? <p className={styles.draftWarning}>Consulta ainda não finalizada.</p> : null}
            </header>

            <section className={styles.introNote}>
              Este relatório resume os principais achados da Avaliação Geriátrica Ampla para apoiar o cuidado diário e a continuidade do acompanhamento. Ele não substitui avaliação médica individualizada.
            </section>

            <section className={styles.executiveGrid} aria-label="Resumo executivo">
              <article className={styles.executiveCard} data-tone="overview">
                <span>Visão geral</span>
                <p>{generated.report.changeSummary.headline}</p>
              </article>
              <article className={styles.executiveCard} data-tone="attention">
                <span>Pontos de atenção</span>
                {attentionItems.length > 0 ? <ul>{attentionItems.map((item, index) => <li key={`${item.severity}-${index}`}>{item.message}</li>)}</ul> : <p>Nenhum alerta prioritário registrado nesta consulta.</p>}
              </article>
              <article className={styles.executiveCard} data-tone="recommendation">
                <span>Recomendação principal</span>
                <p>{recommendation}</p>
              </article>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>1</span>
                <h2>Problemas ativos e em acompanhamento</h2>
              </div>
              <div className={styles.problemGrid}>
                <article><h3>Problemas clínicos</h3><ProblemList items={generated.report.clinicalProblems} /></article>
                <article><h3>Problemas geriátricos</h3><ProblemList items={generated.report.geriatricProblems} /></article>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>2</span>
                <h2>Resultados das avaliações</h2>
              </div>
              <div className={styles.scaleDomains}>
                {groupedScales.length > 0 ? groupedScales.map((group) => <ScaleDomain key={group.dimension} label={group.label} scales={group.scales} />) : <p className={styles.empty}>Não avaliado nesta consulta.</p>}
              </div>
            </section>

            <section className={`${styles.section} ${styles.chartSection}`}>
              <div className={styles.sectionHeading}>
                <span>3</span>
                <div>
                  <h2>Evolução da capacidade intrínseca e da independência funcional</h2>
                  <p>Uma trajetória por dimensão. O tempo real entre consultas é preservado.</p>
                </div>
              </div>
              <CapacityDimensionHistoryChart history={generated.report.capacityHistory} context="final-report" />
              <p className={styles.causalityNote}>A associação temporal entre uma mudança e um evento registrado não estabelece causalidade.</p>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>4</span>
                <h2>Plano de cuidados e orientações para a família</h2>
              </div>
              <div className={styles.careGrid}>
                <CareList title="O que priorizar agora" items={generated.report.carePlan.now} />
                <CareList title="Próximos passos" items={generated.report.carePlan.mediumTerm} />
                <CareList title="Família e cuidador" items={generated.report.carePlan.caregiver} />
                <CareList title="Quando entrar em contato" items={generated.report.carePlan.contact} />
                <CareList title="Situações de urgência" items={generated.report.carePlan.urgent} />
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <span>5</span>
                <h2>Vacinas e prevenção</h2>
              </div>
              <div className={styles.preventionBox}>
                <strong>{generated.report.vaccinationPrevention.statusLabel}</strong>
                {generated.report.vaccinationPrevention.status === "PENDING" ? <ul>{generated.report.vaccinationPrevention.pendingVaccines.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                <ul>{generated.report.vaccinationPrevention.guidance.map((item) => <li key={item}>{item}</li>)}</ul>
                <p>Esta seção é informativa e não gera prescrição automática.</p>
              </div>
            </section>

            <section className={`${styles.section} ${styles.medicationLinkSection}`}>
              <div>
                <h2>Plano de medicamentos</h2>
                <p>O plano completo de medicamentos é um documento separado deste relatório.</p>
                <small>{generated.report.medicationPlan.message}</small>
              </div>
              <a className={styles.medicationLink} href={`/consultations/${consultationId}/medications/print`} target="_blank" rel="noreferrer">Ver / imprimir plano de medicamentos</a>
            </section>

            {showTechnical ? (
              <section className={`${styles.section} ${styles.technicalAppendix}`}>
                <div className={styles.sectionHeading}><span>A</span><h2>Apêndice técnico opcional</h2></div>
                {generated.report.assessedScales.map((scale) => (
                  <article key={`technical-${scale.code}-${scale.version}`}>
                    <h3>{scale.name}</h3>
                    <dl>
                      <div><dt>Código / versão</dt><dd>{scale.code} / {scale.version}</dd></div>
                      <div><dt>Fonte / status</dt><dd>{scale.source.status}{scale.source.citation ? ` · ${scale.source.citation}` : ""}</dd></div>
                      <div><dt>Dados registrados</dt><dd>{scale.collectedData.length > 0 ? scale.collectedData.map((item) => `${item.field}: ${item.value}`).join("; ") : "Sem respostas detalhadas registradas"}</dd></div>
                    </dl>
                  </article>
                ))}
              </section>
            ) : null}

            <footer className={styles.footer}>
              <p>Documento de apoio à continuidade do cuidado. Dúvidas ou intercorrências devem ser discutidas com a equipe responsável.</p>
              <PhysicianSignature />
              <p className={`${styles.technicalMeta} no-print`}>Snapshot {generated.snapshot.version} · schema {generated.report.schemaVersion}</p>
            </footer>
          </article>
        </>
      ) : null}
    </section>
  );
}
