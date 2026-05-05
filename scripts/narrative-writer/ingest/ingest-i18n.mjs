#!/usr/bin/env node
//
// ingest-i18n.mjs (Phase E / spec §6.2)
//
// 把 audit 文档（narrative-iron-rule-audit-2026-05-04.md）Tier 1A/1B/2A/2B 的违规
// i18n key surgical 替换到 src/src/demo/demo-i18n.ts。
//
// 重要：本脚本**默认 --dry-run**，需明确加 --apply 才实际写文件。
// 因为 i18n 文件直接影响 game UI，错误改动会破坏现有玩家界面。
//
// CLI:
//   node ingest-i18n.mjs            · dry-run（默认）
//   node ingest-i18n.mjs --dry-run  · 同上，显式
//   node ingest-i18n.mjs --apply    · 实际写文件（确认后用）
//   node ingest-i18n.mjs --check    · 只验证替换表内容不冲突，不动文件

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { validateFragmentV41 } from '../validators/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const TARGET_FILE = join(PROJECT_ROOT, 'src', 'src', 'demo', 'demo-i18n.ts')

// ════════════════════════════════════════════════════════
// audit 文档 Tier 1A/1B/2A/2B 替换表
//
// Source: docs/implementation-artifacts/narrative-iron-rule-audit-2026-05-04.md
// Each entry: { key, oldValue (现 i18n 值), newValue (v4.1 替换), tier, ... }
//
// **§4.1 redirect 影响**：
//   - class_select.lock_* → 用 denial L1 节录（取自 generated/position-denial-affirmation.mjs）
//   - tutorial.L5_class_unlock_* → **整 key 删除**（无 popup）
// ════════════════════════════════════════════════════════

import { POSITION_DENIAL_AFFIRMATION_PAIRS } from '../generated/position-denial-affirmation.mjs'

// 从 deny→affirm pairs 提取 denial L1 节录
function denialL1(position, lang = 'zh') {
  const pair = POSITION_DENIAL_AFFIRMATION_PAIRS.find(p => p.references_position === position)
  if (!pair) return null
  const text = pair.denial.L1_recorder?.[`text_${lang}`]
  if (!text) return null
  // 节录 — 仅取第一句（class picker locked card 单行展示）
  const firstSentence = text.split(/[。.]/)[0] + '。'
  return firstSentence
}

export const I18N_REPLACEMENTS = [
  // ────────── Tier 1A · 解锁字眼（zh）──────────
  {
    key: 'class_select.lock_wordsmith',
    tier: '1A',
    lang: 'zh',
    oldValue: '🔒 通关一次解锁',
    newValue: denialL1('author', 'zh') || '守则 122：编制内无"作者"职位。',
    note: '改为 §122 author denial L1 节录（§4.1 redirect）',
  },
  {
    key: 'class_select.lock_metamorph',
    tier: '1A',
    lang: 'zh',
    oldValue: '🔒 用造词师通关一次解锁',
    newValue: denialL1('reviser', 'zh') || '守则 087：本工位不存在"修改者"职级。',
    note: '改为 §087 reviser denial L1 节录',
  },
  {
    key: 'class_select.lock_none',
    tier: '1A',
    lang: 'zh',
    oldValue: '🔒 未解锁',
    newValue: '编制外',
    note: 'none 实际不锁，dead key（DEFER 验证 game 代码是否仍引用）',
  },
  {
    key: 'tutorial.L5_class_unlock_title',
    tier: '1A',
    lang: 'zh',
    oldValue: '职业解锁',
    newValue: null,  // null = 删除 key
    note: 'L5 整步删除（无 popup · §4.1 redirect）；TutorialMode.ts 后续工单移除 step',
  },
  {
    key: 'tutorial.L5_class_unlock_body',
    tier: '1A',
    lang: 'zh',
    oldValue: '职业解锁了！每个职业有独特资源和专属机制，但也会失去一种通用能力',
    newValue: null,
    note: '同上',
  },
  {
    key: 'tutorial.L3_enchant_unlock_title',
    tier: '1A',
    lang: 'zh',
    oldValue: '附魔解锁',
    newValue: '附注权限就位',
    note: '保留 step（附魔仍是 game mechanic）但去解锁词',
  },
  {
    key: 'tutorial.L3_enchant_unlock_body',
    tier: '1A',
    lang: 'zh',
    oldValue: '技能满级了！选择一个附魔：学徒型随使用次数永久成长，任务型完成特定目标获得永久加成',
    newValue: '该技能等级满后含附注位。选择一项：学徒型随使用次数永久成长；任务型完成特定目标后永久加成。',
    note: '去 fanfare 句式 + passive voice 重写',
  },
  {
    key: 'ascension.unlocked',
    tier: '1A',
    lang: 'zh',
    oldValue: '🏆 Ascension {level} 已解锁！',
    newValue: 'KPI 周期 {level} 已结算',
    note: '去 emoji + 解锁 + ! · 改为 V1 boilerplate',
  },
  {
    key: 'battle.unlock_endless',
    tier: '1A',
    lang: 'zh',
    oldValue: '用全部三个职业各通关一次即可解锁无尽模式',
    newValue: '三个职业全部通关后，转入特殊勤务',
    note: '去解锁字眼 · 用 V1 转岗术语',
  },

  // ────────── Tier 1A 英文镜像 ──────────
  {
    key: 'class_select.lock_wordsmith',
    tier: '1A',
    lang: 'en',
    oldValue: '🔒 Clear once to unlock',
    newValue: 'Rule 122: No "author" position exists in establishment.',
    note: '英文 mirror',
  },
  {
    key: 'class_select.lock_metamorph',
    tier: '1A',
    lang: 'en',
    oldValue: '🔒 Clear with Wordsmith to unlock',
    newValue: 'Rule 087: This workstation has no "reviser" position.',
    note: '英文 mirror',
  },
  {
    key: 'class_select.lock_none',
    tier: '1A',
    lang: 'en',
    oldValue: '🔒 Locked',
    newValue: 'Out of establishment',
    note: '英文 mirror',
  },
  {
    key: 'ascension.unlocked',
    tier: '1A',
    lang: 'en',
    oldValue: '🏆 Ascension {level} Unlocked!',
    newValue: 'KPI cycle {level} settled',
    note: '英文 mirror',
  },
  {
    key: 'battle.unlock_endless',
    tier: '1A',
    lang: 'en',
    oldValue: 'Clear with all 3 classes to unlock Endless Mode',
    newValue: 'After all three classes are cleared, transferred to special assignment',
    note: '英文 mirror',
  },

  // ────────── Tier 1B · 配发 / 批准 / 许可（修复部分）──────────
  {
    key: 'hb.section_3_li_2',
    tier: '1B',
    lang: 'zh',
    oldValue: '已配发之工件视同分内职责，不得退还。',
    newValue: '经手工件视同分内职责，不得退还。',
    note: 'V5 守则 · D26 v2 直接冲突；in-character stamp 保留（156/168/433/491 不动）',
  },
  {
    key: 'class_select.starter_relic',
    tier: '1B',
    lang: 'zh',
    oldValue: '配发工件',
    newValue: '经手工件',
    note: 'class picker UI label · 去"分发"语义',
  },
  {
    key: 'relic_picker.starter_title',
    tier: '1B',
    lang: 'zh',
    oldValue: '签发清单 · 配发工件',
    newValue: '签发清单 · 经手工件',
    note: '同上',
  },

  // ────────── Tier 2A · fanfare emoji + 感叹号 ──────────
  {
    key: 'tutorial.complete.title',
    tier: '2A',
    lang: 'zh',
    oldValue: '🎉 教程完成！',
    newValue: '录入员 L0 准入登记 · 完结',
    note: '去 emoji + 感叹 · 改 V1 boilerplate',
  },
  {
    key: 'tutorial.complete.body',
    tier: '2A',
    lang: 'zh',
    oldValue: '你已经学会了核心机制。祝你好运，打字勇者！',
    newValue: '自下批次起独立轮值。值班表已下发。',
    note: '🚨 fantasy hero framing 必删 · 改 V1',
  },
  {
    key: 'craft.completed',
    tier: '2A',
    lang: 'zh',
    oldValue: '✨ 词语组装完成: {word}',
    newValue: '已经手词条: {word}',
    note: '',
  },
  {
    key: 'ritual.title',
    tier: '2A',
    lang: 'zh',
    oldValue: '✨ 附魔仪式 ✨',
    newValue: '附注台 · 流程 6',
    note: '',
  },
  {
    key: 'ritual.pick_enchant',
    tier: '2A',
    lang: 'zh',
    oldValue: '✨ 附魔成功！选择一个附魔',
    newValue: '附注流程已就位 · 选择一项',
    note: '',
  },
  {
    key: 'ritual.applied',
    tier: '2A',
    lang: 'zh',
    oldValue: '{icon} {name} 已附魔到 {skill}！',
    newValue: '{icon} {name} 已绑定 {skill}',
    note: '',
  },
  {
    key: 'ritual.applied_generic',
    tier: '2A',
    lang: 'zh',
    oldValue: '附魔完成！',
    newValue: '附注完成',
    note: '',
  },
  {
    key: 'rest.ench_trial.success',
    tier: '2A',
    lang: 'zh',
    oldValue: '✨ 试炼通过！',
    newValue: '打字测试 · 通过',
    note: '',
  },
  {
    key: 'shop.enchant_choose',
    tier: '2A',
    lang: 'zh',
    oldValue: '✨ 附魔选择 — {name} (免费!) ✨',
    newValue: '附注 · {name} · 本批免费',
    note: '',
  },
  {
    key: 'shop.enchant_select_title',
    tier: '2A',
    lang: 'zh',
    oldValue: '✨ 附魔台 ✨',
    newValue: '附注台',
    note: '',
  },

  // ────────── Tier 2B · "获得 X !" 句式 ──────────
  {
    key: 'shop.got_relic',
    tier: '2B',
    lang: 'zh',
    oldValue: '获得遗物 {icon} {name}!',
    newValue: '已签出: {icon} {name}',
    note: '',
  },
  {
    key: 'shop.got_skill',
    tier: '2B',
    lang: 'zh',
    oldValue: '获得 {name}!',
    newValue: '已签出: {name}',
    note: '',
  },
  {
    key: 'battle.skills_owned',
    tier: '2B',
    lang: 'zh',
    oldValue: '获得技能: {count}',
    newValue: '已签出技能: {count}',
    note: '',
  },
  {
    key: 'relic.replace',
    tier: '2B',
    lang: 'zh',
    oldValue: '替换遗物！获得 {icon} {name}，卖出 +{banana}',
    newValue: '当批工件已替换 · {icon} {name} · 退还 +{banana}',
    note: '',
  },
  {
    key: 'relic.slots_full',
    tier: '2B',
    lang: 'zh',
    oldValue: '槽位已满！选择要替换的遗物（获得 {icon} {name}）',
    newValue: '数字行槽位已满 · 选择一项替换 ({icon} {name})',
    note: '',
  },
  {
    key: 'rest.buff.r',
    tier: '2B',
    lang: 'zh',
    oldValue: '获得临时增强：+8s时间、+0.5x倍率！',
    newValue: '临时调度: +8s 时间 · +0.5× 倍率',
    note: '',
  },
  {
    key: 'rest.intermission.r',
    tier: '2B',
    lang: 'zh',
    oldValue: '获得25香蕉和2次免费刷新！',
    newValue: '当批补贴: 25 香蕉 · 2 次免费换批',
    note: '',
  },
]

// ════════════════════════════════════════════════════════
// 工具函数
// ════════════════════════════════════════════════════════

function parseArgs() {
  return {
    dryRun: !process.argv.includes('--apply'),
    apply: process.argv.includes('--apply'),
    check: process.argv.includes('--check'),
  }
}

function findKeyInI18nFile(content, key) {
  // 匹配 'key': 'value', 或 'key': "value", · 多行不支持（demo-i18n.ts 用单行）
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`('${escapedKey}'\\s*:\\s*)'((?:[^'\\\\]|\\\\.)*)'`, 'g')
  const matches = []
  let m
  while ((m = re.exec(content)) !== null) {
    matches.push({ index: m.index, full: m[0], prefix: m[1], oldValue: m[2] })
  }
  return matches
}

function checkReplacementValidity() {
  console.log('━'.repeat(60))
  console.log('  Replacement table validators check')
  console.log('━'.repeat(60))
  let totalErrors = 0
  for (const r of I18N_REPLACEMENTS) {
    if (r.newValue === null) {
      console.log(`  ⊘ ${r.key} [${r.lang}] · DELETE`)
      continue
    }
    // newValue 跑 validateFragmentV41 (V1, system_message context)
    const fakeFragment = { text_zh: r.lang === 'zh' ? r.newValue : '', text_en: r.lang === 'en' ? r.newValue : '', length_class: 'short' }
    const result = validateFragmentV41(fakeFragment, 'V1', { context: 'system_message' })
    if (!result.passed) {
      console.log(`  ✗ ${r.key} [${r.lang}] · ${result.errors.length} error(s):`)
      for (const e of result.errors) console.log(`      ${e}`)
      totalErrors += result.errors.length
    } else {
      console.log(`  ✓ ${r.key} [${r.lang}]`)
    }
  }
  return totalErrors
}

// ════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs()

  console.log('╔' + '═'.repeat(58) + '╗')
  console.log('║   ingest-i18n · Phase E ingest                           ║')
  console.log('╚' + '═'.repeat(58) + '╝')
  console.log()
  console.log(`  Source: I18N_REPLACEMENTS (inline table · ${I18N_REPLACEMENTS.length} entries)`)
  console.log(`  Target: ${TARGET_FILE}`)
  console.log()

  if (opts.check) {
    const errors = checkReplacementValidity()
    if (errors > 0) { console.error(`\n  ❌ ${errors} validator error(s)`); process.exit(1) }
    console.log('\n  ✅ All replacements pass v4.1 validators')
    return
  }

  // 验证 + 跑替换
  const errors = checkReplacementValidity()
  if (errors > 0) { console.error(`\n  ❌ ${errors} validator error(s) — abort`); process.exit(1) }

  if (!existsSync(TARGET_FILE)) {
    console.error(`  ❌ target 文件不存在: ${TARGET_FILE}`)
    process.exit(1)
  }

  const original = readFileSync(TARGET_FILE, 'utf-8')
  let content = original
  const summary = []

  for (const r of I18N_REPLACEMENTS) {
    const matches = findKeyInI18nFile(content, r.key)
    // 中英 i18n 在同一文件，多次 occurrences
    if (matches.length === 0) {
      summary.push({ key: r.key, lang: r.lang, status: 'NOT FOUND' })
      continue
    }

    // 选择 lang 对应的 occurrence（demo-i18n 第一个是 zh，第二个是 en，按文件顺序）
    const idx = r.lang === 'zh' ? 0 : (matches.length > 1 ? 1 : -1)
    if (idx < 0) {
      summary.push({ key: r.key, lang: r.lang, status: 'LANG MISSING' })
      continue
    }
    const m = matches[idx]
    if (m.oldValue !== r.oldValue.replace(/'/g, "\\'")
        && m.oldValue !== r.oldValue) {
      summary.push({
        key: r.key, lang: r.lang, status: 'OLDVALUE MISMATCH',
        actual: m.oldValue, expected: r.oldValue,
      })
      continue
    }

    if (r.newValue === null) {
      // delete entire line containing this key
      // simplified: replace key with a comment placeholder; actual line removal needs more parsing
      summary.push({ key: r.key, lang: r.lang, status: 'DELETE (manual review needed)' })
      continue
    }

    // 替换
    const escaped = r.newValue.replace(/'/g, "\\'")
    const replacement = `${m.prefix}'${escaped}'`
    content = content.substring(0, m.index) + replacement + content.substring(m.index + m.full.length)
    summary.push({ key: r.key, lang: r.lang, status: 'REPLACED' })
  }

  // 输出 summary
  console.log()
  console.log('━'.repeat(60))
  console.log('  Replacement summary')
  console.log('━'.repeat(60))
  for (const s of summary) {
    const symbol = s.status === 'REPLACED' ? '✓' : s.status === 'NOT FOUND' ? '?' : s.status === 'DELETE (manual review needed)' ? '⊘' : '✗'
    console.log(`  ${symbol} ${s.key} [${s.lang}] · ${s.status}`)
    if (s.actual) console.log(`      actual:   ${s.actual}`)
    if (s.expected) console.log(`      expected: ${s.expected}`)
  }

  const replacedCount = summary.filter(s => s.status === 'REPLACED').length
  const notFoundCount = summary.filter(s => s.status === 'NOT FOUND').length
  const mismatchCount = summary.filter(s => s.status === 'OLDVALUE MISMATCH').length
  const deleteCount = summary.filter(s => s.status === 'DELETE (manual review needed)').length

  console.log()
  console.log(`  Total: ${summary.length} entries · ${replacedCount} replaced · ${notFoundCount} not found · ${mismatchCount} mismatch · ${deleteCount} delete (manual)`)

  if (opts.dryRun) {
    console.log()
    console.log('━'.repeat(60))
    console.log('  [DRY RUN] 不写文件 · 添加 --apply 实际写入')
    console.log('━'.repeat(60))
    console.log(`  原文件 ${original.length} chars → 改后 ${content.length} chars (Δ ${content.length - original.length})`)
    return
  }

  if (mismatchCount > 0) {
    console.error('\n  ❌ 有 OLDVALUE MISMATCH — abort （请先确认 i18n 现状是否变化）')
    process.exit(1)
  }

  // 实际写入
  writeFileSync(TARGET_FILE, content, 'utf-8')
  console.log()
  console.log(`  ✅ 已写入: ${TARGET_FILE}`)
  console.log(`     ${replacedCount} entries replaced`)
  if (deleteCount > 0) {
    console.log(`     ⚠ ${deleteCount} delete entries 标记 — 需 manual review (整 key 删除需 grep 调用点)`)
  }
}

main().catch(err => { console.error('错误:', err); process.exit(1) })
