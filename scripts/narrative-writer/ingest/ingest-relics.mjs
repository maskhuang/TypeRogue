#!/usr/bin/env node
//
// ingest-relics.mjs (Phase E / spec §6.2 · SKELETON)
//
// 替换 src/src/data/relics.ts 中 v2.3 残留 flavor (58/95 entries) 为 v4.1 layered footnote。
//
// **状态**：SKELETON · pipeline 跑批前不可实跑。
// 跑批后 LLM 会把 V5 layered fragments 写入 output/<timestamp>-relic-approved.json，
// 此脚本读取该文件、按 relic id 映射、写入 relics.ts。
//
// CLI:
//   --input <path>  · 指定 LLM output JSON 路径（默认取最新 *-relic-approved.json）
//   --dry-run       · 不写文件，print diff
//   --check         · 跑 validators 验证 input
//   --apply         · 实际写文件（需 input 存在）

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { validateFragmentV41 } from '../validators/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const TARGET_FILE = join(PROJECT_ROOT, 'src', 'src', 'data', 'relics.ts')
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
  const files = readdirSync(OUTPUT_DIR).filter(f => /relic.*approved.*\.json$/.test(f))
  if (files.length === 0) return null
  files.sort().reverse()
  return join(OUTPUT_DIR, files[0])
}

// ════════════════════════════════════════════════════════
// Input contract (per SCHEMA.md §6 V5 layered)
// ════════════════════════════════════════════════════════
//
// LLM output JSON 数组，每条 entry 对应一个 relic：
//
// [
//   {
//     "schema_version": "v4.1",
//     "type": "relic",
//     "id": "combo_buffer",
//     "voice": "V5",
//     "metadata": { ... },
//     "content": {
//       "section_ref": "§???",  // optional · 部分 relic 不引用守则编号
//       "L1_recorder": { text_zh, text_en, anomaly_signal_density: 0 },
//       "L2_proofreader": { ... density 0-0.2 },
//       "L3_reviser": { ... density 0.2-0.5 },
//       "L4_author": { ... density 0.5-0.8 },
//       "state": "plain"
//     }
//   },
//   ...
// ]

async function main() {
  const opts = parseArgs()

  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   ingest-relics · Phase E ingest · SKELETON              ║')
  console.log('╚' + '═'.repeat(58) + '╝')
  console.log()

  const inputFile = opts.input || findLatestApprovedOutput()
  if (!inputFile) {
    console.log('  ❌ 找不到 LLM output（output/*-relic-approved.json）')
    console.log('  ℹ Phase E 跑批后才能 ingest。')
    console.log('  ℹ 跑批 cmd: ANTHROPIC_API_KEY=... node run.mjs --voice V5 --type relic --all')
    process.exit(1)
  }
  console.log(`  Input: ${inputFile}`)
  console.log(`  Target: ${TARGET_FILE}`)
  console.log()

  const raw = readFileSync(inputFile, 'utf-8')
  const entries = JSON.parse(raw)
  console.log(`  Entries: ${entries.length}`)

  // Validate
  console.log('━'.repeat(60))
  console.log('  Validators check')
  console.log('━'.repeat(60))
  let totalErrors = 0
  for (const entry of entries) {
    const result = validateFragmentV41(entry.content || entry, entry.voice || 'V5', { context: 'narrative_flavor' })
    if (!result.passed) {
      console.log(`  ✗ ${entry.id} · ${result.errors.length} error(s):`)
      for (const e of result.errors) console.log(`      ${e}`)
      totalErrors += result.errors.length
    }
  }
  if (totalErrors > 0) {
    console.error(`\n  ❌ ${totalErrors} validator error(s) — abort`)
    process.exit(1)
  }
  console.log(`  ✅ ${entries.length} entries passed`)

  if (opts.check) return

  // SKELETON: 实际 ingest 路径需要 parse relics.ts AST 并替换 flavor field
  // 简化路径（v0.1）：
  //   1. 读 relics.ts
  //   2. 对每个 entry，找 `id: 'combo_buffer'` 后续的 flavor 字段
  //   3. 用 v4.1 layered 替换
  //
  // 当前未实现 — 留 Phase E 跑批后 finalize（需要小心 TS AST 操作）。
  console.log()
  console.log('━'.repeat(60))
  console.log('  ⚠ SKELETON · 实际 TS AST 改写未实现')
  console.log('━'.repeat(60))
  console.log('  Phase E 跑批后 finalize：解析 relics.ts → 按 id 映射 → 写回 layered footnote。')
  console.log('  当前 input 已过 validators，可作为下一步 implementation 的 reference。')
  if (opts.dryRun) {
    console.log()
    console.log('  [DRY RUN] 输出 entry mapping preview:')
    for (const e of entries.slice(0, 5)) {
      console.log(`    ${e.id} · L1 zh: "${e.content?.L1_recorder?.text_zh || '(missing)'}"`)
    }
    if (entries.length > 5) console.log(`    ... (${entries.length - 5} more)`)
  }
}

main().catch(err => { console.error('错误:', err); process.exit(1) })
