// ============================================
// 打字肉鸽 - Demo 新手引导
// ============================================
// Story 39.3: 迁移至 TutorialManager 系统

import { IS_DEMO } from './demo-config'
import { DEMO_TUTORIAL_STEPS } from '../data/tutorialSteps'
import { tutorialManager } from '../systems/tutorial/TutorialManager'

export function initDemoTutorial(): void {
  if (!IS_DEMO) return

  tutorialManager.register(DEMO_TUTORIAL_STEPS)
  tutorialManager.start()
}
