"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import styles from "./oncogeriatric-nav.module.css";

const workflowSteps = [
  { id: "basal", label: "Avaliação inicial", path: "/basal", description: "CARG, G8 e avaliação geriátrica antes do tratamento" },
  { id: "check", label: "Durante o tratamento", path: "/check", description: "Reavaliações, toxicidades e eventos" },
  { id: "longitudinal", label: "Evolução longitudinal", path: "/longitudinal", description: "Trajetória por domínio ao longo do episódio" },
  { id: "relatorio", label: "Relatório", path: "/relatorio", description: "Revisão clínica e documento final" },
] as const;

const supportSteps = [
  { id: "tratamento", label: "Tratamento oncológico", path: "/tratamento", description: "Esquema, intenção e ciclos" },
  { id: "escalas", label: "Escalas clínicas", path: "/escalas", description: "Instrumentos escolhidos pelo geriatra" },
  { id: "pos-tratamento", label: "Planejamento", path: "/pos-tratamento", description: "Próximas consultas e recuperação" },
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
  const activeSupport = supportSteps.find((step) => pathname === `${overviewPath}${step.path}`);

  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav className={styles.workspaceNav} aria-label="Navegação do acompanhamento oncogeriátrico">
      <div className={styles.railHeader}>
        <div>
          <p className="eyebrow">Jornada clínica</p>
          <strong>{activeWorkflow?.label ?? activeSupport?.label ?? "Visão geral do acompanhamento"}</strong>
        </div>
        <span>Fluxo principal curto; ferramentas específicas ficam separadas para reduzir distração.</span>
      </div>

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

      <div className={styles.supportRail}>
        <span>Ferramentas de apoio</span>
        <div>
          {supportSteps.map((step) => {
            const active = pathname === `${overviewPath}${step.path}`;
            return (
              <Link
                key={step.id}
                href={stepHref(patientId, step.path, episodeId)}
                prefetch={false}
                ref={active ? activeLinkRef : undefined}
                className={active ? styles.activeSupport : undefined}
              >
                <strong>{step.label}</strong>
                <small>{step.description}</small>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function OncogeriatricQuickActions({
  patientId,
  episodeId,
}: {
  patientId: string;
  episodeId?: string | null;
}) {
  const actions = [
    { step: "Essencial", label: "CARG e avaliação inicial", path: "/basal" },
    { step: "Seguimento", label: "Reavaliar durante o tratamento", path: "/check" },
    { step: "Instrumentos", label: "Aplicar ou revisar escalas", path: "/escalas" },
    { step: "Documento", label: "Revisar relatório", path: "/relatorio" },
  ] as const;

  return (
    <nav className={styles.quickActions} aria-label="Ações clínicas frequentes">
      {actions.map((action) => (
        <Link key={action.path} href={stepHref(patientId, action.path, episodeId)} prefetch={false}>
          <span className={styles.quickActionCopy}>
            <small>{action.step}</small>
            <strong>{action.label}</strong>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
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
  const workflowIndex = workflowSteps.findIndex((step) => step.id === currentStep);
  const isSupport = supportSteps.some((step) => step.id === currentStep);
  const previous = workflowIndex > 0 ? workflowSteps[workflowIndex - 1] : null;
  const next = currentStep === "overview"
    ? workflowSteps[0]
    : workflowIndex >= 0 && workflowIndex < workflowSteps.length - 1
      ? workflowSteps[workflowIndex + 1]
      : null;
  const previousHref = previous ? stepHref(patientId, previous.path, episodeId) : overviewHref;

  return (
    <nav className={styles.actionBar} aria-label="Ações da etapa">
      <div className={styles.secondaryActions}>
        <Link href="/" prefetch={false} className={styles.homeAction}>Página inicial</Link>
        {currentStep !== "overview" ? (
          <Link href={isSupport ? overviewHref : previousHref} prefetch={false} className={styles.previousAction}>
            <span>{isSupport ? "Retornar" : "Etapa anterior"}</span>
            <strong>{isSupport ? "Visão geral" : previous?.label ?? "Visão geral"}</strong>
          </Link>
        ) : null}
      </div>

      <div className={styles.primaryActionGroup}>
        <small>{isSupport ? "Ferramenta de apoio: volte à visão geral quando concluir." : "Salve os formulários desta página antes de continuar."}</small>
        {isSupport ? (
          <Link href={overviewHref} prefetch={false} className={styles.primaryAction}>
            <span>Concluir ferramenta</span>
            <strong>Voltar à visão geral →</strong>
          </Link>
        ) : next ? (
          <Link href={stepHref(patientId, next.path, episodeId)} prefetch={false} className={styles.primaryAction}>
            <span>{currentStep === "overview" ? "Iniciar acompanhamento" : "Próxima etapa"}</span>
            <strong>{next.label} →</strong>
          </Link>
        ) : (
          <Link href="/" prefetch={false} className={styles.primaryAction}>
            <span>Não encerra o episódio clínico</span>
            <strong>Finalizar e voltar à página inicial</strong>
          </Link>
        )}
      </div>
    </nav>
  );
}

export const ONCOGERIATRIC_STEP_LABELS = Object.fromEntries(
  allSteps.map((step) => [step.id, step.label]),
) as Record<string, string>;

export function oncogeriatricStepLabel(step: OncogeriatricStepId): string {
  return stepLabel(step);
}
