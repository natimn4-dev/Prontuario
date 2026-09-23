"use client";

import { useMemo, useState } from "react";
import type { AgaReportModel } from "@/domain/aga-report";
import { sourceStatusLabel } from "@/domain/accessible-report-language";
import {
  hasDisplayableLongitudinalHistory,
  type CapacityDimensionHistory,
} from "@/domain/capacity-dimension-history";
import type { ProfessionalIdentity } from "@/domain/professional-identity";
import type {
  AgaReportClinicalConduct,
  AgaReportGastrostomyCare,
} from "@/domain/report-care-sections";
import type {
  AgaAdvanceDirectivesReportSection,
  AgaReportOverview,
  AgaReportOverviewScaleItem,
} from "@/domain/report-overview";
import { CapacityDimensionHistoryChart } from "@/components/reports/capacity-dimension-history-chart";
import {
  buildReportDomainSummaries,
  type ReportDomainSummary,
} from "@/domain/report-domain-summary";
import type { ReportSigningSnapshot } from "./report-signing-snapshot";
import styles from "./aga-report-document-preview.module.css";

interface GeneratedReportResponse {
  report: AgaReportModel & {
    capacityHistory: CapacityDimensionHistory;
    overview: AgaReportOverview;
    advanceDirectives?: AgaAdvanceDirectivesReportSection;
    clinicalConducts?: AgaReportClinicalConduct[];
    gastrostomyCare?: AgaReportGastrostomyCare;
  };
  text: string;
  snapshot: { id: string; version: number };
}

type ReportGlyphName =
  | "overview"
  | "attention"
  | "clinical"
  | "geriatric"
  | "nutrition"
  | "activity"
  | "sleep"
  | "cognition"
  | "home"
  | "support";

type ReportTab = "aga" | "directives";

function formatDate(value?: string): string {
  if (!value) return "Data não registrada";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function ReportGlyph({ name }: { name: ReportGlyphName }) {
  return (
    <span className={styles.glyph} data-glyph={name} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {name === "overview" ? (
          <><circle cx="12" cy="12" r="8" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>
        ) : name === "attention" ? (
          <><path d="M12 3.5 21 20H3L12 3.5Z" /><path d="M12 8v5" /><path d="M12 16.8h.01" /></>
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
  if (items.length === 0) return null;
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

function DomainSummaryTable({ domains }: { domains: ReportDomainSummary[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.domainTable} aria-label="Resultados das avaliações resumidos por domínio">
        <thead>
          <tr>
            <th scope="col">Domínio</th>
            <th scope="col">Resultado nesta consulta</th>
            <th scope="col">Orientações pertinentes</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr key={domain.code} data-state={domain.state}>
              <th className={styles.domainCell} scope="row">{domain.label}</th>
              <td>
                <span className={styles.domainStatus} data-state={domain.state}>{domain.stateLabel}</span>
                <ul className={styles.compactResults}>
                  {domain.results.map((result) => <li key={result.scaleCode}><strong>{result.scaleName}:</strong> {result.value}</li>)}
                </ul>
              </td>
              <td>
                {domain.guidance.length > 0 ? (
                  <ul className={styles.compactList}>
                    {domain.guidance.map((guidance) => <li key={guidance}>{guidance}</li>)}
                  </ul>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PhysicianSignature({ identity }: { identity: ProfessionalIdentity }) {
  return (
    <div className={styles.signature} aria-label="Identificação profissional e espaço para assinatura">
      <span className={styles.signatureLine} aria-hidden="true" />
      <strong>{identity.displayName}</strong>
      {identity.registrationLine ? <span>{identity.registrationLine}</span> : null}
      <small>Assinatura e carimbo</small>
    </div>
  );
}

function scaleOverviewText(item: AgaReportOverviewScaleItem): string {
  return `${item.value}${item.assessedInTargetConsultation ? "" : ` · último registro conhecido em ${formatDate(item.sourceDate)}`}`;
}

function OverviewContent({ overview }: { overview: AgaReportOverview }) {
  return (
    <ul className={styles.compactResults}>
      {overview.ageYears !== undefined ? <li><strong>Idade:</strong> {overview.ageYears} anos</li> : null}
      {overview.cognition ? (
        <li><strong>Cognição — {overview.cognition.label}:</strong> {scaleOverviewText(overview.cognition)}</li>
      ) : null}
      {overview.functionality.map((item, index) => (
        <li key={item.scaleCode}>
          <strong>{index === 0 ? `Funcionalidade — ${item.label}` : item.label}:</strong> {scaleOverviewText(item)}
        </li>
      ))}
      {overview.device ? <li><strong>Dispositivo:</strong> {overview.device.label}</li> : null}
      {overview.advanceDirectives ? <li><strong>Diretivas antecipadas:</strong> {overview.advanceDirectives.label}</li> : null}
    </ul>
  );
}

function AdvanceDirectivesDocument({
  section,
  patientName,
  professionalIdentity,
}: {
  section: AgaAdvanceDirectivesReportSection;
  patientName: string;
  professionalIdentity: ProfessionalIdentity;
}) {
  return (
    <article className={styles.document}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          {professionalIdentity.logoPath ? <img src={professionalIdentity.logoPath} alt={professionalIdentity.logoAlt ?? professionalIdentity.displayName} /> : null}
          <div>
            <strong>{professionalIdentity.displayName}</strong>
            <span>{professionalIdentity.roleLabel}</span>
          </div>
        </div>
        <div className={styles.titleBlock}>
          <p>Avaliação Geriátrica Ampla</p>
          <h1>Diretivas antecipadas</h1>
          <span>Preferências, valores e objetivos de cuidado registrados</span>
        </div>
        <dl className={styles.identity}>
          <div><dt>Paciente</dt><dd>{patientName}</dd></div>
          <div><dt>Consulta do registro</dt><dd>{formatDate(section.sourceConsultationDate)}</dd></div>
        </dl>
      </header>

      <section className={styles.introNote}>
        Registro longitudinal de conversa sobre preferências, valores e objetivos de cuidado. O conteúdo reproduz informações documentadas e deve ser revisto no contexto clínico atual.
      </section>

      {section.participation ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>1</span><h2>Participação na conversa</h2></div>
        <p>{section.participation}</p>
      </section> : null}

      {section.whatMatters ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>2</span><h2>O que é importante para a pessoa</h2></div>
        <p>{section.whatMatters}</p>
      </section> : null}

      {section.dignityAndComfort ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>3</span><h2>Conforto, dignidade e sentido</h2></div>
        <p>{section.dignityAndComfort}</p>
      </section> : null}

      {section.priorities.length > 0 ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>4</span><h2>Prioridades registradas</h2></div>
        <ul className={styles.compactList}>{section.priorities.map((item) => <li key={item}>{item}</li>)}</ul>
      </section> : null}

      {section.topics.length > 0 ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>5</span><h2>Preferências discutidas</h2></div>
        <div className={styles.problemGrid}>
          {section.topics.map((topic) => <article key={topic.code}>
            <h3>{topic.title}</h3>
            <p>{topic.status}</p>
            {topic.note ? <small>{topic.note}</small> : null}
          </article>)}
        </div>
      </section> : null}

      {section.trustedPerson || section.documentStatus ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>6</span><h2>Pessoa de confiança e documento prévio</h2></div>
        {section.trustedPerson ? <p><strong>Pessoa de confiança:</strong> {section.trustedPerson.name}{section.trustedPerson.relation ? ` — ${section.trustedPerson.relation}` : ""}</p> : null}
        {section.documentStatus ? <p><strong>Documento prévio:</strong> {section.documentStatus}</p> : null}
      </section> : null}

      <section className={styles.section}>
        <div className={styles.sectionHeading}><span>7</span><h2>Revisão</h2></div>
        <p>{section.reviewTrigger}</p>
      </section>

      {section.history.length > 1 ? <section className={styles.section}>
        <div className={styles.sectionHeading}><span>8</span><h2>Histórico</h2></div>
        <ul className={styles.compactList}>
          {section.history.map((item) => <li key={`${item.consultationId}-${item.version}`}>{formatDate(item.consultationDate)} — versão {item.version}</li>)}
        </ul>
      </section> : null}

      <footer className={styles.footer}>
        <p>Registro de apoio à continuidade do cuidado. Preferências podem ser revistas pela pessoa e pela equipe conforme sua vontade e o contexto clínico.</p>
        <PhysicianSignature identity={professionalIdentity} />
      </footer>
    </article>
  );
}

export function AgaReportDocumentPreview({
  consultationId,
  professionalIdentity,
  onSigningSnapshotChange,
}: {
  consultationId: string;
  professionalIdentity: ProfessionalIdentity;
  onSigningSnapshotChange?: (snapshot: ReportSigningSnapshot | null) => void;
}) {
  const [generated, setGenerated] = useState<GeneratedReportResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clinicalReviewConfirmed, setClinicalReviewConfirmed] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>("aga");

  const reportDomains = useMemo(() => {
    if (!generated) return [];
    return buildReportDomainSummaries(
      generated.report.assessedScales,
      generated.report.intrinsicCapacity,
    );
  }, [generated]);

  async function generate() {
    setLoading(true);
    setError("");
    setClinicalReviewConfirmed(false);
    setActiveTab("aga");
    onSigningSnapshotChange?.(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/reports/aga`, { method: "POST" });
      const result = await response.json() as GeneratedReportResponse & { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível gerar o relatório.");
      setGenerated(result);
      onSigningSnapshotChange?.({
        id: result.snapshot.id,
        version: result.snapshot.version,
        consultationStatus: result.report.consultationStatus,
        draftContext: result.report.draftContext,
        hasAdvanceDirectives: Boolean(result.report.advanceDirectives),
      });
    } catch (caught) {
      setGenerated(null);
      onSigningSnapshotChange?.(null);
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
  const executiveCardCount = 1 + (attentionItems.length > 0 ? 1 : 0);
  const hasProblems = Boolean(generated && (generated.report.clinicalProblems.length > 0 || generated.report.geriatricProblems.length > 0));

  return (
    <section className={styles.workspace} data-review={clinicalReviewConfirmed ? "confirmed" : "pending"}>
      <div className={`${styles.toolbar} no-print`}>
        <div>
          <p className={styles.eyebrow}>Relatório para paciente, família e cuidadores</p>
          <h2>Prévia do relatório final</h2>
          <p>Gere a prévia, revise o conteúdo e só depois libere a impressão ou a exportação.</p>
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
              <span><strong>Revisão clínica antes de compartilhar</strong><small>Confirmo que revisei problemas, avaliações, alertas, orientações e o contexto desta consulta.</small></span>
            </label>
            <label className={styles.technicalToggle}>
              <input type="checkbox" checked={showTechnical} onChange={(event) => setShowTechnical(event.target.checked)} />
              Mostrar informações técnicas
            </label>
          </div>

          <div className={`${styles.actions} no-print`} role="tablist" aria-label="Seções do relatório final">
            <button type="button" role="tab" aria-selected={activeTab === "aga"} className={activeTab === "aga" ? undefined : styles.secondaryButton} onClick={() => setActiveTab("aga")}>Avaliação Geriátrica</button>
            {generated.report.advanceDirectives ? (
              <button type="button" role="tab" aria-selected={activeTab === "directives"} className={activeTab === "directives" ? undefined : styles.secondaryButton} onClick={() => setActiveTab("directives")}>Diretivas antecipadas</button>
            ) : null}
          </div>

          {activeTab === "aga" ? <article className={styles.document}>
            <header className={styles.header}>
              <div className={styles.brandBlock}>
                {professionalIdentity.logoPath ? <img src={professionalIdentity.logoPath} alt={professionalIdentity.logoAlt ?? professionalIdentity.displayName} /> : null}
                <div>
                  <strong>{professionalIdentity.displayName}</strong>
                  <span>{professionalIdentity.roleLabel}</span>
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
              Este relatório reúne os principais achados da Avaliação Geriátrica Ampla para facilitar o cuidado no dia a dia e a continuidade do acompanhamento.
            </section>

            <section className={styles.executiveGrid} data-count={executiveCardCount} aria-label="Resumo do relatório">
              <article className={styles.executiveCard} data-tone="overview">
                <div className={styles.cardTitle}><ReportGlyph name="overview" /><span>Visão geral</span></div>
                <OverviewContent overview={generated.report.overview} />
              </article>
              {attentionItems.length > 0 ? (
                <article className={styles.executiveCard} data-tone="attention">
                  <div className={styles.cardTitle}><ReportGlyph name="attention" /><span>Pontos de atenção</span></div>
                  <ul>{attentionItems.map((item, index) => <li key={`${item.severity}-${index}`}>{item.message}</li>)}</ul>
                </article>
              ) : null}
            </section>

            {hasProblems ? <section className={styles.section}>
              <div className={styles.sectionHeading}><span>1</span><h2>Problemas em acompanhamento</h2></div>
              <div className={styles.problemGrid}>
                {generated.report.clinicalProblems.length > 0 ? <article>
                  <div className={styles.problemTitle}><ReportGlyph name="clinical" /><h3>Problemas clínicos</h3></div>
                  <ProblemList items={generated.report.clinicalProblems} />
                </article> : null}
                {generated.report.geriatricProblems.length > 0 ? <article>
                  <div className={styles.problemTitle}><ReportGlyph name="geriatric" /><h3>Problemas geriátricos</h3></div>
                  <ProblemList items={generated.report.geriatricProblems} />
                </article> : null}
              </div>
            </section> : null}

            {reportDomains.length > 0 ? <section className={styles.section}>
              <div className={styles.sectionHeading}><span>2</span><h2>Resultados das avaliações</h2></div>
              <p className={styles.sectionLead}>Resumo por área avaliada, com foco no que o resultado significa para o dia a dia e nas orientações de cuidado. Os detalhes técnicos permanecem no prontuário.</p>
              <DomainSummaryTable domains={reportDomains} />
            </section> : null}

            {hasDisplayableLongitudinalHistory(generated.report.capacityHistory) ? <section className={`${styles.section} ${styles.chartSection}`}>
              <div className={styles.sectionHeading}>
                <span>3</span>
                <div>
                  <h2>Evolução da capacidade e da independência funcional</h2>
                  <p>O gráfico mostra a evolução de cada área ao longo das consultas.</p>
                </div>
              </div>
              <CapacityDimensionHistoryChart history={generated.report.capacityHistory} context="final-report" />
              <p className={styles.causalityNote}>Mudanças que aconteceram em períodos próximos podem estar relacionadas ou não. O gráfico não define a causa da mudança.</p>
            </section> : null}

            {(generated.report.clinicalConducts?.length ?? 0) > 0 ? <section className={styles.section}>
              <div className={styles.sectionHeading}><span>4</span><h2>Condutas clínicas</h2></div>
              <p className={styles.sectionLead}>Condutas registradas pelo médico nesta consulta. Podem incluir solicitações de exames, mudanças de tratamento ou outras decisões documentadas no plano clínico.</p>
              <div className={styles.problemGrid}>
                {generated.report.clinicalConducts?.map((conduct) => <article key={conduct.problemId}>
                  <div className={styles.problemTitle}><ReportGlyph name="clinical" /><h3>{conduct.problemTitle}</h3></div>
                  <ul className={styles.compactList}>{conduct.actions.map((action) => <li key={action}>{action}</li>)}</ul>
                </article>)}
              </div>
            </section> : null}

            {generated.report.gastrostomyCare ? <section className={`${styles.section} ${styles.supportPanel}`}>
              <div className={styles.sectionHeading}><span>GTT</span><h2>Cuidados com gastrostomia</h2></div>
              <p className={styles.sectionLead}>Orientações práticas para o cuidado diário da gastrostomia já registrada. Fórmula, volumes, horários e preparo de medicamentos seguem a orientação individual da equipe.</p>
              <div className={styles.problemGrid}>
                <article>
                  <div className={styles.problemTitle}><ReportGlyph name="nutrition" /><h3>Cuidados práticos</h3></div>
                  <ul className={styles.compactList}>
                    {[...generated.report.gastrostomyCare.practicalActions, ...generated.report.gastrostomyCare.caregiverActions].map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
                <article>
                  <div className={styles.problemTitle}><ReportGlyph name="attention" /><h3>Quando entrar em contato com a equipe</h3></div>
                  <ul className={styles.compactList}>{generated.report.gastrostomyCare.contactGuidance.map((item) => <li key={item}>{item}</li>)}</ul>
                </article>
              </div>
            </section> : null}

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
                  <ul>{generated.report.safetyGuidance.urgent.map((item) => <li key={item}>{item}</li>)}</ul>
                </article>
                <article>
                  <h3>Quando entrar em contato com a equipe</h3>
                  <ul>{generated.report.safetyGuidance.contact.map((item) => <li key={item}>{item}</li>)}</ul>
                </article>
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
                    <p>A carteira de vacinação ainda precisa ser revisada para identificar possíveis pendências.</p>
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
                  <p>O plano de medicamentos fica em um documento próprio, vinculado a esta consulta.</p>
                  <small>{generated.report.medicationPlan.message}</small>
                </div>
                <a className={styles.medicationLink} href={`/consultations/${consultationId}/medications/print`} target="_blank" rel="noreferrer">Ver ou imprimir plano de medicamentos</a>
              </section>
            </div>

            {showTechnical ? (
              <section className={`${styles.section} ${styles.technicalAppendix} no-print`}>
                <div className={styles.sectionHeading}><span>A</span><h2>Informações técnicas</h2></div>
                {generated.report.assessedScales.map((scale) => (
                  <article key={`technical-${scale.code}-${scale.version}`}>
                    <h3>{scale.name}</h3>
                    <dl>
                      <div><dt>Código / versão</dt><dd>{scale.code} / {scale.version}</dd></div>
                      <div><dt>Fonte / situação</dt><dd>{sourceStatusLabel(scale.source.status)}{scale.source.citation ? ` · ${scale.source.citation}` : ""}</dd></div>
                      <div><dt>Dados registrados</dt><dd>{scale.collectedData.length > 0 ? scale.collectedData.map((item) => `${item.field}: ${item.value}`).join("; ") : "Sem respostas detalhadas registradas"}</dd></div>
                    </dl>
                  </article>
                ))}
                <article>
                  <h3>Base científica das orientações</h3>
                  <ul>
                    {[...reportDomains.flatMap((domain) => domain.evidenceReferences), ...generated.report.safetyGuidance.evidenceReferences]
                      .filter((reference, index, items) => items.findIndex((item) => item.pmid === reference.pmid) === index)
                      .map((reference) => <li key={reference.pmid}>PMID {reference.pmid} — {reference.label}</li>)}
                  </ul>
                </article>
              </section>
            ) : null}

            <footer className={styles.footer}>
              <p>Documento de apoio à continuidade do cuidado. Dúvidas ou intercorrências devem ser discutidas com a equipe responsável.</p>
              <PhysicianSignature identity={professionalIdentity} />
              <p className={`${styles.technicalMeta} no-print`}>Versão do relatório {generated.snapshot.version} · estrutura técnica {generated.report.schemaVersion}</p>
            </footer>
          </article> : null}

          {activeTab === "directives" && generated.report.advanceDirectives ? (
            <AdvanceDirectivesDocument
              section={generated.report.advanceDirectives}
              patientName={generated.report.patientName}
              professionalIdentity={professionalIdentity}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
