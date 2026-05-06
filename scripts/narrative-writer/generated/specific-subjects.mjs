// Auto-derived from docs/narrative-design.md v4.1-late §2.6 specific subject sub-axis
// (LOCKED 2026-05-05 · post 5-tier 职业模型 calibration)
//
// MOKO 历史档案 specific research subjects · 5 anchor pool
//
// 5-tier 职业模型 (LOCKED)：
//   L1 录入员 / L2 校对员 / L3 修改员 / L4 作者     ← Cycle 1-5 base game · 全程 NO 灵长 frame
//   L5 猴子                                         ← Cycle 6+ endless · primate reveal step-function
//
// 双层 anchor 显化：
//   - **L4 (作者层) 显化 fictional archive_designation**（"Subject N-1976"等编号 anchor）
//     · base game 末段 / B7-B8 前响 · 玩家看到编号但不知 real-world lineage
//     · 仍属 fictional化语言（"具体研究项目档案已封存"）· 不暴露物种 / 真名
//   - **L5 (猴子 / endless) reveal real-world lineage**（N-1976 ≈ Nim Chimpsky · W-1965 ≈ Washoe ...）
//     · Cycle 6+ endless / B8 reveal 后段落 · 玩家此时已认知"作者"=lab subject
//     · 揭穿 archive_designation 与 1970s 灵长协议代际的对应关系
//
// IP-safe 要求：
//   - 用 fictional化 archive_designation（"Subject N-1976" 不直接复用"Nim"全名作 metadata key）
//   - 历史 era reference 保留作 lore（"1973-77 manual ASL"等是公共历史事实）
//   - L4_voice template 用 fictional化语言（"具体研究项目档案已封存"等）
//   - L5_endless_reveal 才允许显化 real-world subject 关联（"N-1976 即 Nim 协议样本编号"等）
//   - **绝不**复述 specific real-world catalog data / frequency stats / 具体 fates
//
// 关联 LOCKED：
//   - §4.5 Nim hidden tragedy core (B8 reveal)：N1976 是 singular tragedy core，其他
//     subjects 是 background lore（不及 N1976 的 emotional weight）
//   - §5.4.1 MOKO 3-step lineage：5 subjects 对应不同协议代际 anchor
//   - §2.6 4-axis tensor：subject 是 L4 fictional anchor + L5 real-lineage reveal 的双层 axis
//   - 大部分 relics 的 L4 用 generic "处置员工 [工号已封存]" / "前一代研究主体（项目档案已封存）"

export const SPECIFIC_SUBJECTS = {
  // ════════════════════════════════════════════════════════
  // N1976 · Nim-analogue · §4.5 hidden tragedy core (B8 reveal)
  // ════════════════════════════════════════════════════════
  N1976: {
    archive_designation: 'Subject N-1976',
    project_era: '1973-77 · manual ASL 训练协议代际 [1]',
    role: 'B8 reveal core (§4.5 LOCKED) · singular tragedy core',
    appears_in_subsystems: ['Boss Modifier', 'Scoring'],  // attribution / 评级 anchor
    appears_in_relic_count: 2,  // 1 in BM + 1 in Scoring
    L4_voice_template: '原始登记：MOKO 协议 1986-XX-XX。Subject N-1976 行为档案续档 · {项目时代 reference}。终末期 emergent text 协议续档 reference (§5.2 DPCA Genesis 神话源头)。',
    horror_weight: 'highest · §4.5 + §5.2 hidden tragedy core',
    historical_lineage_anchor: '协议代际 [1] manual ASL',
  },

  // ════════════════════════════════════════════════════════
  // W1965 · Washoe-analogue · early ASL pioneer
  // ════════════════════════════════════════════════════════
  W1965: {
    archive_designation: 'Subject W-1965',
    project_era: '1966-2007 · manual ASL 训练协议代际 [1]',
    role: 'early ASL pioneer · Word subsystem anchor',
    appears_in_subsystems: ['Word'],
    appears_in_relic_count: 1,
    L4_voice_template: '原始登记：MOKO 协议 1986-XX-XX。Subject W-1965 词条采集档案 · 早期 manual ASL 协议代际原型。具体词包对应记录已封存。',
    horror_weight: 'medium · background lore',
    historical_lineage_anchor: '协议代际 [1] manual ASL',
  },

  // ════════════════════════════════════════════════════════
  // L1971 · Lana-analogue · first lexigram subject
  // ════════════════════════════════════════════════════════
  L1971: {
    archive_designation: 'Subject L-1971',
    project_era: '1971+ · fixed lexigram keyboard 协议代际 [2]',
    role: 'first lexigram subject · Skill subsystem anchor',
    appears_in_subsystems: ['Skill'],
    appears_in_relic_count: 1,
    L4_voice_template: '原始登记：MOKO 协议 1986-XX-XX。Subject L-1971 行为档案续档 · 1971 fixed lexigram keyboard 协议代际原型。Lexigram-key 1:1 配对档案已并入。',
    horror_weight: 'medium · 历史代际 anchor',
    historical_lineage_anchor: '协议代际 [2] fixed lexigram keyboard',
  },

  // ════════════════════════════════════════════════════════
  // K1980 · Kanzi-analogue · observational learner
  // ════════════════════════════════════════════════════════
  K1980: {
    archive_designation: 'Subject K-1980',
    project_era: '1980+ · 后期 lexigram + observational 学习协议',
    role: 'observational learner · evaluation subject',
    appears_in_subsystems: ['Boss Modifier', 'Scoring'],  // overlaps with N1976; pick 1 for K
    appears_in_relic_count: 1,  // 1 only in Scoring (BM is N1976)
    L4_voice_template: '原始登记：MOKO 协议 1986-XX-XX。Subject K-1980 评估档案续档 · 后期 observational 协议时段 reference。具体行为模式已并入 §M-XXX 档案池。',
    horror_weight: 'low-medium · evaluation anchor',
    historical_lineage_anchor: '协议代际 [2] lexigram + observational extensions',
  },

  // ════════════════════════════════════════════════════════
  // SA1974 · Sherman/Austin-analogue · Yerkish twin subjects (optional)
  // ════════════════════════════════════════════════════════
  SA1974: {
    archive_designation: 'Subject SA-1974',
    project_era: '1973-2000 · Yerkish lexigram 配套协议代际 [2]',
    role: 'Yerkish 双主体配套 (optional · sparse appearance)',
    appears_in_subsystems: ['Skill', 'Word'],  // optional secondary anchor
    appears_in_relic_count: 1,  // sparse · 1 relic max
    L4_voice_template: '原始登记：MOKO 协议 1986-XX-XX。Subject SA-1974 配套档案 · Yerkish 双主体协议代际副 anchor。配对学习记录已封存。',
    horror_weight: 'low · sparse background',
    historical_lineage_anchor: '协议代际 [2] Yerkish twin subjects',
  },
}

// ─── Generic fallback (大多数 relic L4 用此) ───
//
// 不引用 specific subject 时，L4 用 generic "处置员工" / "前一代研究主体"。

export const GENERIC_L4_VOICE_TEMPLATES = [
  '原始登记：MOKO 协议 1986-XX-XX。本工具关联前一代研究主体行为档案（具体研究项目档案已封存）。Subject [玩家工号] 经手注：[runtime 替换]',
  '原始登记：MOKO 协议 1986-XX-XX。本工具关联处置员工 [工号已封存] 经手记录。Subject [玩家工号] 经手注：[runtime 替换]',
  '原始登记：MOKO 协议 1986-XX-XX。前一代实验对象遗存（来源记录已合并入 §M-XXX 档案池）。Subject [玩家工号] 经手注：[runtime 替换]',
]

// ─── 总分布（94 relic 估算）───
//
// 94 总 relic estimate · per affix-taxa.mjs
// Specific subject anchor 总数：~6 relic (N1976×2 + W×1 + L×1 + K×1 + SA×1)
// Generic L4：~88 relic (大部分用 generic templates)

export const SUBJECT_DISTRIBUTION_POLICY = {
  total_relics_estimate: 94,
  specific_subject_anchored: 6,
  generic_L4: 88,
  ratio: '6.4% specific / 93.6% generic',
  note: 'Nim singular tragedy core 不被稀释 · 其他 4 subjects 是 background lore · 大部分 relic 用 generic L4',
}

// ─── 设计纪律（铁律）───

export const SPECIFIC_SUBJECT_DESIGN_RULES = {
  forbidden: [
    'L1-L3 (录入/校对/修改) 出现 subject archive_designation（必须 L4 作者层 only）',
    'L4 (作者层) reveal real-world subject lineage（必须 L5 endless only）',
    '直接复用真实研究 subject 全名作 metadata key（用 fictional化 designation · 即使 L5）',
    '复述 specific real-world catalog data / frequency stats / 具体 fates',
    '5 个 subjects 平等 emotional weight（必须 N1976 highest · 其他 background）',
  ],
  required: [
    'L4 (作者) voice template 仅含 fictional archive_designation + "档案已封存" phrase',
    'L5 (猴子 / endless) 才允许显化 real-world lineage 关联（"N-1976 即 1973-77 manual ASL 协议代际样本"等）',
    'Specific subjects 仅 ~6 relic 引用 · 其余 ~88 relic 用 generic',
    'N1976 保持 §4.5 + §5.2 singular tragedy core 地位',
    'L4 引用 subject 时 L1-L3 必须保持本部门 voice 主导（不混合）',
    'Subject anchor 与协议代际 lineage (§5.4.1 3-step) 对应 · 但代际 reference 也仅在 L5 显化',
  ],
}

// ─── Quick lookup helpers ───

export const SUBJECT_BY_DESIGNATION = Object.fromEntries(
  Object.entries(SPECIFIC_SUBJECTS).map(([id, s]) => [s.archive_designation, { id, ...s }])
)

export const SUBSYSTEMS_WITH_SUBJECT_ANCHORS = (() => {
  const map = {}
  for (const [id, s] of Object.entries(SPECIFIC_SUBJECTS)) {
    for (const sub of s.appears_in_subsystems) {
      if (!map[sub]) map[sub] = []
      map[sub].push(id)
    }
  }
  return map
})()

/**
 * 给定 relic id / subsystem，返回应该使用的 L4 anchor:
 * - 若该 subsystem 有 specific subject anchor 配额未用完，从 anchor 池取
 * - 否则返回 null（用 generic L4 template）
 *
 * 实际 ingest 时由 pipeline / runtime 决定哪几条 relic 使用 specific anchor。
 */
export function suggestL4Anchor(subsystem, alreadyAnchoredRelicIdsInSubsystem = []) {
  const candidateAnchors = SUBSYSTEMS_WITH_SUBJECT_ANCHORS[subsystem] || []
  if (candidateAnchors.length === 0) return null
  // 简化：若 subsystem 已有 anchor 满额，返回 null；否则返回第一个 anchor
  const subject = SPECIFIC_SUBJECTS[candidateAnchors[0]]
  if (alreadyAnchoredRelicIdsInSubsystem.length >= subject.appears_in_relic_count) return null
  return candidateAnchors[0]
}
