#!/usr/bin/env node
// Cross-reference our emoji-manifest against the SerenityOS supported set
// (extracted from the TTF distribution's index.html).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(readFileSync(resolve(__dirname, 'emoji-manifest.json'), 'utf8'));
const indexHtml = readFileSync(resolve(__dirname, 'serenity-index.html'), 'utf8');

// Pull every <span class="emoji">X</span> entry.
const supportedSet = new Set();
const re = /<span class="emoji">([^<]+)<\/span>/g;
let m;
while ((m = re.exec(indexHtml)) !== null) {
  const raw = m[1];
  // Normalize: SerenityOS lists emoji without VS16 (U+FE0F).
  // We compare on a "stripped" form: drop FE0F and ZWJ-stripping for this comparison? No — keep ZWJ.
  // But many of our codepoints have FE0F that the font's listed form omits. So normalize by stripping FE0F.
  const stripped = [...raw].filter(ch => ch !== '️').join('');
  supportedSet.add(stripped);
}

function normalize(emoji) {
  return [...emoji].filter(ch => ch !== '️').join('');
}

let covered = 0, missing = 0;
const missingList = [];
const coveredList = [];

manifest.forEach(item => {
  const norm = normalize(item.emoji);
  const ok = supportedSet.has(norm);
  if (ok) { covered++; coveredList.push(item); }
  else { missing++; missingList.push(item); }
});

const report = {
  total: manifest.length,
  covered,
  missing,
  coveragePct: +(covered / manifest.length * 100).toFixed(1),
  supportedSetSize: supportedSet.size,
  missingList: missingList.map(m => ({
    emoji: m.emoji, codepoints: m.codepoints, count: m.count, sources: m.sources,
  })),
};

writeFileSync(resolve(__dirname, 'coverage-report.json'), JSON.stringify(report, null, 2));

console.log(`SerenityOS Emoji supported set: ${supportedSet.size} entries`);
console.log(`Game emoji manifest:           ${manifest.length} unique`);
console.log(`Covered:                       ${covered} (${report.coveragePct}%)`);
console.log(`Missing:                       ${missing}`);
if (missing) {
  console.log(`\nMissing emojis (sorted by usage):`);
  missingList.sort((a, b) => b.count - a.count).forEach(m => {
    const srcSummary = m.sources[0] + (m.sources.length > 1 ? ` +${m.sources.length - 1}` : '');
    console.log(`  ${m.emoji}\t${m.codepoints.padEnd(28)} ×${String(m.count).padStart(3)}  ${srcSummary}`);
  });
}
console.log(`\nWrote ${resolve(__dirname, 'coverage-report.json')}`);
