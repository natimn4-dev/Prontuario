"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProfessionalIdentity } from "@/domain/professional-identity";
import {
  PreviousConsultationNote,
  type PreviousConsultationReference,
} from "./previous-consultation-note";
import styles from "./consultation-workspace.module.css";

type WorkspaceSectionId = "problemas" | "medicamentos" | "alimentacao" | "soap" | "escalas" | "demencia" | "diretivas" | "relatorio" | "finalizacao";

type WorkspaceSection = {
  id: WorkspaceSectionId;
  label: string;
  shortLabel: string;
  description: string;
};

const SECTIONS: readonly WorkspaceSection[] = [
  { id: "problemas", label: "Problemas", shortLabel: "Problemas", description: "Lista clínica e geriátrica longitudinal" },
  { id: "medicamentos", label: "Medicamentos", shortLabel: "Medicamentos", description: "Reconciliação e horários" },
  { id: "alimentacao", label: "Alimentação", shortLabel: "Alimentação", description: "Recordatório e estimativa nutricional" },
  { id: "soap", label: "Evolução e plano", shortLabel: "Evolução + plano", description: "SOAP, exames, vacinas e plano por problema" },
  { id: "escalas", label: "Escalas clínicas", shortLabel: "Escalas", description: "Avaliações estruturadas" },
  { id: "demencia", label: "Investigação cognitiva", shortLabel: "Cognição", description: "Fluxo diagnóstico preenchível" },
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
const DietaryAssessmentWorkspace = dynamic(
  () => import("@/components/dietary/dietary-assessment-workspace").then((module) => module.DietaryAssessmentWorkspace),
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
const CognitiveDomainProfileWorkspace = dynamic(
  () => import("@/components/consultations/cognitive-domain-profile-workspace").then((module) => module.CognitiveDomainProfileWorkspace),
  { ssr: false, loading: () => <WorkspaceLoading /> },
);
const DementiaAssessmentWorkspace = dynamic(
  () => import("@/components/consultations/dementia-assessment-workspace").then((module) => module.DementiaAssessmentWorkspace),
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
  previousConsultation,
  returnContext,
}: {
  consultationId: string;
  patientName: string;
  professionalIdentity: ProfessionalIdentity;
  previousConsultation?: PreviousConsultationReference;
  returnContext?: { href: string; label: string };
}) {
  const [active, setActive] = useState<WorkspaceSectionId>("soap");
  const [dirtySections, setDirtySections] = useState<Set<WorkspaceSectionId>>(new Set());

  useEffect(() => {
    const initial = sectionFromHash();
    if (initial) setActive(initial);

    function onHashChange() {
      const next = sectionFromHash();
      if (!next) return;
      setActive(next);
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const activeIndex = useMemo(() => SECTIONS.findIndex((section) => section.id === active), [active]);

  function select(sectionId: WorkspaceSectionId) {
    setActive(sectionId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${sectionId}`);
    }
  }

  const setSectionDirty = useCallback((sectionId: WorkspaceSectionId, dirty: boolean) => {
    setDirtySections((current) => {
      const next = new Set(current);
      if (dirty) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  }, []);

  function shouldMount(sectionId: WorkspaceSectionId): boolean {
    return active === sectionId || dirtySections.has(sectionId);
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
        {returnContext ? (
          <aside className={`${styles.returnBar} no-print`} aria-label="Retorno à etapa de origem">
            <div>
              <span>Você abriu esta área pela Oncogeriatria</span>
              <strong>{returnContext.label}</strong>
            </div>
            <a href={returnContext.href}>← Retornar para {returnContext.label}</a>
          </aside>
        ) : null}

        <header className={styles.contentHeader}>
          <div>
            <span>Etapa atual</span>
            <h2>{SECTIONS[activeIndex]?.label ?? "Consulta"}</h2>
          </div>
          <small>Etapas sem alterações não permanecem montadas em segundo plano; rascunhos ativos são preservados até serem salvos.</small>
        </header>

        {shouldMount("problemas") ? (
          <div id="problemas" hidden={active !== "problemas"} className={styles.panel}>
            <ProblemWorkspace consultationId={consultationId} onDirtyChange={(dirty) => setSectionDirty("problemas", dirty)} />
          </div>
        ) : null}

        {shouldMount("medicamentos") ? (
          <div id="medicamentos" hidden={active !== "medicamentos"} className={styles.panel}>
            <MedicationWorkspace consultationId={consultationId} patientName={patientName} onDirtyChange={(dirty) => setSectionDirty("medicamentos", dirty)} />
            <div className={styles.documentActionBar} aria-label="Ações da tabela de medicamentos">
              <div><strong>Tabela de medicamentos</strong><span>Abra o documento separado para revisar e imprimir. As salvaguardas de identidade e reconciliação continuam valendo.</span></div>
              <a className={styles.documentAction} href={`/consultations/${consultationId}/medications/print`} target="_blank" rel="noreferrer">Abrir e imprimir tabela</a>
            </div>
          </div>
        ) : null}

        {shouldMount("alimentacao") ? (
          <div id="alimentacao" hidden={active !== "alimentacao"} className={styles.panel}>
            <DietaryAssessmentWorkspace consultationId={consultationId} patientName={patientName} onDirtyChange={(dirty) => setSectionDirty("alimentacao", dirty)} />
          </div>
        ) : null}

        {shouldMount("soap") ? (
          <div id="soap" hidden={active !== "soap"} className={styles.panel}>
            <PreviousConsultationNote previousConsultation={previousConsultation} />
            <SoapEditor consultationId={consultationId} onDirtyChange={(dirty) => setSectionDirty("soap", dirty)} />
          </div>
        ) : null}

        {shouldMount("escalas") ? (
          <div id="escalas" hidden={active !== "escalas"} className={styles.panel}>
            <ClinicalScalesWorkspace consultationId={consultationId} onDirtyChange={(dirty) => setSectionDirty("escalas", dirty)} />
          </div>
        ) : null}

        {shouldMount("diretivas") ? (
          <div id="diretivas" hidden={active !== "diretivas"} className={styles.panel}>
            <AdvanceDirectivesWorkspace consultationId={consultationId} onDirtyChange={(dirty) => setSectionDirty("diretivas", dirty)} />
          </div>
        ) : null}

        {shouldMount("demencia") ? (
          <div id="demencia" hidden={active !== "demencia"} className={styles.panel}>
            <CognitiveDomainProfileWorkspace consultationId={consultationId} />
            <DementiaAssessmentWorkspace consultationId={consultationId} onDirtyChange={(dirty) => setSectionDirty("demencia", dirty)} />
          </div>
        ) : null}

        {shouldMount("relatorio") ? (
          <div id="relatorio" hidden={active !== "relatorio"} className={styles.panel}>
            <ReportWorkspaceTabs consultationId={consultationId} professionalIdentity={professionalIdentity} />
          </div>
        ) : null}

        {shouldMount("finalizacao") ? (
          <div id="finalizacao" hidden={active !== "finalizacao"} className={styles.panel}>
            <ConsultationFinalizationPanel consultationId={consultationId} />
          </div>
        ) : null}

        {returnContext ? (
          <nav className={`${styles.returnFooter} no-print`} aria-label="Concluir e retornar à etapa de origem">
            <span>Terminou o preenchimento ou a revisão desta área?</span>
            <a href={returnContext.href}>← Retornar para {returnContext.label}</a>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
