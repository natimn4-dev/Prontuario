import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("consulta expõe barra lateral com todas as etapas principais e âncoras correspondentes", () => {
  const pageSource = readFileSync(
    new URL("../../src/app/consultations/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  const navSource = readFileSync(
    new URL("../../src/components/consultations/consultation-section-nav.tsx", import.meta.url),
    "utf8",
  );
  const cssSource = readFileSync(
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

  assert.match(navSource, /IntersectionObserver/);
  assert.match(navSource, /aria-current/);
  assert.match(navSource, /aria-label="Seções do preenchimento da consulta"/);
  assert.match(cssSource, /position:\s*sticky/);
  assert.match(cssSource, /overflow-x:\s*auto/);
});
