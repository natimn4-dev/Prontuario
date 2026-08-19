import type { AgaReportModel } from "./aga-report.ts";

export type ChangeSummaryDashboardTone =
  | "unfavorable"
  | "favorable"
  | "stable"
  | "warning"
  | "neutral";

export interface ChangeSummaryDashboardCard {
  key:
    | "unfavorable"
    | "favorable"
    | "stable"
    | "notComparable"
    | "insufficientData"
    | "urgentAlerts";
  label: string;
  value: number;
  tone: ChangeSummaryDashboardTone;
  explanation: string;
}

export function buildChangeSummaryDashboard(
  changeSummary: AgaReportModel["changeSummary"],
): ChangeSummaryDashboardCard[] {
  const { counts } = changeSummary;

  return [
    {
      key: "unfavorable",
      label: "Tendências desfavoráveis",
      value: counts.unfavorable,
      tone: "unfavorable",
      explanation: "Avaliações com tendência desfavorável já calculada pelo domínio longitudinal.",
    },
    {
      key: "favorable",
      label: "Tendências favoráveis",
      value: counts.favorable,
      tone: "favorable",
      explanation: "Avaliações com tendência favorável já calculada pelo domínio longitudinal.",
    },
    {
      key: "stable",
      label: "Estáveis",
      value: counts.stable,
      tone: "stable",
      explanation: "Avaliações classificadas como estáveis pelo domínio longitudinal.",
    },
    {
      key: "notComparable",
      label: "Não comparáveis",
      value: counts.notComparable,
      tone: "neutral",
      explanation: "Comparações que não devem ser interpretadas como melhora, piora ou estabilidade.",
    },
    {
      key: "insufficientData",
      label: "Dados insuficientes",
      value: counts.insufficientData,
      tone: "neutral",
      explanation: "Avaliações sem dados suficientes para classificar uma tendência longitudinal.",
    },
    {
      key: "urgentAlerts",
      label: "Alertas urgentes",
      value: counts.urgentAlerts,
      tone: "warning",
      explanation: "Alertas urgentes já produzidos pelas regras clínicas existentes e sujeitos à revisão médica.",
    },
  ];
}
