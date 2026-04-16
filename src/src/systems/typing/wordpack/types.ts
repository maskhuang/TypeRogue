// Story 59.5 — Wordpack 系统类型定义
//
// W-1: 所有词包加载走 WordpackRegistry.load()，禁止其它路径直接 fetch
// W-2: Wordpack 与既有 RelicData 在类型系统层面不兼容，
//      通过 phantom brand 让 TypeScript 在编译期拒绝 `const r: RelicData = wordpack` 这类误用。
//
// 注意：本文件与既有 `src/core/types.ts` 中的 `WordPack` 类型共存。
// 既有 `WordPack` 是商店奖励层的 pack condition 结构；本文件的 `Wordpack`
// 是 systems 层的运行时词包对象。命名大小写差异（WordPack vs Wordpack）
// 刻意保留以区分领域，未来 story 会讨论是否合并/迁移。

// ===== ModifierHost 占位 =====
// 本处提供最小 interface 占位用于 59.5 落地时的类型契约。
// TODO(迁移): Story 59.4 已落地 `src/systems/modifiers/engine/` 目录，提供
//   `EngineModifier` / `EngineModifierHost` / `EngineModifierKind` 等真实类型。
//   下次任何 touch 本文件的 story 应把 `ModifierPlaceholder` 替换为 `EngineModifier`，
//   把 `ModifierHost` 替换为 `EngineModifierHost`，并调整 `Wordpack.getModifiers()` 为
//   `getEngineModifiers(scope?)`。此替换会波及 WordpackRegistry / tests / type-assertions，
//   因此刻意不在 59.4 范围内一并改，避免 commit 耦合。
export interface ModifierPlaceholder {
  readonly id: string
  readonly kind: string
}

export interface ModifierHost {
  getModifiers(): ReadonlyArray<ModifierPlaceholder>
}

// ===== 解锁条件 =====
export interface UnlockRule {
  kind: 'default' | 'achievement' | 'meta-progress' | 'challenge'
  key?: string
}

// ===== 语言提示 =====
// 抽出为独立类型：IDE 自动补全时看到常见值，但字段本身保持 `string` 类型避免
// `'en' | 'zh-py' | string` 这种反模式（TS 会将其收缩为 string 并丢失字面量）。
// 约定：新语言先加到这个 type，再在数据文件中使用。
export type LanguageHint = 'en' | 'zh-py' | 'zh-romaji' | 'ja' | 'ko'

// ===== Wordpack 运行时对象 =====
// W-2 通过 **phantom brand** 实现：`[WordpackBrand]` 字段仅存在于类型系统，
// 运行时没有任何属性（零 runtime 开销）。
//
// 边界说明：phantom brand 是**类型系统协议**，不是 runtime 屏障。
//   - ✅ TS-strict 代码写 `const r: RelicData = wordpack` 会被编译器拒绝
//   - ✅ 字面量构造 Wordpack 无法提供 unique symbol brand，编译期报错
//   - ⚠️  任何 `as Wordpack` / `as any` / `JSON.parse(...) as Wordpack` 都能绕过
//   - ⚠️  真实 runtime 隔离需要配合 tsc --noEmit CI gate（见 tsconfig.typetest.json）
//
// 这种模式在 TS 生态叫 "phantom type brand" 或 "nominal type via unique symbol"。

declare const WordpackBrand: unique symbol

export interface Wordpack extends ModifierHost {
  readonly [WordpackBrand]: 'Wordpack'
  readonly id: string
  readonly themeKey: string      // narrative.get(themeKey)
  readonly descKey: string       // narrative.get(descKey)
  readonly language: string      // 常见值见 LanguageHint 类型
  readonly difficulty: 1 | 2 | 3 | 4 | 5
  readonly words: ReadonlyArray<string>
  readonly unlockCondition?: UnlockRule
  readonly narrativeTag?: string
}

/** 不带 brand 的裸数据结构，供 Registry loader 与工厂使用。 */
export interface WordpackInit {
  readonly id: string
  readonly themeKey: string
  readonly descKey: string
  readonly language: string
  readonly difficulty: 1 | 2 | 3 | 4 | 5
  readonly words: ReadonlyArray<string>
  readonly modifiers?: ReadonlyArray<ModifierPlaceholder>
  readonly unlockCondition?: UnlockRule
  readonly narrativeTag?: string
}

/**
 * 唯一合法的 Wordpack 构造入口。
 * - 运行时只返回普通对象 + getModifiers 闭包；brand 是 phantom（零成本）。
 * - words 和 modifiers 做 defensive spread copy + Object.freeze，
 *   防止调用方后续修改 init 的数组导致 Wordpack 内部状态被篡改。
 */
export function createWordpack(init: WordpackInit): Wordpack {
  const modifiers: ReadonlyArray<ModifierPlaceholder> = Object.freeze([
    ...(init.modifiers ?? []),
  ])
  const words: ReadonlyArray<string> = Object.freeze([...init.words])
  const obj = {
    id: init.id,
    themeKey: init.themeKey,
    descKey: init.descKey,
    language: init.language,
    difficulty: init.difficulty,
    words,
    unlockCondition: init.unlockCondition,
    narrativeTag: init.narrativeTag,
    getModifiers(): ReadonlyArray<ModifierPlaceholder> {
      return modifiers
    },
  }
  return Object.freeze(obj) as unknown as Wordpack
}

// ===== Meta 解锁查询端口 =====
// listCachedUnlocked 接受这个 port 查询某个 key 是否解锁。
// 由 core/state 的 MetaState 实现；wordpack/ 只用查询能力，不反向 import MetaState 整体。
// 命名采用 hexagonal 风格（~Port 后缀），表明这是 systems → core 的依赖倒置接口。
export interface MetaUnlockPort {
  hasAchievement(key: string): boolean
  hasMetaProgress(key: string): boolean
  hasChallenge(key: string): boolean
}
