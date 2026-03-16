// ============================================
// 打字肉鸽 - 完整版教程初始化
// ============================================
// Story 39.4: L0-L1 引导步骤注入 condition + 注册
// Story 39.5: L2-L3 引导步骤注入 condition + 注册

import { L0_STEPS, L1_STEPS, L2_STEPS, L3_STEPS } from '../../data/tutorialSteps'
import { state } from '../../core/state'
import { eventBus } from '../../core/events/EventBus'
import { tutorialManager } from './TutorialManager'
import { AFFIX_CATEGORY_MAP } from '../../data/affixes'
import { getMinEnchantmentLevel } from '../relics/EnchantmentRelicBehaviors'

/**
 * 初始化完整版引导系统（L0-L3）
 * - 注入需要运行时状态的 condition 闭包
 * - 注册步骤到 TutorialManager
 * - 启动事件监听
 *
 * 注意：在 MetaState 初始化且 setPersistence 后调用
 */
let initialized = false

export function initFullTutorial(): void {
  if (initialized) return
  initialized = true

  // --- L0 condition 注入 ---

  // L0_welcome: 无特殊 condition（prerequisite 链 + persistence 已防止重复触发）

  // L0_combo: combo >= 5 时触发
  const comboStep = L0_STEPS.find(s => s.id === 'L0_combo')
  if (comboStep) {
    comboStep.trigger.condition = () => state.combo >= 5
  }

  // --- L1 condition 注入 ---

  // 共享 flag 变量：shop:purchase 事件信息
  let lastPurchaseWasSkill = false
  let lastPurchaseSkillRarity = -1
  let lastPurchaseHasTopologyAffix = false

  eventBus.on('shop:purchase', (data) => {
    lastPurchaseWasSkill = data.type === 'skill'
    if (data.type === 'skill') {
      const skill = state.affixSkills.get(data.itemId)
      if (skill) {
        lastPurchaseSkillRarity = skill.rarity
        lastPurchaseHasTopologyAffix = skill.affixes.some(
          a => AFFIX_CATEGORY_MAP[a.type] === 'topology'
        )
      } else {
        lastPurchaseSkillRarity = -1
        lastPurchaseHasTopologyAffix = false
      }
    } else {
      lastPurchaseSkillRarity = -1
      lastPurchaseHasTopologyAffix = false
    }
  })

  // L1_skill_bind: 最近一次购买为技能
  const skillBindStep = L1_STEPS.find(s => s.id === 'L1_skill_bind')
  if (skillBindStep) {
    skillBindStep.trigger.condition = () => lastPurchaseWasSkill
  }

  // L1_upgrade / L1_relic: 无特殊 condition（事件本身即足够）

  // --- L2 condition 注入 ---

  // L2_affix_intro: 购买的技能稀有度 >= 1（蓝色，1 词条）
  const affixIntroStep = L2_STEPS.find(s => s.id === 'L2_affix_intro')
  if (affixIntroStep) {
    affixIntroStep.trigger.condition = () => lastPurchaseSkillRarity >= 1
  }

  // L2_affix_positional: 购买的技能含拓扑型词条（void/resonance/mirror）
  const affixPositionalStep = L2_STEPS.find(s => s.id === 'L2_affix_positional')
  if (affixPositionalStep) {
    affixPositionalStep.trigger.condition = () => lastPurchaseHasTopologyAffix
  }

  // L2_affix_variety: 购买的技能稀有度 >= 2（紫色，2 词条）
  const affixVarietyStep = L2_STEPS.find(s => s.id === 'L2_affix_variety')
  if (affixVarietyStep) {
    affixVarietyStep.trigger.condition = () => lastPurchaseSkillRarity >= 2
  }

  // L2_rarity_explain: 购买的技能稀有度 >= 3（橙色，3 词条）
  const rarityExplainStep = L2_STEPS.find(s => s.id === 'L2_rarity_explain')
  if (rarityExplainStep) {
    rarityExplainStep.trigger.condition = () => lastPurchaseSkillRarity >= 3
  }

  // --- L3 condition 注入 ---

  // L3_enchant_unlock: 技能升级后达到附魔资格
  let lastUpgradeReachedEnchantLevel = false
  eventBus.on('skill:upgraded', (data) => {
    lastUpgradeReachedEnchantLevel = data.newLevel >= getMinEnchantmentLevel()
  })

  const enchantUnlockStep = L3_STEPS.find(s => s.id === 'L3_enchant_unlock')
  if (enchantUnlockStep) {
    enchantUnlockStep.trigger.condition = () => lastUpgradeReachedEnchantLevel
  }

  // L3_enchant_growth: 技能触发时附魔产生成长效果
  let lastTriggerHadGrowth = false
  eventBus.on('skill:triggered', (data) => {
    lastTriggerHadGrowth = (data.growthValue != null && data.growthValue > 0) || !!data.questCompleted
  })

  const enchantGrowthStep = L3_STEPS.find(s => s.id === 'L3_enchant_growth')
  if (enchantGrowthStep) {
    enchantGrowthStep.trigger.condition = () => lastTriggerHadGrowth
  }

  // --- 注册并启动 ---
  tutorialManager.register([...L0_STEPS, ...L1_STEPS, ...L2_STEPS, ...L3_STEPS])
  tutorialManager.start()
}
