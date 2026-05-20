// ============================================
// 回归：进店不得清空 state.player.inbox（待装配区跨关持久）
// ============================================
// Bug: enterTerminalShop() → resetSession() 里 `state.player.inbox = []` 会在每次进店时
// 清空待装配区，导致：
//   1) SUBMIT 警告承诺未装配项「带入下批次」(warn_inbox_left) 被食言；
//   2) battle:end 时 teach 等 on_battle_end 词条 push 进 inbox 的获赠技能，进店即被清空 —
//      获赠技能永远到不了待装配区，teach 看似无效。
// 修复：resetSession 不再清空 inbox；inbox 仅由 购买/装配/卖出 维护，新 run 由 resetState 重建。

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const bootstrapPath = path.resolve(__dirname, '../../../src/ui/shop/shopBootstrap.ts')
const src = fs.readFileSync(bootstrapPath, 'utf-8')

function sliceFn(name: string): string {
  const start = src.indexOf(`function ${name}(`)
  if (start < 0) return ''
  const after = src.indexOf('\nfunction ', start + 1)
  return src.slice(start, after < 0 ? undefined : after)
}

describe('shop entry must not wipe the IN-tray', () => {
  it('resetSession() 不再清空 state.player.inbox', () => {
    const resetSession = sliceFn('resetSession')
    expect(resetSession).not.toBe('')
    // 不得出现把 inbox 整体清空 / 重赋空数组的语句
    expect(resetSession).not.toMatch(/player\.inbox\s*=\s*\[\s*\]/)
    expect(resetSession).not.toMatch(/player\.inbox\.length\s*=\s*0/)
  })

  it('shopBootstrap.ts 全文不在进店路径整体清空 inbox', () => {
    // 守护：除 RunState 加载过滤外，渲染层不应 bulk-clear inbox
    expect(src).not.toMatch(/state\.player\.inbox\s*=\s*\[\s*\]/)
  })
})
