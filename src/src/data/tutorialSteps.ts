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
