// ============================================
// 打字肉鸽 - Boss 修饰器 ID 定义
// ============================================
// Story 18.1: 修饰器池（占位，实际逻辑由 Story 18.4 实现）

/**
 * 所有 Boss 修饰器 ID
 * 打字难度类（7种）+ 数值规则类（6种）= 13种
 */
export const BOSS_MODIFIER_IDS = [
  // 打字难度类
  'boss_fade',       // 渐隐之词
  'boss_scramble',   // 乱序打字
  'boss_reverse',    // 倒序输入
  'boss_drift',      // 移动文字
  'boss_masked',     // 残缺词语
  'boss_spotlight',  // 聚光灯
  'boss_rhythm',     // 节奏锁定
  // 数值规则类
  'boss_decay',      // 分数衰减
  'boss_combo_punish', // 断连即扣
  'boss_cap',        // 单词限额
  'boss_fast_time',  // 时间加速
  'boss_double_target', // 双倍目标
  'boss_diminish',   // 递减收益
] as const

export type BossModifierId = typeof BOSS_MODIFIER_IDS[number]

/**
 * 从修饰器池中随机抽取 n 个不重复的修饰器
 */
export function drawBossModifiers(count: number): BossModifierId[] {
  const pool = [...BOSS_MODIFIER_IDS]
  const result: BossModifierId[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}
