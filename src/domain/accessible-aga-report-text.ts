import type { AgaReportModel } from "./aga-report.ts";
import type {
  AgaReportClinicalConduct,
  AgaReportGastrostomyCare,
} from "./report-care-sections.ts";
import type {
  AgaAdvanceDirectivesReportSection,
  AgaReportOverview,
} from "./report-overview.ts";
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

const SELF_HARM_OR_VIOLENCE_PATTERN = /suic|autoagress|machucar|ferir|fala\s+(?:sobre|de)\s+morte|ideação|ideacao|risco\s+(?:para|a)\s+(?:outra|outras|terceira|terceiras)\s+pessoa/i;

export function conciseUrgentGuidance(items: readonly string[]): string[] {
  const uniqueItems = [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  if (uniqueItems.length === 0) return [];

  const concise = [
    "Procure atendimento imediatamente se houver uma piora súbita importante — por exemplo, falta de ar intensa, dor forte no peito, desmaio, novo sintoma neurológico, sangramento importante, trauma relevante ou uma mudança rápida que faça a pessoa parecer gravemente doente ou muito diferente do habitual.",
  ];

  if (uniqueItems.some((item) => SELF_HARM_OR_VIOLENCE_PATTERN.test(item))) {
    concise.push(
      "Se houver fala sobre morte, intenção de se machucar ou risco para alguém, permaneça com a pessoa e procure ajuda imediatamente.",
    );
  }

  return concise;
}

type AccessibleAgaReportModel = AgaReportModel & {
  overview?: AgaReportOverview;
  advanceDirectives?: AgaAdvanceDirectivesReportSection;
  clinicalConducts?: AgaReportClinicalConduct[];
  gastrostomyCare?: AgaReportGastrostomyCare;
};

function overviewBlocks(overview: AgaReportOverview): string[] {
  const items: string[] = [];
  if (overview.ageYears !== undefined) items.push(`Idade: ${overview.ageYears} anos`);
  if (overview.cognition) {
    items.push(`Cognição — ${overview.cognition.label}: ${overview.cognition.value}`);
  }
  if (overview.functionality.length > 0) {
    items.push(...overview.functionality.map((item) => `Funcionalidade — ${item.label}: ${item.value}`));
  }
  if (overview.device) items.push(`Dispositivo: ${overview.device.label}`);
  if (overview.advanceDirectives) items.push(`Diretivas antecipadas: ${overview.advanceDirectives.label}`);
  return items.length > 0 ? ["", "VISÃO GERAL", list(items)] : [];
}

function advanceDirectiveBlocks(section: AgaAdvanceDirectivesReportSection): string[] {
  const blocks = [
    "",
    "DIRETIVAS ANTECIPADAS",
    "Este registro resume valores, prioridades e preferências conversadas para orientar decisões compartilhadas se, no futuro, a pessoa estiver mais doente ou tiver dificuldade para expressar suas escolhas.",
    "As preferências devem ser interpretadas à luz da situação clínica de cada momento e podem ser revistas sempre que a pessoa desejar ou quando houver mudança importante de saúde, funcionalidade ou objetivos de cuidado.",
    `Registro de referência: ${section.sourceConsultationDate.slice(0, 10)} · versão ${section.version}`,
  ];
  if (section.participation) blocks.push("", "Participação na conversa", section.participation);
  if (section.whatMatters) blocks.push("", "O que é importante para a pessoa", section.whatMatters);
  if (section.dignityAndComfort) blocks.push("", "Conforto, dignidade e sentido", section.dignityAndComfort);
  if (section.priorities.length > 0) blocks.push("", "Prioridades registradas", list(section.priorities));
  if (section.topics.length > 0) {
    blocks.push(
      "",
      "Preferências discutidas",
      list(section.topics.map((topic) => `${topic.title}: ${topic.status}${topic.note ? ` — ${topic.note}` : ""}`)),
    );
  }
  if (section.trustedPerson) {
    blocks.push(
      "",
      "Pessoa de confiança",
      `${section.trustedPerson.name}${section.trustedPerson.relation ? ` — ${section.trustedPerson.relation}` : ""}`,
    );
  }
  if (section.documentStatus) blocks.push("", "Documento prévio", section.documentStatus);
  blocks.push("", "Revisão", section.reviewTrigger);
  if (section.history.length > 1) {
    blocks.push(
      "",
      "Histórico",
      list(section.history.map((item) => `${item.consultationDate.slice(0, 10)} — versão ${item.version}`)),
    );
  }
  return blocks;
}

export function renderAccessibleAgaReportText(model: AccessibleAgaReportModel): string {
  const blocks = [
    `RELATÓRIO DA AVALIAÇÃO GERIÁTRICA AMPLA — LONGITUDINAL — ${model.patientName}`,
    `Consulta: ${model.consultationId} · Situação: ${consultationStatusLabel(model.consultationStatus)}`,
  ];

  if (model.overview) {
    blocks.push(...overviewBlocks(model.overview));
  } else {
    blocks.push(
      "",
      "RESUMO LONGITUDINAL",
      model.changeSummary.headline,
      list(model.changeSummary.narrative),
    );
  }

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

  if ((model.clinicalConducts?.length ?? 0) > 0) {
    blocks.push("", "CONDUTAS CLÍNICAS", "Condutas registradas pelo médico nesta consulta:");
    for (const conduct of model.clinicalConducts ?? []) {
      blocks.push("", conduct.problemTitle, list(conduct.actions));
    }
  }

  if (model.gastrostomyCare) {
    blocks.push(
      "",
      "CUIDADOS COM GASTROSTOMIA",
      "Cuidados práticos:",
      list([...model.gastrostomyCare.practicalActions, ...model.gastrostomyCare.caregiverActions]),
      "Quando entrar em contato com a equipe:",
      list(model.gastrostomyCare.contactGuidance),
    );
  }

  if (model.swallowingSupportCare) {
    blocks.push(
      "",
      "DEGLUTIÇÃO E FORMA DE ALIMENTAÇÃO",
      "Orientações baseadas nas opções registradas nesta consulta; confirme que continuam de acordo com o plano atual da equipe.",
      "Cuidados práticos:",
      list([...model.swallowingSupportCare.practicalActions, ...model.swallowingSupportCare.caregiverActions]),
      "Quando conversar com a equipe:",
      list(model.swallowingSupportCare.contactGuidance),
    );
  }

  if (model.advanceDirectives) {
    blocks.push(...advanceDirectiveBlocks(model.advanceDirectives));
  }

  blocks.push(
    "",
    "QUANDO PROCURAR AJUDA MÉDICA IMEDIATA",
    list(conciseUrgentGuidance(model.safetyGuidance.urgent)),
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
