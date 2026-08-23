"use client";

import { useRef, useState, type FormEvent } from "react";
import { patientSearchFailureFeedback } from "@/domain/patient-search-http";
import styles from "./patient-finder.module.css";

interface PatientSearchResult {
  id: string;
  fullName: string;
  birthDate: string | null;
  needsIdentityReview: boolean;
  activeConsultationId: string | null;
  activeConsultationStatus: "DRAFT" | "IN_REVIEW" | null;
  activeConsultationDate: string | null;
  destinationPath: string;
}

interface PatientSearchResponse {
  results?: PatientSearchResult[];
  code?: string;
  message?: string;
}

type FinderFeedback = {
  kind: "status" | "validation" | "error";
  text: string;
};

function displayDate(value: string | null): string {
  if (!value) return "não registrada";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function consultationStatusLabel(status: PatientSearchResult["activeConsultationStatus"]): string {
  if (status === "IN_REVIEW") return "Em revisão";
  if (status === "DRAFT") return "Em preenchimento";
  return "Sem consulta em andamento";
}

export function PatientFinder() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FinderFeedback | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const compactQuery = query.trim().replace(/\s+/g, " ");
    if (compactQuery.length < 2) {
      setResults([]);
      setFeedback({
        kind: "validation",
        text: "Digite pelo menos 2 caracteres para localizar um paciente.",
      });
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setResults([]);
    setFeedback(null);
    try {
      const response = await fetch("/api/patients/search", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: compactQuery }),
      });
      const payload = await response.json().catch(() => ({})) as PatientSearchResponse;
      if (controller.signal.aborted) return;

      if (!response.ok) {
        const failure = patientSearchFailureFeedback(response.status, payload);
        setResults([]);
        setFeedback({
          kind: failure.kind === "validation" ? "validation" : "error",
          text: failure.message,
        });
        return;
      }

      const nextResults = payload.results ?? [];
      setResults(nextResults);
      setFeedback(nextResults.length === 0
        ? { kind: "status", text: "Nenhum paciente encontrado." }
        : null);
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      setResults([]);
      setFeedback({
        kind: "error",
        text: "Não foi possível concluir a busca por uma falha de rede. Tente novamente.",
      });
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }

  const feedbackIsError = feedback?.kind === "validation" || feedback?.kind === "error";

  return (
    <section className={styles.panel} aria-labelledby="patient-finder-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>Acesso rápido</p>
          <h2 id="patient-finder-title">Localizar paciente</h2>
        </div>
        <a className={styles.newPatientLink} href="/patients/new">Cadastrar novo paciente</a>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label} htmlFor="patient-search-query">
          Nome ou parte do nome
          <input
            className={styles.input}
            id="patient-search-query"
            name="query"
            type="search"
            minLength={2}
            maxLength={120}
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: Maria ou Maria Silva"
          />
        </label>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Localizando..." : "Localizar paciente"}
        </button>
        <p className={styles.help}>
          A busca aceita nome completo ou parcial e ignora acentos, diferença entre maiúsculas/minúsculas e espaços repetidos.
        </p>
      </form>

      <div aria-live={feedbackIsError ? "assertive" : "polite"} aria-busy={loading}>
        {feedback ? (
          <p className={feedbackIsError ? styles.error : styles.status} role={feedbackIsError ? "alert" : "status"}>
            {feedback.text}
          </p>
        ) : null}
        {results.length ? (
          <div className={styles.resultRegion}>
            <p className={styles.resultRegionLabel}>
              {results.length === 1 ? "Paciente localizado" : `${results.length} pacientes localizados`}
            </p>
            <ul className={styles.results} aria-label="Pacientes encontrados">
              {results.map((patient) => {
                const hasActiveConsultation = Boolean(patient.activeConsultationId);
                return (
                  <li className={styles.resultItem} key={patient.id}>
                    <a className={styles.resultLink} href={patient.destinationPath}>
                      <span className={styles.resultIdentity}>
                        <span className={styles.resultName}>{patient.fullName}</span>
                        <span className={styles.resultMeta}>
                          Nascimento: {displayDate(patient.birthDate)}
                          {patient.needsIdentityReview ? " · homônimo/identidade pendente de revisão" : ""}
                        </span>
                      </span>
                      <span className={styles.resultConsultation}>
                        <span className={styles.resultStatus} data-active={hasActiveConsultation ? "true" : "false"}>
                          {consultationStatusLabel(patient.activeConsultationStatus)}
                        </span>
                        {patient.activeConsultationDate ? (
                          <span className={styles.resultConsultationDate}>
                            Consulta de {displayDate(patient.activeConsultationDate)}
                          </span>
                        ) : null}
                        <span className={styles.resultAction}>
                          {hasActiveConsultation ? "Continuar consulta" : "Abrir paciente"} →
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
