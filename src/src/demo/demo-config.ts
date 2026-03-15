// ============================================
// 打字肉鸽 - Demo 模式配置
// ============================================
// 编译时注入，生产构建会 tree-shake 掉非 Demo 分支

declare const __DEMO_MODE__: boolean

export const IS_DEMO = typeof __DEMO_MODE__ !== 'undefined' && __DEMO_MODE__

// === Demo 关卡地图（完整一周目：10 节点 / 3 Act） ===
export const DEMO_STAGE_MAP = {
  totalNodes: 10,
  nodeStageType: {
    1: 'standard' as const,
    2: 'standard' as const,
    3: 'elite' as const,
    4: 'rest' as const,
    5: 'standard' as const,
    6: 'elite' as const,
    7: 'standard' as const,
    8: 'rest' as const,
    9: 'elite' as const,
    10: 'boss' as const,
  },
  nodeAct: {
    1: 1, 2: 1, 3: 1, 4: 1,
    5: 2, 6: 2, 7: 2, 8: 2,
    9: 3, 10: 3,
  },
  nodeBattleNumber: {
    1: 1, 2: 2, 3: 3,
    5: 4, 6: 5, 7: 6,
    9: 7, 10: 8,
  },
  eliteModifierIndex: {
    3: 0,
    6: 1,
    9: 2,
  },
}

// === Demo 开局赠送遗物 ===
export const DEMO_STARTER_RELIC = 'cornucopia'

// === Demo 初始技能资源 + 绑定 ===
// 由 main.ts 使用 generateSkill() 生成新词条制技能
export const DEMO_STARTER_BINDINGS: Array<{ resource: import('../core/types').ResourceType; key: string }> = [
  { resource: 'base',  key: 'e' },  // E — 高频字母
  { resource: 'score', key: 't' },  // T — 高频字母
  { resource: 'gold',  key: 'a' },  // A — 高频字母
]

// === 第一关固定词序（保证前 3 个词包含 E/T/A 触发技能） ===
export const DEMO_FIRST_STAGE_WORDS = [
  'the',     // t + e 触发两个技能
  'gate',    // a + t + e 三个全触发
  'take',    // t + a + e 继续强化
  'beat',    // e + a + t
  'late',    // a + t + e
]

// === Demo 关卡目标分数（使用正式计算，不再覆盖） ===
export const DEMO_TARGET_SCORES: Record<number, number> = {}
