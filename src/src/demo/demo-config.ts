// ============================================
// 打字肉鸽 - Demo 模式配置
// ============================================
// 编译时注入，生产构建会 tree-shake 掉非 Demo 分支

declare const __DEMO_MODE__: boolean

export const IS_DEMO = typeof __DEMO_MODE__ !== 'undefined' && __DEMO_MODE__

// === Demo 关卡地图 ===
export const DEMO_STAGE_MAP = {
  totalNodes: 4,
  nodeStageType: {
    1: 'standard' as const,  // 引导关
    2: 'standard' as const,  // 正常关
    3: 'elite' as const,     // 精英关（展示压力感，带 1 个视觉 Modifier）
    4: 'standard' as const,  // 最终关（Demo 结束）
  },
  nodeAct: { 1: 1, 2: 1, 3: 1, 4: 1 },
  nodeBattleNumber: { 1: 1, 2: 2, 3: 3, 4: 4 },
}

// === 精英关 Demo Modifier ===
// boss_spotlight（聚光灯）— 视觉类修饰器，直觉易懂，不增加系统复杂度
export const DEMO_ELITE_MODIFIER = 'boss_spotlight'

// === Demo 开局赠送遗物 ===
export const DEMO_STARTER_RELIC = 'cornucopia'

// === Demo 技能池 ===
export const DEMO_PRODUCER_IDS = [
  'prod_burst',    // 爆发 — base +5
  'prod_loot',     // 掠夺 — score +15
  'prod_boost',    // 强化 — multiplier +0.2
  'prod_freeze',   // 冻结 — time +2s
  'prod_mint',     // 铸币 — gold +3
]

export const DEMO_CONVERTER_IDS = [
  'conv_base_score_add',  // 变现 — base → score
  'conv_mult_score_add',  // 溢光 — mult → score
  'conv_time_base_add',   // 蚀刻 — time → base
  'conv_gold_base_add',   // 收购 — gold → base
  'conv_score_mult_add',  // 乘势 — score → mult
]

// === Demo 遗物池 ===
export const DEMO_RELIC_IDS = [
  'lucky_coin',      // 幸运硬币 — 商店折扣
  'phoenix_feather', // 凤凰羽毛 — 容错
  'perfect_rhythm',  // 完美韵律 — 奖励完美打字
  'forge_heart',     // 熔炉之心 — 生产→转化 combo
  'cornucopia',      // 聚宝盆 — 开局送金
  'spark_core',      // 点火核心 — 多生产者奖励
  'campfire_ember',  // 篝火余烬 — 购买技能累积奖励
  'ramen',           // 拉面 — 打字快则强
]

// === 第一关预设绑定 ===
export const DEMO_STARTER_SKILLS: Array<{ skillId: string; key: string }> = [
  { skillId: 'prod_burst', key: 'e' },  // E — 高频字母
  { skillId: 'prod_loot',  key: 't' },  // T — 高频字母
  { skillId: 'prod_mint',  key: 'a' },  // A — 高频字母
]

// === 第一关固定词序（保证前 3 个词包含 E/T/A 触发技能） ===
export const DEMO_FIRST_STAGE_WORDS = [
  'the',     // t + e 触发两个技能
  'gate',    // a + t + e 三个全触发
  'take',    // t + a + e 继续强化
  'beat',    // e + a + t
  'late',    // a + t + e
]

// === Demo 关卡目标分数（降低难度） ===
export const DEMO_TARGET_SCORES: Record<number, number> = {
  1: 60,   // 第一关：极低目标，保证通过
  2: 120,  // 第二关：稍有挑战
  3: 200,  // 精英关：需要技能组合
  4: 250,  // 最终关：展示爽感
}
