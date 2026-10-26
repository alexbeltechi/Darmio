/**
 * Render labelled grey placeholder images, for posts drafted before their
 * real assets are exported. Each one names the asset to swap in.
 *
 *   npx tsx scripts/ingest/placeholders.ts <specs.json>
 *
 * specs.json: [{ "file": "/abs/out.png", "num": "HP · 1", "label": "...", "sub": "...", "w": 1600, "h": 1000 }]
 */
import fs from "fs/promises";
import sharp from "sharp";

interface Spec {
  file: string;
  num: string;
  label: string;
  sub: string;
  w: number;
  h: number;
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Greedy word wrap to a rough character budget per line. */
function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

async function render(spec: Spec) {
  const { w, h } = spec;
  const size = Math.round(Math.min(w, h) / 16);
  const chars = Math.max(14, Math.floor((w * 0.8) / (size * 0.55)));
  const label = wrap(spec.label, chars);
  const sub = wrap(spec.sub, Math.floor(chars * 1.4));
  const lineH = size * 1.25;
  const subSize = Math.round(size * 0.6);
  const block = size * 0.8 + label.length * lineH + subSize * 1.6 + sub.length * subSize * 1.3;
  let y = h / 2 - block / 2 + size * 0.6;

  const tspans: string[] = [];
  tspans.push(`<text x="${w / 2}" y="${y}" font-size="${subSize}" fill="#78716C" letter-spacing="2">${escape(spec.num)}</text>`);
  y += size * 0.8 + size * 0.4;
  for (const l of label) {
    tspans.push(`<text x="${w / 2}" y="${y}" font-size="${size}" fill="#44403C" font-weight="600">${escape(l)}</text>`);
    y += lineH;
  }
  y += subSize * 0.6;
  for (const l of sub) {
    tspans.push(`<text x="${w / 2}" y="${y}" font-size="${subSize}" fill="#78716C">${escape(l)}</text>`);
    y += subSize * 1.3;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#E2DFD9"/>
  <g font-family="Helvetica, Arial, sans-serif" text-anchor="middle">${tspans.join("")}</g>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(spec.file);
}

async function main() {
  const specs: Spec[] = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
  for (const spec of specs) await render(spec);
  console.log(`rendered ${specs.length} placeholders`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
