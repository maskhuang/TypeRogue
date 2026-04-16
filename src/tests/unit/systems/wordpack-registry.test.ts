// Story 59.5 — wordpack/ 骨架单元测试
//
// 覆盖：
//   - lazy load：首次调用才走 loader，之后命中 cache
//   - 并发合并：同 id 并发 load 只触发一次 loader
//   - get() 未 load 时返回 null
//   - listUnlocked 按 UnlockRule 过滤
//   - WordpackBinding 生命周期 (bind / current / unbind / isBound / double-bind 报错)
//   - W-2 类型隔离：Wordpack 不能赋值给 RelicData
//   - W-2 伪造防御：外部代码不能跳过 createWordpack 构造带 brand 的对象

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RelicData } from '../../../src/data/relics'
import {
  createWordpack,
  WordpackBinding,
  WordpackRegistry,
  type UnlockedKeysQuery,
  type Wordpack,
  type WordpackDataLoader,
  type WordpackRawData,
} from '../../../src/systems/typing/wordpack'

// ---- Fixtures ----
const raw = (id: string, overrides: Partial<WordpackRawData> = {}): WordpackRawData => ({
  id,
  themeKey: `pack.${id}.theme`,
  descKey: `pack.${id}.desc`,
  language: 'en',
  difficulty: 1,
  words: ['alpha', 'beta', 'gamma'],
  ...overrides,
})

const emptyMeta = (): UnlockedKeysQuery => ({
  hasAchievement: () => false,
  hasMetaProgress: () => false,
  hasChallenge: () => false,
})

// ---- WordpackRegistry ----
describe('WordpackRegistry', () => {
  describe('lazy load', () => {
    it('首次 load 调用 loader，之后命中 cache 不再调用', async () => {
      const loader = vi.fn<WordpackDataLoader>().mockImplementation(async (id) => raw(id))
      const reg = new WordpackRegistry(loader)

      const first = await reg.load('a')
      expect(first?.id).toBe('a')
      expect(loader).toHaveBeenCalledTimes(1)

      const second = await reg.load('a')
      expect(second?.id).toBe('a')
      expect(loader).toHaveBeenCalledTimes(1) // still only called once
      expect(second).toBe(first) // 同一个对象引用
    })

    it('loader 返回 null 时 load 返回 null 且不 cache', async () => {
      const loader = vi.fn<WordpackDataLoader>().mockResolvedValue(null)
      const reg = new WordpackRegistry(loader)

      expect(await reg.load('missing')).toBeNull()
      expect(await reg.load('missing')).toBeNull()
      expect(loader).toHaveBeenCalledTimes(2) // null 不 cache，会重试
    })

    it('同 id 并发 load 只触发一次 loader', async () => {
      let resolve: ((v: WordpackRawData | null) => void) | undefined
      const loader = vi.fn<WordpackDataLoader>().mockImplementation(
        () =>
          new Promise((r) => {
            resolve = r
          }),
      )
      const reg = new WordpackRegistry(loader)

      const p1 = reg.load('race')
      const p2 = reg.load('race')
      const p3 = reg.load('race')
      expect(loader).toHaveBeenCalledTimes(1)

      resolve!(raw('race'))
      const [r1, r2, r3] = await Promise.all([p1, p2, p3])
      expect(r1).toBe(r2)
      expect(r2).toBe(r3)
    })
  })

  describe('get', () => {
    it('未 load 时返回 null，不触发加载', () => {
      const loader = vi.fn<WordpackDataLoader>()
      const reg = new WordpackRegistry(loader)
      expect(reg.get('nothing')).toBeNull()
      expect(loader).not.toHaveBeenCalled()
    })

    it('load 后 get 返回相同实例', async () => {
      const loader: WordpackDataLoader = async (id) => raw(id)
      const reg = new WordpackRegistry(loader)
      const loaded = await reg.load('p1')
      expect(reg.get('p1')).toBe(loaded)
    })
  })

  describe('listUnlocked', () => {
    const setup = async (): Promise<WordpackRegistry> => {
      const loader: WordpackDataLoader = async (id) => {
        switch (id) {
          case 'default':
            return raw('default', { unlockCondition: { kind: 'default' } })
          case 'none':
            return raw('none') // no unlockCondition → default
          case 'ach':
            return raw('ach', { unlockCondition: { kind: 'achievement', key: 'first_win' } })
          case 'prog':
            return raw('prog', { unlockCondition: { kind: 'meta-progress', key: 'level_10' } })
          case 'challenge':
            return raw('challenge', { unlockCondition: { kind: 'challenge', key: 'ascension_5' } })
          default:
            return null
        }
      }
      const reg = new WordpackRegistry(loader)
      await Promise.all([
        reg.load('default'),
        reg.load('none'),
        reg.load('ach'),
        reg.load('prog'),
        reg.load('challenge'),
      ])
      return reg
    }

    it('default / 无条件的词包总是解锁', async () => {
      const reg = await setup()
      const ids = reg.listUnlocked(emptyMeta()).map((p) => p.id).sort()
      expect(ids).toEqual(['default', 'none'])
    })

    it('按 achievement / meta-progress / challenge key 解锁', async () => {
      const reg = await setup()
      const meta: UnlockedKeysQuery = {
        hasAchievement: (k) => k === 'first_win',
        hasMetaProgress: (k) => k === 'level_10',
        hasChallenge: (k) => k === 'ascension_5',
      }
      const ids = reg.listUnlocked(meta).map((p) => p.id).sort()
      expect(ids).toEqual(['ach', 'challenge', 'default', 'none', 'prog'])
    })

    it('unlockCondition 缺 key 时 non-default kinds 视为未解锁', async () => {
      const loader: WordpackDataLoader = async (id) =>
        raw(id, { unlockCondition: { kind: 'achievement' } })
      const reg = new WordpackRegistry(loader)
      await reg.load('broken')
      expect(reg.listUnlocked(emptyMeta())).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('清空 cache 与 inFlight', async () => {
      const loader: WordpackDataLoader = async (id) => raw(id)
      const reg = new WordpackRegistry(loader)
      await reg.load('a')
      expect(reg.get('a')).not.toBeNull()
      reg.clear()
      expect(reg.get('a')).toBeNull()
    })
  })
})

// ---- WordpackBinding ----
describe('WordpackBinding', () => {
  let binding: WordpackBinding
  let packA: Wordpack
  let packB: Wordpack

  beforeEach(() => {
    binding = new WordpackBinding()
    packA = createWordpack(raw('a'))
    packB = createWordpack(raw('b'))
  })

  it('初始状态未绑定', () => {
    expect(binding.current()).toBeNull()
    expect(binding.isBound()).toBe(false)
  })

  it('bind 后 current 返回该 pack', () => {
    binding.bind(packA)
    expect(binding.current()).toBe(packA)
    expect(binding.isBound()).toBe(true)
  })

  it('重复 bind 不同 pack 抛错（而非静默覆盖）', () => {
    binding.bind(packA)
    expect(() => binding.bind(packB)).toThrow(/already bound/)
  })

  it('unbind 后可重新 bind', () => {
    binding.bind(packA)
    binding.unbind()
    expect(binding.current()).toBeNull()
    expect(binding.isBound()).toBe(false)
    binding.bind(packB)
    expect(binding.current()).toBe(packB)
  })
})

// ---- W-2 类型隔离测试 ----
// 注意：@ts-expect-error 指令由 tsc / eslint 在编译期校验；vitest 默认用 esbuild
// 编译 TS，会剥离这些指令。本测试的运行时部分只做 no-op（验证 createWordpack 返回
// 正确的 shape），真正的 W-2 合规校验由 `tsc --noEmit` 在 CI 环节兜底。
// 此处保留 @ts-expect-error 作为**未来 tsc 门禁的 fixture 断言**。
describe('W-2 type isolation', () => {
  it('Wordpack 不能赋值给 RelicData（phantom brand 在编译期阻止）', () => {
    const pack: Wordpack = createWordpack(raw('nominal-test'))
    // @ts-expect-error — W-2: Wordpack 的 WordpackBrand phantom 让结构类型系统拒绝此赋值
    const _asRelic: RelicData = pack
    void _asRelic
    expect(pack.id).toBe('nominal-test')
  })

  it('外部字面量无法构造 Wordpack（缺少 unique symbol brand）', () => {
    // @ts-expect-error — 外部代码无法拼出带 WordpackBrand phantom 的对象
    const fake: Wordpack = {
      id: 'fake',
      themeKey: 'x',
      descKey: 'y',
      language: 'en',
      difficulty: 1,
      words: [],
      getModifiers: () => [],
    }
    // 运行时：phantom brand 不是实际属性，所以 fake 和 createWordpack 产物在 shape 上
    // 看起来一致。真正的守护在编译期（上面的 @ts-expect-error）。
    expect(fake.id).toBe('fake')
  })

  it('createWordpack 返回的对象 shape 正确且不包含真实 brand 符号（phantom）', () => {
    const pack = createWordpack(raw('shape'))
    // 关键断言 1：必备字段存在
    expect(pack).toMatchObject({
      id: 'shape',
      themeKey: 'pack.shape.theme',
      descKey: 'pack.shape.desc',
      language: 'en',
      difficulty: 1,
    })
    expect(typeof pack.getModifiers).toBe('function')
    expect(pack.getModifiers()).toEqual([])
    // 关键断言 2：phantom brand 是类型-only，运行时没有任何 symbol 属性
    expect(Object.getOwnPropertySymbols(pack)).toHaveLength(0)
  })
})
