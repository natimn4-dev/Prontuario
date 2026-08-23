"use client";

import { useRef, useState, type FormEvent } from "react";
import styles from "./patient-finder.module.css";

export interface PatientSearchResult {
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
  message?: string;
}

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

export function PatientFinder({ initialResults = [] }: { initialResults?: PatientSearchResult[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>(initialResults);
  const [mode, setMode] = useState<"recent" | "search">("recent");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  function restoreRecentPatients() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setQuery("");
    setResults(initialResults);
    setMode("recent");
    setMessage(null);
    setLoading(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const compactQuery = query.trim().replace(/\s+/g, " ");
    if (compactQuery.length < 2) {
      setResults(initialResults);
      setMode("recent");
      setMessage("Digite pelo menos 2 caracteres para localizar um paciente.");
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
    setMode("search");
    setMessage(null);
    try {
      const response = await fetch("/api/patients/search", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: compactQuery }),
      });
      const payload = await response.json() as PatientSearchResponse;
      if (controller.signal.aborted) return;

      if (!response.ok) {
        setResults([]);
        setMessage(payload.message ?? "Não foi possível localizar pacientes.");
        return;
      }

      const nextResults = payload.results ?? [];
      setResults(nextResults);
      setMessage(nextResults.length === 0 ? "Nenhum paciente encontrado." : null);
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      setResults([]);
      setMessage("Não foi possível localizar pacientes.");
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setLoading(false);
      }
    }
  }

  const hasValidationError = Boolean(message?.startsWith("Digite"));
  const resultLabel = mode === "recent"
    ? "Pacientes recentes"
    : results.length === 1
      ? "Paciente localizado"
      : `${results.length} pacientes localizados`;

  return (
    <section className={styles.panel} aria-labelledby="patient-finder-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>Acesso rápido</p>
          <h2 id="patient-finder-title">Localizar paciente</h2>
          <p className={styles.headingDescription}>Pesquise pelo nome ou escolha um dos pacientes recentes abaixo.</p>
        </div>
        <a className={styles.newPatientLink} href="/patients/new">+ Cadastrar paciente</a>
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
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (!value.trim()) {
                setResults(initialResults);
                setMode("recent");
                setMessage(null);
              }
            }}
            placeholder="Ex.: Maria ou Maria Silva"
          />
        </label>
        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Localizando..." : "Localizar paciente"}
        </button>
        {mode === "search" ? (
          <button className={styles.clearButton} type="button" onClick={restoreRecentPatients}>
            Ver recentes
          </button>
        ) : null}
        <p className={styles.help}>
          A busca aceita nome completo ou parcial e ignora acentos, diferença entre maiúsculas/minúsculas e espaços repetidos.
        </p>
      </form>

      <div aria-live="polite" aria-busy={loading}>
        {message ? (
          <p className={hasValidationError ? styles.error : styles.status} role={hasValidationError ? "alert" : undefined}>
            {message}
          </p>
        ) : null}
        {results.length ? (
          <div className={styles.resultRegion}>
            <p className={styles.resultRegionLabel}>{resultLabel}</p>
            <ul className={styles.results} aria-label={mode === "recent" ? "Pacientes recentes" : "Pacientes encontrados"}>
              {results.map((patient) => {
                const hasActiveConsultation = Boolean(patient.activeConsultationId);
                return (
                  <li className={styles.resultItem} key={patient.id}>
                    <a className={styles.resultLink} href={patient.destinationPath}>
                      <span className={styles.resultIdentity}>
                        <span className={styles.resultName}>{patient.fullName}</span>
                        <span className={styles.resultMeta}>
                          Nascimento: {displayDate(patient.birthDate)}
                          {patient.needsIdentityReview ? " · identidade pendente de revisão" : ""}
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
        ) : mode === "recent" && !message ? (
          <p className={styles.status}>Nenhum paciente recente disponível. Use a busca acima ou cadastre um novo paciente.</p>
        ) : null}
      </div>
    </section>
  );
}
