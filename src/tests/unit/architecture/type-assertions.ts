// Story 59.5 H3 — 类型级架构断言
//
// 本文件**不是 vitest 测试**。它由 `npm run typecheck:types` 直接用 tsc 编译，
// 通过 `@ts-expect-error` 指令断言架构规则在类型系统层面成立。
//
// tsc 编译本文件时：
//   - 每一行 @ts-expect-error 必须捕获到至少一个类型错误，否则整个编译失败
//   - 这让 Epic 59 的 phantom brand / 结构类型隔离规则有持久化 CI 兜底
//
// 为什么不直接用 `tsc --noEmit` 全仓跑？
//   - 仓库当前有 ~250 处历史类型错误（主要是 noUnusedLocals / 第三方类型不匹配）
//   - 修复它们是 Epic 59 范围外的独立工作
//   - 本 scoped tsconfig (tsconfig.typetest.json) 只覆盖架构骨架文件，规避历史债
//
// 未来 Epic 59 新增 story 的 architectural 类型规则应该往这个文件追加新 @ts-expect-error。

import {
  createWordpack,
  type LanguageHint,
  type MetaUnlockPort,
  type Wordpack,
  type WordpackInit,
} from '../../../src/systems/typing/wordpack'
import {
  ModifierEngine,
  type EngineModifier,
  type EngineModifierContext,
  type EngineModifierHost,
  type EngineModifierResult,
} from '../../../src/systems/modifiers/engine'

// ===== Stub RelicData =====
// 我们不从真实 src/data/relics.ts import RelicData，因为那会触发 tsc 跟踪
// 到整个 data/core 依赖图，碰到历史类型错误。本 stub 提供一个"足够像 RelicData"
// 的结构，用于验证 W-2 phantom brand 能让 Wordpack 被拒绝赋值。
interface RelicDataStub {
  id: string
  name: string
  rarity: string
}

// ===== W-2: Wordpack 与 RelicData 类型不兼容 =====
{
  const pack: Wordpack = createWordpack({
    id: 'w',
    themeKey: 't',
    descKey: 'd',
    language: 'en',
    difficulty: 1,
    words: [],
  })

  // @ts-expect-error — W-2: phantom brand 让 Wordpack 不可赋值给 RelicData
  const _asRelic: RelicDataStub = pack
  void _asRelic
}

// ===== W-2: 外部字面量无法构造 Wordpack（缺少 phantom brand） =====
{
  // @ts-expect-error — 外部代码无法提供 [WordpackBrand] unique symbol 字段
  const _fake: Wordpack = {
    id: 'fake',
    themeKey: 'x',
    descKey: 'y',
    language: 'en',
    difficulty: 1,
    words: [],
    getModifiers: () => [],
  }
  void _fake
}

// ===== W-2: createWordpack 是唯一合法入口 =====
{
  const init: WordpackInit = {
    id: 'legit',
    themeKey: 't',
    descKey: 'd',
    language: 'en',
    difficulty: 3,
    words: ['a', 'b'],
  }
  const legit: Wordpack = createWordpack(init)
  void legit
}

// ===== MetaUnlockPort 只暴露查询能力（不是 MetaState 整体） =====
{
  const port: MetaUnlockPort = {
    hasAchievement: () => false,
    hasMetaProgress: () => false,
    hasChallenge: () => false,
  }
  void port

  // MetaState 会有多得多的字段；MetaUnlockPort 不应该接受任意 MetaState 对象
  interface FakeMetaState {
    hasAchievement(k: string): boolean
    hasMetaProgress(k: string): boolean
    hasChallenge(k: string): boolean
    unlock(k: string): void // extra method
    level: number
  }
  const full: FakeMetaState = {
    hasAchievement: () => false,
    hasMetaProgress: () => false,
    hasChallenge: () => false,
    unlock: () => {},
    level: 0,
  }
  // 反向赋值 OK（FakeMetaState 是 MetaUnlockPort 的超集）
  const asPort: MetaUnlockPort = full
  void asPort
}

// ===== LanguageHint 是 IDE 提示（Wordpack.language 仍是 string） =====
{
  const hint: LanguageHint = 'en'
  void hint
  // LanguageHint 不直接约束 Wordpack.language；字段类型是 string
  const pack: Wordpack = createWordpack({
    id: 'lang',
    themeKey: 't',
    descKey: 'd',
    language: 'tlh', // Klingon，非 LanguageHint 成员，但 string 允许
    difficulty: 1,
    words: [],
  })
  void pack
}

// ===== difficulty 必须在 1-5 字面量内 =====
{
  const _init: WordpackInit = {
    id: 'bad',
    themeKey: 't',
    descKey: 'd',
    language: 'en',
    // @ts-expect-error — difficulty 受 1|2|3|4|5 字面量约束
    difficulty: 6,
    words: [],
  }
  void _init
}

// ===== Wordpack 字段是 readonly =====
{
  const pack = createWordpack({
    id: 'readonly',
    themeKey: 't',
    descKey: 'd',
    language: 'en',
    difficulty: 1,
    words: ['a'],
  })
  // @ts-expect-error — id 是 readonly，不可赋值
  pack.id = 'mutated'
}

// ═══════════════════════════════════════════════════════════════════
//   Story 59.4 — EngineModifier 类型断言
// ═══════════════════════════════════════════════════════════════════

// ===== AC9.1: EngineModifierKind 字面量约束 =====
{
  const ok: EngineModifier = {
    id: 'ok',
    source: 'skill',
    kind: 'additive',
    scope: 'score',
    apply(ctx: EngineModifierContext): EngineModifierResult {
      return { value: ctx.baseValue, applied: true }
    },
  }
  void ok

  const _bad: EngineModifier = {
    id: 'bad',
    source: 'skill',
    // @ts-expect-error — kind 必须是 EngineModifierKind 字面量之一，'amazing' 不在列表
    kind: 'amazing',
    scope: 'score',
    apply: (ctx) => ({ value: ctx.baseValue, applied: true }),
  }
  void _bad
}

// ===== AC9.2: EngineModifier.apply 必须返回 EngineModifierResult（不能返回 number） =====
{
  const _bad: EngineModifier = {
    id: 'bad-return',
    source: 'relic',
    kind: 'multiplicative',
    scope: 'score',
    // @ts-expect-error — apply 返回类型必须是 EngineModifierResult 对象，不是裸 number
    apply: (ctx) => ctx.baseValue * 2,
  }
  void _bad
}

// ===== AC9.3: EngineModifierHost 方法名是 getEngineModifiers（不是 getModifiers） =====
{
  const host: EngineModifierHost = {
    getEngineModifiers: () => [],
  }
  void host

  const _wrongMethodName: EngineModifierHost = {
    // @ts-expect-error — 必须是 getEngineModifiers 而非 getModifiers（避免与 Epic 11 / 59.5 占位冲突）
    getModifiers: () => [],
  }
  void _wrongMethodName
}

// ===== AC9.4: ModifierEngine.resolve 的类型契约 =====
{
  const engine = new ModifierEngine()
  const result: number = engine.resolve(10, [], 'score')
  void result

  // @ts-expect-error — baseValue 必须是 number，不能传 string
  engine.resolve('10', [], 'score')

  // @ts-expect-error — modifiers 必须是 EngineModifier[]，不能传 any[]
  engine.resolve(10, [{ arbitrary: 'object' }], 'score')
}
