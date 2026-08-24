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

type ScaleGroup = {
  dimension: string;
  label: string;
  scales: AgaScaleReportSection[];
};

type ReportGlyphName =
  | "overview"
  | "attention"
  | "recommendation"
  | "clinical"
  | "geriatric"
  | "nutrition"
  | "activity"
  | "sleep"
  | "cognition"
  | "home"
  | "support";

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

function ReportGlyph({ name }: { name: ReportGlyphName }) {
  return (
    <span className={styles.glyph} data-glyph={name} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {name === "overview" ? (
          <><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>
        ) : name === "attention" ? (
          <><path d="M12 3.5 21 20H3L12 3.5Z" /><path d="M12 8v5" /><path d="M12 16.8h.01" /></>
        ) : name === "recommendation" ? (
          <path d="M12 20s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.8-7 9-7 9Z" />
        ) : name === "clinical" ? (
          <><path d="M4 13h4l1.5-4 3 8 1.8-4H20" /><path d="M12 21C7 18.2 4 15.6 4 10.7A4.2 4.2 0 0 1 11.6 8 4.2 4.2 0 0 1 20 10.7" /></>
        ) : name === "geriatric" ? (
          <><circle cx="12" cy="6.5" r="2.3" /><path d="M8.5 20v-4.5c0-2.6 1.6-4.5 3.5-4.5s3.5 1.9 3.5 4.5V20" /><path d="M6.5 20h11" /></>
        ) : name === "nutrition" ? (
          <><path d="M7 5c3.5 0 6 2.4 6 5.5 0 3.8-3.3 6.7-7.5 7.5C5.2 13.6 5.7 9 7 5Z" /><path d="M8.2 15.5 15.5 8" /></>
        ) : name === "activity" ? (
          <><circle cx="13" cy="5" r="2" /><path d="m11 9 2.5 2 2-1" /><path d="m13.5 11-2 4-3.5 4" /><path d="m13 14 4 5" /><path d="m11 9-3 3" /></>
        ) : name === "sleep" ? (
          <path d="M17.5 15.5A7.5 7.5 0 0 1 8.5 6.2 7.5 7.5 0 1 0 17.5 15.5Z" />
        ) : name === "cognition" ? (
          <><path d="M9.5 19a3 3 0 0 1-2.7-4.3A3.4 3.4 0 0 1 7.5 8a3 3 0 0 1 5-2.2A3 3 0 0 1 17.7 8a3.4 3.4 0 0 1 .6 6.7A3 3 0 0 1 15.5 19" /><path d="M12 6v13" /><path d="M8.5 11H12" /><path d="M12 14h4" /></>
        ) : name === "home" ? (
          <><path d="m4 11 8-7 8 7" /><path d="M6.5 10.5V20h11v-9.5" /><path d="M10 20v-5h4v5" /></>
        ) : (
          <><circle cx="8" cy="8" r="2.5" /><circle cx="16" cy="8" r="2.5" /><path d="M3.5 19c.3-3 2.1-5 4.5-5s4.2 2 4.5 5" /><path d="M11.5 19c.3-3 2.1-5 4.5-5s4.2 2 4.5 5" /></>
        )}
      </svg>
    </span>
  );
}

function ProblemList({ items }: { items: AgaReportModel["clinicalProblems"] }) {
  if (items.length === 0) return <p className={styles.empty}>Sem problemas registrados.</p>;
  return (
    <ul className={styles.problemList}>
      {items.map((problem) => (
        <li key={problem.id}>
          <span>{problem.title}</span>
          {problem.status !== "ACTIVE" ? (
            <small>
              {problem.status === "STABLE"
                ? "Estável"
                : problem.status === "MONITORING"
                  ? "Em acompanhamento"
                  : "Resolvido"}
            </small>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CareList({ title, items, icon }: { title: string; items: readonly string[]; icon: ReportGlyphName }) {
  return (
    <section className={styles.careCard}>
      <div className={styles.careTitle}><ReportGlyph name={icon} /><h3>{title}</h3></div>
      {items.length > 0 ? (
        <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      ) : (
        <p className={styles.empty}>Sem orientação registrada.</p>
      )}
    </section>
  );
}

function PracticalMeaning({ scale }: { scale: AgaScaleReportSection }) {
  if (scale.interventionSuggestions.length === 0) {
    return <span className={styles.empty}>Sem orientação prática adicional registrada.</span>;
  }
  return (
    <ul className={styles.compactList}>
      {scale.interventionSuggestions.map((suggestion) => <li key={suggestion.text}>{suggestion.text}</li>)}
    </ul>
  );
}

function ScaleSummaryTable({ groups }: { groups: ScaleGroup[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.scaleTable}>
        <thead>
          <tr>
            <th scope="col">Domínio</th>
            <th scope="col">Escala</th>
            <th scope="col">Resultado</th>
            <th scope="col">Interpretação</th>
            <th scope="col">Significado / orientação prática</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) => group.scales.map((scale, index) => (
            <tr key={`${scale.code}-${scale.version}`}>
              {index === 0 ? <th className={styles.domainCell} scope="rowgroup" rowSpan={group.scales.length}>{group.label}</th> : null}
              <th scope="row">{scale.name}</th>
              <td className={styles.resultCell}>
                <strong>{displayResult(scale)}</strong>
                <small>{scale.result.classification ?? "Sem classificação registrada"}</small>
                {!scale.assessedInTargetConsultation ? <small>Último valor conhecido — não avaliado nesta consulta</small> : null}
              </td>
              <td>{scale.interpretation ?? "Sem interpretação registrada"}</td>
              <td><PracticalMeaning scale={scale} /></td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
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
  const recommendation = generated?.report.carePlan.now[0] ?? generated?.report.carePlan.mediumTerm[0] ?? null;
  const finalMessageItems = generated
    ? [...new Set([
        ...generated.report.carePlan.now,
        ...generated.report.carePlan.mediumTerm,
        ...generated.report.carePlan.caregiver,
        ...generated.report.carePlan.referrals,
        ...generated.report.vaccinationPrevention.guidance,
      ])].slice(0, 6)
    : [];

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
                <div className={styles.cardTitle}><ReportGlyph name="overview" /><span>Visão geral</span></div>
                <p>{generated.report.changeSummary.headline}</p>
                {generated.report.changeSummary.narrative.length > 0 ? (
                  <ul>{generated.report.changeSummary.narrative.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
                ) : null}
              </article>
              <article className={styles.executiveCard} data-tone="attention">
                <div className={styles.cardTitle}><ReportGlyph name="attention" /><span>Pontos de atenção</span></div>
                {attentionItems.length > 0 ? (
                  <ul>{attentionItems.map((item, index) => <li key={`${item.severity}-${index}`}>{item.message}</li>)}</ul>
                ) : (
                  <p>Nenhum alerta prioritário registrado nesta consulta.</p>
                )}
              </article>
              <article className={styles.executiveCard} data-tone="recommendation">
                <div className={styles.cardTitle}><ReportGlyph name="recommendation" /><span>Recomendação principal</span></div>
                <p>{recommendation ?? "Sem recomendação priorizada registrada."}</p>
              </article>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><span>1</span><h2>Problemas ativos</h2></div>
              <div className={styles.problemGrid}>
                <article>
                  <div className={styles.problemTitle}><ReportGlyph name="clinical" /><h3>Problemas clínicos</h3></div>
                  <ProblemList items={generated.report.clinicalProblems} />
                </article>
                <article>
                  <div className={styles.problemTitle}><ReportGlyph name="geriatric" /><h3>Problemas geriátricos</h3></div>
                  <ProblemList items={generated.report.geriatricProblems} />
                </article>
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}><span>2</span><h2>Resultados das avaliações</h2></div>
              {groupedScales.length > 0 ? <ScaleSummaryTable groups={groupedScales} /> : <p className={styles.empty}>Não avaliado nesta consulta.</p>}
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
              <div className={styles.sectionHeading}><span>4</span><h2>Plano de cuidados e orientações para a família</h2></div>
              <div className={styles.careGrid}>
                <CareList title="O que priorizar agora" items={generated.report.carePlan.now} icon="nutrition" />
                <CareList title="Próximos passos" items={generated.report.carePlan.mediumTerm} icon="activity" />
                <CareList title="Família e cuidador" items={generated.report.carePlan.caregiver} icon="support" />
                <CareList title="Equipe e encaminhamentos" items={generated.report.carePlan.referrals} icon="cognition" />
              </div>

              {generated.report.intrinsicCapacity.alteredDomains.length > 0 ? (
                <div className={styles.intrinsicGuidance}>
                  <h3>Orientações por domínio de capacidade intrínseca</h3>
                  <p className={styles.guidanceSource}>{generated.report.intrinsicCapacity.sourceLabel}</p>
                  <div className={styles.intrinsicGrid}>
                    {generated.report.intrinsicCapacity.alteredDomains.map((domain) => (
                      <article key={domain.code}>
                        <h4>{domain.label}</h4>
                        <p>{domain.whyItMatters}</p>
                        <strong>O que fazer no dia a dia</strong>
                        <ul>{domain.actions.map((action) => <li key={action}>{action}</li>)}</ul>
                        <strong>Quando avisar a equipe ou procurar ajuda</strong>
                        <ul>{domain.attentionSigns.map((sign) => <li key={sign}>{sign}</li>)}</ul>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className={styles.safetyPanel} aria-labelledby="report-urgent-help-title">
              <div className={styles.safetyTitle}>
                <ReportGlyph name="attention" />
                <div>
                  <p>Segurança e continuidade do cuidado</p>
                  <h2 id="report-urgent-help-title">Quando procurar ajuda médica imediata</h2>
                </div>
              </div>
              <div className={styles.safetyColumns}>
                <article>
                  <h3>Situações de urgência</h3>
                  {generated.report.carePlan.urgent.length > 0 ? (
                    <ul>{generated.report.carePlan.urgent.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p className={styles.empty}>Sem situação urgente registrada.</p>}
                </article>
                <article>
                  <h3>Quando entrar em contato com a equipe</h3>
                  {generated.report.carePlan.contact.length > 0 ? (
                    <ul>{generated.report.carePlan.contact.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p className={styles.empty}>Sem sinal adicional registrado.</p>}
                </article>
              </div>
            </section>

            <section className={styles.finalMessage} aria-labelledby="report-final-message-title">
              <div className={styles.finalMessageTitle}>
                <ReportGlyph name="recommendation" />
                <div>
                  <p>Fechamento do relatório</p>
                  <h2 id="report-final-message-title">Mensagem final</h2>
                </div>
              </div>
              <div className={styles.finalMessageContent}>
                <strong>O acompanhamento contínuo e a revisão regular do plano de cuidados fazem diferença.</strong>
                {finalMessageItems.length > 0 ? (
                  <ul>{finalMessageItems.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : <p className={styles.empty}>Sem orientação adicional registrada.</p>}
              </div>
            </section>

            <div className={styles.supportGrid}>
              <section className={`${styles.section} ${styles.supportPanel}`}>
                <div className={styles.sectionHeading}><span>5</span><h2>Vacinas e prevenção</h2></div>
                <div className={styles.preventionBox}>
                  <strong>{generated.report.vaccinationPrevention.statusLabel}</strong>
                  {generated.report.vaccinationPrevention.status === "PENDING" ? (
                    <ul>{generated.report.vaccinationPrevention.pendingVaccines.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : generated.report.vaccinationPrevention.status === "UNKNOWN" ? (
                    <p>As pendências não podem ser determinadas sem revisar a carteira.</p>
                  ) : (
                    <p>Nenhuma vacina foi registrada como pendente nesta consulta.</p>
                  )}
                  <ul>{generated.report.vaccinationPrevention.guidance.map((item) => <li key={item}>{item}</li>)}</ul>
                  <p>Esta seção é informativa e não gera prescrição automática.</p>
                </div>
              </section>

              <section className={`${styles.section} ${styles.medicationLinkSection}`}>
                <div className={styles.medicationLinkCopy}>
                  <span className={styles.documentBadge}>Documento separado</span>
                  <h2>Plano de medicamentos</h2>
                  <p>Plano de medicamentos disponível em documento próprio, vinculado a esta consulta.</p>
                  <small>{generated.report.medicationPlan.message}</small>
                </div>
                <a className={styles.medicationLink} href={`/consultations/${consultationId}/medications/print`} target="_blank" rel="noreferrer">Ver / imprimir plano de medicamentos</a>
              </section>
            </div>

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
