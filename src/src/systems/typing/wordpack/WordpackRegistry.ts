// Story 59.5 — WordpackRegistry
//
// W-1: 唯一的词包加载入口。所有 wordpack 必须通过此类 load()，
//      禁止其它路径直接 fetch `assets/data/words/<id>.json`。
//
// 本文件是**骨架**：真实数据文件不在本 story 创建，由后续词包内容 story 填充。
// Registry 接收一个 DataLoader 函数做依赖注入，便于测试替身并为未来真实加载器留接口。

import { createWordpack, type MetaUnlockPort, type WordpackInit, type Wordpack } from './types'

/**
 * 数据加载器函数签名：给定词包 id，返回该词包的原始初始化数据（或 null 表示不存在）。
 * 真实实现会走 fetch(`assets/data/words/${id}.json`) 或 Vite import.meta.glob。
 * 测试 / 骨架场景走内存 map。
 */
export type WordpackDataLoader = (id: string) => Promise<WordpackInit | null>

export class WordpackRegistry {
  private readonly cache = new Map<string, Wordpack>()
  private readonly inFlight = new Map<string, Promise<Wordpack | null>>()

  /**
   * clear() 生成号：每次 clear 自增。in-flight load 在 resolve 时若发现
   * 生成号变了，就丢弃结果不写 cache，防止 "clear() 期间 in-flight → cache 幽灵" 的竞态。
   */
  private generation = 0

  private readonly loader: WordpackDataLoader

  // 显式字段赋值（不走 parameter-property 语法）——与 tsconfig 的 erasableSyntaxOnly 兼容。
  constructor(loader: WordpackDataLoader) {
    this.loader = loader
  }

  /**
   * Lazy load：首次调用时走 loader，之后命中 cache。
   *
   * 契约:
   * - 同 id 并发 load 合并为单个 promise，避免重复请求。
   * - loader 抛错或 promise reject 时：`inFlight` 会在 `finally` 里清理，
   *   下一次 `load(same id)` 可以重新尝试（错误不粘）。
   * - loader 返回 null 时：不写 cache（null 结果不 memoize）。
   * - clear() 期间的 in-flight：生成号变化时结果被丢弃，不污染后续 cache。
   */
  async load(id: string): Promise<Wordpack | null> {
    const cached = this.cache.get(id)
    if (cached) return cached

    const pending = this.inFlight.get(id)
    if (pending) return pending

    const startGeneration = this.generation
    const promise = this.loader(id)
      .then((raw) => {
        // H3 保护：clear() 在 in-flight 期间发生过 → 丢弃这次结果
        if (this.generation !== startGeneration) return null
        if (!raw) return null
        const pack = createWordpack(raw)
        this.cache.set(id, pack)
        return pack
      })
      .finally(() => {
        // H1 保护：无论成功/失败都清理 inFlight，避免粘性错误
        this.inFlight.delete(id)
      })

    this.inFlight.set(id, promise)
    return promise
  }

  /** 未 load 时返回 null；不触发加载。 */
  get(id: string): Wordpack | null {
    return this.cache.get(id) ?? null
  }

  /**
   * 返回 **已 load 且满足解锁条件** 的词包。
   *
   * ⚠️ 语义说明：只扫描 cache，不会自动 load。调用方（Meta 层）有义务在 Run 启动前
   * 预加载所有需要判定解锁的词包。如果某个已解锁的词包未被预加载，它不会出现在结果里。
   *
   * 命名刻意保留 "Cached" 前缀以免读者误以为这会遍历磁盘上全部词包。
   */
  listCachedUnlocked(meta: MetaUnlockPort): Wordpack[] {
    const out: Wordpack[] = []
    for (const pack of this.cache.values()) {
      if (WordpackRegistry.isUnlocked(pack, meta)) out.push(pack)
    }
    return out
  }

  /**
   * 清空 cache 与 inFlight，并使所有未完成的 load 失效。
   * 测试与 Run 结束清理用。
   */
  clear(): void {
    this.cache.clear()
    this.inFlight.clear()
    this.generation++
  }

  // ---- 解锁判定（Story 59.5 Non-Goal: 只做最小判定，后续 story 会扩展） ----
  private static isUnlocked(pack: Wordpack, meta: MetaUnlockPort): boolean {
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
