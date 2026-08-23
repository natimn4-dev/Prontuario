import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("home mostra pacientes recentes antes da busca manual e preserva busca por nome", () => {
  const home = source("src/app/page.tsx");
  const finder = source("src/components/patients/patient-finder.tsx");
  const service = source("src/server/patients/search-patients.ts");

  assert.match(home, /listRecentPatientsForSelection/);
  assert.match(home, /initialResults=\{recentPatients\}/);
  assert.match(finder, /Pacientes recentes/);
  assert.match(finder, /initialResults/);
  assert.match(finder, /patient\.fullName/);
  assert.match(finder, /\/api\/patients\/search/);
  assert.match(service, /orderBy:[\s\S]*updatedAt:[\s\S]*desc/);
  assert.match(service, /take:\s*PATIENT_SEARCH_LIMIT/);
  assert.doesNotMatch(service, /phone:\s*true/);
  assert.doesNotMatch(service, /identifiers:\s*true/);
});

test("workspace clínico carrega a camada visual aprovada e mantém identidade do paciente visível", () => {
  const layout = source("src/app/layout.tsx");
  const page = source("src/app/consultations/[id]/page.tsx");
  const styles = source("src/app/consultations/[id]/page.module.css");
  const approved = source("src/app/approved-clinical-design.css");

  assert.match(layout, /approved-clinical-design\.css/);
  assert.match(page, /clinicalTopbar/);
  assert.match(page, /Natalia Mendes — Médica Geriatra/);
  assert.match(page, />Paciente</);
  assert.match(page, />Consulta</);
  assert.match(page, />Avaliação</);
  assert.match(page, />Documentos</);
  assert.match(page, /context\.patientName/);
  assert.match(page, /Finalizar consulta/);
  assert.match(styles, /\.clinicalTopbar[\s\S]*position:\s*sticky/);
  assert.match(styles, /\.sidebarColumn[\s\S]*position:\s*sticky/);
  assert.match(approved, /--primary:\s*#5b238f/);
  assert.match(approved, /\.report-workspace/);
});

test("gráfico longitudinal preserva pequenos múltiplos e geometria compacta sem esticar SVG", () => {
  const chart = source("src/components/reports/capacity-dimension-history-chart.tsx");
  const styles = source("src/components/reports/capacity-dimension-history-chart.module.css");

  assert.match(chart, /functionalDimension/);
  assert.match(chart, /intrinsicDimensions/);
  assert.match(chart, /Independência funcional/);
  assert.match(chart, /Capacidade intrínseca/);
  assert.match(chart, /DimensionTimeline/);
  assert.match(chart, /const CHART_HEIGHT = 78/);
  assert.match(chart, /style=\{\{ width: `\$\{timelineWidth\}px` \}\}/);
  assert.match(chart, /height=\{CHART_HEIGHT\}/);
  assert.match(styles, /\.dimensionRow/);
  assert.match(styles, /grid-template-columns:\s*190px minmax\(0, 1fr\)/);
  assert.match(styles, /\.dimensionGroup/);
  assert.match(styles, /overflow-x:\s*auto/);
  assert.doesNotMatch(styles, /\.dateAxis, \.domainChart \{[^}]*width:\s*100%/);
  assert.doesNotMatch(chart, /globalScore|compositeScore|overallScore/);
});

test("gráficos das escalas mantêm tamanho intrínseco e amortecem exagero visual sem inventar corte clínico", () => {
  const chart = source("src/components/reports/scale-history-chart.tsx");
  const styles = source("src/components/reports/scale-history-chart.module.css");

  assert.match(chart, /const HEIGHT = 176/);
  assert.match(chart, /const MIN_WIDTH = 680/);
  assert.match(chart, /function visualScoreRange/);
  assert.match(chart, /const padding = Math\.max\(1, span \* 0\.5\)/);
  assert.match(chart, /height=\{HEIGHT\}/);
  assert.match(styles, /\.chart\s*\{[\s\S]*max-width:\s*none/);
  assert.doesNotMatch(styles, /width:\s*max\(100%,\s*640px\)/);
  assert.doesNotMatch(chart, /clinicalCutoff|cutoff|threshold/);
});

test("tabela de medicações usa hierarquia e checkboxes do design aprovado", () => {
  const table = source("src/components/medications/medication-plan-table.tsx");
  const styles = source("src/components/medications/medication-plan-table.module.css");

  assert.match(table, /Tabela de medicações/);
  assert.match(table, /Lista estruturada dos medicamentos em uso atual/);
  assert.match(table, /patientIdentity/);
  assert.match(styles, /background:\s*#f6f0fa/);
  assert.match(styles, /\.selected[\s\S]*background:\s*#5b238f/);
});
