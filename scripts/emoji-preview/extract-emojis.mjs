#!/usr/bin/env node
// Extract every unique emoji used in the game and where it appears.
// Output: scripts/emoji-preview/emoji-manifest.json

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..', '..');

const sources = [
  'src/data-json/relics.json',
  'src/src/ui/HelpPanel.ts',
  'src/src/core/constants.ts',
  'src/src/demo/demo-i18n.ts',
  'src/src/systems/skills.ts',
  'src/index.html',
];

// Match emoji-ish sequences: any run of codepoints in emoji ranges,
// including ZWJ (U+200D), VS16 (U+FE0F), regional indicators, skin tones.
// We use Unicode property escapes via the \p{Extended_Pictographic} class plus modifiers.
const EMOJI_RE = /(?:\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*️?)+/gu;

const seen = new Map(); // emoji string -> { count, sources: Set<file:line> }

for (const rel of sources) {
  const abs = resolve(root, rel);
  let text;
  try { text = readFileSync(abs, 'utf8'); } catch { continue; }
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const matches = line.matchAll(EMOJI_RE);
    for (const m of matches) {
      const e = m[0];
      // skip pure VS16 / ZWJ noise
      if (![...e].some(ch => /\p{Extended_Pictographic}/u.test(ch))) continue;
      if (!seen.has(e)) seen.set(e, { count: 0, sources: new Set() });
      const entry = seen.get(e);
      entry.count++;
      entry.sources.add(`${rel}:${i + 1}`);
    }
  });
}

const manifest = [...seen.entries()]
  .map(([emoji, { count, sources }]) => ({
    emoji,
    codepoints: [...emoji].map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '),
    count,
    sources: [...sources].sort(),
  }))
  .sort((a, b) => b.count - a.count);

const outPath = resolve(__dirname, 'emoji-manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
// Also emit a browser-loadable variant so the preview works via file:// (no fetch).
const jsPath = resolve(__dirname, 'emoji-manifest.js');
writeFileSync(jsPath, `window.__emojiManifest = ${JSON.stringify(manifest, null, 2)};\n`);

console.log(`Extracted ${manifest.length} unique emoji from ${sources.length} files.`);
console.log(`Top 10 by frequency:`);
manifest.slice(0, 10).forEach(m => {
  console.log(`  ${m.emoji}\t${m.codepoints.padEnd(20)} ×${m.count}`);
});
console.log(`Wrote ${outPath}`);
