"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./oncogeriatric-nav.module.css";

const steps = [
  { id: "basal", label: "Antes do tratamento", path: "/basal", description: "Avaliação geriátrica inicial" },
  { id: "tratamento", label: "Tratamento oncológico", path: "/tratamento", description: "Trajetória antineoplásica" },
  { id: "check", label: "Durante o tratamento", path: "/check", description: "Reavaliações e eventos" },
  { id: "intervencoes", label: "Plano geriátrico", path: "/intervencoes", description: "Intervenções e responsáveis" },
  { id: "escalas", label: "Escalas clínicas", path: "/escalas", description: "Instrumentos escolhidos pelo geriatra" },
  { id: "longitudinal", label: "Evolução longitudinal", path: "/longitudinal", description: "Trajetória por domínio" },
  { id: "pos-tratamento", label: "Pós-tratamento", path: "/pos-tratamento", description: "Recuperação e seguimento" },
  { id: "relatorio", label: "Relatório", path: "/relatorio", description: "Revisão clínica e documento" },
] as const;

export type OncogeriatricStepId = "overview" | (typeof steps)[number]["id"];

function episodeSuffix(episodeId?: string | null): string {
  return episodeId ? `?episode=${encodeURIComponent(episodeId)}` : "";
}

function stepHref(patientId: string, path: string, episodeId?: string | null): string {
  return `/patients/${patientId}/oncogeriatria${path}${episodeSuffix(episodeId)}`;
}

export function OncogeriatricNav({ patientId, episodeId }: { patientId: string; episodeId?: string | null }) {
  const pathname = usePathname();
  const overviewPath = `/patients/${patientId}/oncogeriatria`;
  const activeIndex = steps.findIndex((step) => pathname === `${overviewPath}${step.path}`);
  const activeStep = activeIndex >= 0 ? steps[activeIndex] : null;
  const overviewActive = pathname === overviewPath;

  return (
    <nav className={styles.workspaceNav} aria-label="Etapas do acompanhamento oncogeriátrico">
      <div className={styles.navHeader}>
        <div>
          <p className="eyebrow">Acompanhamento em etapas</p>
          <div className={styles.currentStep}>
            <h2>{activeStep?.label ?? "Visão geral"}</h2>
            <strong>{activeStep ? `Etapa ${activeIndex + 1} de ${steps.length}` : "Resumo do acompanhamento"}</strong>
          </div>
          <p>{activeStep?.description ?? "Consulte o estado atual e escolha o próximo passo clínico."}</p>
        </div>
        <div className={styles.exitLinks} aria-label="Saídas rápidas">
          <Link href="/" prefetch={false}>Página inicial</Link>
          <Link href={`/patients/${patientId}`} prefetch={false}>Prontuário do paciente</Link>
        </div>
      </div>

      <progress
        className={styles.progress}
        max={steps.length}
        value={activeIndex + 1}
        aria-label={activeStep ? `Etapa ${activeIndex + 1} de ${steps.length}` : "Visão geral do acompanhamento"}
      />

      <div className={styles.stepScroller}>
        <Link
          href={`${overviewPath}${episodeSuffix(episodeId)}`}
          prefetch={false}
          className={`${styles.overviewLink} ${overviewActive ? styles.active : ""}`}
          aria-current={overviewActive ? "page" : undefined}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9.5 19v-5h5v5" />
          </svg>
          <strong>Visão geral</strong>
        </Link>
        <ol className={styles.stepList}>
          {steps.map((step, index) => {
            const active = activeIndex === index;
            return (
              <li key={step.id}>
                <Link
                  href={stepHref(patientId, step.path, episodeId)}
                  prefetch={false}
                  className={active ? styles.active : undefined}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <strong>{step.label}</strong>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <p className={styles.performanceNote}>Cada etapa abre em uma página independente para reduzir o carregamento do prontuário.</p>
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
    { label: "Avaliação antes do tratamento", path: "/basal" },
    { label: "Reavaliar durante o tratamento", path: "/check" },
    { label: "Aplicar ou revisar escalas", path: "/escalas" },
    { label: "Revisar relatório", path: "/relatorio" },
  ] as const;

  return (
    <nav className={styles.quickActions} aria-label="Ações clínicas frequentes">
      {actions.map((action) => (
        <Link key={action.path} href={stepHref(patientId, action.path, episodeId)} prefetch={false}>
          <span>{action.label}</span>
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
  const currentIndex = currentStep === "overview" ? -1 : steps.findIndex((step) => step.id === currentStep);
  const previous = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const next = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;
  const previousHref = previous
    ? stepHref(patientId, previous.path, episodeId)
    : `/patients/${patientId}/oncogeriatria${episodeSuffix(episodeId)}`;

  return (
    <nav className={styles.actionBar} aria-label="Ações da etapa">
      <div className={styles.secondaryActions}>
        <Link href="/" prefetch={false} className={styles.homeAction}>Página inicial</Link>
        {currentStep !== "overview" ? (
          <Link href={previousHref} prefetch={false} className={styles.previousAction}>
            <span>Página anterior</span>
            <strong>{previous?.label ?? "Visão geral"}</strong>
          </Link>
        ) : null}
      </div>

      <div className={styles.primaryActionGroup}>
        <small>Salve os formulários desta página antes de continuar.</small>
        {next ? (
          <Link href={stepHref(patientId, next.path, episodeId)} prefetch={false} className={styles.primaryAction}>
            <span>{currentStep === "overview" ? "Iniciar acompanhamento" : "Próxima etapa"}</span>
            <strong>{next.label} →</strong>
          </Link>
        ) : (
          <Link href="/" prefetch={false} className={styles.primaryAction}>
            <span>Concluir navegação</span>
            <strong>Finalizar e voltar à página inicial</strong>
          </Link>
        )}
      </div>
    </nav>
  );
}
