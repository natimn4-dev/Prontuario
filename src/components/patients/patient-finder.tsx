"use client";

import { useRef, useState, type FormEvent } from "react";
import styles from "./patient-finder.module.css";

interface PatientSearchResult {
  id: string;
  fullName: string;
  birthDate: string | null;
  needsIdentityReview: boolean;
}

interface PatientSearchResponse {
  results?: PatientSearchResult[];
  message?: string;
}

export function PatientFinder() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const compactQuery = query.trim().replace(/\s+/g, " ");
    if (compactQuery.length < 2) {
      setResults([]);
      setMessage("Digite pelo menos 2 caracteres para localizar um paciente.");
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setLoading(true);
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

      <div aria-live="polite" aria-busy={loading}>
        {message ? (
          <p className={hasValidationError ? styles.error : styles.status} role={hasValidationError ? "alert" : undefined}>
            {message}
          </p>
        ) : null}
        {results.length ? (
          <ul className={styles.results} aria-label="Pacientes encontrados">
            {results.map((patient) => (
              <li className={styles.resultItem} key={patient.id}>
                <a className={styles.resultLink} href={`/patients/${patient.id}`}>
                  <span className={styles.resultName}>{patient.fullName}</span>
                  <span className={styles.resultMeta}>
                    Nascimento: {patient.birthDate ?? "não registrado"}
                    {patient.needsIdentityReview ? " · homônimo/identidade pendente de revisão" : ""}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
