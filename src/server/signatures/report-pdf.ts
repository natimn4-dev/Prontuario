import type { AgaReportModel } from "@/domain/aga-report";
import {
  hasDisplayableLongitudinalHistory,
  type CapacityDimensionHistory,
  type CapacityDimensionStatus,
} from "@/domain/capacity-dimension-history";
import type { ProfessionalIdentity } from "@/domain/professional-identity";
import {
  buildReportDomainSummaries,
  type ReportDomainState,
  type ReportDomainSummary,
} from "@/domain/report-domain-summary";
import type {
  AgaReportClinicalConduct,
  AgaReportGastrostomyCare,
} from "@/domain/report-care-sections";
import type { AgaReportOverview } from "@/domain/report-overview";
import { createValidationQrMatrix } from "./validation-qr";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 36;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const TOP = 806;
const BODY_BOTTOM = 48;

const FONT_BODY = "F1";
const FONT_BOLD = "F2";

const COLORS = Object.freeze({
  primary: "#5f2a91",
  primaryStrong: "#48206f",
  primarySoft: "#f4eefb",
  primarySoftStrong: "#eadcf8",
  ink: "#272331",
  muted: "#6f6879",
  line: "#e7e1ec",
  surface: "#ffffff",
  success: "#178b62",
  successSoft: "#f3fbf7",
  warning: "#c56a12",
  warningSoft: "#fff9f2",
  info: "#2869cf",
  infoSoft: "#f4f8ff",
  danger: "#7c3440",
  dangerSoft: "#faecee",
});

const WIN_ANSI: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91,
  "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98,
  "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

type FontName = typeof FONT_BODY | typeof FONT_BOLD;
type PdfPage = { commands: string[] };

type StyledCard = {
  title: string;
  items?: readonly string[];
  paragraphs?: readonly string[];
  fill?: string;
  border?: string;
  titleColor?: string;
};

export type AgaSignedReportModel = AgaReportModel & {
  capacityHistory: CapacityDimensionHistory;
  overview: AgaReportOverview;
  clinicalConducts?: AgaReportClinicalConduct[];
  gastrostomyCare?: AgaReportGastrostomyCare;
};

function winAnsiCode(character: string): number {
  const mapped = WIN_ANSI[character];
  if (mapped !== undefined) return mapped;
  const code = character.codePointAt(0) ?? 0x3f;
  if (code >= 0x20 && code <= 0xff) return code;
  return 0x3f;
}

function pdfLiteral(value: string): string {
  let output = "";
  for (const character of value) {
    const code = winAnsiCode(character);
    if (code === 0x28 || code === 0x29 || code === 0x5c) output += `\\${String.fromCharCode(code)}`;
    else if (code < 0x20 || code > 0x7e) output += `\\${code.toString(8).padStart(3, "0")}`;
    else output += String.fromCharCode(code);
  }
  return `(${output})`;
}

function rgb(hex: string): string {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = ((value >> 16) & 0xff) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function charWidthFactor(character: string, bold: boolean): number {
  if (character === " ") return 0.28;
  if (/[ilI1.,:;'`!|]/.test(character)) return 0.27;
  if (/[mwMW@%&]/.test(character)) return bold ? 0.85 : 0.8;
  if (/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(character)) return bold ? 0.64 : 0.6;
  if (/[0-9]/.test(character)) return 0.54;
  return bold ? 0.54 : 0.5;
}

function approximateWidth(text: string, fontSize: number, bold = false): number {
  let total = 0;
  for (const character of text) total += charWidthFactor(character, bold);
  return total * fontSize;
}

function wrapText(text: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushOversizedWord = (word: string) => {
    let chunk = "";
    for (const character of word) {
      if (!chunk || approximateWidth(chunk + character, fontSize, bold) <= maxWidth) chunk += character;
      else {
        lines.push(chunk);
        chunk = character;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (approximateWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = approximateWidth(word, fontSize, bold) <= maxWidth ? word : pushOversizedWord(word);
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(value?: string | Date): string {
  if (!value) return "Data não registrada";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data não registrada";
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function formatShortDate(value?: string | Date): string {
  if (!value) return "--/--/--";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "--/--/--";
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCFullYear()).slice(-2)}`;
}

function statusLabel(status: AgaReportModel["clinicalProblems"][number]["status"]): string {
  if (status === "STABLE") return "Estável";
  if (status === "MONITORING") return "Em acompanhamento";
  if (status === "RESOLVED") return "Resolvido";
  return "Ativo";
}

function scaleOverviewText(item: AgaReportOverview["functionality"][number]): string {
  return `${item.value}${item.assessedInTargetConsultation ? "" : ` · último registro em ${formatDate(item.sourceDate)}`}`;
}

function overviewItems(overview: AgaReportOverview): string[] {
  const items: string[] = [];
  if (overview.ageYears !== undefined) items.push(`Idade: ${overview.ageYears} anos`);
  if (overview.cognition) items.push(`Cognição - ${overview.cognition.label}: ${scaleOverviewText(overview.cognition)}`);
  for (const [index, item] of overview.functionality.entries()) {
    items.push(`${index === 0 ? `Funcionalidade - ${item.label}` : item.label}: ${scaleOverviewText(item)}`);
  }
  if (overview.device) items.push(`Dispositivo: ${overview.device.label}`);
  if (overview.advanceDirectives) items.push(`Diretivas antecipadas: ${overview.advanceDirectives.label}`);
  return items;
}

function qrCommands(payload: string, x: number, y: number, size: number): string {
  const matrix = createValidationQrMatrix(payload);
  const quiet = 4;
  const total = matrix.length + quiet * 2;
  const module = size / total;
  const commands = [
    `${rgb(COLORS.surface)} rg`,
    `${x.toFixed(2)} ${y.toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)} re f`,
    "0 0 0 rg",
  ];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      if (!matrix[row][column]) continue;
      const rectX = x + (column + quiet) * module;
      const rectY = y + (matrix.length - row - 1 + quiet) * module;
      commands.push(`${rectX.toFixed(2)} ${rectY.toFixed(2)} ${module.toFixed(2)} ${module.toFixed(2)} re f`);
    }
  }
  return commands.join("\n");
}

class StyledPdfBuilder {
  private readonly pages: PdfPage[] = [];
  private y = TOP;

  constructor(
    private readonly identity: ProfessionalIdentity,
    private readonly patientName: string,
    private readonly snapshotVersion: number,
  ) {
    this.addPage(false);
  }

  private get page(): PdfPage {
    return this.pages[this.pages.length - 1]!;
  }

  private addPage(runningHeader: boolean): void {
    this.pages.push({ commands: [] });
    this.y = TOP;
    if (runningHeader) {
      this.text(this.patientName, MARGIN, 812, 8.2, FONT_BOLD, COLORS.primaryStrong);
      const title = "Relatório de Avaliação Geriátrica";
      const titleWidth = approximateWidth(title, 8.2, false);
      this.text(title, A4_WIDTH - MARGIN - titleWidth, 812, 8.2, FONT_BODY, COLORS.muted);
      this.line(MARGIN, 802, A4_WIDTH - MARGIN, 802, COLORS.line, 0.8);
      this.y = 787;
    }
  }

  private ensureSpace(height: number): void {
    if (this.y - height >= BODY_BOTTOM) return;
    this.addPage(true);
  }

  private text(value: string, x: number, y: number, size: number, font: FontName, color: string): void {
    this.page.commands.push(
      `${rgb(color)} rg BT /${font} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfLiteral(value)} Tj ET`,
    );
  }

  private line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1): void {
    this.page.commands.push(`${rgb(color)} RG ${width.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  }

  private fillRect(x: number, y: number, width: number, height: number, color: string): void {
    this.page.commands.push(`${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
  }

  private strokeRect(x: number, y: number, width: number, height: number, color: string, lineWidth = 0.8): void {
    this.page.commands.push(`${rgb(color)} RG ${lineWidth.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`);
  }

  private wrappedLines(value: string, width: number, size: number, bold = false): string[] {
    return wrapText(value, width, size, bold);
  }

  private drawWrappedAt(
    value: string,
    x: number,
    top: number,
    width: number,
    size: number,
    lineHeight: number,
    font: FontName = FONT_BODY,
    color = COLORS.ink,
  ): number {
    const lines = this.wrappedLines(value, width, size, font === FONT_BOLD);
    let baseline = top - size;
    for (const line of lines) {
      this.text(line, x, baseline, size, font, color);
      baseline -= lineHeight;
    }
    return lines.length * lineHeight;
  }

  private measureParagraphs(paragraphs: readonly string[] | undefined, width: number, size: number, lineHeight: number): number {
    if (!paragraphs?.length) return 0;
    return paragraphs.reduce((height, paragraph) => height + this.wrappedLines(paragraph, width, size).length * lineHeight + 3, 0);
  }

  private measureBullets(items: readonly string[] | undefined, width: number, size: number, lineHeight: number): number {
    if (!items?.length) return 0;
    return items.reduce((height, item) => height + this.wrappedLines(item, width - 12, size).length * lineHeight + 2, 0);
  }

  private drawBulletsAt(
    items: readonly string[],
    x: number,
    top: number,
    width: number,
    size = 8.2,
    lineHeight = 10.5,
    color = COLORS.ink,
  ): number {
    let cursor = top;
    for (const item of items) {
      const lines = this.wrappedLines(item, width - 12, size);
      this.text("-", x, cursor - size, size, FONT_BOLD, color);
      let baseline = cursor - size;
      for (const line of lines) {
        this.text(line, x + 10, baseline, size, FONT_BODY, color);
        baseline -= lineHeight;
      }
      cursor -= lines.length * lineHeight + 2;
    }
    return top - cursor;
  }

  private cardHeight(card: StyledCard, width: number): number {
    const inner = width - 18;
    const titleHeight = this.wrappedLines(card.title, inner, 9.1, true).length * 11.2;
    return 16 + titleHeight
      + this.measureParagraphs(card.paragraphs, inner, 8.2, 10.5)
      + this.measureBullets(card.items, inner, 8.2, 10.5)
      + 8;
  }

  private drawCardAt(card: StyledCard, x: number, top: number, width: number, forcedHeight?: number): number {
    const height = forcedHeight ?? this.cardHeight(card, width);
    const bottom = top - height;
    this.fillRect(x, bottom, width, height, card.fill ?? COLORS.surface);
    this.strokeRect(x, bottom, width, height, card.border ?? COLORS.line);
    let cursor = top - 10;
    const titleLines = this.wrappedLines(card.title, width - 18, 9.1, true);
    for (const line of titleLines) {
      this.text(line, x + 9, cursor - 9.1, 9.1, FONT_BOLD, card.titleColor ?? COLORS.primaryStrong);
      cursor -= 11.2;
    }
    cursor -= 2;
    for (const paragraph of card.paragraphs ?? []) {
      cursor -= this.drawWrappedAt(paragraph, x + 9, cursor, width - 18, 8.2, 10.5, FONT_BODY, COLORS.ink) + 3;
    }
    if (card.items?.length) this.drawBulletsAt(card.items, x + 9, cursor, width - 18, 8.2, 10.5, COLORS.ink);
    return height;
  }

  private drawTwoCards(left: StyledCard, right: StyledCard): void {
    const gap = 10;
    const width = (CONTENT_WIDTH - gap) / 2;
    const height = Math.max(this.cardHeight(left, width), this.cardHeight(right, width));
    this.ensureSpace(height + 8);
    this.drawCardAt(left, MARGIN, this.y, width, height);
    this.drawCardAt(right, MARGIN + width + gap, this.y, width, height);
    this.y -= height + 10;
  }

  private sectionHeading(label: string, title: string, lead?: string): void {
    const titleLines = this.wrappedLines(title, CONTENT_WIDTH - 44, 11.2, true);
    const leadHeight = lead ? this.wrappedLines(lead, CONTENT_WIDTH, 7.8).length * 9.6 + 4 : 0;
    const height = Math.max(22, titleLines.length * 13) + leadHeight + 8;
    this.ensureSpace(height);
    this.line(MARGIN, this.y, A4_WIDTH - MARGIN, this.y, COLORS.line, 0.8);
    this.y -= 10;
    const badgeWidth = Math.max(22, approximateWidth(label, 7.4, true) + 10);
    this.fillRect(MARGIN, this.y - 15, badgeWidth, 15, COLORS.primarySoft);
    this.text(label, MARGIN + 5, this.y - 11, 7.4, FONT_BOLD, COLORS.primaryStrong);
    let titleBaseline = this.y - 10.8;
    for (const line of titleLines) {
      this.text(line, MARGIN + badgeWidth + 8, titleBaseline, 11.2, FONT_BOLD, COLORS.primaryStrong);
      titleBaseline -= 13;
    }
    this.y -= Math.max(22, titleLines.length * 13);
    if (lead) {
      this.y -= 2;
      const lines = this.wrappedLines(lead, CONTENT_WIDTH, 7.8);
      for (const line of lines) {
        this.text(line, MARGIN, this.y - 7.8, 7.8, FONT_BODY, COLORS.muted);
        this.y -= 9.6;
      }
    }
    this.y -= 6;
  }

  drawFirstPageHeader(report: AgaSignedReportModel): void {
    const targetDate = report.capacityHistory.consultations.find((item) => item.isTarget)?.occurredAt;
    const headerHeight = 84;
    this.ensureSpace(headerHeight);

    this.fillRect(MARGIN, this.y - 56, 4, 56, COLORS.primary);
    this.text(this.identity.displayName, MARGIN + 11, this.y - 14, 9.3, FONT_BOLD, COLORS.primaryStrong);
    this.text(this.identity.roleLabel, MARGIN + 11, this.y - 27, 7.5, FONT_BODY, COLORS.muted);
    if (this.identity.registrationLine) this.text(this.identity.registrationLine, MARGIN + 11, this.y - 39, 7.2, FONT_BODY, COLORS.muted);

    const centerX = MARGIN + 174;
    this.text("AVALIAÇÃO GERIÁTRICA AMPLA", centerX, this.y - 11, 7.2, FONT_BOLD, COLORS.primary);
    this.text("Relatório de Avaliação Geriátrica", centerX, this.y - 30, 14.2, FONT_BOLD, COLORS.primaryStrong);
    this.text("Informações para paciente, família e cuidadores", centerX, this.y - 44, 7.6, FONT_BODY, COLORS.muted);

    const boxX = A4_WIDTH - MARGIN - 137;
    const boxWidth = 137;
    this.fillRect(boxX, this.y - 28, boxWidth, 28, "#fbfafd");
    this.strokeRect(boxX, this.y - 28, boxWidth, 28, COLORS.line);
    this.text("Paciente", boxX + 7, this.y - 9, 6.5, FONT_BOLD, COLORS.muted);
    const patientLines = this.wrappedLines(report.patientName, boxWidth - 14, 7.4, true).slice(0, 2);
    patientLines.forEach((line, index) => this.text(line, boxX + 7, this.y - 19 - index * 8.5, 7.4, FONT_BOLD, COLORS.ink));

    this.fillRect(boxX, this.y - 59, boxWidth, 25, "#fbfafd");
    this.strokeRect(boxX, this.y - 59, boxWidth, 25, COLORS.line);
    this.text("Data da consulta", boxX + 7, this.y - 43, 6.5, FONT_BOLD, COLORS.muted);
    this.text(formatDate(targetDate), boxX + 7, this.y - 54, 7.4, FONT_BOLD, COLORS.ink);

    this.y -= headerHeight;
    if (report.draftContext) {
      const warning = "Consulta ainda não finalizada.";
      this.ensureSpace(28);
      this.fillRect(MARGIN, this.y - 22, CONTENT_WIDTH, 22, "#fff7df");
      this.text(warning, MARGIN + 8, this.y - 15, 8.2, FONT_BOLD, "#7b4a06");
      this.y -= 30;
    }
  }

  drawIntro(): void {
    const text = "Este relatório reúne os principais achados da Avaliação Geriátrica Ampla para facilitar o cuidado no dia a dia e a continuidade do acompanhamento. Ele não substitui uma avaliação médica individual.";
    const lines = this.wrappedLines(text, CONTENT_WIDTH - 16, 8.1);
    const height = lines.length * 10.4 + 14;
    this.ensureSpace(height + 4);
    this.fillRect(MARGIN, this.y - height, CONTENT_WIDTH, height, "#fcfaff");
    this.strokeRect(MARGIN, this.y - height, CONTENT_WIDTH, height, COLORS.primarySoftStrong);
    let baseline = this.y - 10;
    for (const line of lines) {
      this.text(line, MARGIN + 8, baseline - 8.1, 8.1, FONT_BODY, COLORS.ink);
      baseline -= 10.4;
    }
    this.y -= height + 10;
  }

  drawExecutive(report: AgaSignedReportModel): void {
    const attention = report.alerts.slice(0, 5).map((item) => item.message);
    const overview: StyledCard = {
      title: "Visão geral",
      items: overviewItems(report.overview),
      fill: COLORS.successSoft,
      border: "#d7eee3",
      titleColor: COLORS.success,
    };
    if (attention.length === 0) {
      const height = this.cardHeight(overview, CONTENT_WIDTH);
      this.ensureSpace(height + 8);
      this.drawCardAt(overview, MARGIN, this.y, CONTENT_WIDTH, height);
      this.y -= height + 10;
      return;
    }
    this.drawTwoCards(overview, {
      title: "Pontos de atenção",
      items: attention,
      fill: COLORS.warningSoft,
      border: "#f1dfc7",
      titleColor: COLORS.warning,
    });
  }

  drawProblems(report: AgaSignedReportModel): void {
    if (report.clinicalProblems.length === 0 && report.geriatricProblems.length === 0) return;
    this.sectionHeading("1", "Problemas em acompanhamento");
    const clinical: StyledCard = {
      title: "Problemas clínicos",
      items: report.clinicalProblems.map((problem) => `${problem.title}${problem.status === "ACTIVE" ? "" : ` · ${statusLabel(problem.status)}`}`),
    };
    const geriatric: StyledCard = {
      title: "Problemas geriátricos",
      items: report.geriatricProblems.map((problem) => `${problem.title}${problem.status === "ACTIVE" ? "" : ` · ${statusLabel(problem.status)}`}`),
    };
    if (report.clinicalProblems.length > 0 && report.geriatricProblems.length > 0) this.drawTwoCards(clinical, geriatric);
    else {
      const only = report.clinicalProblems.length > 0 ? clinical : geriatric;
      const height = this.cardHeight(only, CONTENT_WIDTH);
      this.ensureSpace(height + 6);
      this.drawCardAt(only, MARGIN, this.y, CONTENT_WIDTH, height);
      this.y -= height + 10;
    }
  }

  private domainStateColors(state: ReportDomainState): { fill: string; text: string; border: string } {
    if (state === "altered") return { fill: COLORS.dangerSoft, text: COLORS.danger, border: "#e4bcc3" };
    if (state === "attention") return { fill: "#fff7e8", text: "#775917", border: "#ead29d" };
    if (state === "preserved") return { fill: "#edf7f1", text: "#2f6245", border: "#b7d8c3" };
    return { fill: COLORS.surface, text: COLORS.muted, border: COLORS.line };
  }

  private domainRowHeight(domain: ReportDomainSummary, widths: readonly number[]): number {
    const size = 7.3;
    const lineHeight = 9.3;
    const labelLines = this.wrappedLines(domain.label, widths[0] - 12, size, true).length;
    const resultText = [domain.stateLabel, ...domain.results.map((result) => `${result.scaleName}: ${result.value}`)];
    const resultLines = resultText.reduce((count, text) => count + this.wrappedLines(text, widths[1] - 12, size, text === domain.stateLabel).length, 0);
    const guidanceLines = domain.guidance.reduce((count, text) => count + this.wrappedLines(text, widths[2] - 18, size).length, 0);
    return Math.max(labelLines, resultLines, guidanceLines) * lineHeight + 18;
  }

  private drawDomainTableHeader(widths: readonly number[]): void {
    const height = 24;
    this.ensureSpace(height + 2);
    let x = MARGIN;
    const labels = ["DOMÍNIO", "RESULTADO NESTA CONSULTA", "ORIENTAÇÕES PERTINENTES"];
    for (let index = 0; index < widths.length; index += 1) {
      this.fillRect(x, this.y - height, widths[index]!, height, COLORS.primarySoft);
      this.strokeRect(x, this.y - height, widths[index]!, height, COLORS.line);
      const lines = this.wrappedLines(labels[index]!, widths[index]! - 10, 6.5, true);
      lines.slice(0, 2).forEach((line, lineIndex) => this.text(line, x + 5, this.y - 9 - lineIndex * 7.2, 6.5, FONT_BOLD, COLORS.primaryStrong));
      x += widths[index]!;
    }
    this.y -= height;
  }

  drawDomains(report: AgaSignedReportModel): void {
    const domains = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity);
    if (domains.length === 0) return;
    this.sectionHeading(
      "2",
      "Resultados das avaliações",
      "Resumo por área avaliada, com foco no que o resultado significa para o dia a dia e nas orientações de cuidado. Os detalhes técnicos permanecem no prontuário.",
    );
    const widths = [94, 127, CONTENT_WIDTH - 221] as const;
    this.drawDomainTableHeader(widths);

    for (const domain of domains) {
      const rowHeight = this.domainRowHeight(domain, widths);
      if (this.y - rowHeight < BODY_BOTTOM) {
        this.addPage(true);
        this.drawDomainTableHeader(widths);
      }
      const top = this.y;
      const bottom = top - rowHeight;
      let x = MARGIN;
      this.fillRect(x, bottom, widths[0], rowHeight, "#fbf9fd");
      this.strokeRect(x, bottom, widths[0], rowHeight, COLORS.line);
      let cursor = top - 9;
      for (const line of this.wrappedLines(domain.label, widths[0] - 12, 7.3, true)) {
        this.text(line, x + 6, cursor - 7.3, 7.3, FONT_BOLD, COLORS.primaryStrong);
        cursor -= 9.3;
      }
      x += widths[0];

      this.fillRect(x, bottom, widths[1], rowHeight, COLORS.surface);
      this.strokeRect(x, bottom, widths[1], rowHeight, COLORS.line);
      cursor = top - 8;
      const state = this.domainStateColors(domain.state);
      const stateLines = this.wrappedLines(domain.stateLabel, widths[1] - 12, 7.0, true);
      const stateHeight = stateLines.length * 8.8 + 6;
      this.fillRect(x + 5, cursor - stateHeight + 2, widths[1] - 10, stateHeight, state.fill);
      this.strokeRect(x + 5, cursor - stateHeight + 2, widths[1] - 10, stateHeight, state.border, 0.6);
      let stateBaseline = cursor - 6.9;
      for (const line of stateLines) {
        this.text(line, x + 8, stateBaseline, 7.0, FONT_BOLD, state.text);
        stateBaseline -= 8.8;
      }
      cursor -= stateHeight + 4;
      for (const result of domain.results) {
        const value = `${result.scaleName}: ${result.value}`;
        const lines = this.wrappedLines(value, widths[1] - 12, 7.1);
        this.text("-", x + 6, cursor - 7.1, 7.1, FONT_BOLD, COLORS.ink);
        let baseline = cursor - 7.1;
        for (const line of lines) {
          this.text(line, x + 15, baseline, 7.1, FONT_BODY, COLORS.ink);
          baseline -= 9.0;
        }
        cursor -= lines.length * 9.0 + 2;
      }
      x += widths[1];

      this.fillRect(x, bottom, widths[2], rowHeight, COLORS.surface);
      this.strokeRect(x, bottom, widths[2], rowHeight, COLORS.line);
      this.drawBulletsAt(domain.guidance, x + 6, top - 8, widths[2] - 12, 7.1, 9.0, COLORS.ink);
      this.y = bottom;
    }
    this.y -= 10;
  }

  private statusY(status: CapacityDimensionStatus, top: number): number {
    if (status === "preserved") return top - 10;
    if (status === "altered") return top - 36;
    return top - 23;
  }

  private statusColor(status: CapacityDimensionStatus): string {
    if (status === "preserved") return COLORS.success;
    if (status === "attention") return COLORS.warning;
    if (status === "altered") return COLORS.danger;
    if (status === "indeterminate") return COLORS.primary;
    return COLORS.muted;
  }

  drawCapacityChart(history: CapacityDimensionHistory): void {
    if (!hasDisplayableLongitudinalHistory(history)) return;
    this.sectionHeading(
      "3",
      "Evolução da capacidade e da independência funcional",
      "O gráfico mostra a evolução de cada área ao longo das consultas. A linha só continua quando instrumento e versão são comparáveis.",
    );
    const rowHeight = 50;
    const titleHeight = 42;
    const figureHeight = titleHeight + history.dimensions.length * rowHeight + 18;
    this.ensureSpace(figureHeight);
    const figureTop = this.y;
    this.fillRect(MARGIN, figureTop - figureHeight, CONTENT_WIDTH, figureHeight, "#fcfbfd");
    this.strokeRect(MARGIN, figureTop - figureHeight, CONTENT_WIDTH, figureHeight, COLORS.line);
    this.text("Evolução da capacidade intrínseca e da independência funcional", MARGIN + 8, figureTop - 13, 8.4, FONT_BOLD, COLORS.primaryStrong);
    this.text(`Metodologia: ${history.methodologyVersion}`, MARGIN + 8, figureTop - 26, 6.7, FONT_BODY, COLORS.muted);

    const labelWidth = 134;
    const chartX = MARGIN + labelWidth + 10;
    const chartWidth = CONTENT_WIDTH - labelWidth - 18;
    const consultations = history.consultations;
    const times = consultations.map((item) => new Date(item.occurredAt).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const span = maxTime - minTime;
    const xFor = (consultationId: string): number => {
      const index = consultations.findIndex((item) => item.id === consultationId);
      if (index < 0) return chartX + chartWidth / 2;
      if (span <= 0) return chartX + chartWidth / 2;
      const current = new Date(consultations[index]!.occurredAt).getTime();
      return chartX + 12 + (chartWidth - 24) * ((current - minTime) / span);
    };

    let cursorTop = figureTop - titleHeight;
    for (const dimension of history.dimensions) {
      if (cursorTop - rowHeight < BODY_BOTTOM) {
        this.y = cursorTop;
        this.addPage(true);
        cursorTop = this.y;
      }
      this.fillRect(MARGIN + 1, cursorTop - rowHeight + 1, labelWidth - 2, rowHeight - 2, "#fbf9fd");
      const labelLines = this.wrappedLines(dimension.label, labelWidth - 14, 7.4, true);
      labelLines.slice(0, 2).forEach((line, index) => this.text(line, MARGIN + 7, cursorTop - 13 - index * 9, 7.4, FONT_BOLD, COLORS.primaryStrong));
      const latest = dimension.cells.at(-1)?.status ?? "not-assessed";
      this.text(
        latest === "preserved" ? "Sem redução" : latest === "attention" ? "Atenção" : latest === "altered" ? "Redução" : "Registro",
        MARGIN + 7,
        cursorTop - 39,
        6.5,
        FONT_BODY,
        this.statusColor(latest),
      );

      const guideTop = cursorTop - 5;
      [10, 23, 36].forEach((offset) => this.line(chartX + 6, guideTop - offset, chartX + chartWidth - 6, guideTop - offset, COLORS.line, 0.55));
      for (let index = 1; index < dimension.cells.length; index += 1) {
        const previous = dimension.cells[index - 1]!;
        const current = dimension.cells[index]!;
        const comparable = previous.comparabilityKey
          && current.comparabilityKey
          && previous.comparabilityKey === current.comparabilityKey
          && ["preserved", "attention", "altered"].includes(previous.status)
          && ["preserved", "attention", "altered"].includes(current.status);
        if (comparable) {
          this.line(
            xFor(previous.consultationId),
            this.statusY(previous.status, guideTop),
            xFor(current.consultationId),
            this.statusY(current.status, guideTop),
            COLORS.primary,
            1.15,
          );
        }
      }
      for (const cell of dimension.cells) {
        const x = xFor(cell.consultationId);
        const y = this.statusY(cell.status, guideTop);
        const color = this.statusColor(cell.status);
        if (cell.status === "indeterminate") {
          this.page.commands.push(`${rgb(color)} rg ${x.toFixed(2)} ${(y + 4).toFixed(2)} m ${(x + 4).toFixed(2)} ${y.toFixed(2)} l ${x.toFixed(2)} ${(y - 4).toFixed(2)} l ${(x - 4).toFixed(2)} ${y.toFixed(2)} l h f`);
        } else {
          this.fillRect(x - 3.3, y - 3.3, 6.6, 6.6, color);
        }
      }
      cursorTop -= rowHeight;
    }

    const axisY = cursorTop + 7;
    consultations.forEach((consultation) => {
      const x = xFor(consultation.id);
      this.text(formatShortDate(consultation.occurredAt), x - 12, axisY, 5.8, FONT_BODY, COLORS.muted);
    });
    this.y = cursorTop - 8;
    const note = "Mudanças que aconteceram em períodos próximos podem estar relacionadas ou não. O gráfico não define a causa da mudança.";
    const noteLines = this.wrappedLines(note, CONTENT_WIDTH, 7.2);
    this.ensureSpace(noteLines.length * 9 + 8);
    for (const line of noteLines) {
      this.text(line, MARGIN, this.y - 7.2, 7.2, FONT_BODY, COLORS.muted);
      this.y -= 9;
    }
    this.y -= 6;
  }

  drawClinicalConducts(conducts: readonly AgaReportClinicalConduct[] | undefined): void {
    if (!conducts?.length) return;
    this.sectionHeading(
      "4",
      "Condutas clínicas",
      "Condutas registradas pelo médico nesta consulta. Podem incluir solicitações de exames, mudanças de tratamento ou outras decisões documentadas no plano clínico.",
    );
    for (let index = 0; index < conducts.length; index += 2) {
      const left = conducts[index]!;
      const right = conducts[index + 1];
      const leftCard: StyledCard = { title: left.problemTitle, items: left.actions };
      if (right) this.drawTwoCards(leftCard, { title: right.problemTitle, items: right.actions });
      else {
        const height = this.cardHeight(leftCard, CONTENT_WIDTH);
        this.ensureSpace(height + 8);
        this.drawCardAt(leftCard, MARGIN, this.y, CONTENT_WIDTH, height);
        this.y -= height + 10;
      }
    }
  }

  drawGastrostomy(care: AgaReportGastrostomyCare | undefined): void {
    if (!care) return;
    this.sectionHeading(
      "GTT",
      "Cuidados com gastrostomia",
      "Orientações práticas para o cuidado diário da gastrostomia já registrada. Fórmula, volumes, horários e preparo de medicamentos seguem a orientação individual da equipe.",
    );
    this.drawTwoCards(
      {
        title: "Cuidados práticos",
        items: [...care.practicalActions, ...care.caregiverActions],
        fill: "#fcfbfd",
      },
      {
        title: "Quando entrar em contato com a equipe",
        items: care.contactGuidance,
        fill: COLORS.warningSoft,
        border: "#f1dfc7",
        titleColor: COLORS.warning,
      },
    );
  }

  drawSafety(report: AgaSignedReportModel): void {
    const left: StyledCard = {
      title: "Situações de urgência",
      items: report.safetyGuidance.urgent,
      fill: COLORS.infoSoft,
      border: "#d8e4f7",
      titleColor: COLORS.info,
    };
    const right: StyledCard = {
      title: "Quando entrar em contato com a equipe",
      items: report.safetyGuidance.contact,
      fill: COLORS.infoSoft,
      border: "#d8e4f7",
      titleColor: COLORS.info,
    };
    const gap = 10;
    const width = (CONTENT_WIDTH - gap) / 2;
    const cardsHeight = Math.max(this.cardHeight(left, width), this.cardHeight(right, width));
    const headingHeight = 36;
    this.ensureSpace(cardsHeight + headingHeight + 10);
    this.fillRect(MARGIN, this.y - cardsHeight - headingHeight, CONTENT_WIDTH, cardsHeight + headingHeight, COLORS.infoSoft);
    this.strokeRect(MARGIN, this.y - cardsHeight - headingHeight, CONTENT_WIDTH, cardsHeight + headingHeight, "#d8e4f7");
    this.text("SEGURANÇA E CONTINUIDADE DO CUIDADO", MARGIN + 9, this.y - 12, 6.6, FONT_BOLD, COLORS.muted);
    this.text("Quando procurar ajuda médica imediata", MARGIN + 9, this.y - 27, 10.2, FONT_BOLD, COLORS.primaryStrong);
    const top = this.y - headingHeight;
    this.drawCardAt(left, MARGIN + 5, top, width - 5, cardsHeight);
    this.drawCardAt(right, MARGIN + width + gap, top, width - 5, cardsHeight);
    this.y -= cardsHeight + headingHeight + 10;
  }

  drawSupport(report: AgaSignedReportModel): void {
    this.sectionHeading("5", "Vacinas e prevenção");
    const pending = report.vaccinationPrevention.status === "PENDING"
      ? report.vaccinationPrevention.pendingVaccines
      : report.vaccinationPrevention.status === "UNKNOWN"
        ? ["A carteira de vacinação ainda precisa ser revisada para identificar possíveis pendências."]
        : ["Nenhuma vacina foi registrada como pendente nesta consulta."];
    const vaccines: StyledCard = {
      title: report.vaccinationPrevention.statusLabel,
      items: [...pending, ...report.vaccinationPrevention.guidance, "Esta seção é informativa e não gera prescrição automática."],
      fill: "#fcfbfd",
    };
    const medication: StyledCard = {
      title: "Plano de medicamentos - documento separado",
      paragraphs: [
        "O plano de medicamentos fica em um documento próprio, vinculado a esta consulta.",
        report.medicationPlan.message,
      ],
      fill: COLORS.primarySoft,
      border: COLORS.primarySoftStrong,
    };
    this.drawTwoCards(vaccines, medication);
  }

  drawFinalVerification(verificationUrl: string): void {
    const height = 112;
    this.ensureSpace(height + 12);
    const top = this.y;
    const bottom = top - height;
    this.fillRect(MARGIN, bottom, CONTENT_WIDTH, height, "#fcfaff");
    this.strokeRect(MARGIN, bottom, CONTENT_WIDTH, height, COLORS.primarySoftStrong);
    const qrSize = 78;
    const qrX = A4_WIDTH - MARGIN - qrSize - 8;
    const qrY = bottom + 17;
    const textWidth = CONTENT_WIDTH - qrSize - 30;
    this.text("Documento para assinatura digital qualificada", MARGIN + 10, top - 16, 9.5, FONT_BOLD, COLORS.primaryStrong);
    this.text(this.identity.displayName, MARGIN + 10, top - 31, 8.2, FONT_BOLD, COLORS.ink);
    if (this.identity.registrationLine) this.text(this.identity.registrationLine, MARGIN + 10, top - 43, 7.2, FONT_BODY, COLORS.muted);
    const note = "O PDF é assinado digitalmente via VIDaaS. O QR Code contém somente um token aleatório de verificação e não contém dados clínicos.";
    let cursor = top - 52;
    for (const line of this.wrappedLines(note, textWidth, 7.2)) {
      this.text(line, MARGIN + 10, cursor - 7.2, 7.2, FONT_BODY, COLORS.muted);
      cursor -= 9;
    }
    this.text("Validação segura:", MARGIN + 10, bottom + 28, 6.7, FONT_BOLD, COLORS.muted);
    const urlLines = this.wrappedLines(verificationUrl, textWidth, 5.7).slice(0, 2);
    urlLines.forEach((line, index) => this.text(line, MARGIN + 10, bottom + 17 - index * 7, 5.7, FONT_BODY, COLORS.muted));
    this.page.commands.push(qrCommands(verificationUrl, qrX, qrY, qrSize));
    this.y -= height + 10;
  }

  finalize(): Buffer {
    const total = this.pages.length;
    for (let index = 0; index < total; index += 1) {
      const page = this.pages[index]!;
      const label = `Página ${index + 1} de ${total} · relatório v${this.snapshotVersion}`;
      page.commands.push(`${rgb(COLORS.muted)} rg BT /${FONT_BODY} 6.8 Tf 1 0 0 1 ${MARGIN.toFixed(2)} 21 Tm ${pdfLiteral(label)} Tj ET`);
    }
    return buildPdfObjects(this.pages.map((page) => page.commands.join("\n")));
  }
}

function buildPdfObjects(streams: string[]): Buffer {
  const objects: string[] = [];
  const pageObjectNumbers = streams.map((_, index) => 5 + index * 2);
  const contentObjectNumbers = streams.map((_, index) => 6 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${streams.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  for (let index = 0; index < streams.length; index += 1) {
    const pageNumber = pageObjectNumbers[index]!;
    const contentNumber = contentObjectNumbers[index]!;
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    const stream = streams[index]!;
    objects[contentNumber] = `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`;
  }

  const chunks: Buffer[] = [Buffer.from("%PDF-1.7\n", "ascii")];
  const offsets = new Array(objects.length).fill(0);
  let length = chunks[0].length;
  for (let number = 1; number < objects.length; number += 1) {
    const object = objects[number];
    if (!object) continue;
    offsets[number] = length;
    const chunk = Buffer.from(`${number} 0 obj\n${object}\nendobj\n`, "ascii");
    chunks.push(chunk);
    length += chunk.length;
  }
  const xrefOffset = length;
  const xref: string[] = [`xref\n0 ${objects.length}\n`, "0000000000 65535 f \n"];
  for (let number = 1; number < objects.length; number += 1) {
    xref.push(`${String(offsets[number]).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref.join("") + trailer, "ascii"));
  return Buffer.concat(chunks);
}

export function buildAgaReportPdf(input: {
  report: AgaSignedReportModel;
  professionalIdentity: ProfessionalIdentity;
  verificationUrl: string;
  snapshotVersion: number;
}): Buffer {
  const builder = new StyledPdfBuilder(
    input.professionalIdentity,
    input.report.patientName,
    input.snapshotVersion,
  );
  builder.drawFirstPageHeader(input.report);
  builder.drawIntro();
  builder.drawExecutive(input.report);
  builder.drawProblems(input.report);
  builder.drawDomains(input.report);
  builder.drawCapacityChart(input.report.capacityHistory);
  builder.drawClinicalConducts(input.report.clinicalConducts);
  builder.drawGastrostomy(input.report.gastrostomyCare);
  builder.drawSafety(input.report);
  builder.drawSupport(input.report);
  builder.drawFinalVerification(input.verificationUrl);
  return builder.finalize();
}
