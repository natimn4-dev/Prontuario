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

test("entrada e consulta preservam identidade por sessão, paciente e navegação progressiva aprovada", () => {
  const home = source("src/app/page.tsx");
  const consultation = source("src/app/consultations/[id]/page.tsx");
  const workspace = source("src/components/consultations/consultation-workspace.tsx");
  const workspaceCss = source("src/components/consultations/consultation-workspace.module.css");

  assert.match(home, /buildProfessionalIdentity|professionalIdentity/);
  assert.match(home, /professionalIdentity\.logoPath/);
  assert.doesNotMatch(home, /src=["']\/brand\/natalia-mendes-logo\.svg["']/);
  assert.match(home, /Localize o paciente/);
  assert.match(consultation, /ConsultationWorkspace/);
  assert.match(consultation, /shell consultation-shell/);
  assert.match(consultation, /consultation-content/);
  assert.match(consultation, /patientName=\{context\.patientName\}/);
  assert.match(consultation, /professionalIdentity=\{professionalIdentity\}/);
  assert.doesNotMatch(consultation, /natalia-mendes-logo\.svg/);
  assert.match(workspace, /Consulta em etapas/);
  assert.match(workspace, /Problemas/);
  assert.match(workspace, /Medicamentos/);
  assert.match(workspace, /Evolução e plano/);
  assert.match(workspace, /Escalas clínicas/);
  assert.match(workspace, /Relatório final/);
  assert.match(workspace, /Finalizar consulta/);
  assert.match(workspace, /professionalIdentity: ProfessionalIdentity/);
  assert.match(workspaceCss, /\.navigation/);
  assert.match(workspaceCss, /position:\s*sticky/);
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

test("relatório e impressão carregam camada premium e preservam relatório aninhado", () => {
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

test("gráfico longitudinal aprovado reproduz o modelo visual por sete trajetórias", () => {
  const chart = source("src/components/reports/capacity-dimension-history-chart.tsx");
  const reportDocument = source("src/components/reports/aga-report-document-preview.tsx");
  const css = source("src/components/reports/capacity-dimension-history-chart.module.css");

  assert.match(chart, /Evolução da capacidade intrínseca e da independência funcional/);
  assert.match(chart, /Uma trajetória por domínio\. O tempo real entre consultas é preservado\./);
  assert.match(chart, /hasDisplayableLongitudinalHistory/);
  assert.match(chart, /consultas sem reaplicação não apagam o histórico/i);
  assert.match(chart, /hasLongitudinalTrendData/);
  assert.match(chart, /data-chart="line-small-multiples"/);
  assert.match(chart, /<polyline/);
  assert.match(chart, /Independência funcional/);
  assert.match(chart, /Capacidade intrínseca/);
  assert.match(chart, /Locomoção, cognição, humor, vitalidade, audição e visão/);
  assert.match(chart, /ABVD\/AIVD/);
  assert.match(chart, /methodologyBadge/);
  assert.match(chart, /targetLabel[\s\S]*?mais recente/);
  assert.match(chart, /targetGuide/);
  assert.match(chart, /Pontos de inflexão observados/);
  assert.match(chart, /não atribui causa/);
  assert.doesNotMatch(chart, /<table/);
  assert.match(reportDocument, /hasDisplayableLongitudinalHistory/);

  assert.match(css, /data-dimension="funcionalidade"\]\s*\{\s*color:\s*#8b7478/);
  assert.match(css, /data-dimension="locomocao"\]\s*\{\s*color:\s*#9a6a32/);
  assert.match(css, /data-dimension="cognicao"\]\s*\{\s*color:\s*#416f91/);
  assert.match(css, /data-dimension="psicologico"\]\s*\{\s*color:\s*#9b5f79/);
  assert.match(css, /data-dimension="vitalidade"\]\s*\{\s*color:\s*#4f8060/);
  assert.match(css, /data-dimension="sensorial"\]\s*\{\s*color:\s*#68647e/);
  assert.match(css, /\.targetGuide/);
  assert.match(css, /\.statusLegend/);
  assert.match(css, /grid-template-columns:\s*190px minmax\(0, 1fr\)/);
});
