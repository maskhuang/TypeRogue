// Story 59.4 — ModifierEngine
//
// v1.1 §Affix/Modifier Layer 的横向求值引擎。按固定顺序串联 EngineModifier 的 apply() 回调
// 得到最终值。**与 Epic 11 legacy EffectPipeline 并存**，不取代、不迁移。
//
// ═══════════════════════════════════════════════════════════════════════
//   求值契约（不可变，由 Story 59.4 AC3 锁定）
// ═══════════════════════════════════════════════════════════════════════
//
// 固定求值顺序:
//   1. 所有 additive（priority 升序）
//   2. 所有 multiplicative（priority 升序）
//   3. 所有 conditional（priority 升序）
//   4. 所有 transform（priority 升序）
//
// 每步的 ctx.baseValue 语义:
//   - 每个 modifier 看到的 ctx.baseValue 是**前面已应用的 modifier 累加后的结果**，
//     不是原始传入的 baseValue。
//   - 例：base=10，additive +5（applied），multiplicative ×2（applied）
//        → 第 1 步 ctx.baseValue = 10 → 结果 15
//        → 第 2 步 ctx.baseValue = 15 → 结果 30 ✅（而不是 25）
//
// applied 语义:
//   - `EngineModifierResult.applied === false` → 结果被丢弃，value 保持上一步
//   - 这是 conditional modifier 表达"不满足条件"的约定路径
//
// priority 语义:
//   - 仅在**同 kind 内**排序。undefined 默认 100。
//   - kind 间的顺序由上面的固定顺序决定，不受 priority 影响。
//
// id 去重（collectActive）:
//   - 跨 host 收集 modifier 时，同 id 只保留**首次遇到**的那个
//   - 这给调用方提供了一种 override 机制：Meta 层 host 比 Run 层 host 先出现
//     即可覆盖同 id 的 Run 层 modifier
//
// ═══════════════════════════════════════════════════════════════════════

import type {
  EngineModifier,
  EngineModifierContext,
  EngineModifierHost,
  EngineModifierKind,
  EngineModifierScope,
} from './types'

/** Story 59.4 定义的求值顺序。任何改动必须同步更新本文件顶部的契约注释与测试。 */
const EVALUATION_ORDER: ReadonlyArray<EngineModifierKind> = [
  'additive',
  'multiplicative',
  'conditional',
  'transform',
]

const DEFAULT_PRIORITY = 100

export class ModifierEngine {
  /**
   * 从多个 host 中收集所有声明在 `scope` 下生效的 modifier。
   * 同 id 去重：首次出现优先（为调用方提供 override 机制，见文件顶部契约）。
   */
  collectActive(
    hosts: ReadonlyArray<EngineModifierHost>,
    scope: EngineModifierScope,
  ): EngineModifier[] {
    const seen = new Set<string>()
    const out: EngineModifier[] = []
    for (const host of hosts) {
      const mods = host.getEngineModifiers(scope)
      for (const m of mods) {
        if (m.scope !== scope) continue // host 返回未过滤 scope 时由 engine 兜底过滤
        if (seen.has(m.id)) continue
        seen.add(m.id)
        out.push(m)
      }
    }
    return out
  }

  /**
   * 按固定求值顺序应用 modifiers 到 baseValue。空列表返回原始 baseValue。
   * 每步都会构造新的 context；modifier 的 apply 只读 ctx，不得修改 engine 状态。
   */
  resolve(
    baseValue: number,
    modifiers: ReadonlyArray<EngineModifier>,
    scope: EngineModifierScope,
  ): number {
    let value = baseValue
    for (const kind of EVALUATION_ORDER) {
      const bucket = modifiers
        .filter((m) => m.kind === kind)
        .sort((a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY))
      for (const m of bucket) {
        const ctx: EngineModifierContext = { scope, baseValue: value }
        const result = m.apply(ctx)
        if (result.applied) {
          value = result.value
        }
      }
    }
    return value
  }
}
