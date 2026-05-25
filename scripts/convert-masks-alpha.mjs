/**
 * Converts mask PNGs to use the alpha channel instead of luminance.
 *
 * The mask PNGs are grayscale (color type 0) or RGB (color type 2) with no
 * alpha channel. CSS mask-mode: luminance works on Safari 15.4+ but not on
 * iOS 15.0-15.3 which only supports -webkit-mask-image (alpha mode only, no
 * -webkit-mask-mode equivalent exists).
 *
 * This script converts:
 *   grayscale  → grayscale+alpha  (color type 4), alpha = gray value
 *   RGB        → RGBA             (color type 6), alpha = sRGB luminance
 *
 * After conversion, masks work with mask-mode: alpha (the browser default for
 * PNG images) on all Safari versions that support -webkit-mask-image.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync, deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MASKS_DIR = join(__dirname, "../public/cards/masks");

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// ── CRC-32 ────────────────────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf, start, len) {
  let c = 0xffffffff;
  for (let i = start; i < start + len; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── Chunk I/O ─────────────────────────────────────────────────────────────────
function readChunks(buf) {
  const chunks = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    chunks.push({ type, data: buf.subarray(pos + 8, pos + 8 + len) });
    pos += 12 + len;
  }
  return chunks;
}

function buildChunk(type, data) {
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, "ascii");
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(buf, 4, 4 + data.length), 8 + data.length);
  return buf;
}

// ── PNG filter reconstruction ─────────────────────────────────────────────────
function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function unfilterRows(raw, width, cpp) {
  const stride = width * cpp;
  const rows = [];
  let pos = 0;
  while (pos < raw.length) {
    const f = raw[pos++];
    const row = Buffer.from(raw.subarray(pos, pos + stride));
    const prev = rows.length ? rows[rows.length - 1] : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= cpp ? row[x - cpp] : 0;
      const b = prev[x];
      const c = x >= cpp ? prev[x - cpp] : 0;
      if (f === 1) row[x] = (row[x] + a) & 0xff;
      else if (f === 2) row[x] = (row[x] + b) & 0xff;
      else if (f === 3) row[x] = (row[x] + ((a + b) >> 1)) & 0xff;
      else if (f === 4) row[x] = (row[x] + paeth(a, b, c)) & 0xff;
    }
    rows.push(row);
    pos += stride;
  }
  return rows;
}

// ── Main conversion ───────────────────────────────────────────────────────────
function convertToAlpha(srcBuf) {
  const chunks = readChunks(srcBuf);
  const ihdr = chunks.find((c) => c.type === "IHDR");
  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];

  // Already has alpha — nothing to do.
  if (colorType === 4 || colorType === 6) return null;

  if (bitDepth !== 8 || (colorType !== 0 && colorType !== 2))
    throw new Error(`Unsupported PNG: colorType=${colorType} bitDepth=${bitDepth}`);

  const compressed = Buffer.concat(
    chunks.filter((c) => c.type === "IDAT").map((c) => c.data)
  );
  const raw = inflateSync(compressed);

  const srcCpp = colorType === 0 ? 1 : 3;
  const rows = unfilterRows(raw, width, srcCpp);

  // Expand each pixel to include an alpha channel equal to the luminance.
  const dstCpp = srcCpp + 1;
  const newRaw = Buffer.alloc(height * (1 + width * dstCpp));
  let outPos = 0;
  for (const row of rows) {
    newRaw[outPos++] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      if (colorType === 0) {
        const g = row[x];
        newRaw[outPos++] = g;
        newRaw[outPos++] = g; // alpha = gray
      } else {
        const r = row[x * 3], g = row[x * 3 + 1], b = row[x * 3 + 2];
        const a = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        newRaw[outPos++] = r;
        newRaw[outPos++] = g;
        newRaw[outPos++] = b;
        newRaw[outPos++] = a;
      }
    }
  }

  const newIhdr = Buffer.alloc(13);
  newIhdr.writeUInt32BE(width, 0);
  newIhdr.writeUInt32BE(height, 4);
  newIhdr[8] = 8;
  newIhdr[9] = colorType === 0 ? 4 : 6; // gray+alpha or RGBA
  // compression=0, filter=0, interlace=0 already zero

  return Buffer.concat([
    PNG_SIG,
    buildChunk("IHDR", newIhdr),
    buildChunk("IDAT", deflateSync(newRaw)),
    buildChunk("IEND", Buffer.alloc(0)),
  ]);
}

const files = readdirSync(MASKS_DIR).filter((f) => f.endsWith(".png"));
let converted = 0;
for (const file of files) {
  const path = join(MASKS_DIR, file);
  try {
    const result = convertToAlpha(readFileSync(path));
    if (result) {
      writeFileSync(path, result);
      converted++;
      process.stdout.write(`✓ ${file}\n`);
    }
  } catch (e) {
    process.stderr.write(`✗ ${file}: ${e.message}\n`);
  }
}
console.log(`\nConverted ${converted}/${files.length} files.`);
