// ============================================
// 打字肉鸽 - 休息关选项数据（多选项制）
// ============================================
// 每次休息关展示一组选项（基础→职业→遗物），玩家选其一。

import type { GameState } from '../core/types'
import { t } from '../demo/demo-i18n'

// === 选项类型定义 ===

export interface RestOption {
  id: string
  label: string
  description: string
  icon: string
  /** 效果 ID，由 restStage.ts 解释执行 */
  effectId: string
  /** 来源标记：'base' | 'class' | 'relic' */
  source: 'base' | 'class' | 'relic'
}

// === 遗物注册表 ===

interface RelicOptionEntry {
  relicId: string
  getOption: (state: GameState) => RestOption | null
}

const RELIC_OPTIONS: RelicOptionEntry[] = [
  {
    relicId: 'intermission',
    getOption: (_state) => ({
      id: 'relic_intermission',
      label: t('rest.opt.intermission'),
      description: t('rest.opt.intermission_d'),
      icon: '🔋',
      effectId: 'relic_intermission',
      source: 'relic',
    }),
  },
  {
    relicId: 'gamblers_creed',
    getOption: (state) => {
      if (state.gold < 100) return null
      return {
        id: 'relic_gamble',
        label: t('rest.opt.gamble'),
        description: t('rest.opt.gamble_d'),
        icon: '🎲',
        effectId: 'relic_gamble',
        source: 'relic',
      }
    },
  },
]

// === 构建选项列表 ===

export function buildRestOptions(state: GameState): RestOption[] {
  const options: RestOption[] = []

  // --- 基础选项 A: 技能附魔（只给附魔，不再升级等级）---
  if (state.player.skills.size >= 1) {
    options.push({
      id: 'base_upgrade',
      label: t('rest.opt.upgrade'),
      description: t('rest.opt.upgrade_d'),
      icon: '🗿',
      effectId: 'rest_upgrade_skill',
      source: 'base',
    })
  }

  // --- 基础选项 B: 临时增强 ---
  options.push({
    id: 'base_buff',
    label: t('rest.opt.buff'),
    description: t('rest.opt.buff_d'),
    icon: '⚡',
    effectId: 'rest_temp_buff',
    source: 'base',
  })

  // --- 职业专属选项（预留扩展） ---
  // TODO: 造词师/蜕变师风味选项

  // --- 遗物解锁选项 ---
  for (const entry of RELIC_OPTIONS) {
    if (!state.player.relics.has(entry.relicId)) continue
    const opt = entry.getOption(state)
    if (opt) options.push(opt)
  }

  return options
}
