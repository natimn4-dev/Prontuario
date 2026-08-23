"use client";

import { useEffect, useState } from "react";
import styles from "./consultation-section-nav.module.css";

const sections = [
  { id: "resumo-consulta", label: "Resumo" },
  { id: "problemas", label: "Problemas" },
  { id: "medicamentos", label: "Medicamentos" },
  { id: "soap", label: "SOAP / AGA" },
  { id: "escalas", label: "Escalas clínicas" },
  { id: "relatorio", label: "Relatório final" },
  { id: "finalizacao", label: "Revisão e finalização" },
] as const;

export function ConsultationSectionNav() {
  const [activeId, setActiveId] = useState<(typeof sections)[number]["id"]>(sections[0].id);

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
      <div className={styles.heading}>
        <p className={styles.kicker}>Preenchimento</p>
        <p className={styles.title}>Navegação da consulta</p>
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
                <span>{section.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className={styles.helper}>Use a barra para saltar entre as etapas sem perder o contexto do paciente.</p>
    </nav>
  );
}
