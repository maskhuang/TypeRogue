// ============================================
// 打字肉鸽 - 休息关随机事件数据
// ============================================
// Story 18.3: 10 个随机事件 + 抽取逻辑

import type { GameState } from '../core/types'

// === 事件类型定义 ===

export interface RestEventOption {
  label: string
  description: string
  /** 事件效果 ID，由 restStage.ts 解释执行 */
  effectId: string
}

export interface RestEvent {
  id: string
  name: string
  icon: string
  description: string
  options: RestEventOption[]
  /** 前置条件：返回 true 才可被抽到 */
  prerequisite?: (state: GameState) => boolean
}

// === 10 个休息关事件 ===

export const REST_EVENTS: RestEvent[] = [
  // 事件 1：神秘商人
  {
    id: 'mysterious_merchant',
    name: '神秘商人',
    icon: '🧙',
    description: '一位神秘的旅人出现在你面前，愿意和你做笔交易。',
    options: [
      { label: '花费 50% 金币', description: '获得一个随机稀有遗物', effectId: 'merchant_rare_relic' },
      { label: '免费拿一个', description: '获得一个随机普通遗物', effectId: 'merchant_common_relic' },
      { label: '离开', description: '不做交易', effectId: 'noop' },
    ],
  },
  // 事件 2：打字之神的考验
  {
    id: 'typing_god_trial',
    name: '打字之神的考验',
    icon: '⚡',
    description: '打字之神降临，给你一个抉择。',
    options: [
      { label: '力量', description: '下一 Act 倍率 +1.0×，但时间 -10 秒', effectId: 'trial_power' },
      { label: '耐力', description: '下一 Act 时间 +15 秒，但倍率 -0.5×', effectId: 'trial_endurance' },
      { label: '离开', description: '放弃考验', effectId: 'noop' },
    ],
  },
  // 事件 3：技能祭坛（需至少 2 个技能）
  {
    id: 'skill_altar',
    name: '技能祭坛',
    icon: '🗿',
    description: '古老的祭坛散发着力量，你可以献祭一个技能来获取回报。',
    options: [
      { label: '献祭换技能', description: '失去一个随机技能，获得一个更高级技能', effectId: 'altar_upgrade' },
      { label: '献祭换金币', description: '失去一个随机技能，获得 200 金币', effectId: 'altar_gold' },
      { label: '离开', description: '不献祭', effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.skills.size >= 2,
  },
  // 事件 4：赌徒的骰子（需至少 100 金币）
  {
    id: 'gambler_dice',
    name: '赌徒的骰子',
    icon: '🎲',
    description: '一个赌徒向你展示了一对骰子，邀请你试试运气。',
    options: [
      { label: '押 100 金币', description: '50% 赢得 300 金币，50% 失去 100 金币', effectId: 'gamble_bet' },
      { label: '离开', description: '不赌', effectId: 'noop' },
    ],
    prerequisite: (s) => s.gold >= 100,
  },
  // 事件 5：遗物熔炉
  {
    id: 'relic_forge',
    name: '遗物熔炉',
    icon: '🔥',
    description: '炽热的熔炉可以销毁你的装备，转化为其他力量。',
    options: [
      { label: '销毁遗物', description: '销毁一个随机遗物，随机一个技能 +1 级', effectId: 'forge_relic_to_skill' },
      { label: '销毁技能', description: '销毁一个随机技能，获得一个随机遗物', effectId: 'forge_skill_to_relic' },
      { label: '离开', description: '不熔炼', effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.relics.size >= 1 || s.player.skills.size >= 1,
  },
  // 事件 6：时间裂缝
  {
    id: 'time_rift',
    name: '时间裂缝',
    icon: '🌀',
    description: '时空裂缝出现在你面前，你可以改变接下来的旅程。',
    options: [
      { label: '跳过下一关', description: '直接跳过一关（少打一关，少拿一关奖励）', effectId: 'rift_skip' },
      { label: '重打上一关', description: '再次挑战上一关，获取额外金币奖励', effectId: 'rift_replay' },
      { label: '离开', description: '不干涉时间', effectId: 'noop' },
    ],
  },
  // 事件 7：键盘诅咒
  {
    id: 'keyboard_curse',
    name: '键盘诅咒',
    icon: '⛓️',
    description: '暗影低语：接受诅咒，获得力量。两个键位将被封印至 Act 结束。',
    options: [
      { label: '接受诅咒', description: '封印 2 个随机键位，获得 150 金币 + 随机遗物', effectId: 'curse_accept' },
      { label: '拒绝', description: '离开', effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.bindings.size >= 1,
  },
  // 事件 8：技能复制器
  {
    id: 'skill_copier',
    name: '技能复制器',
    icon: '📋',
    description: '一台神秘的机器可以复制你的技能，但代价是更高的挑战。',
    options: [
      { label: '复制技能', description: '随机一个技能 +1 级，但下一关目标分 ×1.5', effectId: 'copy_skill' },
      { label: '离开', description: '不复制', effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.skills.size >= 1,
  },
  // 事件 9：命运之轮（无选择，直接随机）
  {
    id: 'wheel_of_destiny',
    name: '命运之轮',
    icon: '🎡',
    description: '命运之轮开始旋转……无人能预测结果。',
    options: [
      { label: '旋转命运之轮', description: '随机获得好运或厄运', effectId: 'wheel_spin' },
    ],
  },
  // 事件 10：宁静冥想
  {
    id: 'serene_meditation',
    name: '宁静冥想',
    icon: '🧘',
    description: '在宁静中，你可以预见未来，或是积蓄力量。',
    options: [
      { label: '冥想预见', description: '预览下一 Act 的 Boss 类型和精英关修饰器', effectId: 'meditate_preview' },
      { label: '积蓄力量', description: '获得 80 金币', effectId: 'meditate_gold' },
    ],
  },
]

// === 事件抽取 ===

/**
 * 从满足条件的事件池中随机抽取一个事件
 * @param usedEventIds 本局已使用的事件 ID（不重复）
 * @param state 当前游戏状态（检查前置条件）
 */
export function drawRestEvent(
  usedEventIds: string[],
  state: GameState,
): RestEvent | null {
  const available = REST_EVENTS.filter(
    (e) => !usedEventIds.includes(e.id) && (!e.prerequisite || e.prerequisite(state)),
  )
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}
