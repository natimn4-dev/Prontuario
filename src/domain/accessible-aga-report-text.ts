import type { AgaReportModel } from "./aga-report.ts";
import { buildReportDomainSummaries } from "./report-domain-summary.ts";
import { MEDICATION_MOMENT_LABELS, type MedicationMoment } from "./medication-plan.ts";
import {
  alertSeverityLabel,
  consultationStatusLabel,
  problemStatusLabel,
} from "./accessible-report-language.ts";

function list(items: readonly string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Sem dados registrados";
}

export function renderAccessibleAgaReportText(model: AgaReportModel): string {
  const blocks = [
    `RELATÓRIO DA AVALIAÇÃO GERIÁTRICA AMPLA — LONGITUDINAL — ${model.patientName}`,
    `Consulta: ${model.consultationId} · Situação: ${consultationStatusLabel(model.consultationStatus)}`,
    "",
    "RESUMO LONGITUDINAL",
    model.changeSummary.headline,
    list(model.changeSummary.narrative),
  ];

  if (model.draftContext) {
    blocks.push("", "ATENÇÃO: relatório gerado antes da finalização da consulta.");
  }

  if (model.clinicalProblems.length > 0) {
    blocks.push(
      "",
      "PROBLEMAS CLÍNICOS",
      list(model.clinicalProblems.map((problem) => `${problem.title} [${problemStatusLabel(problem.status)}]`)),
    );
  }
  if (model.geriatricProblems.length > 0) {
    blocks.push(
      "",
      "PROBLEMAS GERIÁTRICOS",
      list(model.geriatricProblems.map((problem) => `${problem.title} [${problemStatusLabel(problem.status)}]`)),
    );
  }

  const vaccinationItems = model.vaccinationPrevention.status === "PENDING"
    ? model.vaccinationPrevention.pendingVaccines
    : model.vaccinationPrevention.status === "UNKNOWN"
      ? ["Não foi possível definir pendências porque a carteira de vacinação ainda não foi revisada."]
      : ["Nenhuma vacina pendente foi registrada nesta consulta."];

  blocks.push(
    "",
    "VACINAS E PREVENÇÃO",
    `Situação: ${model.vaccinationPrevention.statusLabel}`,
    "Vacinas pendentes:",
    list(vaccinationItems),
    "Orientação:",
    list(model.vaccinationPrevention.guidance),
    "Esta seção é informativa, não contém prescrição automática e permanece separada da tabela de medicamentos.",
  );

  const domains = buildReportDomainSummaries(model.assessedScales, model.intrinsicCapacity);
  if (domains.length > 0) {
    blocks.push(
      "",
      "RESULTADOS DAS AVALIAÇÕES E ORIENTAÇÕES PARA A FAMÍLIA",
    );
    for (const domain of domains) {
      blocks.push(
        "",
        `${domain.label.toUpperCase()} — ${domain.stateLabel}`,
        list(domain.results.map((result) => `${result.scaleName}: ${result.value}`)),
      );
      if (domain.guidance.length > 0) blocks.push("Orientações:", list(domain.guidance));
    }
  }

  blocks.push(
    "",
    "QUANDO PROCURAR AJUDA MÉDICA IMEDIATA",
    list(model.safetyGuidance.urgent),
    "",
    "QUANDO ENTRAR EM CONTATO COM A EQUIPE",
    list(model.safetyGuidance.contact),
  );

  if (model.alerts.length > 0) {
    blocks.push(
      "",
      "PONTOS DE ATENÇÃO",
      list(model.alerts.map((alert) => `[${alertSeverityLabel(alert.severity)}] ${alert.message}`)),
    );
  }

  blocks.push("", "TABELA FINAL DE MEDICAMENTOS", model.medicationPlan.message);
  if (model.medicationPlan.status === "READY" && model.medicationPlan.plan) {
    if (model.medicationPlan.plan.rows.length === 0) {
      blocks.push("- Nenhum medicamento ativo reconciliado nesta consulta.");
    }
    for (const row of model.medicationPlan.plan.rows) {
      const details = [row.doseInstruction, row.route, row.continuous ? "uso contínuo" : undefined]
        .filter(Boolean)
        .join(" · ");
      blocks.push(
        "",
        `- ${row.medicationText}${details ? ` — ${details}` : ""}`,
        Object.entries(row.moments)
          .map(([moment, selected]) => `${selected ? "[x]" : "[ ]"} ${MEDICATION_MOMENT_LABELS[moment as MedicationMoment]}`)
          .join("  "),
      );
      if (row.instructions) blocks.push(`  ${row.instructions}`);
    }
  }

  return blocks.join("\n");
}
