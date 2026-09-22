"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import styles from "./oncogeriatric-nav.module.css";

const workflowSteps = [
  { id: "avaliacao", label: "Avaliação do momento", path: "/avaliacao", description: "CARG e escalas clínicas" },
  { id: "longitudinal", label: "Trajetória", path: "/longitudinal", description: "Evolução do episódio" },
  { id: "relatorio", label: "Relatório", path: "/relatorio", description: "Revisão e documento" },
] as const;

const supportSteps = [
  { id: "basal", label: "Avaliação inicial", path: "/basal", description: "Contexto pré tratamento" },
  { id: "check", label: "Durante o tratamento", path: "/check", description: "Eventos e toxicidade" },
  { id: "tratamento", label: "Tratamento oncológico", path: "/tratamento", description: "Esquema e ciclos" },
  { id: "pos-tratamento", label: "Planejamento", path: "/pos-tratamento", description: "Recuperação" },
  { id: "carg", label: "CARG", path: "/carg", description: "Rota legada" },
  { id: "escalas", label: "Escalas", path: "/escalas", description: "Rota legada" },
] as const;

const allSteps = [...workflowSteps, ...supportSteps] as const;
export type OncogeriatricStepId = "overview" | (typeof allSteps)[number]["id"];

function episodeSuffix(episodeId?: string | null): string {
  return episodeId ? `?episode=${encodeURIComponent(episodeId)}` : "";
}

function stepHref(patientId: string, path: string, episodeId?: string | null): string {
  return `/patients/${patientId}/oncogeriatria${path}${episodeSuffix(episodeId)}`;
}

function stepLabel(currentStep: OncogeriatricStepId): string {
  if (currentStep === "overview") return "Visão geral";
  return allSteps.find((step) => step.id === currentStep)?.label ?? "Oncogeriatria";
}

export function OncogeriatricWorkspaceHeader({
  patientId,
  patientName,
  episodeLabel,
  currentStep,
  title,
  description,
}: {
  patientId: string;
  patientName: string;
  episodeLabel: string;
  currentStep: OncogeriatricStepId;
  title: string;
  description: string;
}) {
  const workflowIndex = workflowSteps.findIndex((step) => step.id === currentStep);
  const badge = currentStep === "overview"
    ? "Visão geral"
    : workflowIndex >= 0
      ? `Etapa ${workflowIndex + 1} de ${workflowSteps.length}`
      : "Ferramenta de apoio";

  return (
    <header className={styles.clinicalHeader}>
      <div className={styles.identityBlock}>
        <nav className={styles.breadcrumbs} aria-label="Retorno e contexto do paciente">
          <Link href="/oncogeriatria" prefetch={false}>Oncogeriatria</Link>
          <span aria-hidden="true">›</span>
          <Link href={`/patients/${patientId}`} prefetch={false}>Prontuário do paciente</Link>
        </nav>
        <p className={styles.identityLabel}>Paciente em acompanhamento</p>
        <h1>{patientName}</h1>
        <p className={styles.episodeLabel}>{episodeLabel}</p>
      </div>
      <div className={styles.taskBlock}>
        <span className={styles.stepBadge}>{badge}</span>
        <p className={styles.taskLabel}>Tarefa atual</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function OncogeriatricNav({ patientId, episodeId }: { patientId: string; episodeId?: string | null }) {
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const overviewPath = `/patients/${patientId}/oncogeriatria`;
  const overviewActive = pathname === overviewPath;
  const activeWorkflow = workflowSteps.find((step) => pathname === `${overviewPath}${step.path}`);

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav className={styles.workspaceNav} aria-label="Navegação do acompanhamento oncogeriátrico">
      <div className={styles.railHeader}><div><p className="eyebrow">Oncogeriatria</p><strong>{activeWorkflow?.label ?? (overviewActive ? "Visão geral" : "Contexto do episódio")}</strong></div></div>

      <div className={styles.primaryJourney}>
        <Link
          href={`${overviewPath}${episodeSuffix(episodeId)}`}
          prefetch={false}
          ref={overviewActive ? activeLinkRef : undefined}
          className={overviewActive ? styles.active : undefined}
          aria-current={overviewActive ? "page" : undefined}
        >
          <span className={styles.stepNumber}>0</span>
          <span><strong>Visão geral</strong><small>Estado atual e próximos passos</small></span>
        </Link>

        {workflowSteps.map((step, index) => {
          const active = pathname === `${overviewPath}${step.path}`;
          return (
            <Link
              key={step.id}
              href={stepHref(patientId, step.path, episodeId)}
              prefetch={false}
              ref={active ? activeLinkRef : undefined}
              className={active ? styles.active : undefined}
              aria-current={active ? "step" : undefined}
            >
              <span className={styles.stepNumber}>{index + 1}</span>
              <span><strong>{step.label}</strong><small>{step.description}</small></span>
            </Link>
          );
        })}
      </div>

    </nav>
  );
}

export function OncogeriatricStepActions({
  patientId,
  episodeId,
  currentStep,
}: {
  patientId: string;
  episodeId?: string | null;
  currentStep: OncogeriatricStepId;
}) {
  const overviewHref = `/patients/${patientId}/oncogeriatria${episodeSuffix(episodeId)}`;
  return <nav className={styles.actionBar} aria-label="Retorno ao acompanhamento">
    <Link href={overviewHref} prefetch={false} className={styles.homeAction}>Voltar à visão geral</Link>
  </nav>;

}

export const ONCOGERIATRIC_STEP_LABELS = Object.fromEntries(
  allSteps.map((step) => [step.id, step.label]),
) as Record<string, string>;

export function oncogeriatricStepLabel(step: OncogeriatricStepId): string {
  return stepLabel(step);
}
