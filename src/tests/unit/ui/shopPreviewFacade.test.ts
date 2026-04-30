// ============================================
// Story 60.16 Task 7: shopPreview facade 兼容性单测
// ============================================
// 验证拆分（state / terminal / workbench / bootstrap）后，
// 旧路径 `from '../../../src/ui/shopPreview'` 仍能拿到所有关键 export。
// 既有 11 个 shopPreview*.test.ts 是回归覆盖，本测试是契约 lock —
// 任何 import 路径破坏会立即在这里失败而非散落到其他 11 个测试。
// ============================================

import { describe, it, expect } from 'vitest'
import {
  // Lifecycle
  enterTerminalShop,
  initShopPreview,
  triggerSubmit,
  handleSubmitConfirmation,
  // Banner / labels / chrome
  buildBannerLine,
  buildBannerText,
  getFormLabel,
  getClrLabel,
  getStageIcon,
  updateTerminalChrome,
  // Pack picker
  finalizePackPick,
  cancelPackPick,
  // Workbench tooltip
  attachWorkbenchTooltips,
  // Test API
  __test,
} from '../../../src/ui/shopPreview'

describe('shopPreview facade exports (Story 60.16 backward-compat lock)', () => {
  it('lifecycle entries exported as functions', () => {
    expect(typeof enterTerminalShop).toBe('function')
    expect(typeof initShopPreview).toBe('function')
    expect(typeof triggerSubmit).toBe('function')
    expect(typeof handleSubmitConfirmation).toBe('function')
  })

  it('banner / labels / chrome exported as functions', () => {
    expect(typeof buildBannerLine).toBe('function')
    expect(typeof buildBannerText).toBe('function')
    expect(typeof getFormLabel).toBe('function')
    expect(typeof getClrLabel).toBe('function')
    expect(typeof getStageIcon).toBe('function')
    expect(typeof updateTerminalChrome).toBe('function')
  })

  it('pack picker exported as functions', () => {
    expect(typeof finalizePackPick).toBe('function')
    expect(typeof cancelPackPick).toBe('function')
  })

  it('workbench tooltip exported as function', () => {
    expect(typeof attachWorkbenchTooltips).toBe('function')
  })

  it('__test object includes all internal hook entries', () => {
    expect(__test).toBeDefined()
    // pack picker
    expect(typeof __test.executeBuyPack).toBe('function')
    expect(typeof __test.getPendingPackPick).toBe('function')
    expect(typeof __test.setPendingPackPick).toBe('function')
    // undo
    expect(typeof __test.getUndoStack).toBe('function')
    expect(typeof __test.resetUndoStack).toBe('function')
    // submit
    expect(typeof __test.getPendingSubmit).toBe('function')
    expect(typeof __test.setPendingSubmit).toBe('function')
    expect(typeof __test.isSubmitting).toBe('function')
    expect(typeof __test.resetSubmitting).toBe('function')
    expect(typeof __test.proceedSubmit).toBe('function')
    // BUY confirm
    expect(typeof __test.setPendingConfirm).toBe('function')
    expect(typeof __test.getPendingConfirm).toBe('function')
    // BUY/SELL/UND
    expect(typeof __test.executeBuySkill).toBe('function')
    expect(typeof __test.executeBuyRelic).toBe('function')
    expect(typeof __test.cmdSell).toBe('function')
    expect(typeof __test.cmdUndo).toBe('function')
    expect(typeof __test.cmdBuy).toBe('function')
    // INFO
    expect(typeof __test.cmdInfo).toBe('function')
    expect(typeof __test.setDescriptorCache).toBe('function')
    // animations
    expect(typeof __test.cmdList).toBe('function')
    expect(typeof __test.cmdReshuffle).toBe('function')
    expect(typeof __test.triggerInboxWhoosh).toBe('function')
    expect(typeof __test.showOnly).toBe('function')
    expect(typeof __test.setNextListAnimated).toBe('function')
    // workbench
    expect(typeof __test.bindSkillToKey).toBe('function')
    expect(typeof __test.unbindSkillFromKey).toBe('function')
    expect(typeof __test.openDrawer).toBe('function')
  })

  it('pure-function exports execute deterministically (smoke test, no DOM)', () => {
    // buildBannerLine 是纯函数，不动 DOM/state
    const line = buildBannerLine(1, 1, 0)
    expect(line).toContain('CLERK ID: 7842')
    expect(line).toContain('FILE')
    expect(line).toContain('A0')
    // getFormLabel 同样纯
    expect(getFormLabel(3)).toBe('F-3')
    expect(getFormLabel(0)).toBe('F-1') // safeLevel 兜底
  })
})
