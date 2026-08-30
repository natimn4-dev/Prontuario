import type { ProfessionalIdentity } from "@/domain/professional-identity";
import { createValidationQrMatrix } from "./validation-qr";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const LEFT = 50;
const TOP = 790;
const LINE_HEIGHT = 13;
const BODY_FONT_SIZE = 9.5;
const FIRST_PAGE_LINES = 49;
const FINAL_PAGE_LINES = 38;

const WIN_ANSI: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91,
  "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98,
  "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
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

function normalizedLines(text: string): string[] {
  const output: string[] = [];
  for (const sourceLine of text.replace(/\r/g, "").split("\n")) {
    const clean = sourceLine.trimEnd();
    if (!clean) {
      output.push("");
      continue;
    }
    const words = clean.split(/\s+/);
    let current = "";
    for (const word of words) {
      if (!current) current = word;
      else if (`${current} ${word}`.length <= 92) current += ` ${word}`;
      else {
        output.push(current);
        current = word;
      }
    }
    if (current) output.push(current);
  }
  return output;
}

function paginate(lines: string[]): string[][] {
  const pages: string[][] = [];
  let cursor = 0;
  while (lines.length - cursor > FINAL_PAGE_LINES) {
    const remaining = lines.length - cursor;
    const take = Math.min(FIRST_PAGE_LINES, remaining - FINAL_PAGE_LINES);
    pages.push(lines.slice(cursor, cursor + take));
    cursor += take;
  }
  pages.push(lines.slice(cursor));
  return pages;
}

function qrCommands(payload: string, x: number, y: number, size: number): string {
  const matrix = createValidationQrMatrix(payload);
  const quiet = 4;
  const total = matrix.length + quiet * 2;
  const module = size / total;
  const commands = ["0 g", `${x.toFixed(2)} ${y.toFixed(2)} ${size.toFixed(2)} ${size.toFixed(2)} re`, "1 g f", "0 g"];
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

function buildPageStream(input: {
  lines: string[];
  pageNumber: number;
  totalPages: number;
  identity: ProfessionalIdentity;
  verificationUrl: string;
  finalPage: boolean;
  snapshotVersion: number;
}): string {
  const content: string[] = [];
  content.push("0 g");
  content.push(`BT /F1 16 Tf ${LEFT} ${TOP} Td ${pdfLiteral("Relatório de Avaliação Geriátrica")} Tj ET`);
  content.push(`BT /F1 9 Tf ${LEFT} ${TOP - 20} Td ${pdfLiteral(`${input.identity.displayName}${input.identity.registrationLine ? ` · ${input.identity.registrationLine}` : ""}`)} Tj ET`);
  content.push(`0.75 G ${LEFT} ${TOP - 30} m ${A4_WIDTH - LEFT} ${TOP - 30} l S 0 G`);
  content.push(`BT /F1 ${BODY_FONT_SIZE} Tf ${LEFT} ${TOP - 50} Td ${LINE_HEIGHT} TL`);
  for (let index = 0; index < input.lines.length; index += 1) {
    if (index > 0) content.push("T*");
    content.push(`${pdfLiteral(input.lines[index] || " ")} Tj`);
  }
  content.push("ET");
  content.push(`BT /F1 8 Tf ${LEFT} 28 Td ${pdfLiteral(`Página ${input.pageNumber} de ${input.totalPages} · relatório v${input.snapshotVersion}`)} Tj ET`);

  if (input.finalPage) {
    const qrSize = 82;
    const qrX = A4_WIDTH - LEFT - qrSize;
    const qrY = 42;
    content.push(`0.8 G ${LEFT} 143 m ${A4_WIDTH - LEFT} 143 l S 0 G`);
    content.push(`BT /F1 9 Tf ${LEFT} 126 Td ${pdfLiteral("Documento final destinado à assinatura digital qualificada via VIDaaS.")} Tj ET`);
    content.push(`BT /F1 8 Tf ${LEFT} 110 Td ${pdfLiteral("O QR Code contém somente um token aleatório de verificação; não contém dados clínicos.")} Tj ET`);
    content.push(`BT /F1 8 Tf ${LEFT} 94 Td ${pdfLiteral("Validação segura:")} Tj ET`);
    content.push(`BT /F1 7 Tf ${LEFT} 82 Td ${pdfLiteral(input.verificationUrl)} Tj ET`);
    content.push(qrCommands(input.verificationUrl, qrX, qrY, qrSize));
  }
  return content.join("\n");
}

function buildPdfObjects(streams: string[]): Buffer {
  const objects: string[] = [];
  const pageObjectNumbers = streams.map((_, index) => 4 + index * 2);
  const contentObjectNumbers = streams.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${streams.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  for (let index = 0; index < streams.length; index += 1) {
    const pageNumber = pageObjectNumbers[index];
    const contentNumber = contentObjectNumbers[index];
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNumber} 0 R >>`;
    const stream = streams[index];
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
  reportText: string;
  professionalIdentity: ProfessionalIdentity;
  verificationUrl: string;
  snapshotVersion: number;
}): Buffer {
  const pages = paginate(normalizedLines(input.reportText));
  const streams = pages.map((lines, index) => buildPageStream({
    lines,
    pageNumber: index + 1,
    totalPages: pages.length,
    identity: input.professionalIdentity,
    verificationUrl: input.verificationUrl,
    finalPage: index === pages.length - 1,
    snapshotVersion: input.snapshotVersion,
  }));
  return buildPdfObjects(streams);
}
