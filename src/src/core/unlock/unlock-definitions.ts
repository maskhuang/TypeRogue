// ============================================
// 打字肉鸽 - 解锁条件定义数据
// ============================================
// Story 6.3: 解锁系统 - 配置数据 (AC: #8)

import type { UnlockDefinition } from './UnlockSystem'

/**
 * 所有解锁定义 (AC: #8)
 *
 * 设计参考 gdd.md:
 * - 里程碑：首次通关各 Act 解锁基础内容
 * - Build 成就：特定组合通关解锁相关技能
 * - 挑战完成：Ascension 等级解锁高级内容
 */
export const UNLOCK_DEFINITIONS: UnlockDefinition[] = [
  // ===========================================
  // 里程碑解锁 (Act 通关) - AC: #2
  // ===========================================

  {
    id: 'milestone_act1',
    type: 'skill',
    targetId: 'echo_basic',
    name: '共鸣入门',
    description: '首次通关 Act 1',
    condition: {
      type: 'milestone',
      milestone: { act: 1, minStages: 3 }
    }
  },
  {
    id: 'milestone_act2',
    type: 'skill',
    targetId: 'ripple_basic',
    name: '涟漪觉醒',
    description: '首次通关 Act 2',
    condition: {
      type: 'milestone',
      milestone: { act: 2, minStages: 6 }
    }
  },
  {
    id: 'milestone_act3',
    type: 'skill',
    targetId: 'void_master',
    name: '虚空掌控',
    description: '首次通关全部关卡',
    condition: {
      type: 'milestone',
      milestone: { act: 3, minStages: 8 }
    }
  },
  {
    id: 'milestone_relic_act1',
    type: 'relic',
    targetId: 'combo_keeper',
    name: '连击守护者',
    description: '首次通关 Act 1',
    condition: {
      type: 'milestone',
      milestone: { act: 1, minStages: 3 }
    }
  },

  // ===========================================
  // Build 成就解锁 (特定技能组合) - AC: #3
  // ===========================================

  {
    id: 'build_aura_master',
    type: 'skill',
    targetId: 'aura_enhanced',
    name: '光环大师',
    description: '使用 3 个光环类技能通关',
    condition: {
      type: 'build',
      build: {
        requiredSkills: ['aura_basic'],
        minSkillCount: 3,
        mustWin: true
      }
    }
  },
  {
    id: 'build_lone_wolf',
    type: 'skill',
    targetId: 'lone_enhanced',
    name: '孤狼之道',
    description: '仅使用 1 个技能胜利通关',
    condition: {
      type: 'build',
      build: {
        requiredSkills: [],
        minSkillCount: 1,
        mustWin: true
      }
    }
  },

  // ===========================================
  // 统计解锁 - AC: #4
  // ===========================================

  {
    id: 'stats_veteran',
    type: 'skill',
    targetId: 'score_veteran',
    name: '老兵',
    description: '完成 10 局游戏',
    condition: {
      type: 'stats',
      stats: { field: 'totalRuns', threshold: 10 }
    }
  },
  {
    id: 'stats_winner',
    type: 'skill',
    targetId: 'time_master',
    name: '常胜将军',
    description: '胜利 5 次',
    condition: {
      type: 'stats',
      stats: { field: 'victories', threshold: 5 }
    }
  },
  {
    id: 'stats_highscore',
    type: 'relic',
    targetId: 'score_amplifier',
    name: '高分猎手',
    description: '单局得分达到 50000',
    condition: {
      type: 'stats',
      stats: { field: 'highestScore', threshold: 50000 }
    }
  },
  {
    id: 'stats_combo_legend',
    type: 'skill',
    targetId: 'combo_legend',
    name: '连击传说',
    description: '达成 100 连击',
    condition: {
      type: 'stats',
      stats: { field: 'longestCombo', threshold: 100 }
    }
  },

  // ===========================================
  // 挑战解锁 (Ascension)
  // ===========================================

  {
    id: 'challenge_a1',
    type: 'skill',
    targetId: 'ascension_boost',
    name: '挑战者',
    description: '完成 Ascension 1',
    condition: {
      type: 'challenge',
      challenge: { ascensionLevel: 1 }
    }
  },
]
