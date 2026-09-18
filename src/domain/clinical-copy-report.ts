import type { ClinicalExamHistoryItem } from "./consultation-exams.ts";
import { problemStatusLabel } from "./accessible-report-language.ts";
import type { ProblemStatus, ProblemType } from "./problems.ts";

export interface CompletedScaleResult {
  scaleCode: string;
  scaleName: string;
  scoreText?: string;
  scoreNumeric?: number | null;
  classification?: string;
  interpretation?: string;
  appliedAt: string;
}

export interface CopyProblem {
  type: ProblemType;
  status: ProblemStatus;
  title: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function resultValue(result: CompletedScaleResult): string | undefined {
  const scoreText = result.scoreText?.trim();
  if (scoreText) return scoreText;
  return result.scoreNumeric === null || result.scoreNumeric === undefined
    ? undefined
    : String(result.scoreNumeric);
}

export function completedScaleResultLines(results: readonly CompletedScaleResult[]): string[] {
  return results.flatMap((result) => {
    const score = resultValue(result);
    const classification = result.classification?.trim();
    const interpretation = result.interpretation?.trim();
    if (!score && !classification && !interpretation) return [];
    const details = [score, classification, interpretation]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
    return [`- ${result.scaleName}: ${details.join(" — ")}`];
  });
}

export function renderClinicalExamsText(input: {
  current: string;
  history: readonly ClinicalExamHistoryItem[];
}): string {
  const blocks: string[] = [];
  const current = input.current.trim();
  if (current) blocks.push("EXAMES DESTA CONSULTA", current);
  for (const item of input.history) {
    const content = item.content.trim();
    if (content) blocks.push(`EXAMES ANTERIORES — ${formatDate(item.consultationOccurredAt)}`, content);
  }
  return blocks.join("\n\n");
}

export function renderCompletedScalesText(results: readonly CompletedScaleResult[]): string {
  const lines = completedScaleResultLines(results);
  return lines.length > 0 ? ["RESULTADOS DAS ESCALAS PREENCHIDAS NESTA CONSULTA", ...lines].join("\n") : "";
}

function renderProblemGroup(title: string, problems: readonly CopyProblem[]): string {
  const lines = problems.length > 0
    ? problems.map((problem) => `- ${problem.title.trim() || "sem dados registrados"} — ${problemStatusLabel(problem.status)}`)
    : ["- sem dados registrados"];
  return [title, ...lines].join("\n");
}

export function renderProblemsText(problems: readonly CopyProblem[]): string {
  return [
    "LISTA DE PROBLEMAS",
    renderProblemGroup("PROBLEMAS CLÍNICOS", problems.filter((problem) => problem.type === "CLINICAL")),
    renderProblemGroup("PROBLEMAS GERIÁTRICOS", problems.filter((problem) => problem.type === "GERIATRIC")),
  ].join("\n\n");
}

export function renderSoapExamsScalesReport(input: {
  soap: string;
  problems: readonly CopyProblem[];
  currentExams: string;
  examHistory: readonly ClinicalExamHistoryItem[];
  scaleResults: readonly CompletedScaleResult[];
}): string {
  return [
    input.soap.trim(),
    renderProblemsText(input.problems),
    renderClinicalExamsText({ current: input.currentExams, history: input.examHistory }),
    renderCompletedScalesText(input.scaleResults),
  ].filter(Boolean).join("\n\n");
}
