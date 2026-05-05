#!/usr/bin/env node
//
// ingest-bossmods.mjs (Phase E / spec §6.2 · SKELETON)
//
// reframe src/src/data/bossModifiers.ts 为 V1 + V6（boss tooltip 反身闭合
// attribution placeholder）框架。
//
// **状态**：SKELETON · pipeline 跑批前不可实跑。
//
// CLI: --input <path> · --dry-run · --check · --apply

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { validateFragmentV41 } from '../validators/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const TARGET_FILE = join(PROJECT_ROOT, 'src', 'src', 'data', 'bossModifiers.ts')
const OUTPUT_DIR = join(__dirname, '..', 'output')

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { dryRun: !args.includes('--apply'), apply: args.includes('--apply'), check: args.includes('--check'), input: null }
  const i = args.indexOf('--input')
  if (i >= 0) opts.input = args[i + 1]
  return opts
}

function findLatestApprovedOutput() {
  if (!existsSync(OUTPUT_DIR)) return null
  const files = readdirSync(OUTPUT_DIR).filter(f => /(?:bossModifier|bossTooltip).*approved.*\.json$/.test(f))
  if (files.length === 0) return null
  files.sort().reverse()
  return join(OUTPUT_DIR, files[0])
}

// ════════════════════════════════════════════════════════
// Input contract:
//
// boss modifier entries 含 V1 boilerplate flavor + V6 boss tooltip placeholder：
//
// [
//   {
//     "type": "bossModifier",
//     "id": "wordforge",
//     "voice": "V1",
//     "content": { text_zh, text_en, length_class }  // boilerplate flavor
//   },
//   {
//     "type": "bossTooltip",
//     "id": "wordforge_tooltip",
//     "voice": "V6",
//     "content": {
//       text_zh: "本场 modifier: {{MODIFIER_TEXT:source=player_history,chapter=2}}\n上一任作者: {{ATTRIBUTION:type=approximate_player_worker_id,drift=1}}",
//       placeholders_used: [...],
//       chapter_target: 3
//     }
//   }
// ]
// ════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs()

  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   ingest-bossmods · Phase E ingest · SKELETON            ║')
  console.log('╚' + '═'.repeat(58) + '╝')

  const inputFile = opts.input || findLatestApprovedOutput()
  if (!inputFile) {
    console.log('  ❌ 找不到 LLM output (output/*-bossModifier-approved.json or *-bossTooltip-*)')
    console.log('  ℹ 跑批 cmd:')
    console.log('     ANTHROPIC_API_KEY=... node run.mjs --voice V1 --type bossModifier --all')
    console.log('     ANTHROPIC_API_KEY=... node run.mjs --voice V6 --type bossTooltip --all')
    process.exit(1)
  }
  console.log(`  Input: ${inputFile}`)
  console.log(`  Target: ${TARGET_FILE}`)

  const entries = JSON.parse(readFileSync(inputFile, 'utf-8'))
  console.log(`  Entries: ${entries.length}`)

  console.log('\n  Validators check ...')
  let totalErrors = 0
  for (const entry of entries) {
    const result = validateFragmentV41(entry.content || entry, entry.voice, { context: 'narrative_flavor' })
    if (!result.passed) {
      console.log(`    ✗ ${entry.id} (${entry.voice}) · ${result.errors.length} error(s)`)
      for (const e of result.errors.slice(0, 2)) console.log(`        ${e}`)
      totalErrors += result.errors.length
    }
  }
  if (totalErrors > 0) { console.error(`\n  ❌ ${totalErrors} errors`); process.exit(1) }
  console.log(`  ✅ ${entries.length} passed`)

  if (opts.check) return

  console.log('\n  ⚠ SKELETON · bossModifiers.ts AST 改写未实现')
  console.log('  ⚠ V6 placeholder runtime resolver 接入 NarrativeArchive (commit f36a331) 也需 Phase E 完整实施')
}

main().catch(err => { console.error('错误:', err); process.exit(1) })
