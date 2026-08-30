import type { ProfessionalIdentity } from "@/domain/professional-identity";
import type { AgaAdvanceDirectivesReportSection } from "@/domain/report-overview";
import { createValidationQrMatrix } from "./validation-qr.ts";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const MARGIN = 42;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const TOP = 794;
const BOTTOM = 48;
const FONT_BODY = "F1";
const FONT_BOLD = "F2";

const COLORS = Object.freeze({
  primary: "#5f2a91",
  primaryStrong: "#48206f",
  primarySoft: "#f4eefb",
  ink: "#272331",
  muted: "#6f6879",
  line: "#e7e1ec",
  surface: "#ffffff",
  note: "#fcfaff",
});

const WIN_ANSI: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91,
  "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98,
  "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

type FontName = typeof FONT_BODY | typeof FONT_BOLD;
type Page = { commands: string[] };

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
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = ((value >> 16) & 0xff) / 255;
  const g = ((value >> 8) & 0xff) / 255;
  const b = (value & 0xff) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function widthFactor(character: string, bold: boolean): number {
  if (character === " ") return 0.28;
  if (/[ilI1.,:;'`!|]/.test(character)) return 0.27;
  if (/[mwMW@%&]/.test(character)) return bold ? 0.85 : 0.8;
  if (/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(character)) return bold ? 0.64 : 0.6;
  if (/[0-9]/.test(character)) return 0.54;
  return bold ? 0.54 : 0.5;
}

function approximateWidth(value: string, size: number, bold = false): number {
  let width = 0;
  for (const character of value) width += widthFactor(character, bold);
  return width * size;
}

function wrapText(value: string, maxWidth: number, size: number, bold = false): string[] {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (approximateWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (approximateWidth(word, size, bold) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const character of word) {
      if (!chunk || approximateWidth(chunk + character, size, bold) <= maxWidth) chunk += character;
      else {
        lines.push(chunk);
        chunk = character;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Data não registrada";
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function qrCommands(payload: string, x: number, y: number, size: number): string {
  const matrix = createValidationQrMatrix(payload);
  const quiet = 4;
  const total = matrix.length + quiet * 2;
  const module = size / total;
  const commands = [
    `${rgb(COLORS.surface)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)} re f`,
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

class DirectivesPdfBuilder {
  private readonly pages: Page[] = [];
  private y = TOP;
  private readonly identity: ProfessionalIdentity;
  private readonly patientName: string;
  private readonly directiveVersion: number;

  constructor(identity: ProfessionalIdentity, patientName: string, directiveVersion: number) {
    this.identity = identity;
    this.patientName = patientName;
    this.directiveVersion = directiveVersion;
    this.addPage(false);
  }

  private get page(): Page {
    return this.pages[this.pages.length - 1]!;
  }

  private addPage(runningHeader: boolean): void {
    this.pages.push({ commands: [] });
    this.y = TOP;
    if (runningHeader) {
      this.text(this.patientName, MARGIN, 812, 8.3, FONT_BOLD, COLORS.primaryStrong);
      const title = "Diretivas antecipadas";
      this.text(title, A4_WIDTH - MARGIN - approximateWidth(title, 8.3), 812, 8.3, FONT_BODY, COLORS.muted);
      this.line(MARGIN, 802, A4_WIDTH - MARGIN, 802, COLORS.line, 0.8);
      this.y = 784;
    }
  }

  private ensureSpace(height: number): void {
    if (this.y - height >= BOTTOM) return;
    this.addPage(true);
  }

  private text(value: string, x: number, y: number, size: number, font: FontName, color: string): void {
    this.page.commands.push(`${rgb(color)} rg BT /${font} ${size.toFixed(2)} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm ${pdfLiteral(value)} Tj ET`);
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

  private wrapped(value: string, width: number, size = 8.5, bold = false): string[] {
    return wrapText(value, width, size, bold);
  }

  private paragraph(value: string, options: { size?: number; color?: string; indent?: number; bold?: boolean } = {}): void {
    const size = options.size ?? 8.5;
    const color = options.color ?? COLORS.ink;
    const indent = options.indent ?? 0;
    const bold = options.bold ?? false;
    const lines = this.wrapped(value, CONTENT_WIDTH - indent, size, bold);
    const lineHeight = size + 3;
    this.ensureSpace(lines.length * lineHeight + 7);
    for (const line of lines) {
      this.text(line, MARGIN + indent, this.y - size, size, bold ? FONT_BOLD : FONT_BODY, color);
      this.y -= lineHeight;
    }
    this.y -= 4;
  }

  private sectionTitle(number: string, title: string): void {
    const titleLines = this.wrapped(title, CONTENT_WIDTH - 32, 10.5, true);
    const height = Math.max(22, titleLines.length * 13 + 7);
    this.ensureSpace(height + 5);
    this.fillRect(MARGIN, this.y - 20, 22, 20, COLORS.primarySoft);
    this.text(number, MARGIN + 6, this.y - 14, 8.2, FONT_BOLD, COLORS.primaryStrong);
    let baseline = this.y - 10.5;
    for (const line of titleLines) {
      this.text(line, MARGIN + 30, baseline, 10.5, FONT_BOLD, COLORS.primaryStrong);
      baseline -= 13;
    }
    this.y -= height;
  }

  private bullets(items: readonly string[]): void {
    for (const item of items) {
      const lines = this.wrapped(item, CONTENT_WIDTH - 16, 8.5);
      const lineHeight = 11.5;
      this.ensureSpace(lines.length * lineHeight + 4);
      this.text("-", MARGIN + 2, this.y - 8.5, 8.5, FONT_BOLD, COLORS.primaryStrong);
      let baseline = this.y - 8.5;
      for (const line of lines) {
        this.text(line, MARGIN + 14, baseline, 8.5, FONT_BODY, COLORS.ink);
        baseline -= lineHeight;
      }
      this.y -= lines.length * lineHeight + 3;
    }
    this.y -= 3;
  }

  private topicCard(title: string, status: string, note?: string): void {
    const titleLines = this.wrapped(title, CONTENT_WIDTH - 22, 9.1, true);
    const statusLines = this.wrapped(status, CONTENT_WIDTH - 22, 8.5);
    const noteLines = note ? this.wrapped(note, CONTENT_WIDTH - 22, 8.0) : [];
    const height = 18 + titleLines.length * 11.5 + statusLines.length * 11 + noteLines.length * 10.5 + (noteLines.length ? 7 : 2);
    this.ensureSpace(height + 6);
    const bottom = this.y - height;
    this.fillRect(MARGIN, bottom, CONTENT_WIDTH, height, COLORS.surface);
    this.strokeRect(MARGIN, bottom, CONTENT_WIDTH, height, COLORS.line);
    let cursor = this.y - 11;
    for (const line of titleLines) {
      this.text(line, MARGIN + 10, cursor - 9.1, 9.1, FONT_BOLD, COLORS.primaryStrong);
      cursor -= 11.5;
    }
    cursor -= 2;
    for (const line of statusLines) {
      this.text(line, MARGIN + 10, cursor - 8.5, 8.5, FONT_BODY, COLORS.ink);
      cursor -= 11;
    }
    if (noteLines.length) {
      cursor -= 2;
      for (const line of noteLines) {
        this.text(line, MARGIN + 10, cursor - 8, 8, FONT_BODY, COLORS.muted);
        cursor -= 10.5;
      }
    }
    this.y = bottom - 7;
  }

  header(section: AgaAdvanceDirectivesReportSection): void {
    this.text(this.identity.displayName, MARGIN, this.y, 11, FONT_BOLD, COLORS.primaryStrong);
    this.text(this.identity.roleLabel, MARGIN, this.y - 14, 8.2, FONT_BODY, COLORS.muted);
    if (this.identity.registrationLine) this.text(this.identity.registrationLine, MARGIN, this.y - 26, 8.2, FONT_BODY, COLORS.muted);

    const titleX = 220;
    this.text("AVALIAÇÃO GERIÁTRICA AMPLA", titleX, this.y, 7.5, FONT_BOLD, COLORS.primary);
    this.text("Diretivas antecipadas", titleX, this.y - 20, 16, FONT_BOLD, COLORS.primaryStrong);
    this.text("Preferências, valores e objetivos de cuidado registrados", titleX, this.y - 36, 8.2, FONT_BODY, COLORS.muted);
    this.y -= 58;
    this.line(MARGIN, this.y, A4_WIDTH - MARGIN, this.y, COLORS.line, 0.9);
    this.y -= 12;

    const gap = 10;
    const boxWidth = (CONTENT_WIDTH - gap) / 2;
    const boxHeight = 42;
    this.fillRect(MARGIN, this.y - boxHeight, boxWidth, boxHeight, COLORS.note);
    this.strokeRect(MARGIN, this.y - boxHeight, boxWidth, boxHeight, COLORS.line);
    this.text("Paciente", MARGIN + 8, this.y - 12, 7.2, FONT_BOLD, COLORS.muted);
    const patientLines = this.wrapped(this.patientName, boxWidth - 16, 8.8, true).slice(0, 2);
    let patientBaseline = this.y - 25;
    for (const line of patientLines) {
      this.text(line, MARGIN + 8, patientBaseline, 8.8, FONT_BOLD, COLORS.ink);
      patientBaseline -= 10.5;
    }

    const rightX = MARGIN + boxWidth + gap;
    this.fillRect(rightX, this.y - boxHeight, boxWidth, boxHeight, COLORS.note);
    this.strokeRect(rightX, this.y - boxHeight, boxWidth, boxHeight, COLORS.line);
    this.text("Consulta do registro", rightX + 8, this.y - 12, 7.2, FONT_BOLD, COLORS.muted);
    this.text(formatDate(section.sourceConsultationDate), rightX + 8, this.y - 27, 8.8, FONT_BOLD, COLORS.ink);
    this.y -= boxHeight + 12;

    const intro = "Registro longitudinal de conversa sobre preferências, valores e objetivos de cuidado. O conteúdo reproduz informações documentadas e deve ser revisto no contexto clínico atual.";
    const introLines = this.wrapped(intro, CONTENT_WIDTH - 18, 8.3);
    const introHeight = introLines.length * 11 + 16;
    this.fillRect(MARGIN, this.y - introHeight, CONTENT_WIDTH, introHeight, COLORS.note);
    this.strokeRect(MARGIN, this.y - introHeight, CONTENT_WIDTH, introHeight, COLORS.primarySoft);
    let introBaseline = this.y - 12;
    for (const line of introLines) {
      this.text(line, MARGIN + 9, introBaseline, 8.3, FONT_BODY, COLORS.ink);
      introBaseline -= 11;
    }
    this.y -= introHeight + 12;
  }

  render(section: AgaAdvanceDirectivesReportSection): void {
    if (section.participation) {
      this.sectionTitle("1", "Participação na conversa");
      this.paragraph(section.participation);
    }
    if (section.whatMatters) {
      this.sectionTitle("2", "O que é importante para a pessoa");
      this.paragraph(section.whatMatters);
    }
    if (section.dignityAndComfort) {
      this.sectionTitle("3", "Conforto, dignidade e sentido");
      this.paragraph(section.dignityAndComfort);
    }
    if (section.priorities.length > 0) {
      this.sectionTitle("4", "Prioridades registradas");
      this.bullets(section.priorities);
    }
    if (section.topics.length > 0) {
      this.sectionTitle("5", "Preferências discutidas");
      for (const topic of section.topics) this.topicCard(topic.title, topic.status, topic.note);
    }
    if (section.trustedPerson || section.documentStatus) {
      this.sectionTitle("6", "Pessoa de confiança e documento prévio");
      if (section.trustedPerson) {
        this.paragraph(`Pessoa de confiança: ${section.trustedPerson.name}${section.trustedPerson.relation ? ` - ${section.trustedPerson.relation}` : ""}`);
      }
      if (section.documentStatus) this.paragraph(`Documento prévio: ${section.documentStatus}`);
    }
    this.sectionTitle("7", "Revisão");
    this.paragraph(section.reviewTrigger);

    if (section.history.length > 1) {
      this.sectionTitle("8", "Histórico");
      this.bullets(section.history.map((item) => `${formatDate(item.consultationDate)} - versão ${item.version}`));
    }
  }

  finish(verificationUrl: string): Buffer {
    const footerHeight = 148;
    this.ensureSpace(footerHeight);
    this.line(MARGIN, this.y, A4_WIDTH - MARGIN, this.y, COLORS.line, 0.9);
    this.y -= 14;
    this.paragraph("Registro de apoio à continuidade do cuidado. Preferências podem ser revistas pela pessoa e pela equipe conforme sua vontade e o contexto clínico.", { size: 7.8, color: COLORS.muted });

    const signatureY = this.y - 22;
    const signatureWidth = 235;
    this.line(MARGIN, signatureY, MARGIN + signatureWidth, signatureY, COLORS.primary, 0.8);
    this.text(this.identity.displayName, MARGIN, signatureY - 13, 8.4, FONT_BOLD, COLORS.ink);
    if (this.identity.registrationLine) this.text(this.identity.registrationLine, MARGIN, signatureY - 25, 7.5, FONT_BODY, COLORS.muted);
    this.text("Documento destinado à assinatura digital qualificada via VIDaaS.", MARGIN, signatureY - 42, 7.4, FONT_BODY, COLORS.muted);
    this.text("O QR Code contém somente um token aleatório de verificação; não contém dados clínicos.", MARGIN, signatureY - 54, 7.0, FONT_BODY, COLORS.muted);

    const qrSize = 86;
    const qrX = A4_WIDTH - MARGIN - qrSize;
    const qrY = Math.max(38, signatureY - 66);
    this.page.commands.push(qrCommands(verificationUrl, qrX, qrY, qrSize));
    const validationLines = this.wrapped(`Validação: ${verificationUrl}`, signatureWidth, 6.4);
    let validationBaseline = signatureY - 68;
    for (const line of validationLines.slice(0, 3)) {
      this.text(line, MARGIN, validationBaseline, 6.4, FONT_BODY, COLORS.muted);
      validationBaseline -= 8;
    }

    const totalPages = this.pages.length;
    for (let index = 0; index < totalPages; index += 1) {
      const page = this.pages[index]!;
      const footer = `Página ${index + 1} de ${totalPages} · diretivas v${this.directiveVersion}`;
      page.commands.push(`${rgb(COLORS.muted)} rg BT /${FONT_BODY} 7.2 Tf 1 0 0 1 ${MARGIN.toFixed(2)} 24 Tm ${pdfLiteral(footer)} Tj ET`);
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
  const xref = [`xref\n0 ${objects.length}\n`, "0000000000 65535 f \n"];
  for (let number = 1; number < objects.length; number += 1) {
    xref.push(`${String(offsets[number]).padStart(10, "0")} 00000 n \n`);
  }
  chunks.push(Buffer.from(`${xref.join("")}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, "ascii"));
  return Buffer.concat(chunks);
}

export function buildAdvanceDirectivesPdf(input: {
  section: AgaAdvanceDirectivesReportSection;
  patientName: string;
  professionalIdentity: ProfessionalIdentity;
  verificationUrl: string;
}): Buffer {
  const builder = new DirectivesPdfBuilder(input.professionalIdentity, input.patientName, input.section.version);
  builder.header(input.section);
  builder.render(input.section);
  return builder.finish(input.verificationUrl);
}