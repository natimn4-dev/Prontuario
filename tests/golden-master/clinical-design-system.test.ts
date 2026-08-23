import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

test("PA-CDS mantém tokens clinical premium e não restaura paleta marrom antiga", () => {
  const globals = source("src/app/globals.css");
  assert.match(globals, /--primary:\s*#5f2a91/);
  assert.match(globals, /--primary-strong:\s*#48206f/);
  assert.match(globals, /--primary-soft:\s*#f4eefb/);
  assert.match(globals, /--background:\s*#f8f7fb/);
  assert.match(globals, /--surface:\s*#ffffff/);
  assert.match(globals, /--focus:\s*#6b55d9/);
  assert.doesNotMatch(globals, /--primary:\s*#896d72/);
});

test("entrada e consulta preservam marca, paciente e navegação lateral aprovada", () => {
  const home = source("src/app/page.tsx");
  const consultation = source("src/app/consultations/[id]/page.tsx");
  const nav = source("src/components/consultations/consultation-section-nav.tsx");
  const navCss = source("src/components/consultations/consultation-section-nav.module.css");

  assert.match(home, /natalia-mendes-logo\.svg/);
  assert.match(home, /Localize o paciente/);
  assert.match(consultation, /ConsultationSectionNav/);
  assert.match(consultation, /patientName=\{context\.patientName\}/);
  assert.match(nav, /Natalia Mendes — Médica Geriatra/);
  assert.match(nav, /patientName/);
  assert.match(nav, /Resumo/);
  assert.match(nav, /Problemas/);
  assert.match(nav, /Medicamentos/);
  assert.match(nav, /SOAP \/ AGA/);
  assert.match(nav, /Escalas clínicas/);
  assert.match(nav, /Relatório final/);
  assert.match(nav, /Revisão e finalização/);
  assert.match(navCss, /\.patientCard/);
  assert.match(navCss, /background:\s*var\(--primary\)/);
});

test("escala clínica permanece caixa única por domínio no padrão aprovado", () => {
  const scales = source("src/components/scales/clinical-scales-workspace.tsx");
  const css = source("src/components/scales/clinical-scales-workspace.module.css");

  assert.match(scales, /groupClinicalScaleOptions/);
  assert.match(scales, /selectedKeys/);
  assert.match(css, /\.domainGrid/);
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /accent-color:\s*var\(--primary\)/);
  assert.match(css, /\.selectedBar/);
  assert.match(css, /\.activeTab/);
});

test("relatório e impressão carregam a camada premium depois do legado", () => {
  const layout = source("src/app/layout.tsx");
  const overrides = source("src/app/clinical-premium-overrides.css");
  const branding = source("src/app/report-branding.css");

  const legacyIndex = layout.indexOf("./clinical-report.css");
  const premiumIndex = layout.indexOf("./clinical-premium-overrides.css");
  assert.ok(legacyIndex >= 0 && premiumIndex > legacyIndex);
  assert.match(overrides, /--care-accent:\s*var\(--primary\)/);
  assert.match(overrides, /\.care-report-header h1/);
  assert.match(overrides, /\.medication-final-table thead th/);
  assert.match(branding, /report-brand-logo/);
  assert.match(branding, /professional-signature/);
});

test("gráfico longitudinal aprovado permanece separado por seis dimensões e com marcador atual", () => {
  const chart = source("src/components/reports/capacity-dimension-history-chart.tsx");
  const css = source("src/components/reports/capacity-dimension-history-chart.module.css");

  assert.match(chart, /Evolução da capacidade intrínseca e da independência funcional/);
  assert.match(chart, /Independência funcional/);
  assert.match(chart, /Capacidade intrínseca/);
  assert.match(chart, /targetGuide/);
  assert.match(chart, /consulta atual/);
  assert.match(chart, /Pontos de inflexão observados/);
  assert.match(chart, /não atribui causa/);
  assert.doesNotMatch(chart, /<table/);

  assert.match(css, /data-dimension="funcionalidade"\]\s*\{\s*color:\s*var\(--primary\)/);
  assert.match(css, /data-dimension="locomocao"\]\s*\{\s*color:\s*#9a7440/);
  assert.match(css, /data-dimension="cognicao"\]\s*\{\s*color:\s*#4f7189/);
  assert.match(css, /data-dimension="psicologico"\]\s*\{\s*color:\s*#996277/);
  assert.match(css, /data-dimension="vitalidade"\]\s*\{\s*color:\s*#5f8068/);
  assert.match(css, /data-dimension="sensorial"\]\s*\{\s*color:\s*#6d6b82/);
  assert.match(css, /\.targetGuide/);
  assert.match(css, /\.statusLegend/);
});
