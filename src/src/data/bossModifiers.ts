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
 * Boss 修饰器元数据
 */
export interface BossModifierMeta {
  id: BossModifierId
  name: string
  icon: string
  description: string
  eliteHint: string
}

/**
 * 13 个修饰器的元数据
 */
export const BOSS_MODIFIER_META: Record<BossModifierId, BossModifierMeta> = {
  boss_fade: {
    id: 'boss_fade',
    name: '渐隐之词',
    icon: '👻',
    description: '字母逐个淡出消失',
    eliteHint: '字母缓慢淡出（速度减半）',
  },
  boss_scramble: {
    id: 'boss_scramble',
    name: '乱序打字',
    icon: '🔀',
    description: '字母打乱显示，照乱序打',
    eliteHint: '仅打乱中间字母，首尾保留',
  },
  boss_reverse: {
    id: 'boss_reverse',
    name: '倒序输入',
    icon: '⏪',
    description: '从最后一个字母往前打',
    eliteHint: '从最后一个字母往前打',
  },
  boss_drift: {
    id: 'boss_drift',
    name: '移动文字',
    icon: '🌊',
    description: '词语在屏幕上漂移晃动',
    eliteHint: '词语轻微漂移（振幅减半）',
  },
  boss_masked: {
    id: 'boss_masked',
    name: '残缺词语',
    icon: '🕳️',
    description: '部分字母被遮挡（30%）',
    eliteHint: '遮挡 15% 字母',
  },
  boss_spotlight: {
    id: 'boss_spotlight',
    name: '聚光灯',
    icon: '🔦',
    description: '只能看到当前 2-3 个字母',
    eliteHint: '可见 3-4 个字母',
  },
  boss_rhythm: {
    id: 'boss_rhythm',
    name: '节奏锁定',
    icon: '🎵',
    description: '字母按节拍解锁（BPM 90-140）',
    eliteHint: '节拍较慢（BPM 70-110）',
  },
  boss_decay: {
    id: 'boss_decay',
    name: '分数衰减',
    icon: '📉',
    description: '每秒扣 5% 当前总分',
    eliteHint: '每秒扣 2.5% 总分',
  },
  boss_combo_punish: {
    id: 'boss_combo_punish',
    name: '断连即扣',
    icon: '☠️',
    description: '连击中断扣 20% 总分',
    eliteHint: '断连扣 10% 总分',
  },
  boss_cap: {
    id: 'boss_cap',
    name: '单词限额',
    icon: '📦',
    description: '单词得分上限 50 分',
    eliteHint: '单词得分上限 75 分',
  },
  boss_fast_time: {
    id: 'boss_fast_time',
    name: '时间加速',
    icon: '⏩',
    description: '计时器 1.5 倍速',
    eliteHint: '计时器 1.25 倍速',
  },
  boss_double_target: {
    id: 'boss_double_target',
    name: '双倍目标',
    icon: '🎯',
    description: '目标分数 ×2',
    eliteHint: '目标分数 ×1.5',
  },
  boss_diminish: {
    id: 'boss_diminish',
    name: '递减收益',
    icon: '📉',
    description: '每完成一词下个词分数 -10%',
    eliteHint: '每词 -5%',
  },
}

/**
 * 查询修饰器元数据
 */
export function getBossModifierMeta(id: BossModifierId): BossModifierMeta | undefined {
  return BOSS_MODIFIER_META[id]
}

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
