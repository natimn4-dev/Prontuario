"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./cognitive-domain-profile-workspace.module.css";

type DomainObservation = {
  scaleCode: string;
  scaleName: string;
  display: string;
  status: "NO_RECORDED_ERROR" | "ERRORS_PRESENT" | "ALTERED_VALIDATED_RULE" | "RECORDED_NO_CUTOFF" | "CLINICAL_ALTERATION_RECORDED";
  interpretation: string;
};

type DomainSummary = {
  key: string;
  label: string;
  status: DomainObservation["status"];
  interpretation: string;
  observations: DomainObservation[];
};

type Snapshot = {
  version: string;
  profile: string;
  profileLabel: string;
  profileExplanation: string;
  domains: DomainSummary[];
  scaleSummaries: Array<{
    scaleCode: string;
    scaleName: string;
    scoreText: string;
    classification?: string;
    appliedAt: string;
    detailedDomainsAvailable: boolean;
  }>;
  missingDetail: string[];
};

type SnapshotAtConsultation = {
  consultationId: string;
  occurredAt: string | null;
  snapshot: Snapshot;
} | null;

type Etiology = {
  status: "AVAILABLE" | "INSUFFICIENT_CLINICAL_DATA" | "INTERRUPTED_PATHWAY" | "MIXED_OR_INDETERMINATE";
  heading: string;
  leadingLabel?: string;
  support?: "LOW" | "MODERATE" | "HIGH";
  rationale: string;
  additionalDifferential?: string;
  disclaimer: string;
};

type CognitiveProfileView = {
  consultationId: string;
  current: SnapshotAtConsultation;
  previous: SnapshotAtConsultation;
  baseline: SnapshotAtConsultation;
  etiology: Etiology;
  sourceNote: string;
};

const DOMAIN_ORDER = [
  "orientation_temporal",
  "orientation_spatial",
  "orientation_global",
  "immediate_memory",
  "attention_working_memory",
  "delayed_recall",
  "executive_visuospatial",
  "naming",
  "language",
  "repetition",
  "reading",
  "writing",
  "comprehension_commands",
  "abstraction",
  "verbal_fluency",
];

const STATUS_LABELS: Record<DomainObservation["status"], string> = {
  NO_RECORDED_ERROR: "Sem erro registrado",
  ERRORS_PRESENT: "Erros presentes",
  ALTERED_VALIDATED_RULE: "Alterado pela regra do instrumento",
  RECORDED_NO_CUTOFF: "Registrado sem corte automático",
  CLINICAL_ALTERATION_RECORDED: "Alteração clínica registrada",
};

const SUPPORT_LABELS: Record<NonNullable<Etiology["support"]>, string> = {
  LOW: "apoio baixo",
  MODERATE: "apoio moderado",
  HIGH: "apoio alto",
};

function displayDate(value: string | null): string {
  if (!value) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function domainFor(snapshot: SnapshotAtConsultation, key: string): DomainSummary | null {
  return snapshot?.snapshot.domains.find((domain) => domain.key === key) ?? null;
}

function domainCell(domain: DomainSummary | null) {
  if (!domain) return <span className={styles.empty}>Não avaliado</span>;
  return (
    <div className={styles.cellStack}>
      {domain.observations.map((observation) => (
        <div key={`${observation.scaleCode}-${observation.display}`} className={styles.observation}>
          <strong>{observation.scaleName}</strong>
          <span>{observation.display}</span>
        </div>
      ))}
      <span className={styles.statusText}>{STATUS_LABELS[domain.status]}</span>
    </div>
  );
}

export function CognitiveDomainProfileWorkspace({ consultationId }: { consultationId: string }) {
  const [view, setView] = useState<CognitiveProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/consultations/${consultationId}/cognitive-profile`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as (CognitiveProfileView & { message?: string }) | null;
      if (!response.ok || !body) throw new Error(body?.message ?? "Não foi possível carregar o perfil cognitivo.");
      setView(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil cognitivo.");
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  useEffect(() => { void load(); }, [load]);

  const domainRows = useMemo(() => {
    if (!view) return [];
    const keys = new Set<string>();
    for (const item of [view.baseline, view.previous, view.current]) {
      for (const domain of item?.snapshot.domains ?? []) keys.add(domain.key);
    }
    return [...keys]
      .sort((left, right) => {
        const leftIndex = DOMAIN_ORDER.indexOf(left);
        const rightIndex = DOMAIN_ORDER.indexOf(right);
        return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex);
      })
      .map((key) => ({
        key,
        label: domainFor(view.current, key)?.label ?? domainFor(view.previous, key)?.label ?? domainFor(view.baseline, key)?.label ?? key,
        baseline: domainFor(view.baseline, key),
        previous: domainFor(view.previous, key),
        current: domainFor(view.current, key),
      }));
  }, [view]);

  if (loading) return <section className={styles.card} aria-busy="true"><p>Carregando perfil cognitivo…</p></section>;
  if (error) {
    return (
      <section className={styles.card}>
        <div className={styles.headerRow}>
          <div><p className={styles.eyebrow}>Cognição</p><h3>Perfil cognitivo integrado</h3></div>
          <button type="button" onClick={() => void load()}>Tentar novamente</button>
        </div>
        <p className={styles.error} role="alert">{error}</p>
      </section>
    );
  }
  if (!view) return null;

  const current = view.current?.snapshot;
  const scaleSummaries = current?.scaleSummaries ?? [];
  const missingDetail = current?.missingDetail ?? [];

  return (
    <section className={styles.workspace} aria-labelledby="cognitive-profile-title">
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Cognição</p>
            <h3 id="cognitive-profile-title">Perfil cognitivo integrado</h3>
            <p className={styles.lead}>Consolida os domínios disponíveis de MEEM, MoCA, fluência verbal e Teste do Relógio sem inferir subtotais ausentes.</p>
          </div>
          <button type="button" className={styles.refreshButton} onClick={() => void load()}>Atualizar perfil</button>
        </div>

        {scaleSummaries.length > 0 ? (
          <div className={styles.scaleStrip} aria-label="Testes cognitivos atuais">
            {scaleSummaries.map((scale) => (
              <div className={styles.scaleChip} key={scale.scaleCode}>
                <strong>{scale.scaleName}</strong>
                <span>{scale.scoreText}</span>
                <small>{scale.detailedDomainsAvailable ? "Domínios estruturados disponíveis" : "Somente escore global"}</small>
              </div>
            ))}
          </div>
        ) : <p className={styles.emptyPanel}>Nenhum dos testes cognitivos integrados foi registrado nesta consulta.</p>}

        {current ? (
          <div className={styles.profileSummary}>
            <span className={styles.summaryLabel}>Perfil descritivo dos itens registrados</span>
            <strong>{current.profileLabel}</strong>
            <p>{current.profileExplanation}</p>
          </div>
        ) : null}

        {missingDetail.length > 0 ? (
          <div className={styles.notice}>
            <strong>Limitações dos dados disponíveis</strong>
            <ul>{missingDetail.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        ) : null}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Dimensões</p><h3>Matriz cognitiva longitudinal</h3></div>
          <p>Baseline → avaliação anterior → atual. “Erros presentes” descreve o desempenho no item/subtotal e não equivale a diagnóstico.</p>
        </div>
        {domainRows.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Domínio</th>
                  <th scope="col">Baseline{view.baseline ? <small>{displayDate(view.baseline.occurredAt)}</small> : null}</th>
                  <th scope="col">Anterior{view.previous ? <small>{displayDate(view.previous.occurredAt)}</small> : null}</th>
                  <th scope="col">Atual{view.current ? <small>{displayDate(view.current.occurredAt)}</small> : null}</th>
                  <th scope="col">Interpretação atual</th>
                </tr>
              </thead>
              <tbody>
                {domainRows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td>{domainCell(row.baseline)}</td>
                    <td>{domainCell(row.previous)}</td>
                    <td>{domainCell(row.current)}</td>
                    <td>{row.current?.interpretation ?? <span className={styles.empty}>Sem interpretação atual</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.emptyPanel}>Dados estruturados insuficientes para construir a matriz de domínios.</p>}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Integração etiológica</p><h3>{view.etiology.heading}</h3></div>
        </div>
        {view.etiology.status === "AVAILABLE" && view.etiology.leadingLabel ? (
          <div className={styles.etiologyResult}>
            <span>Maior apoio entre as hipóteses já avaliadas no fluxo clínico</span>
            <strong>{view.etiology.leadingLabel}</strong>
            {view.etiology.support ? <small>{SUPPORT_LABELS[view.etiology.support]}</small> : null}
          </div>
        ) : null}
        <p>{view.etiology.rationale}</p>
        {view.etiology.additionalDifferential ? <p className={styles.noticeInline}>{view.etiology.additionalDifferential}</p> : null}
        <p className={styles.disclaimer}>{view.etiology.disclaimer}</p>
        <p className={styles.sourceNote}>{view.sourceNote}</p>
      </div>
    </section>
  );
}
