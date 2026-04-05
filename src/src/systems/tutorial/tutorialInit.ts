// ============================================
// 打字肉鸽 - 完整版教程初始化
// ============================================
// Story 39.4: L0-L1 引导步骤注入 condition + 注册
// Story 39.5: L2-L3 引导步骤注入 condition + 注册
// Story 39.6: L4-L5 引导步骤注入 condition + paramsProvider + 注册

import { L0_STEPS, L1_STEPS, L2_STEPS, L3_STEPS, L4_STEPS, L5_STEPS } from '../../data/tutorialSteps'
import { state } from '../../core/state'
import { eventBus } from '../../core/events/EventBus'
import { tutorialManager } from './TutorialManager'
import { AFFIX_CATEGORY_MAP } from '../../data/affixes'
import { getMinEnchantmentLevel } from '../relics/EnchantmentRelicBehaviors'
import { getStageType } from '../stage/stageFlow'
import { getBossModifierMeta } from '../../data/bossModifiers'
import { t } from '../../demo/demo-i18n'
import { initHelpButtons } from '../../ui/HelpPanel'

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

  // L0_combo: 第二词完成时触发（wordsCompleted >= 2）
  const comboStep = L0_STEPS.find(s => s.id === 'L0_combo')
  if (comboStep) {
    comboStep.trigger.condition = () =>
      state.battleStats != null && state.battleStats.wordsCompleted >= 2
    comboStep.content.paramsProvider = () => ({
      combo: state.combo,
    })
  }

  // --- L1 condition 注入 ---

  // L1_relic: L1_shop_intro 完成后立即触发
  let lastCompletedStepId = ''
  eventBus.on('tutorial:step_completed', (data) => {
    lastCompletedStepId = data.stepId
  })

  const relicStep = L1_STEPS.find(s => s.id === 'L1_relic')
  if (relicStep) {
    relicStep.trigger.condition = () => lastCompletedStepId === 'L1_shop_intro'
  }

  // 共享 flag 变量：shop:purchase 事件信息
  let lastPurchaseWasSkill = false
  let lastPurchaseSkillRarity = -1
  let lastPurchaseHasTopologyAffix = false
  let lastPurchaseIsMultiCell = false

  eventBus.on('shop:purchase', (data) => {
    lastPurchaseWasSkill = data.type === 'skill'
    lastPurchaseIsMultiCell = false
    if (data.type === 'skill') {
      const skill = state.affixSkills.get(data.itemId)
      if (skill) {
        lastPurchaseSkillRarity = skill.rarity
        lastPurchaseHasTopologyAffix = skill.affixes.some(
          a => AFFIX_CATEGORY_MAP[a.type]?.includes('topology')
        )
        lastPurchaseIsMultiCell = skill.shapeId != null && skill.shapeId !== 'monomino'
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

  // L1_shape_hint: 最近一次购买为多格技能（Story 40.11）
  const shapeHintStep = L1_STEPS.find(s => s.id === 'L1_shape_hint')
  if (shapeHintStep) {
    shapeHintStep.trigger.condition = () => lastPurchaseIsMultiCell
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

  // --- L4 condition 注入 ---

  // 共享 flag 变量：battle:start 事件关卡类型信息
  let lastBattleIsElite = false
  let lastBattleIsBoss = false
  let lastBattleHasModifier = false
  let lastModifierName = ''
  let lastModifierDesc = ''

  eventBus.on('battle:start', (data) => {
    const stageType = getStageType(data.stageId)
    lastBattleIsElite = false
    lastBattleIsBoss = stageType === 'boss'

    // Boss 关有修饰器
    if (lastBattleIsBoss) {
      lastBattleHasModifier = true
      const pool = state.bossModifierPool
      if (pool && pool.length > 0) {
        const meta = getBossModifierMeta(pool[0])
        if (meta) {
          lastModifierName = `${meta.icon} ${t(`modifier.${meta.id}`)}`
          lastModifierDesc = t(`modifier.${meta.id}.desc`)
        } else {
          lastModifierName = ''
          lastModifierDesc = ''
        }
      } else {
        lastModifierName = ''
        lastModifierDesc = ''
      }
    } else {
      lastBattleHasModifier = false
      lastModifierName = ''
      lastModifierDesc = ''
    }
  })

  // L4_elite_intro condition: 精英关
  const eliteIntroStep = L4_STEPS.find(s => s.id === 'L4_elite_intro')
  if (eliteIntroStep) {
    eliteIntroStep.trigger.condition = () => lastBattleIsElite
  }

  // L4_boss_intro condition: Boss 关
  const bossIntroStep = L4_STEPS.find(s => s.id === 'L4_boss_intro')
  if (bossIntroStep) {
    bossIntroStep.trigger.condition = () => lastBattleIsBoss
  }

  // L4_modifier_explain condition + paramsProvider: 有修饰器的精英/Boss 关
  const modExplainStep = L4_STEPS.find(s => s.id === 'L4_modifier_explain')
  if (modExplainStep) {
    modExplainStep.trigger.condition = () => lastBattleHasModifier
    modExplainStep.content.paramsProvider = () => ({
      name: lastModifierName,
      desc: lastModifierDesc,
    })
  }

  // --- L5 condition 注入 ---

  // L5_class_unlock: meta:class_unlocked 事件本身即足够，无需额外 condition

  // L5_class_resource: 职业 Run 中首次触发技能
  let lastTriggerInClassRun = false
  // 扩展已有 skill:triggered 监听（与 L3 的 lastTriggerHadGrowth 共存）
  eventBus.on('skill:triggered', () => {
    lastTriggerInClassRun = state.classId !== 'none'
  })

  const classResourceStep = L5_STEPS.find(s => s.id === 'L5_class_resource')
  if (classResourceStep) {
    classResourceStep.trigger.condition = () => lastTriggerInClassRun
  }

  // --- 注册并启动 ---
  tutorialManager.register([...L0_STEPS, ...L1_STEPS, ...L2_STEPS, ...L3_STEPS, ...L4_STEPS, ...L5_STEPS])
  tutorialManager.start()

  // --- 帮助按钮 ---
  initHelpButtons()
}
