// ============================================
// 回归：每次通关都要 emit battle:end（V2 on_battle_end / teach 依赖）
// ============================================
// Bug: 过去 battle:end 仅在 victory()（最终周目 Boss）和 gameOver()（失败）emit，
// 普通/精英/非最终 Boss 通关直接进商店、从不 emit → teach 等 on_battle_end 词条永不触发。
// 修复：endLevel() 的通关分支统一 emit battle:end{win}，victory() 不再单独 emit。
// endLevel 依赖大量 DOM/BGM/timer，难以单元驱动，故用源码级断言守护该 emit 不被移除。

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const battlePath = path.resolve(__dirname, '../../../src/systems/battle.ts')
const src = fs.readFileSync(battlePath, 'utf-8')

function sliceFn(name: string): string {
  const start = src.indexOf(`function ${name}(`)
  if (start < 0) return ''
  // 粗略截到下一个顶层 function 声明
  const after = src.indexOf('\nfunction ', start + 1)
  return src.slice(start, after < 0 ? undefined : after)
}

describe('battle:end emitted on every stage clear', () => {
  it('endLevel() 通关分支 emit battle:end{win}', () => {
    const endLevel = sliceFn('endLevel')
    expect(endLevel).not.toBe('')
    // 通关判定行
    expect(endLevel).toMatch(/_isCalibrationLevel \|\| state\.score >= state\.targetScore/)
    // 该分支内存在 win 型 battle:end emit
    expect(endLevel).toMatch(/emit\(\s*['"]battle:end['"]\s*,\s*\{\s*result:\s*['"]win['"]/)
  })

  it('victory() 不再单独 emit battle:end（避免最终 Boss 重复）', () => {
    const victory = sliceFn('victory')
    expect(victory).not.toBe('')
    expect(victory).not.toMatch(/emit\(\s*['"]battle:end['"]/)
  })

  it('gameOver() 仍 emit battle:end{lose}', () => {
    const gameOver = sliceFn('gameOver')
    expect(gameOver).not.toBe('')
    expect(gameOver).toMatch(/emit\(\s*['"]battle:end['"]\s*,\s*\{\s*result:\s*['"]lose['"]/)
  })
})
