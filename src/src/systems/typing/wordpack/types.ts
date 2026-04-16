// Story 59.5 — Wordpack 系统类型定义
//
// W-1: 所有词包加载走 WordpackRegistry.load()，禁止其它路径直接 fetch
// W-2: Wordpack 与既有 RelicData **无任何共同父类或结构兼容**，
//      确保 TypeScript 在编译期拒绝 `const r: RelicData = wordpack` 这类误用。
//
// 注意：本文件与既有 `src/core/types.ts` 中的 `WordPack` 类型共存。
// 既有 `WordPack` 是商店奖励层的 pack condition 结构；本文件的 `Wordpack`
// 是 systems 层的运行时词包对象。命名大小写差异（WordPack vs Wordpack）
// 刻意保留以区分领域，未来 story 会讨论是否合并/迁移。

// ===== ModifierHost 占位 =====
// 59.4（modifiers/ 横向层骨架）尚未落地，本处提供最小 interface 占位。
// 59.4 完成后应删除这段占位并从 `../../modifiers/types` import Modifier + ModifierHost。
// TODO(59.4): 删除占位，import 真实类型
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

// ===== Wordpack 运行时对象 =====
// W-2 通过 **phantom brand** 实现：`__wordpackBrand` 字段仅存在于类型系统，
// 运行时没有任何属性（零 runtime 开销），但任何外部代码想构造 Wordpack
// 都必须提供这个 brand，而 `unique symbol` 的 declare 让外部无法复现。
//
// 这种模式在 TS 生态叫"phantom type brand"或"nominal type via unique symbol"。

declare const WordpackBrand: unique symbol

export interface Wordpack extends ModifierHost {
  readonly [WordpackBrand]: 'Wordpack'
  readonly id: string
  readonly themeKey: string      // narrative.get(themeKey)
  readonly descKey: string       // narrative.get(descKey)
  readonly language: 'en' | 'zh-py' | 'zh-romaji' | string
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
 * 运行时只返回普通对象 + getModifiers 闭包；brand 是 phantom（零运行时成本）。
 * 类型系统会把返回值视作带 brand 的 Wordpack，外部代码无法跳过此函数自造。
 */
export function createWordpack(init: WordpackInit): Wordpack {
  const modifiers = init.modifiers ?? []
  return {
    id: init.id,
    themeKey: init.themeKey,
    descKey: init.descKey,
    language: init.language,
    difficulty: init.difficulty,
    words: init.words,
    unlockCondition: init.unlockCondition,
    narrativeTag: init.narrativeTag,
    getModifiers(): ReadonlyArray<ModifierPlaceholder> {
      return modifiers
    },
  } as unknown as Wordpack
}

// ===== Meta 状态占位 =====
// WordpackRegistry.listUnlocked(meta) 的参数类型。
// 实际 MetaState 在 src/core/state 中维护；此处只声明 listUnlocked 需要的最小形状，
// 避免 systems/typing/wordpack/ 反向 import 整个 core 类型图。
export interface UnlockedKeysQuery {
  hasAchievement(key: string): boolean
  hasMetaProgress(key: string): boolean
  hasChallenge(key: string): boolean
}
