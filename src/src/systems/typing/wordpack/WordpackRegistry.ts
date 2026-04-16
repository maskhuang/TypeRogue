// Story 59.5 — WordpackRegistry
//
// W-1: 唯一的词包加载入口。所有 wordpack 必须通过此类 load()，
//      禁止其它路径直接 fetch `assets/data/words/<id>.json`。
//
// 本文件是**骨架**：真实数据文件（assets/data/words/*.json）不在本 story 创建，
// 由后续词包内容 story 填充。Registry 接收一个 DataLoader 函数做依赖注入，
// 便于测试替身并为未来真实加载器留接口。

import { createWordpack, type UnlockRule, type UnlockedKeysQuery, type Wordpack } from './types'

/**
 * 数据加载器函数签名：给定词包 id，返回该词包的原始 JSON 对象（或 null 表示不存在）。
 * 真实实现会走 fetch(`assets/data/words/${id}.json`) 或 Vite import.meta.glob。
 * 测试 / 骨架场景走内存 map。
 */
export type WordpackDataLoader = (id: string) => Promise<WordpackRawData | null>

/**
 * 磁盘/内存格式的"原始数据"——不带 WORDPACK_BRAND 的裸对象。
 * Registry 的 load() 会把它通过 createWordpack() 升级为真正的 Wordpack 对象。
 */
export interface WordpackRawData {
  id: string
  themeKey: string
  descKey: string
  language: string
  difficulty: 1 | 2 | 3 | 4 | 5
  words: string[]
  unlockCondition?: UnlockRule
  narrativeTag?: string
}

export class WordpackRegistry {
  private readonly cache = new Map<string, Wordpack>()
  private readonly inFlight = new Map<string, Promise<Wordpack | null>>()

  constructor(private readonly loader: WordpackDataLoader) {}

  /**
   * Lazy load：首次调用时走 loader，之后命中 cache。
   * 并发 load 同一 id 合并为一个 promise，避免重复请求。
   */
  async load(id: string): Promise<Wordpack | null> {
    const cached = this.cache.get(id)
    if (cached) return cached

    const pending = this.inFlight.get(id)
    if (pending) return pending

    const promise = this.loader(id).then((raw) => {
      this.inFlight.delete(id)
      if (!raw) return null
      const pack = createWordpack(raw)
      this.cache.set(id, pack)
      return pack
    })
    this.inFlight.set(id, promise)
    return promise
  }

  /** 未 load 时返回 null；不触发加载。 */
  get(id: string): Wordpack | null {
    return this.cache.get(id) ?? null
  }

  /** 返回所有已 load 且满足解锁条件的词包。 */
  listUnlocked(meta: UnlockedKeysQuery): Wordpack[] {
    const out: Wordpack[] = []
    for (const pack of this.cache.values()) {
      if (WordpackRegistry.isUnlocked(pack, meta)) out.push(pack)
    }
    return out
  }

  /** 测试与 Run 结束清理用。 */
  clear(): void {
    this.cache.clear()
    this.inFlight.clear()
  }

  // ---- 解锁判定（Story 59.5 Non-Goal: 只做最小判定，后续 story 会扩展） ----
  private static isUnlocked(pack: Wordpack, meta: UnlockedKeysQuery): boolean {
    const rule = pack.unlockCondition
    if (!rule || rule.kind === 'default') return true
    if (!rule.key) return false
    switch (rule.kind) {
      case 'achievement':
        return meta.hasAchievement(rule.key)
      case 'meta-progress':
        return meta.hasMetaProgress(rule.key)
      case 'challenge':
        return meta.hasChallenge(rule.key)
      default:
        return false
    }
  }
}
