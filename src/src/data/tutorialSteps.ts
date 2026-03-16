// ============================================
// 打字肉鸽 - 引导步骤数据定义
// ============================================
// Story 39.3: TutorialManager 基础设施

/**
 * 引导步骤触发器
 */
export interface TutorialTrigger {
  /** EventBus 事件名 */
  event: string
  /** 可选额外条件（返回 true 才触发） */
  condition?: () => boolean
  /** 事件后延迟 ms */
  delay?: number
}

/**
 * 引导步骤内容
 */
export interface TutorialContent {
  /** i18n key — 标题 */
  titleKey: string
  /** i18n key — 正文 */
  bodyKey: string
  /** 锚定 DOM 元素 ID（浮窗定位） */
  anchorElement?: string
  /** 锚定方向 */
  anchorPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** 高亮区域选择器 */
  highlight?: string
}

/**
 * 引导步骤定义
 */
export interface TutorialStep {
  /** 唯一标识，如 'L0_type_to_trigger' */
  id: string
  /** 引导层级 0-5 */
  level: 0 | 1 | 2 | 3 | 4 | 5
  /** 触发器 */
  trigger: TutorialTrigger
  /** 显示内容 */
  content: TutorialContent
  /** 自动消失时间 ms（默认 6000） */
  dismissAfter?: number
  /** 前置步骤 ID（前置未完成时不触发） */
  prerequisite?: string
}

// ============================================
// L0 打字基础引导（第一场战斗中触发）
// Story 39.4: condition 函数留空，由 systems/tutorial/tutorialInit.ts 注入
// ============================================
export const L0_STEPS: TutorialStep[] = [
  {
    id: 'L0_welcome',
    level: 0,
    trigger: {
      event: 'battle:start',
      delay: 1000,
      // condition 由 tutorialInit 注入（首次 Run）
    },
    content: {
      titleKey: 'tutorial.L0_welcome_title',
      bodyKey: 'tutorial.L0_welcome_body',
      anchorElement: 'word-display',
      anchorPosition: 'bottom',
    },
    dismissAfter: 6000,
  },
  {
    id: 'L0_skill_triggered',
    level: 0,
    trigger: {
      event: 'skill:triggered',
    },
    content: {
      titleKey: 'tutorial.L0_skill_triggered_title',
      bodyKey: 'tutorial.L0_skill_triggered_body',
      anchorElement: 'skill-trigger-zone',
      anchorPosition: 'top',
    },
    dismissAfter: 6000,
    prerequisite: 'L0_welcome',
  },
  {
    id: 'L0_word_complete',
    level: 0,
    trigger: {
      event: 'word:complete',
    },
    content: {
      titleKey: 'tutorial.L0_word_complete_title',
      bodyKey: 'tutorial.L0_word_complete_body',
      anchorElement: 'score-count',
      anchorPosition: 'bottom',
    },
    dismissAfter: 6000,
    prerequisite: 'L0_skill_triggered',
  },
  {
    id: 'L0_combo',
    level: 0,
    trigger: {
      event: 'combo:update',
      // condition 由 tutorialInit 注入（combo >= 5）
    },
    content: {
      titleKey: 'tutorial.L0_combo_title',
      bodyKey: 'tutorial.L0_combo_body',
      anchorElement: 'combo-display',
      anchorPosition: 'bottom',
    },
    dismissAfter: 6000,
    prerequisite: 'L0_word_complete',
  },
]

// ============================================
// L1 经济系统引导（商店中触发）
// Story 39.4: condition 函数留空，由 systems/tutorial/tutorialInit.ts 注入
// ============================================
export const L1_STEPS: TutorialStep[] = [
  {
    id: 'L1_shop_intro',
    level: 1,
    trigger: {
      event: 'shop:opened',
      delay: 500,
    },
    content: {
      titleKey: 'tutorial.L1_shop_intro_title',
      bodyKey: 'tutorial.L1_shop_intro_body',
      anchorElement: 'reward-cards',
      anchorPosition: 'top',
    },
    dismissAfter: 6000,
  },
  {
    id: 'L1_skill_bind',
    level: 1,
    trigger: {
      event: 'shop:purchase',
      // condition 由 tutorialInit 注入（type === 'skill'）
    },
    content: {
      titleKey: 'tutorial.L1_skill_bind_title',
      bodyKey: 'tutorial.L1_skill_bind_body',
      anchorElement: 'skill-trigger-zone',
      anchorPosition: 'bottom',
    },
    dismissAfter: 6000,
  },
  {
    id: 'L1_upgrade',
    level: 1,
    trigger: {
      event: 'skill:upgraded',
      // 触发时机：首次技能升级
    },
    content: {
      titleKey: 'tutorial.L1_upgrade_title',
      bodyKey: 'tutorial.L1_upgrade_body',
      anchorElement: 'reward-cards',
      anchorPosition: 'top',
    },
    dismissAfter: 6000,
  },
  {
    id: 'L1_relic',
    level: 1,
    trigger: {
      event: 'relic:acquired',
    },
    content: {
      titleKey: 'tutorial.L1_relic_title',
      bodyKey: 'tutorial.L1_relic_body',
      anchorElement: 'player-relics',
      anchorPosition: 'top',
    },
    dismissAfter: 6000,
  },
]

// ============================================
// L2 词条系统引导（商店购买技能时触发）
// Story 39.5: condition 函数留空，由 systems/tutorial/tutorialInit.ts 注入
// ============================================
export const L2_STEPS: TutorialStep[] = [
  {
    id: 'L2_affix_intro',
    level: 2,
    trigger: {
      event: 'shop:purchase',
      // condition 由 tutorialInit 注入（rarity >= 1）
    },
    content: {
      titleKey: 'tutorial.L2_affix_intro_title',
      bodyKey: 'tutorial.L2_affix_intro_body',
      anchorElement: 'reward-cards',
      anchorPosition: 'top',
    },
    dismissAfter: 8000,
  },
  {
    id: 'L2_affix_positional',
    level: 2,
    trigger: {
      event: 'shop:purchase',
      // condition 由 tutorialInit 注入（has topology affix）
    },
    content: {
      titleKey: 'tutorial.L2_affix_positional_title',
      bodyKey: 'tutorial.L2_affix_positional_body',
      anchorElement: 'skill-trigger-zone',
      anchorPosition: 'bottom',
    },
    dismissAfter: 8000,
  },
  {
    id: 'L2_affix_variety',
    level: 2,
    trigger: {
      event: 'shop:purchase',
      // condition 由 tutorialInit 注入（rarity >= 2）
    },
    content: {
      titleKey: 'tutorial.L2_affix_variety_title',
      bodyKey: 'tutorial.L2_affix_variety_body',
      anchorElement: 'reward-cards',
      anchorPosition: 'top',
    },
    dismissAfter: 8000,
  },
  {
    id: 'L2_rarity_explain',
    level: 2,
    trigger: {
      event: 'shop:purchase',
      // condition 由 tutorialInit 注入（rarity >= 3）
    },
    content: {
      titleKey: 'tutorial.L2_rarity_explain_title',
      bodyKey: 'tutorial.L2_rarity_explain_body',
      anchorElement: 'reward-cards',
      anchorPosition: 'top',
    },
    dismissAfter: 8000,
  },
]

// ============================================
// L3 附魔系统引导（技能升级/战斗中触发）
// Story 39.5: condition 函数留空，由 systems/tutorial/tutorialInit.ts 注入
// ============================================
export const L3_STEPS: TutorialStep[] = [
  {
    id: 'L3_enchant_unlock',
    level: 3,
    trigger: {
      event: 'skill:upgraded',
      // condition 由 tutorialInit 注入（newLevel >= enchantLevel）
    },
    content: {
      titleKey: 'tutorial.L3_enchant_unlock_title',
      bodyKey: 'tutorial.L3_enchant_unlock_body',
      anchorElement: 'enchantment-modal',
      anchorPosition: 'bottom',
    },
    dismissAfter: 10000,
  },
  {
    id: 'L3_enchant_growth',
    level: 3,
    trigger: {
      event: 'skill:triggered',
      // condition 由 tutorialInit 注入（growthValue > 0 || questCompleted）
    },
    content: {
      titleKey: 'tutorial.L3_enchant_growth_title',
      bodyKey: 'tutorial.L3_enchant_growth_body',
      anchorElement: 'skill-trigger-zone',
      anchorPosition: 'top',
    },
    dismissAfter: 8000,
    prerequisite: 'L3_enchant_unlock',
  },
]

/** 完整版教程步骤（L0 + L1 + L2 + L3） */
export const FULL_TUTORIAL_STEPS: TutorialStep[] = [...L0_STEPS, ...L1_STEPS, ...L2_STEPS, ...L3_STEPS]

/**
 * Demo 模式 3 步教程（迁移自 demo-tutorial.ts）
 */
export const DEMO_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'demo_step1_type',
    level: 0,
    trigger: {
      event: 'battle:start',
      delay: 1000,
    },
    content: {
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step1',
      anchorElement: 'word-display',
      anchorPosition: 'bottom',
    },
    dismissAfter: 4000,
  },
  {
    id: 'demo_step2_skill',
    level: 0,
    trigger: {
      event: 'word:complete',
      delay: 500,
    },
    content: {
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step2',
      anchorElement: 'word-display',
      anchorPosition: 'bottom',
    },
    dismissAfter: 4000,
    prerequisite: 'demo_step1_type',
  },
  {
    id: 'demo_step3_shop',
    level: 0,
    trigger: {
      event: 'shop:opened',
      delay: 500,
    },
    content: {
      titleKey: 'tutorial.demo_title',
      bodyKey: 'tutorial.step3',
      anchorElement: 'shop-tabs',
      anchorPosition: 'bottom',
    },
    dismissAfter: 4000,
    prerequisite: 'demo_step2_skill',
  },
]
