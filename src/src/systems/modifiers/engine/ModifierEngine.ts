// Story 59.4 — ModifierEngine
//
// v1.1 §Affix/Modifier Layer 的横向求值引擎。按固定顺序串联 EngineModifier 的 apply() 回调
// 得到最终值。**与 Epic 11 legacy EffectPipeline 并存**，不取代、不迁移。
//
// ═══════════════════════════════════════════════════════════════════════
//   求值契约（不可变，由 Story 59.4 AC3 + code-review 锁定）
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
//   - **tie-breaking**: priority 相等时按**输入顺序**（Array.sort 自 ES2019 起是 stable sort）。
//     这意味着输入数组的前后顺序决定相等 priority 的执行顺序。
//
// 纯性契约:
//   - modifier.apply(ctx) 必须是**纯函数**：相同 ctx → 相同 result
//   - 禁止 closure mutation / 随机数 / 时间读取 / 全局状态访问
//   - engine 无法运行时强制这一点，靠 code review 兜底
//
// id 去重（collectActive）:
//   - 跨 host 收集 modifier 时，同 id 只保留**首次遇到**的那个
//   - 这给调用方提供一种 override 机制：Meta 层 host 比 Run 层 host 先出现即可覆盖
//   - ⚠️ **dedup 只在 target scope 内生效**：scope 过滤发生在 dedup 之前。
//     Meta host 若用错误 scope 声明 modifier，它在 scope 过滤阶段就被丢弃，
//     根本不会进 seen 集，因此无法 override 同 id 的 Run host 版本。
//     结论：id 去重的 "override" 要求 Meta 和 Run 在**同一 scope** 声明同 id。
//
// Finite 守卫:
//   - 每个 applied 结果的 value 都要通过 Number.isFinite() 检查
//   - NaN / ±Infinity / 非 number 类型：dev 模式 throw，prod 模式 warn + 保留上一步 value
//   - 防止单个坏 modifier 污染整条求值链，保护存档不写 NaN 分数
//
// ═══════════════════════════════════════════════════════════════════════

import type {
  EngineModifier,
  EngineModifierContext,
  EngineModifierHost,
  EngineModifierKind,
  EngineModifierScope,
} from './types'

/**
 * Story 59.4 定义的求值顺序。**导出以便测试直接断言**，任何改动必须同步更新本文件
 * 顶部的契约注释与测试中的 `EVALUATION_ORDER` fixture。
 */
export const EVALUATION_ORDER: ReadonlyArray<EngineModifierKind> = [
  'additive',
  'multiplicative',
  'conditional',
  'transform',
] as const

const DEFAULT_PRIORITY = 100

/**
 * 是否在开发模式：仅用于 finite guard 的 throw vs warn 分支。
 * 使用 Vite 的 import.meta.env.DEV 标志；fallback 为 false (生产安全默认)。
 */
function isDevMode(): boolean {
  try {
    // Vite 运行时注入 import.meta.env.DEV；types 由 "vite/client" 提供（主 tsconfig.json）
    return Boolean(import.meta.env?.DEV)
  } catch {
    return false
  }
}

export class ModifierEngine {
  /**
   * 从多个 host 中收集所有声明在 `scope` 下生效的 modifier。
   * 同 id 去重：首次出现优先（为调用方提供 override 机制，见文件顶部契约）。
   *
   * ⚠️ dedup 的 override 语义只在同 scope 内成立——见顶部契约 "id 去重" 段。
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
   *
   * 每步都会构造新的 context；modifier 的 apply 必须是纯函数（见顶部契约 "纯性契约"）。
   * 返回值永远是 finite number，坏 modifier 的非 finite 结果被 guard 吞掉。
   */
  resolve(
    baseValue: number,
    modifiers: ReadonlyArray<EngineModifier>,
    scope: EngineModifierScope,
  ): number {
    if (!Number.isFinite(baseValue)) {
      throw new Error(
        `ModifierEngine.resolve: baseValue must be finite, got ${String(baseValue)}`,
      )
    }

    let value = baseValue
    for (const kind of EVALUATION_ORDER) {
      const bucket = modifiers
        .filter((m) => m.kind === kind)
        .sort((a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY))
      for (const m of bucket) {
        const ctx: EngineModifierContext = { scope, baseValue: value }
        const result = m.apply(ctx)
        if (!result.applied) continue

        // ----- Finite guard: 拒绝 NaN / ±Infinity / 非 number -----
        if (typeof result.value !== 'number' || !Number.isFinite(result.value)) {
          const msg =
            `ModifierEngine: modifier '${m.id}' (kind=${m.kind}, scope=${String(scope)}) ` +
            `returned non-finite value ${String(result.value)}; skipping to preserve upstream value`
          if (isDevMode()) {
            throw new Error(msg)
          }
          console.warn(msg)
          continue // 丢弃该步，保留上一步 value
        }

        value = result.value
      }
    }
    return value
  }
}
