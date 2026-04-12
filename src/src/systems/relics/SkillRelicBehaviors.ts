// ============================================
// 打字肉鸽 - 技能系统（词条制）遗物行为 (Story 36.4)
// ============================================

import { state, synergy } from '../../core/state'
import { registerRelicBehavior, getRelicState, setRelicState } from './RelicPipeline'
import type { AffixType } from '../../data/affixes'
import { applyAffixLevelScaling, getSkillMaxLevel } from '../../data/affixes'
import { weightedSampleWithout, rollAffixParams, generateName, pickRandom } from '../../data/skillGeneration'
import { PositionRelation } from '../../data/keyboardTopology'
import { eventBus } from '../../core/events/EventBus'


// === 首发强化 (first_strike) ===

const FIRST_STRIKE_SCORE = 10

/**
 * 获取首发强化加成
 * 每词第一个技能触发时 +10 分
 * @returns 10 当持有遗物且为本词第一个技能；否则 0
 */
export function getFirstStrikeBonus(): number {
  if (!state.player.relics.has('first_strike')) return 0
  // wordSkillCount 在 triggerAffixSkillWithFeedback 入口处 ++ 后为 1 表示第一个
  if (synergy.wordSkillCount !== 1) return 0
  return FIRST_STRIKE_SCORE
}

// === 少而精 (less_is_more) ===

/**
 * 获取少而精加成
 * 装备技能 <10 时产出 +20%
 * @returns 0.2 当持有遗物且技能数 <10；否则 0
 */
export function getLessIsMoreBonus(): number {
  if (!state.player.relics.has('less_is_more')) return 0
  if (state.player.skills.size >= 10) return 0
  return 0.2
}

// === 集训手册 (training_manual) ===

/**
 * 应用集训手册效果 — 一次性将所有技能等级 +1（上限 Lv.3）
 * @returns 升级的技能 ID 列表
 */
export function applyTrainingManual(): string[] {
  const upgradedIds: string[] = []
  for (const [skillId, data] of state.player.skills) {
    const affixSkill = state.affixSkills.get(skillId)
    const maxLv = affixSkill ? getSkillMaxLevel(affixSkill.rarity) : 3
    if (data.level < maxLv) {
      data.level++
      if (affixSkill) {
        affixSkill.level = data.level
        applyAffixLevelScaling(affixSkill.affixes, 1)
      }
      upgradedIds.push(skillId)
      eventBus.emit('skill:upgraded', { skillId, newLevel: data.level })
    }
  }
  return upgradedIds
}

// === 爵士乐 (jazz) ===

/** 本词已触发的不同词条类型 */
const _wordAffixTypes = new Set<AffixType>()

/**
 * 追踪本词触发的词条类型
 * @param affixes 触发技能的词条列表
 */
export function trackWordAffixTypes(affixes: Array<{ type: AffixType }>): void {
  if (!state.player.relics.has('jazz')) return
  for (const affix of affixes) {
    _wordAffixTypes.add(affix.type)
  }
}

/**
 * 获取本词已触发的词条类型数
 */
export function getWordAffixTypeCount(): number {
  return _wordAffixTypes.size
}

/**
 * 重置本词词条类型追踪
 */
export function resetWordAffixTypes(): void {
  _wordAffixTypes.clear()
}

/**
 * 检查爵士乐加成
 * N ≥ 3 时返回 0.1 * N（得分加成比例），否则 0
 */
export function checkJazzBonus(): number {
  if (!state.player.relics.has('jazz')) return 0
  const n = _wordAffixTypes.size
  if (n < 3) return 0
  return 0.1 * n
}

// === 无冕之王 (uncrowned_king) ===

/**
 * 检查是否持有无冕之王
 */
export function hasUncrownedKing(): boolean {
  return state.player.relics.has('uncrowned_king')
}

/**
 * 获取无冕之王加成
 * 持有无冕之王时，普通稀有度技能产出 +30%
 */
export function getUncrownedKingAffixlessBonus(): number {
  return hasUncrownedKing() ? 0.3 : 0
}

/**
 * 检查是否应阻止技能获得附魔
 * 重设计后始终返回 false（不再阻止附魔）
 */
export function shouldBlockEnchantment(_enchantmentIds: string[]): boolean {
  return false
}

// === D100（传说，每5战替换所有词条） ===

const D100_INTERVAL = 5

/**
 * 替换所有装备技能的词条为随机词条（保留词条数量、等级、附魔）
 * @returns 被替换的技能数量
 */
export function rerollAllAffixes(): number {
  let count = 0
  for (const [, skill] of state.affixSkills) {
    const affixCount = skill.affixes.length
    if (affixCount === 0) continue
    const samples = weightedSampleWithout(affixCount)
    const sharedPosRel = pickRandom(Object.values(PositionRelation))
    skill.affixes = samples.map(s => rollAffixParams(s.type, skill.resource, s.convertVariant, undefined, sharedPosRel))
    skill.name = generateName(skill.resource, skill.affixes)
    count++
  }
  return count
}

/**
 * 战斗开始时检查 D100 是否触发（每5战）
 * @returns 触发时返回替换的技能数，否则 0
 */
export function checkD100OnBattleStart(): number {
  if (!state.player.relics.has('d_100')) return 0
  const battles = (getRelicState('d_100') ?? 0) + 1
  setRelicState('d_100', battles)
  if (battles % D100_INTERVAL !== 0) return 0
  return rerollAllAffixes()
}

// === 模块重置（关级别） ===

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetSkillRelicState(): void {
  _wordAffixTypes.clear()
}

// === 注册所有行为 ===

/**
 * 初始化技能子系统遗物行为注册
 */
export function initSkillRelicBehaviors(): void {
  registerRelicBehavior('training_manual', (_relicId, _context) => {
    // 实际逻辑在 applyTrainingManual() 中
  })
  // 任何方式获取 training_manual 都触发升级（商店/仪式/奖励/休息关等）
  eventBus.on('relic:acquired', ({ relicId }) => {
    if (relicId === 'training_manual') {
      applyTrainingManual()
    }
  })

  registerRelicBehavior('jazz_diversity', (_relicId, _context) => {
    // 实际逻辑在 trackWordAffixTypes() / checkJazzBonus() 中
  })

  registerRelicBehavior('uncrowned_king', (_relicId, _context) => {
    // 实际逻辑在 hasUncrownedKing() / shouldBlockEnchantment() 中
  })

  registerRelicBehavior('d_100', (_relicId, _context) => {
    // 实际逻辑在 rerollAllAffixes() / checkD100OnBattleStart() 中
  })
}
