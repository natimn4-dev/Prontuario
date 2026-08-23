"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./consultation-section-nav.module.css";

const sections = [
  { id: "resumo-consulta", label: "Resumo", hint: "Visão geral" },
  { id: "problemas", label: "Problemas", hint: "Clínicos e geriátricos" },
  { id: "medicamentos", label: "Medicamentos", hint: "Lista e horários" },
  { id: "soap", label: "SOAP / AGA", hint: "Registro técnico" },
  { id: "escalas", label: "Escalas clínicas", hint: "Instrumentos aplicados" },
  { id: "relatorio", label: "Relatório final", hint: "Paciente e família" },
  { id: "finalizacao", label: "Revisão e finalização", hint: "Conferência e assinatura" },
] as const;

interface ConsultationSectionNavProps {
  patientName: string;
  patientBirthDateLabel: string;
  consultationDateLabel: string;
  consultationStatusLabel: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export function ConsultationSectionNav({
  patientName,
  patientBirthDateLabel,
  consultationDateLabel,
  consultationStatusLabel,
}: ConsultationSectionNavProps) {
  const [activeId, setActiveId] = useState<(typeof sections)[number]["id"]>(sections[0].id);
  const patientInitials = useMemo(() => initials(patientName), [patientName]);

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));

    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveId(visible.target.id as (typeof sections)[number]["id"]);
        }
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0.05, 0.15, 0.3],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={styles.nav} aria-label="Seções do preenchimento da consulta">
      <div className={styles.brand}>
        <img src="/brand/natalia-mendes-logo.svg" alt="Natalia Mendes — Médica Geriatra" />
      </div>

      <section className={styles.patientCard} aria-label="Paciente da consulta atual">
        <span className={styles.avatar} aria-hidden="true">{patientInitials}</span>
        <span className={styles.patientIdentity}>
          <strong>{patientName}</strong>
          <small>Nascimento: {patientBirthDateLabel}</small>
          <small>Consulta: {consultationDateLabel}</small>
        </span>
        <span className={styles.status}>{consultationStatusLabel}</span>
      </section>

      <div className={styles.heading}>
        <p className={styles.kicker}>Consulta atual</p>
        <p className={styles.title}>Preenchimento clínico</p>
      </div>

      <ol className={styles.list}>
        {sections.map((section, index) => {
          const active = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                className={`${styles.link} ${active ? styles.active : ""}`}
                href={`#${section.id}`}
                aria-current={active ? "location" : undefined}
                onClick={() => setActiveId(section.id)}
              >
                <span className={styles.number} aria-hidden="true">{index + 1}</span>
                <span className={styles.linkText}>
                  <strong>{section.label}</strong>
                  <small>{section.hint}</small>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className={styles.helper}>Navegue pelas etapas sem perder o contexto do paciente.</p>
    </nav>
  );
}
