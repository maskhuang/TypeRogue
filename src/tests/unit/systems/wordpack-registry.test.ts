// Story 59.5 — wordpack/ 骨架单元测试
//
// 覆盖：
//   - lazy load：首次调用才走 loader，之后命中 cache
//   - 并发合并：同 id 并发 load 只触发一次 loader
//   - 粘性错误修复 (H1)：loader 抛错不残留在 inFlight，下次可重试成功
//   - get() 未 load 时返回 null
//   - listCachedUnlocked 按 UnlockRule 过滤
//   - clear-race 保护 (M3)：clear() 期间的 in-flight 结果不污染后续 cache
//   - WordpackBinding 生命周期 (bind / current / unbind / isBound / double-bind 抛错)
//   - W-2 runtime 行为（shape / phantom brand 不在 runtime）
//   - H4 defensive copy：init 数组后续修改不影响 Wordpack 内部状态

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RelicData } from '../../../src/data/relics'
import {
  createWordpack,
  WordpackBinding,
  WordpackRegistry,
  type MetaUnlockPort,
  type ModifierPlaceholder,
  type Wordpack,
  type WordpackDataLoader,
  type WordpackInit,
} from '../../../src/systems/typing/wordpack'

// ---- Fixtures ----
const raw = (id: string, overrides: Partial<WordpackInit> = {}): WordpackInit => ({
  id,
  themeKey: `pack.${id}.theme`,
  descKey: `pack.${id}.desc`,
  language: 'en',
  difficulty: 1,
  words: ['alpha', 'beta', 'gamma'],
  ...overrides,
})

const emptyMeta = (): MetaUnlockPort => ({
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
      let resolve: ((v: WordpackInit | null) => void) | undefined
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

  describe('H1 sticky error regression', () => {
    it('loader 首次抛错不残留在 inFlight，第二次 load 同 id 可重试成功', async () => {
      let attempt = 0
      const loader: WordpackDataLoader = async (id) => {
        attempt++
        if (attempt === 1) throw new Error('transient network failure')
        return raw(id)
      }
      const reg = new WordpackRegistry(loader)

      await expect(reg.load('flaky')).rejects.toThrow('transient network failure')
      // 第二次调用应该能 retry，拿到成功结果
      const second = await reg.load('flaky')
      expect(second?.id).toBe('flaky')
      expect(attempt).toBe(2)
    })

    it('loader rejected 之后 get() 仍然返回 null（不 cache 失败结果）', async () => {
      const loader: WordpackDataLoader = async () => {
        throw new Error('boom')
      }
      const reg = new WordpackRegistry(loader)
      await expect(reg.load('x')).rejects.toThrow()
      expect(reg.get('x')).toBeNull()
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

  describe('listCachedUnlocked', () => {
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
      const ids = reg
        .listCachedUnlocked(emptyMeta())
        .map((p) => p.id)
        .sort()
      expect(ids).toEqual(['default', 'none'])
    })

    it('按 achievement / meta-progress / challenge key 解锁', async () => {
      const reg = await setup()
      const meta: MetaUnlockPort = {
        hasAchievement: (k) => k === 'first_win',
        hasMetaProgress: (k) => k === 'level_10',
        hasChallenge: (k) => k === 'ascension_5',
      }
      const ids = reg
        .listCachedUnlocked(meta)
        .map((p) => p.id)
        .sort()
      expect(ids).toEqual(['ach', 'challenge', 'default', 'none', 'prog'])
    })

    it('unlockCondition 缺 key 时 non-default kinds 视为未解锁', async () => {
      const loader: WordpackDataLoader = async (id) =>
        raw(id, { unlockCondition: { kind: 'achievement' } })
      const reg = new WordpackRegistry(loader)
      await reg.load('broken')
      expect(reg.listCachedUnlocked(emptyMeta())).toHaveLength(0)
    })

    it('未预加载的词包即使解锁也不出现在结果里（契约 per JSDoc）', async () => {
      const loader: WordpackDataLoader = async (id) => raw(id)
      const reg = new WordpackRegistry(loader)
      await reg.load('loaded') // 只加载一个
      // 没有预加载 'other'，即使它默认解锁
      const ids = reg.listCachedUnlocked(emptyMeta()).map((p) => p.id)
      expect(ids).toEqual(['loaded'])
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

    it('M3 regression: clear() 期间的 in-flight load 结果不写回 cache', async () => {
      let resolve: ((v: WordpackInit | null) => void) | undefined
      const loader: WordpackDataLoader = () =>
        new Promise((r) => {
          resolve = r
        })
      const reg = new WordpackRegistry(loader)

      const promise = reg.load('ghost')
      reg.clear() // 在 in-flight 期间清空
      resolve!(raw('ghost'))
      const result = await promise

      // 生成号保护：load 返回 null（因为结果被丢弃），cache 保持空
      expect(result).toBeNull()
      expect(reg.get('ghost')).toBeNull()
    })

    it('clear() 后可以重新 load 同 id', async () => {
      const loader: WordpackDataLoader = async (id) => raw(id)
      const reg = new WordpackRegistry(loader)
      await reg.load('a')
      reg.clear()
      const second = await reg.load('a')
      expect(second?.id).toBe('a')
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

// ---- W-2 运行时行为 ----
describe('W-2 type isolation (runtime shape)', () => {
  it('Wordpack 不能赋值给 RelicData（phantom brand 在编译期阻止）', () => {
    const pack: Wordpack = createWordpack(raw('nominal-test'))
    // @ts-expect-error — W-2: Wordpack 的 phantom brand 让结构类型系统拒绝此赋值
    const _asRelic: RelicData = pack
    void _asRelic
    expect(pack.id).toBe('nominal-test')
  })

  it('createWordpack 返回的对象必备字段存在且无运行时 symbol 属性', () => {
    const pack = createWordpack(raw('shape'))
    expect(pack).toMatchObject({
      id: 'shape',
      themeKey: 'pack.shape.theme',
      descKey: 'pack.shape.desc',
      language: 'en',
      difficulty: 1,
    })
    expect(typeof pack.getModifiers).toBe('function')
    expect(pack.getModifiers()).toEqual([])
    // phantom brand 是类型-only，运行时没有任何 symbol 属性
    expect(Object.getOwnPropertySymbols(pack)).toHaveLength(0)
  })
})

// ---- H4 defensive copy ----
describe('H4 defensive copy (encapsulation)', () => {
  it('init.modifiers 后续修改不影响 Wordpack 内部 modifiers', () => {
    const modifiers: ModifierPlaceholder[] = [{ id: 'm1', kind: 'base' }]
    const init: WordpackInit = { ...raw('copy-test'), modifiers }
    const pack = createWordpack(init)

    // 修改原始 init 数组
    modifiers.push({ id: 'm2', kind: 'injected' })

    // Wordpack 内部应该只有最初的 1 个 modifier
    expect(pack.getModifiers()).toHaveLength(1)
    expect(pack.getModifiers()[0]?.id).toBe('m1')
  })

  it('init.words 后续修改不影响 Wordpack 内部 words', () => {
    const words = ['a', 'b']
    const pack = createWordpack({ ...raw('w'), words })

    // 修改原始 words 数组
    words.push('c')

    // Wordpack 内部应该只有最初的 2 个词
    expect(pack.words).toHaveLength(2)
    expect([...pack.words]).toEqual(['a', 'b'])
  })

  it('Wordpack 对象本身被 Object.freeze（runtime 不可变）', () => {
    const pack = createWordpack(raw('frozen'))
    expect(Object.isFrozen(pack)).toBe(true)
  })
})
