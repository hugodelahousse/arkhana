#!/usr/bin/env node
/**
 * CLI script — generates all 78 SVGs to lab/output/.
 * Generation logic lives in app/lib/procgen-tarot.ts.
 *
 * Usage: npx tsx lab/procgen-tarot.ts [deckSeed]
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { generateCard, CARD_DATA } from "../app/lib/procgen-tarot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function main(): void {
  const deckSeed = parseInt(process.argv[2] ?? "12345", 10);
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const total = CARD_DATA.length;
  console.log(`Generating ${total} tarot cards with seed ${deckSeed}...`);
  const t0 = Date.now();

  for (let id = 0; id < total; id++) {
    const card = CARD_DATA[id];
    const { svg: svgContent } = generateCard(id, deckSeed);
    const filename = `card-${String(id).padStart(2, "0")}.svg`;
    fs.writeFileSync(path.join(outputDir, filename), svgContent, "utf8");
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    process.stdout.write(`\r[${String(id + 1).padStart(2)}/${total}] ${card.name.padEnd(25)} ${elapsed}s`);
  }

  console.log(`\nDone! ${total} SVGs written to ${outputDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main();
