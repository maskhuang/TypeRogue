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
// 与 Story 59.5 的 `Wordpack.language: string` 决策对齐：字段类型直接用 string，
// 不玩 `'a' | 'b' | (string & {})` 这类"保留字面量自动补全"的 TS 编译器巧技——
// 那种写法需要未来读者理解 literal union 塌缩机制才能 debug。
//
// 常见值抽成独立的 `EngineModifierScopeHint` 类型：IDE 能看到提示，但实际字段类型
// 保持 `string`，新增 scope 不用改类型。
export type EngineModifierScope = string

/** IDE 提示用的常见 scope 字面量。新增 scope 先加到这里再在数据文件中使用。 */
export type EngineModifierScopeHint = 'score' | 'timer' | 'word' | 'skill-cd' | 'damage'

// ===== 求值上下文 =====
// 本 story 只包含最小字段 { scope, baseValue }；未来 Epic 34/35/45 扩展时
// 应在这个 interface 追加 optional 字段，保持向后兼容。
export interface EngineModifierContext {
  readonly scope: EngineModifierScope
  readonly baseValue: number
}

// ===== 求值结果 =====
// applied=false 时 value 被丢弃（conditional modifier 跳过语义）。
// **value 必须是 finite number**：engine 会在运行时拒绝 NaN / ±Infinity / 非 number
// 类型，dev 模式下抛错，prod 模式下 warn + 保留上一步 value（见 ModifierEngine.resolve）。
export interface EngineModifierResult {
  readonly value: number
  readonly applied: boolean
}

// ===== Modifier =====
// Phantom brand 不是必须的（EngineModifier 不是与其它系统高度混淆的类型，且
// Epic 11 的 Modifier 与其形状差异已经足够大）。若未来需要 nominal 严格分离，
// 可以仿照 Wordpack 的 WordpackBrand 模式追加。
//
// **apply() 契约：必须是纯函数**
//   - 对相同的 EngineModifierContext，必须返回相同的 EngineModifierResult
//   - 禁止 closure state mutation / 全局状态读写 / 随机数 / 时间相关计算
//   - 违反者会让 ModifierEngine 的求值不可预测，给重放调试和存档带来灾难
//   - 运行时无法强制检测此契约，靠 code review + 测试兜底
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
