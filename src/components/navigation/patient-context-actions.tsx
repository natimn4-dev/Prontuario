"use client";

import type { MouseEvent } from "react";
import styles from "./patient-context-actions.module.css";

type PatientContextActionsProps = {
  hasUnsavedChanges?: boolean;
  variant?: "global" | "inline";
};

const UNSAVED_CHANGES_MESSAGE =
  "Há alterações ainda não salvas nesta consulta. Se você sair agora, elas podem ser perdidas. Deseja continuar?";

export function PatientContextActions({
  hasUnsavedChanges = false,
  variant = "global",
}: PatientContextActionsProps) {
  function confirmDeparture(event: MouseEvent<HTMLAnchorElement>) {
    if (!hasUnsavedChanges) return;
    if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) event.preventDefault();
  }

  return (
    <div
      className={`${styles.actions} ${variant === "inline" ? styles.inline : styles.global} no-print`}
      role="navigation"
      aria-label="Navegação global do prontuário"
    >
      <a href="/" onClick={confirmDeparture}>Início</a>
      <a href="/#patient-finder-title" onClick={confirmDeparture}>Trocar paciente</a>
    </div>
  );
}
