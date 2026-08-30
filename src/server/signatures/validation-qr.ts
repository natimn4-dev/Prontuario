const VERSION = 6;
const SIZE = 41;
const DATA_CODEWORDS = 136;
const BLOCK_DATA_CODEWORDS = 68;
const ECC_CODEWORDS_PER_BLOCK = 18;
const MAX_PAYLOAD_BYTES = 134;

class BitBuffer {
  private readonly bits: number[] = [];

  put(value: number, length: number) {
    for (let bit = length - 1; bit >= 0; bit -= 1) {
      this.bits.push((value >>> bit) & 1);
    }
  }

  get length() {
    return this.bits.length;
  }

  toBytes(): number[] {
    const output = new Array(Math.ceil(this.bits.length / 8)).fill(0);
    for (let index = 0; index < this.bits.length; index += 1) {
      output[Math.floor(index / 8)] |= this.bits[index] << (7 - (index % 8));
    }
    return output;
  }
}

const GF_EXP = new Array<number>(512).fill(0);
const GF_LOG = new Array<number>(256).fill(0);
{
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    GF_EXP[index] = value;
    GF_LOG[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < GF_EXP.length; index += 1) GF_EXP[index] = GF_EXP[index - 255];
}

function gfMultiply(left: number, right: number): number {
  if (left === 0 || right === 0) return 0;
  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function generatorPolynomial(degree: number): number[] {
  let result = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = new Array(result.length + 1).fill(0);
    for (let cursor = 0; cursor < result.length; cursor += 1) {
      next[cursor] ^= result[cursor];
      next[cursor + 1] ^= gfMultiply(result[cursor], GF_EXP[index]);
    }
    result = next;
  }
  return result;
}

function reedSolomon(data: number[], degree: number): number[] {
  const generator = generatorPolynomial(degree);
  const working = [...data, ...new Array(degree).fill(0)];
  for (let index = 0; index < data.length; index += 1) {
    const factor = working[index];
    if (!factor) continue;
    for (let offset = 0; offset < generator.length; offset += 1) {
      working[index + offset] ^= gfMultiply(generator[offset], factor);
    }
  }
  return working.slice(data.length);
}

function buildCodewords(payload: string): number[] {
  const bytes = Array.from(Buffer.from(payload, "utf8"));
  if (bytes.length > MAX_PAYLOAD_BYTES) {
    throw new Error("URL de verificação excede a capacidade segura do QR Code local.");
  }

  const buffer = new BitBuffer();
  buffer.put(0b0100, 4); // byte mode
  buffer.put(bytes.length, 8); // versions 1..9
  for (const byte of bytes) buffer.put(byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  buffer.put(0, Math.min(4, capacityBits - buffer.length));
  while (buffer.length % 8 !== 0) buffer.put(0, 1);

  const data = buffer.toBytes();
  let pad = 0;
  while (data.length < DATA_CODEWORDS) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
    pad += 1;
  }

  const blocks = [
    data.slice(0, BLOCK_DATA_CODEWORDS),
    data.slice(BLOCK_DATA_CODEWORDS, BLOCK_DATA_CODEWORDS * 2),
  ];
  const ecc = blocks.map((block) => reedSolomon(block, ECC_CODEWORDS_PER_BLOCK));
  const interleaved: number[] = [];
  for (let index = 0; index < BLOCK_DATA_CODEWORDS; index += 1) {
    for (const block of blocks) interleaved.push(block[index]);
  }
  for (let index = 0; index < ECC_CODEWORDS_PER_BLOCK; index += 1) {
    for (const block of ecc) interleaved.push(block[index]);
  }
  return interleaved;
}

function formatBits(): number {
  const data = 0b01000; // EC level L (01) + mask 0 (000)
  let remainder = data << 10;
  const generator = 0x537;
  while (Math.floor(Math.log2(remainder)) >= 10) {
    remainder ^= generator << (Math.floor(Math.log2(remainder)) - 10);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

export function createValidationQrMatrix(payload: string): boolean[][] {
  const codewords = buildCodewords(payload);
  const matrix = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));
  const reserved = Array.from({ length: SIZE }, () => new Array<boolean>(SIZE).fill(false));

  function setFunction(row: number, column: number, dark: boolean) {
    if (row < 0 || column < 0 || row >= SIZE || column >= SIZE) return;
    matrix[row][column] = dark;
    reserved[row][column] = true;
  }

  function drawFinder(top: number, left: number) {
    for (let row = -1; row <= 7; row += 1) {
      for (let column = -1; column <= 7; column += 1) {
        const inside = row >= 0 && row <= 6 && column >= 0 && column <= 6;
        const dark = inside && (
          row === 0 || row === 6 || column === 0 || column === 6 ||
          (row >= 2 && row <= 4 && column >= 2 && column <= 4)
        );
        setFunction(top + row, left + column, dark);
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, SIZE - 7);
  drawFinder(SIZE - 7, 0);

  for (let index = 8; index < SIZE - 8; index += 1) {
    setFunction(6, index, index % 2 === 0);
    setFunction(index, 6, index % 2 === 0);
  }

  // Version 6 has one non-overlapping alignment pattern centered at 34,34.
  for (let row = -2; row <= 2; row += 1) {
    for (let column = -2; column <= 2; column += 1) {
      const distance = Math.max(Math.abs(row), Math.abs(column));
      setFunction(34 + row, 34 + column, distance !== 1);
    }
  }

  // Reserve format-information cells before writing payload data.
  for (let index = 0; index < 15; index += 1) {
    if (index < 6) setFunction(index, 8, false);
    else if (index < 8) setFunction(index + 1, 8, false);
    else setFunction(SIZE - 15 + index, 8, false);

    if (index < 8) setFunction(8, SIZE - index - 1, false);
    else if (index < 9) setFunction(8, 15 - index, false);
    else setFunction(8, 15 - index - 1, false);
  }
  setFunction(SIZE - 8, 8, true);

  const bits: number[] = [];
  for (const codeword of codewords) {
    for (let bit = 7; bit >= 0; bit -= 1) bits.push((codeword >>> bit) & 1);
  }

  let bitIndex = 0;
  let upwards = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let step = 0; step < SIZE; step += 1) {
      const row = upwards ? SIZE - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const column = right - offset;
        if (reserved[row][column]) continue;
        const value = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        bitIndex += 1;
        matrix[row][column] = ((row + column) % 2 === 0) ? !value : value; // mask 0
      }
    }
    upwards = !upwards;
  }

  const format = formatBits();
  for (let index = 0; index < 15; index += 1) {
    const dark = ((format >>> index) & 1) === 1;
    if (index < 6) matrix[index][8] = dark;
    else if (index < 8) matrix[index + 1][8] = dark;
    else matrix[SIZE - 15 + index][8] = dark;

    if (index < 8) matrix[8][SIZE - index - 1] = dark;
    else if (index < 9) matrix[8][15 - index] = dark;
    else matrix[8][15 - index - 1] = dark;
  }
  matrix[SIZE - 8][8] = true;

  return matrix;
}

export function validationQrSvg(payload: string, moduleSize = 4): string {
  const matrix = createValidationQrMatrix(payload);
  const quiet = 4;
  const size = (matrix.length + quiet * 2) * moduleSize;
  const rectangles: string[] = [];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      if (!matrix[row][column]) continue;
      rectangles.push(`<rect x="${(column + quiet) * moduleSize}" y="${(row + quiet) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR Code para validar a assinatura digital"><rect width="100%" height="100%" fill="white"/><g fill="black">${rectangles.join("")}</g></svg>`;
}

export const validationQrLimits = Object.freeze({ version: VERSION, maxPayloadBytes: MAX_PAYLOAD_BYTES });
