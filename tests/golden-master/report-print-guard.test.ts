import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(new URL("../../src/components/reports/aga-report-preview.tsx", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../../src/app/clinical-report.css", import.meta.url), "utf8");

test("impressão nativa reflete a confirmação local de revisão clínica", () => {
  assert.match(component, /data-clinical-review=\{clinicalReviewConfirmed \? "confirmed" : "pending"\}/);
  assert.match(component, /Relatório não liberado para impressão — revisão clínica pendente\./);
  assert.match(component, /disabled=\{!generated \|\| !clinicalReviewConfirmed\}/);
});

test("CSS de impressão oculta o relatório pendente e mostra somente o bloqueio", () => {
  assert.match(stylesheet, /@media print/);
  assert.match(stylesheet, /\.consultation-shell > \*\s*\{\s*display: none !important;/);
  assert.match(stylesheet, /\.report-workspace\[data-clinical-review="pending"\] > \*\s*\{\s*display: none !important;/);
  assert.match(stylesheet, /\.report-workspace\[data-clinical-review="pending"\] > \.print-review-blocker\s*\{\s*display: block !important;/);
});
