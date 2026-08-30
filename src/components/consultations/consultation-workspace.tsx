"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { ProfessionalIdentity } from "@/domain/professional-identity";
import styles from "./consultation-workspace.module.css";

type WorkspaceSectionId = "problemas" | "medicamentos" | "soap" | "escalas" | "diretivas" | "relatorio" | "finalizacao";

type WorkspaceSection = {
  id: WorkspaceSectionId;
  label: string;
  shortLabel: string;
  description: string;
};

const SECTIONS: readonly WorkspaceSection[] = [
  { id: "problemas", label: "Problemas", shortLabel: "Problemas", description: "Lista clínica e geriátrica longitudinal" },
  { id: "medicamentos", label: "Medicamentos", shortLabel: "Medicamentos", description: "Reconciliação e horários" },
  { id: "soap", label: "Evolução e plano", shortLabel: "Evolução + plano", description: "SOAP, exames, vacinas e condutas" },
  { id: "escalas", label: "Escalas clínicas", shortLabel: "Escalas", description: "Avaliações estruturadas" },
  { id: "diretivas", label: "Diretivas antecipadas", shortLabel: "Diretivas", description: "Valores e preferências revisáveis" },
  { id: "relatorio", label: "Relatório final", shortLabel: "Relatório", description: "Documento para paciente e família" },
  { id: "finalizacao", label: "Finalizar consulta", shortLabel: "Finalizar", description: "Revisão dos itens obrigatórios" },
] as const;

const ProblemWorkspace = dynamic(
  () => import("@/components/problems/problem-workspace").then((module) => module.ProblemWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const MedicationWorkspace = dynamic(
  () => import("@/components/medications/medication-workspace").then((module) => module.MedicationWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const SoapEditor = dynamic(
  () => import("@/components/consultations/soap-editor").then((module) => module.SoapEditor),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const ClinicalScalesWorkspace = dynamic(
  () => import("@/components/scales/clinical-scales-workspace").then((module) => module.ClinicalScalesWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const AdvanceDirectivesWorkspace = dynamic(
  () => import("@/components/consultations/advance-directives-workspace").then((module) => module.AdvanceDirectivesWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const ReportWorkspaceTabs = dynamic(
  () => import("@/components/reports/report-workspace-tabs").then((module) => module.ReportWorkspaceTabs),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const ConsultationFinalizationPanel = dynamic(
  () => import("@/components/consultations/consultation-finalization-panel").then((module) => module.ConsultationFinalizationPanel),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);

function WorkspaceLoading() {
  return <div className={styles.loading} role="status">Carregando esta etapa da consulta…</div>;
}

function sectionFromHash(): WorkspaceSectionId | null {
  if (typeof window === "undefined") return null;
  const value = window.location.hash.replace(/^#/, "") as WorkspaceSectionId;
  return SECTIONS.some((section) => section.id === value) ? value : null;
}

export function ConsultationWorkspace({
  consultationId,
  patientName,
  professionalIdentity,
}: {
  consultationId: string;
  patientName: string;
  professionalIdentity: ProfessionalIdentity;
}) {
  const [active, setActive] = useState<WorkspaceSectionId>("soap");
  const [visited, setVisited] = useState<Set<WorkspaceSectionId>>(() => new Set(["soap"]));

  useEffect(() => {
    const initial = sectionFromHash();
    if (initial) {
      setActive(initial);
      setVisited((current) => new Set([...current, initial]));
    }

    function onHashChange() {
      const next = sectionFromHash();
      if (!next) return;
      setActive(next);
      setVisited((current) => new Set([...current, next]));
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const activeIndex = useMemo(() => SECTIONS.findIndex((section) => section.id === active), [active]);

  function select(sectionId: WorkspaceSectionId) {
    setActive(sectionId);
    setVisited((current) => new Set([...current, sectionId]));
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${sectionId}`);
    }
  }

  return (
    <section className={styles.workspace} aria-label="Etapas da consulta geriátrica">
      <aside className={styles.navigation} aria-label="Navegação da consulta">
        <div className={styles.navigationHeader}>
          <span>Consulta em etapas</span>
          <strong>{activeIndex + 1} de {SECTIONS.length}</strong>
        </div>
        <p className={styles.performanceHint}>Abrimos somente a etapa em uso. Isso reduz o carregamento inicial e evita consumir internet com áreas que ainda não foram acessadas.</p>
        <nav className={styles.sectionList} aria-label="Áreas do prontuário">
          {SECTIONS.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={active === section.id ? styles.active : undefined}
              aria-current={active === section.id ? "step" : undefined}
              onClick={() => select(section.id)}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span className={styles.stepCopy}><strong>{section.shortLabel}</strong><small>{section.description}</small></span>
            </button>
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <header className={styles.contentHeader}>
          <div>
            <span>Etapa atual</span>
            <h2>{SECTIONS[activeIndex]?.label ?? "Consulta"}</h2>
          </div>
          <small>As etapas já abertas permanecem preservadas na tela para não perder rascunhos ao navegar.</small>
        </header>

        {visited.has("problemas") ? (
          <div id="problemas" hidden={active !== "problemas"} className={styles.panel}>
            <ProblemWorkspace consultationId={consultationId} />
          </div>
        ) : null}

        {visited.has("medicamentos") ? (
          <div id="medicamentos" hidden={active !== "medicamentos"} className={styles.panel}>
            <MedicationWorkspace consultationId={consultationId} patientName={patientName} />
            <div className={styles.documentActionBar} aria-label="Ações da tabela de medicamentos">
              <div><strong>Tabela de medicamentos</strong><span>Abra o documento separado para revisar e imprimir. As salvaguardas de identidade e reconciliação continuam valendo.</span></div>
              <a className={styles.documentAction} href={`/consultations/${consultationId}/medications/print`} target="_blank" rel="noreferrer">Abrir e imprimir tabela</a>
            </div>
          </div>
        ) : null}

        {visited.has("soap") ? (
          <div id="soap" hidden={active !== "soap"} className={styles.panel}>
            <SoapEditor consultationId={consultationId} />
          </div>
        ) : null}

        {visited.has("escalas") ? (
          <div id="escalas" hidden={active !== "escalas"} className={styles.panel}>
            <ClinicalScalesWorkspace consultationId={consultationId} />
          </div>
        ) : null}

        {visited.has("diretivas") ? (
          <div id="diretivas" hidden={active !== "diretivas"} className={styles.panel}>
            <AdvanceDirectivesWorkspace consultationId={consultationId} />
          </div>
        ) : null}

        {visited.has("relatorio") ? (
          <div id="relatorio" hidden={active !== "relatorio"} className={styles.panel}>
            <ReportWorkspaceTabs consultationId={consultationId} professionalIdentity={professionalIdentity} />
          </div>
        ) : null}

        {visited.has("finalizacao") ? (
          <div id="finalizacao" hidden={active !== "finalizacao"} className={styles.panel}>
            <ConsultationFinalizationPanel consultationId={consultationId} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
