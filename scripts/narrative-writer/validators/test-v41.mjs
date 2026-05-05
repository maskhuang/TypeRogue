#!/usr/bin/env node
//
// v4.1 validators 单测脚本（Phase D / spec §5.3）
//
// Usage: node scripts/narrative-writer/validators/test-v41.mjs
//
// Each validator: 1 positive (valid input → 0 errors) + 1 negative (invalid → reject with expected error).
// Plus: 真实 Phase C 数据全部 pass（4 对 entries / 5 sample rules / 10 patterns）。

import {
  checkV3Residue,
  checkAuditTier1Banned,
  checkFanfarePattern,
  checkLayeredStratification,
  checkDenialAffirmationVocabulary,
  checkPlaceholderSyntax,
  checkPIInternalNameLeakage,
  checkClassRenamingConsistency,
  validateFragmentV41,
} from './index.mjs'

import { POSITION_DENIAL_AFFIRMATION_PAIRS } from '../generated/position-denial-affirmation.mjs'
import { REDACTION_VERSIONED_RULES } from '../generated/redaction-versioning.mjs'
import { CHAR_DRIFT_PATTERNS } from '../generated/char-drift-patterns.mjs'

let pass = 0, fail = 0
const FAILURES = []

function assertPass(name, errors) {
  if (errors.length === 0) {
    pass++; console.log(`  ✓ ${name}`)
  } else {
    fail++; FAILURES.push({ name, errors })
    console.log(`  ✗ ${name} — got ${errors.length} error(s):\n    ${errors.join('\n    ')}`)
  }
}

function assertReject(name, errors, expectedSubstring) {
  const matched = errors.some(e => !expectedSubstring || e.includes(expectedSubstring))
  if (errors.length > 0 && matched) {
    pass++; console.log(`  ✓ ${name} (rejected with: "${expectedSubstring || 'any'}")`)
  } else {
    fail++; FAILURES.push({ name, errors, expectedSubstring })
    console.log(`  ✗ ${name} — expected reject containing "${expectedSubstring}", got: ${errors.length === 0 ? 'NO REJECT' : errors.join(' | ')}`)
  }
}

// ════════════════════════════════════════════════════════
// 1 · checkV3Residue
// ════════════════════════════════════════════════════════
console.log('\n── 1 · checkV3Residue ──')

assertPass(
  'V3 残留 zh：v4.1 合法文本',
  checkV3Residue('员工 [工号] 转入独立工位。本职位无配额。', 'zh')
)
assertReject(
  'V3 残留 zh：含 "三轨映射"',
  checkV3Residue('应用三轨映射处理流程', 'zh'),
  '三轨映射'
)
assertReject(
  'V3 残留 zh：含 "主任"',
  checkV3Residue('Stage 5 主任突袭检查', 'zh'),
  '主任'
)
assertReject(
  'V3 残留 zh：含 "灵长类辅助文书部"',
  checkV3Residue('您是灵长类辅助文书部的雇员', 'zh'),
  '灵长类辅助文书部'
)
assertReject(
  'V3 残留 en：含 "FRP"',
  checkV3Residue('Apply FRP protocol next cycle', 'en'),
  'FRP'
)

// ════════════════════════════════════════════════════════
// 2 · checkAuditTier1Banned (context-sensitive)
// ════════════════════════════════════════════════════════
console.log('\n── 2 · checkAuditTier1Banned ──')

assertPass(
  'audit Tier 1 zh：narrative_flavor context 允许 "解锁"',
  checkAuditTier1Banned('某些条件下解锁额外权限', 'zh', 'narrative_flavor')
)
assertPass(
  'audit Tier 1 zh：in_character_stamp 允许 "许可"',
  checkAuditTier1Banned('ASSIGNED 许可', 'zh', 'in_character_stamp')
)
assertReject(
  'audit Tier 1 zh：system_message 拒绝 "解锁了"',
  checkAuditTier1Banned('🏆 Ascension 5 已解锁了！', 'zh', 'system_message'),
  '解锁'
)
assertReject(
  'audit Tier 1 en：system_message 拒绝 "Unlocked"',
  checkAuditTier1Banned('Achievement Unlocked', 'en', 'system_message'),
  'Unlocked'
)

// ════════════════════════════════════════════════════════
// 3 · checkFanfarePattern
// ════════════════════════════════════════════════════════
console.log('\n── 3 · checkFanfarePattern ──')

assertPass(
  'Fanfare：V2 同事便条不约束',
  checkFanfarePattern('🎉 想回去：少思考！', 'V2')
)
assertPass(
  'Fanfare：V1 干净 boilerplate',
  checkFanfarePattern('员工 [工号] 转入独立工位。', 'V1')
)
assertReject(
  'Fanfare：V1 含 emoji',
  checkFanfarePattern('🎉 教程完成', 'V1'),
  'fanfare emoji'
)
assertReject(
  'Fanfare：V1 含感叹号',
  checkFanfarePattern('员工已签到！', 'V1'),
  '感叹号'
)
assertReject(
  'Fanfare：V5 含 "Welcome to"',
  checkFanfarePattern('Welcome to your new position', 'V5'),
  'power fantasy'
)

// ════════════════════════════════════════════════════════
// 4 · checkLayeredStratification
// ════════════════════════════════════════════════════════
console.log('\n── 4 · checkLayeredStratification ──')

assertPass(
  'Layered：4 层 density 单调递增正确',
  checkLayeredStratification({
    L1_recorder: { text_zh: '...', text_en: '...', anomaly_signal_density: 0 },
    L2_proofreader: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.1 },
    L3_reviser: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.35 },
    L4_author: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.6 },
  })
)
assertReject(
  'Layered：L1 density != 0',
  checkLayeredStratification({
    L1_recorder: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.3 },
    L4_author: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.6 },
  }),
  '超出范围'
)
assertReject(
  'Layered：density 反向递减',
  checkLayeredStratification({
    L1_recorder: { text_zh: '...', text_en: '...', anomaly_signal_density: 0 },
    L2_proofreader: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.15 },
    L3_reviser: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.05 },
    L4_author: { text_zh: '...', text_en: '...', anomaly_signal_density: 0.6 },
  }),
  '反向递减'
)

// ════════════════════════════════════════════════════════
// 5 · checkDenialAffirmationVocabulary
// ════════════════════════════════════════════════════════
console.log('\n── 5 · checkDenialAffirmationVocabulary ──')

const goodPair = {
  references_position: 'reviser',
  denial: {
    L1_recorder: { text_zh: '本工位不存在修改者职级。', text_en: 'No reviser position.', anomaly_signal_density: 0 },
    L2_proofreader: { text_zh: '相关流程已封存。', text_en: 'Procedure sealed.', anomaly_signal_density: 0.1 },
    L3_reviser: null,
    L4_author: null,
  },
  affirmation: {
    L1_recorder: { text_zh: '修改者经手词条进入特殊勤务流程。', text_en: 'Reviser entries enter special procedure.', anomaly_signal_density: 0 },
    L2_proofreader: { text_zh: '本流程仅用于 reclassify。', text_en: 'Procedure for reclassify only.', anomaly_signal_density: 0.1 },
    L3_reviser: { text_zh: '历史更替备忘。', text_en: 'Historical changes memo.', anomaly_signal_density: 0.4 },
    L4_author: { text_zh: '原始来源 1986 受理窗口扩建。', text_en: '1986 acceptance window expansion.', anomaly_signal_density: 0.6 },
  },
}
assertPass('Pair：合法 denial+affirmation', checkDenialAffirmationVocabulary(goodPair))

assertReject(
  'Pair：denial L1 含 "目前"',
  checkDenialAffirmationVocabulary({
    ...goodPair,
    denial: { ...goodPair.denial, L1_recorder: { text_zh: '目前不存在修改者职级。', text_en: 'Currently no reviser position.', anomaly_signal_density: 0 } },
  }),
  '目前'
)
assertReject(
  'Pair：denial L3 不为 null',
  checkDenialAffirmationVocabulary({
    ...goodPair,
    denial: { ...goodPair.denial, L3_reviser: { text_zh: '不该存在', anomaly_signal_density: 0.3 } },
  }),
  'L3_reviser 必须 null'
)
assertReject(
  'Pair：affirmation L1 含 "新增"',
  checkDenialAffirmationVocabulary({
    ...goodPair,
    affirmation: { ...goodPair.affirmation, L1_recorder: { text_zh: '新增修改者岗位。', text_en: 'Newly added position.', anomaly_signal_density: 0 } },
  }),
  '新增'
)
assertReject(
  'Pair：assimilated affirmation 必须 null',
  checkDenialAffirmationVocabulary({
    ...goodPair,
    references_position: 'assimilated',
    affirmation: goodPair.affirmation,  // 不该非 null
  }),
  'assimilated'
)

// ════════════════════════════════════════════════════════
// 6 · checkPlaceholderSyntax
// ════════════════════════════════════════════════════════
console.log('\n── 6 · checkPlaceholderSyntax ──')

assertPass(
  'Placeholder：合法 ATTRIBUTION',
  checkPlaceholderSyntax('上一任作者: {{ATTRIBUTION:type=current_player_worker_id}}')
)
assertPass(
  'Placeholder：合法 MODIFIER_TEXT',
  checkPlaceholderSyntax('本场 modifier: {{MODIFIER_TEXT:source=player_history,chapter=3}}')
)
assertReject(
  'Placeholder：未知 family',
  checkPlaceholderSyntax('{{FAKE_FAMILY:type=garbage}}'),
  'family 未登记'
)
assertReject(
  'Placeholder：未登记 signature',
  checkPlaceholderSyntax('{{ATTRIBUTION:type=invented_type}}'),
  'signature 未登记'
)

// ════════════════════════════════════════════════════════
// 7 · checkPIInternalNameLeakage
// ════════════════════════════════════════════════════════
console.log('\n── 7 · checkPIInternalNameLeakage ──')

assertPass(
  'PI leak：合法文本（含 DPCA 缩写）',
  checkPIInternalNameLeakage('员工签到 DPCA 第七打字室', 'V1')
)
assertReject(
  'PI leak：含 "灵长接口"',
  checkPIInternalNameLeakage('打开灵长接口 settings 面板', 'V1'),
  '灵长接口'
)
assertReject(
  'PI leak：含 "Primate Interface"',
  checkPIInternalNameLeakage('Open the Primate Interface', 'V1'),
  'Primate Interface'
)
assertReject(
  'PI leak：含 "灵长类辅助文书部"（DPCA forbidden_in_ui）',
  checkPIInternalNameLeakage('欢迎来到灵长类辅助文书部', 'V1'),
  'DPCA 命名违规'
)

// ════════════════════════════════════════════════════════
// 8 · checkClassRenamingConsistency
// ════════════════════════════════════════════════════════
console.log('\n── 8 · checkClassRenamingConsistency ──')

assertPass(
  'Class id：narrative tier id 合法',
  checkClassRenamingConsistency('录入员晋升至校对者，再到修改者 / 作者 / 文本一部分')
)
assertReject(
  'Class id：含 v3.1 残留 "文字工匠"',
  checkClassRenamingConsistency('文字工匠职业 specifications'),
  '文字工匠'
)
assertReject(
  'Class id：含 v3.1 残留 "异体抄录员"',
  checkClassRenamingConsistency('异体抄录员手册'),
  '异体抄录员'
)
assertReject(
  'Class id：flavor 中含 "类别: wordsmith"',
  checkClassRenamingConsistency('员工 [工号] · 类别: wordsmith · 经手词条'),
  'code id 出现在 flavor'
)

// ════════════════════════════════════════════════════════
// 9 · validateFragmentV41 集成测试 — Phase C 真实数据全部 pass
// ════════════════════════════════════════════════════════
console.log('\n── 9 · 集成 · Phase C 真实数据 pass 验证 ──')

console.log('  [position-denial-affirmation 4 对 entries]')
for (const pair of POSITION_DENIAL_AFFIRMATION_PAIRS) {
  const result = validateFragmentV41(pair, 'V5_pair', { context: 'narrative_flavor' })
  if (result.passed) {
    pass++; console.log(`    ✓ ${pair.section_ref}`)
  } else {
    fail++; FAILURES.push({ name: pair.section_ref, errors: result.errors })
    console.log(`    ✗ ${pair.section_ref} — ${result.errors.length} error(s):\n      ${result.errors.join('\n      ')}`)
  }
}

console.log('  [redaction-versioning 5 sample rules]')
for (const rule of REDACTION_VERSIONED_RULES) {
  for (const ver of rule.versions) {
    const fakeFragment = {
      L1_recorder: ver.L1_recorder,
      L2_proofreader: null,
      L3_reviser: null,
      L4_author: null,
    }
    const result = validateFragmentV41(fakeFragment, 'V5', { context: 'narrative_flavor' })
    if (result.passed) {
      pass++; console.log(`    ✓ ${rule.section_ref} v${ver.version}`)
    } else {
      fail++; FAILURES.push({ name: `${rule.section_ref} v${ver.version}`, errors: result.errors })
      console.log(`    ✗ ${rule.section_ref} v${ver.version} — ${result.errors.length} error(s):\n      ${result.errors.join('\n      ')}`)
    }
  }
}

console.log('  [char-drift-patterns 10 patterns · drift_pattern fragment_zh shouldn\'t leak v3 residue]')
for (const pat of CHAR_DRIFT_PATTERNS) {
  // V3 fragment 用 stages[0] 作为 fragment_zh sample
  const fakeFragment = {
    fragment_zh: pat.stages[0] || '',
    fragment_en: '',
    drift_pattern: pat.stages,
    readability: 'self_consistent_but_alien',
  }
  const result = validateFragmentV41(fakeFragment, 'V3', { context: 'narrative_flavor' })
  if (result.passed) {
    pass++; console.log(`    ✓ ${pat.id}`)
  } else {
    fail++; FAILURES.push({ name: pat.id, errors: result.errors })
    console.log(`    ✗ ${pat.id} — ${result.errors.length} error(s):\n      ${result.errors.join('\n      ')}`)
  }
}

// ════════════════════════════════════════════════════════
// 10 · audit 文档负面样本必拒
// ════════════════════════════════════════════════════════
console.log('\n── 10 · audit 文档原文必须 reject ──')

// audit Tier 1A `tutorial.L5_class_unlock_body` 现状（必 reject）
const auditNegativeV1 = {
  text_zh: '职业解锁了！每个职业有独特资源和专属机制，但也会失去一种通用能力',
  text_en: 'Class unlocked! Each class has unique resources',
  length_class: 'short',
}
const auditResult = validateFragmentV41(auditNegativeV1, 'V1', { context: 'system_message' })
if (!auditResult.passed) {
  pass++; console.log(`  ✓ audit Tier 1A "职业解锁了！" reject (${auditResult.errors.length} errors)`)
} else {
  fail++; FAILURES.push({ name: 'audit Tier 1A negative', errors: ['expected reject but passed'] })
  console.log(`  ✗ audit Tier 1A negative - SHOULD HAVE REJECTED`)
}

// audit Tier 2A `ascension.unlocked` 现状（必 reject）
const auditNegativeAsc = {
  text_zh: '🏆 Ascension {level} 已解锁！',
  text_en: '🏆 Ascension {level} Unlocked!',
  length_class: 'short',
}
const ascResult = validateFragmentV41(auditNegativeAsc, 'V1', { context: 'system_message' })
if (!ascResult.passed) {
  pass++; console.log(`  ✓ audit Tier 2A "🏆 Ascension!" reject (${ascResult.errors.length} errors)`)
} else {
  fail++; FAILURES.push({ name: 'audit Tier 2A negative', errors: ['expected reject but passed'] })
  console.log(`  ✗ audit Tier 2A negative - SHOULD HAVE REJECTED`)
}

// ════════════════════════════════════════════════════════
// Summary
// ════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60))
console.log(`  Result: ${pass} pass / ${fail} fail`)
console.log('═'.repeat(60))

if (fail > 0) {
  console.log('\n失败详情:')
  for (const f of FAILURES) {
    console.log(`  - ${f.name}`)
    if (f.errors) {
      for (const e of f.errors) console.log(`      ${e}`)
    }
    if (f.expectedSubstring) console.log(`      expected: "${f.expectedSubstring}"`)
  }
  process.exit(1)
}

console.log('\n✅ All tests pass · Phase D ready for commit')
