// ============================================
// 打字肉鸽 - Demo 模式配置
// ============================================
// 编译时注入，生产构建会 tree-shake 掉非 Demo 分支

declare const __DEMO_MODE__: boolean

export const IS_DEMO = typeof __DEMO_MODE__ !== 'undefined' && __DEMO_MODE__

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
