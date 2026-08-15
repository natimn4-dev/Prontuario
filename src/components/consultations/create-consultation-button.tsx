"use client";

import { useRef, useState } from "react";
import { consultationCreationPresentation } from "@/domain/consultation";

export function CreateConsultationButton(props: {
  patientId: string;
  baselineConsultationId: string | null;
}) {
  const presentation = consultationCreationPresentation(props.baselineConsultationId);
  const creating = useRef(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function createConsultation() {
    if (creating.current) return;
    creating.current = true;
    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": crypto.randomUUID(),
        },
        body: JSON.stringify({
          patientId: props.patientId,
          expectedBaselineConsultationId: props.baselineConsultationId,
        }),
      });
      const result = await response.json() as { consultationId?: string; message?: string };
      if (!response.ok || !result.consultationId) {
        throw new Error(result.message ?? "Não foi possível criar a consulta.");
      }
      window.location.assign(`/consultations/${result.consultationId}`);
    } catch (caught) {
      creating.current = false;
      setIsCreating(false);
      setError(caught instanceof Error ? caught.message : "Não foi possível criar a consulta.");
    }
  }

  return (
    <div className="consultation-create-action no-print">
      <button type="button" disabled={isCreating} onClick={() => void createConsultation()}>
        {isCreating ? "Criando consulta…" : presentation.label}
      </button>
      {presentation.helperText ? <p className="muted">{presentation.helperText}</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
    </div>
  );
}
