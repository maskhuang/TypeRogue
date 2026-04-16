// Story 59.4 — EngineModifier 类型定义
//
// 本文件是 v1.1 §Affix/Modifier Layer 的横向 modifier 类型骨架，
// **与 Epic 11 legacy（../ModifierTypes.ts）并存**，通过 `Engine*` 前缀命名隔离。
//
// 语义:
//   - EngineModifier 是 scope-based 的纯函数，暴露 `apply(ctx)` 回调
//   - ModifierEngine 按 kind 固定顺序（additive → multiplicative → conditional → transform）
//     串联多个 EngineModifier 得到最终值
//   - EngineModifierHost 是任何可以提供 EngineModifier 的载体（skill / relic / wordpack / affix）
//
// 命名约定:
//   所有公开类型以 `Engine*` 开头，避免与 Epic 11 的 `Modifier` / `ModifierHost` 冲突。
//   方法名用 `getEngineModifiers` 而非 `getModifiers`，保证即使 JS 运行时 mixing 两套接口
//   也不会意外同名重载。

// ===== 分类 =====
export type EngineModifierKind = 'additive' | 'multiplicative' | 'conditional' | 'transform'

// ===== 来源 =====
// 与 Epic 11 的 ModifierSourceType（'skill' | 'relic' | 'passive' | 'letter'）**不完全相同**。
// 本层刻意包含 'wordpack' 和 'affix'，反映 v1.1 的横向挂载模型。
export type EngineModifierSource = 'skill' | 'relic' | 'wordpack' | 'affix'

// ===== 作用域 =====
// Extensible string union：常见值是字面量提示，实际类型是 string（避免 TS 反模式）。
// 未来 Epic 34/35/45 可以随意新增 scope 而不用改类型。
export type EngineModifierScope =
  | 'score'
  | 'timer'
  | 'word'
  | 'skill-cd'
  | 'damage'
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | (string & {})

// ===== 求值上下文 =====
// 本 story 只包含最小字段 { scope, baseValue }；未来 Epic 34/35/45 扩展时
// 应在这个 interface 追加 optional 字段，保持向后兼容。
export interface EngineModifierContext {
  readonly scope: EngineModifierScope
  readonly baseValue: number
}

// ===== 求值结果 =====
// applied=false 时 value 被丢弃（conditional modifier 跳过语义）。
// debug 字段只在开发模式填充，用于审计求值链路。
export interface EngineModifierResult {
  readonly value: number
  readonly applied: boolean
  readonly debug?: string
}

// ===== Modifier =====
// Phantom brand 不是必须的（EngineModifier 不是与其它系统高度混淆的类型，且
// Epic 11 的 Modifier 与其形状差异已经足够大）。若未来需要 nominal 严格分离，
// 可以仿照 Wordpack 的 WordpackBrand 模式追加。
export interface EngineModifier {
  readonly id: string
  readonly source: EngineModifierSource
  readonly kind: EngineModifierKind
  readonly scope: EngineModifierScope
  /** 优先级，越小越先执行；默认 100。只在同 kind 内部做排序。 */
  readonly priority?: number
  apply(ctx: EngineModifierContext): EngineModifierResult
}

// ===== Host =====
// skill / relic / wordpack 等载体实现此接口以暴露自身的 modifier 列表。
// 可选 scope 参数：实现方可以按 scope 过滤返回减少 engine 端的工作量，
// 或者忽略参数返回全部让 engine 自己过滤。
export interface EngineModifierHost {
  getEngineModifiers(scope?: EngineModifierScope): ReadonlyArray<EngineModifier>
}
