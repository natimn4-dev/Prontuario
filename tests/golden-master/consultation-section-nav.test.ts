import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("consulta expõe sidebar premium com todas as etapas e comportamento responsivo aprovado", () => {
  const pageSource = readFileSync(
    new URL("../../src/app/consultations/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  const pageStyles = readFileSync(
    new URL("../../src/app/consultations/[id]/page.module.css", import.meta.url),
    "utf8",
  );
  const navSource = readFileSync(
    new URL("../../src/components/consultations/consultation-section-nav.tsx", import.meta.url),
    "utf8",
  );
  const navStyles = readFileSync(
    new URL("../../src/components/consultations/consultation-section-nav.module.css", import.meta.url),
    "utf8",
  );

  for (const id of [
    "resumo-consulta",
    "problemas",
    "medicamentos",
    "soap",
    "escalas",
    "relatorio",
    "finalizacao",
  ]) {
    assert.equal(pageSource.includes(`id="${id}"`), true);
    assert.equal(navSource.includes(`id: "${id}"`), true);
  }

  assert.match(pageSource, /ConsultationSectionNav/);
  assert.match(navSource, /IntersectionObserver/);
  assert.match(navSource, /aria-current/);
  assert.match(navSource, /aria-label="Seções do preenchimento da consulta"/);
  assert.match(navSource, /natalia-mendes-logo\.svg/);
  assert.match(navSource, /patientName/);

  // Desktop: sidebar premium acompanha a página dentro da viewport.
  assert.match(pageStyles, /\.sidebarColumn\s*\{[\s\S]*position:\s*sticky/);
  assert.match(pageStyles, /\.sidebarColumn\s*\{[\s\S]*top:\s*18px/);
  assert.match(pageStyles, /max-height:\s*calc\(100vh - 36px\)/);
  assert.match(pageStyles, /overflow-y:\s*auto/);

  // Tablet/mobile: mantém acesso persistente às etapas, mas o conteúdo do nav
  // vira faixa horizontal compacta e rolável, sem esconder conteúdo clínico.
  assert.match(pageStyles, /@media \(max-width:\s*980px\)[\s\S]*\.sidebarColumn[\s\S]*position:\s*sticky/);
  assert.match(pageStyles, /@media \(max-width:\s*980px\)[\s\S]*top:\s*8px/);
  assert.match(navStyles, /@media \(max-width:\s*980px\)[\s\S]*overflow-x:\s*auto/);
  assert.match(navStyles, /scroll-snap-type:\s*x proximity/);
  assert.match(navStyles, /\.active/);
});
