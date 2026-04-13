// ============================================
// 打字肉鸽 - 引导步骤数据定义
// ============================================
// Story 39.3: TutorialManager 基础设施
// Story 57.1: 数据迁至 data-json/tutorialSteps.json，本文件保留接口与运行时类型

import { TUTORIAL_STEPS_DATA } from './schemas/tutorialSteps.schema'

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
  /** 动态 i18n 参数提供者（由 tutorialInit.ts 注入） */
  paramsProvider?: () => Record<string, string | number>
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
  /** 显示时暂停游戏，任意键可提前关闭 */
  pauseGame?: boolean
}

// ============================================
// 步骤数据 — 来源 data-json/tutorialSteps.json
// 注意：tutorialInit.ts 会就地 mutate 这些 step 对象注入 condition / paramsProvider，
//       JSON import 在 vite/node 下返回的对象是可变的（非 frozen），mutation 行为保持
// ============================================

export const L0_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.L0 as TutorialStep[]
export const L1_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.L1 as TutorialStep[]
export const L2_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.L2 as TutorialStep[]
export const L3_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.L3 as TutorialStep[]
export const L4_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.L4 as TutorialStep[]
export const L5_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.L5 as TutorialStep[]

/** 完整版教程步骤（L0 + L1 + L2 + L3 + L4 + L5） */
export const FULL_TUTORIAL_STEPS: TutorialStep[] = [...L0_STEPS, ...L1_STEPS, ...L2_STEPS, ...L3_STEPS, ...L4_STEPS, ...L5_STEPS]

/**
 * Demo 模式 3 步教程（迁移自 demo-tutorial.ts）
 */
export const DEMO_TUTORIAL_STEPS: TutorialStep[] = TUTORIAL_STEPS_DATA.demo as TutorialStep[]
