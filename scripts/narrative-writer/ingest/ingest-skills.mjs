#!/usr/bin/env node
//
// ingest-skills.mjs (Phase E / spec §6.2 · SKELETON)
//
// 替换 src/src/data/skillGeneration.ts 中 v2.3 残留 flavor (~85% entries)
// 为 v4.1 D25 v2 anomaly expression channel framing。
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
const TARGET_FILE = join(PROJECT_ROOT, 'src', 'src', 'data', 'skillGeneration.ts')
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
  const files = readdirSync(OUTPUT_DIR).filter(f => /(?:affix|skill).*approved.*\.json$/.test(f))
  if (files.length === 0) return null
  files.sort().reverse()
  return join(OUTPUT_DIR, files[0])
}

// ════════════════════════════════════════════════════════
// Input contract:
//
// 每个 affix entry：
// [
//   {
//     "type": "affix",
//     "id": "convert_a",
//     "voice": "V5",  // 或 V3 (anomaly fragment) / V1 (boilerplate)
//     "content": { L1-L4 layered }
//   }
// ]
// ════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs()

  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   ingest-skills · Phase E ingest · SKELETON              ║')
  console.log('╚' + '═'.repeat(58) + '╝')

  const inputFile = opts.input || findLatestApprovedOutput()
  if (!inputFile) {
    console.log('  ❌ 找不到 LLM output (output/*-affix-approved.json)')
    console.log('  ℹ 跑批 cmd: ANTHROPIC_API_KEY=... node run.mjs --voice V5 --type affix --all')
    process.exit(1)
  }
  console.log(`  Input: ${inputFile}`)
  console.log(`  Target: ${TARGET_FILE}`)

  const entries = JSON.parse(readFileSync(inputFile, 'utf-8'))
  console.log(`  Entries: ${entries.length}`)

  console.log('\n  Validators check ...')
  let totalErrors = 0
  for (const entry of entries) {
    const result = validateFragmentV41(entry.content || entry, entry.voice || 'V5', { context: 'narrative_flavor' })
    if (!result.passed) {
      console.log(`    ✗ ${entry.id} · ${result.errors.length} error(s)`)
      for (const e of result.errors.slice(0, 2)) console.log(`        ${e}`)
      totalErrors += result.errors.length
    }
  }
  if (totalErrors > 0) { console.error(`\n  ❌ ${totalErrors} errors`); process.exit(1) }
  console.log(`  ✅ ${entries.length} passed`)

  if (opts.check) return

  console.log('\n  ⚠ SKELETON · skillGeneration.ts AST 改写未实现 (Phase E 跑批后 finalize)')
}

main().catch(err => { console.error('错误:', err); process.exit(1) })
