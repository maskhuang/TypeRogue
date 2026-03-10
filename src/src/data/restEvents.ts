// ============================================
// 打字肉鸽 - 休息关随机事件数据
// ============================================
// Story 18.3: 10 个随机事件 + 抽取逻辑

import type { GameState } from '../core/types'
import { t } from '../demo/demo-i18n'

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

export function getRestEvents(): RestEvent[] { return [
  {
    id: 'mysterious_merchant',
    name: t('rest.merchant.name'), icon: '🧙',
    description: t('rest.merchant.desc'),
    options: [
      { label: t('rest.merchant.opt1'), description: t('rest.merchant.opt1d'), effectId: 'merchant_rare_relic' },
      { label: t('rest.merchant.opt2'), description: t('rest.merchant.opt2d'), effectId: 'merchant_common_relic' },
      { label: t('rest.leave'), description: t('rest.leave.desc'), effectId: 'noop' },
    ],
  },
  {
    id: 'typing_god_trial',
    name: t('rest.trial.name'), icon: '⚡',
    description: t('rest.trial.desc'),
    options: [
      { label: t('rest.trial.power'), description: t('rest.trial.power_d'), effectId: 'trial_power' },
      { label: t('rest.trial.endurance'), description: t('rest.trial.endurance_d'), effectId: 'trial_endurance' },
      { label: t('rest.leave'), description: t('rest.trial.leave_d'), effectId: 'noop' },
    ],
  },
  {
    id: 'skill_altar',
    name: t('rest.altar.name'), icon: '🗿',
    description: t('rest.altar.desc'),
    options: [
      { label: t('rest.altar.upgrade'), description: t('rest.altar.upgrade_d'), effectId: 'altar_upgrade' },
      { label: t('rest.altar.gold'), description: t('rest.altar.gold_d'), effectId: 'altar_gold' },
      { label: t('rest.leave'), description: t('rest.altar.leave_d'), effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.skills.size >= 2,
  },
  {
    id: 'gambler_dice',
    name: t('rest.gamble.name'), icon: '🎲',
    description: t('rest.gamble.desc'),
    options: [
      { label: t('rest.gamble.bet'), description: t('rest.gamble.bet_d'), effectId: 'gamble_bet' },
      { label: t('rest.leave'), description: t('rest.gamble.leave_d'), effectId: 'noop' },
    ],
    prerequisite: (s) => s.gold >= 100,
  },
  {
    id: 'relic_forge',
    name: t('rest.forge.name'), icon: '🔥',
    description: t('rest.forge.desc'),
    options: [
      { label: t('rest.forge.relic'), description: t('rest.forge.relic_d'), effectId: 'forge_relic_to_skill' },
      { label: t('rest.forge.skill'), description: t('rest.forge.skill_d'), effectId: 'forge_skill_to_relic' },
      { label: t('rest.leave'), description: t('rest.forge.leave_d'), effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.relics.size >= 1 || s.player.skills.size >= 1,
  },
  {
    id: 'time_rift',
    name: t('rest.rift.name'), icon: '🌀',
    description: t('rest.rift.desc'),
    options: [
      { label: t('rest.rift.skip'), description: t('rest.rift.skip_d'), effectId: 'rift_skip' },
      { label: t('rest.rift.replay'), description: t('rest.rift.replay_d'), effectId: 'rift_replay' },
      { label: t('rest.leave'), description: t('rest.rift.leave_d'), effectId: 'noop' },
    ],
  },
  {
    id: 'keyboard_curse',
    name: t('rest.curse.name'), icon: '⛓️',
    description: t('rest.curse.desc'),
    options: [
      { label: t('rest.curse.accept'), description: t('rest.curse.accept_d'), effectId: 'curse_accept' },
      { label: t('rest.curse.reject'), description: t('rest.curse.reject_d'), effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.bindings.size >= 1,
  },
  {
    id: 'skill_copier',
    name: t('rest.copier.name'), icon: '📋',
    description: t('rest.copier.desc'),
    options: [
      { label: t('rest.copier.copy'), description: t('rest.copier.copy_d'), effectId: 'copy_skill' },
      { label: t('rest.leave'), description: t('rest.copier.leave_d'), effectId: 'noop' },
    ],
    prerequisite: (s) => s.player.skills.size >= 1,
  },
  {
    id: 'wheel_of_destiny',
    name: t('rest.wheel.name'), icon: '🎡',
    description: t('rest.wheel.desc'),
    options: [
      { label: t('rest.wheel.spin'), description: t('rest.wheel.spin_d'), effectId: 'wheel_spin' },
    ],
  },
  {
    id: 'serene_meditation',
    name: t('rest.meditate.name'), icon: '🧘',
    description: t('rest.meditate.desc'),
    options: [
      { label: t('rest.meditate.preview'), description: t('rest.meditate.preview_d'), effectId: 'meditate_preview' },
      { label: t('rest.meditate.gold'), description: t('rest.meditate.gold_d'), effectId: 'meditate_gold' },
    ],
  },
]; }

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
  const available = getRestEvents().filter(
    (e) => !usedEventIds.includes(e.id) && (!e.prerequisite || e.prerequisite(state)),
  )
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}
