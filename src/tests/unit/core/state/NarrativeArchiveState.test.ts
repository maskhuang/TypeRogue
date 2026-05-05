// ============================================
// 打字肉鸽 - NarrativeArchiveState 单元测试
// ============================================
// PL-5 / §9.6 反身闭合 cross-run 数据存档

import { describe, it, expect, beforeEach } from 'vitest'
import { NarrativeArchiveState, resetNarrativeArchiveInstance, getNarrativeArchive } from '../../../../src/core/state/NarrativeArchiveState'

describe('NarrativeArchiveState', () => {
  let state: NarrativeArchiveState

  beforeEach(() => {
    state = new NarrativeArchiveState()
  })

  describe('初始化', () => {
    it('新实例所有 array 为空，nimL4Unlocked = false', () => {
      const snap = state.snapshot()
      expect(snap.endlessModifierSignatures).toEqual([])
      expect(snap.typingRhythmFingerprints).toEqual([])
      expect(snap.endlessFreeTypeNotes).toEqual([])
      expect(snap.playerWorkerIdHistory).toEqual([])
      expect(snap.nimL4Unlocked).toBe(false)
    })
  })

  describe('endlessModifierSignatures (PL-5 主路径)', () => {
    it('recordEndlessModifierSignature 写入并 round-trip', () => {
      state.recordEndlessModifierSignature({
        playerWorkerId: 'OP. PRIMATE-7842',
        modifier: 'wordforge',
        cycle: 7,
        timestamp: 1000,
      })
      const snap = state.snapshot()
      expect(snap.endlessModifierSignatures).toHaveLength(1)
      expect(snap.endlessModifierSignatures[0].modifier).toBe('wordforge')
      expect(snap.endlessModifierSignatures[0].cycle).toBe(7)
    })

    it('getBossModifierAttribution 返回 modifier 匹配的最新一条', () => {
      state.recordEndlessModifierSignature({ playerWorkerId: 'A', modifier: 'wordforge', cycle: 6, timestamp: 100 })
      state.recordEndlessModifierSignature({ playerWorkerId: 'B', modifier: 'wordforge', cycle: 8, timestamp: 200 })
      state.recordEndlessModifierSignature({ playerWorkerId: 'C', modifier: 'silkworm', cycle: 7, timestamp: 150 })

      const attr = state.getBossModifierAttribution('wordforge')
      expect(attr?.playerWorkerId).toBe('B')
      expect(attr?.timestamp).toBe(200)

      expect(state.getBossModifierAttribution('silkworm')?.playerWorkerId).toBe('C')
      expect(state.getBossModifierAttribution('nonexistent')).toBeNull()
    })

    it('cap 上限 500 条', () => {
      for (let i = 0; i < 510; i++) {
        state.recordEndlessModifierSignature({
          playerWorkerId: 'X', modifier: `mod-${i}`, cycle: 6, timestamp: i,
        })
      }
      const snap = state.snapshot()
      expect(snap.endlessModifierSignatures).toHaveLength(500)
      // FIFO：保留最近 500 条
      expect(snap.endlessModifierSignatures[0].modifier).toBe('mod-10')
      expect(snap.endlessModifierSignatures[499].modifier).toBe('mod-509')
    })
  })

  describe('typingRhythmFingerprints 隐私 invariant (§9.6.3)', () => {
    it('rhythmVector 只接受数值数组', () => {
      state.recordTypingRhythm({
        sessionId: 's1',
        rhythmVector: [120, 140, 95, 110],
        timestamp: 1000,
      })
      expect(state.snapshot().typingRhythmFingerprints).toHaveLength(1)
    })

    it('拒绝包含非数值的 rhythmVector（防止 typed content 泄漏）', () => {
      state.recordTypingRhythm({
        sessionId: 's2',
        rhythmVector: [120, 'a' as unknown as number, 95],
        timestamp: 1000,
      })
      expect(state.snapshot().typingRhythmFingerprints).toHaveLength(0)
    })

    it('拒绝 NaN / Infinity', () => {
      state.recordTypingRhythm({
        sessionId: 's3',
        rhythmVector: [120, NaN, 95],
        timestamp: 1000,
      })
      state.recordTypingRhythm({
        sessionId: 's4',
        rhythmVector: [Infinity, 100],
        timestamp: 1000,
      })
      expect(state.snapshot().typingRhythmFingerprints).toHaveLength(0)
    })
  })

  describe('其他写入路径', () => {
    it('recordEndlessFreeTypeNote', () => {
      state.recordEndlessFreeTypeNote({ playerWorkerId: 'X', content: 'hello', cycle: 6 })
      expect(state.snapshot().endlessFreeTypeNotes).toHaveLength(1)
    })

    it('recordWorkerIdHistory', () => {
      state.recordWorkerIdHistory({ workerId: 'X', chapterCleared: 1, timestamp: 1000 })
      expect(state.snapshot().playerWorkerIdHistory).toHaveLength(1)
    })

    it('markNimL4Unlocked = 一次性 latch（不会回退）', () => {
      expect(state.isNimL4Unlocked()).toBe(false)
      state.markNimL4Unlocked()
      expect(state.isNimL4Unlocked()).toBe(true)
      // 没有 unset API
    })
  })

  describe('序列化 / 反序列化', () => {
    it('round-trip 保留所有字段', () => {
      state.recordEndlessModifierSignature({ playerWorkerId: 'A', modifier: 'm1', cycle: 7, timestamp: 100 })
      state.recordTypingRhythm({ sessionId: 's', rhythmVector: [100, 200], timestamp: 50 })
      state.recordEndlessFreeTypeNote({ playerWorkerId: 'A', content: 'note', cycle: 7 })
      state.recordWorkerIdHistory({ workerId: 'A', chapterCleared: 2, timestamp: 75 })
      state.markNimL4Unlocked()

      const json = state.serialize()
      const fresh = new NarrativeArchiveState()
      fresh.deserialize(json)

      const snap = fresh.snapshot()
      expect(snap.endlessModifierSignatures).toHaveLength(1)
      expect(snap.typingRhythmFingerprints).toHaveLength(1)
      expect(snap.endlessFreeTypeNotes).toHaveLength(1)
      expect(snap.playerWorkerIdHistory).toHaveLength(1)
      expect(snap.nimL4Unlocked).toBe(true)
    })

    it('migration: 缺失字段全部默认为空（v3.x save → v4.1）', () => {
      const fresh = new NarrativeArchiveState()
      fresh.deserialize(JSON.stringify({ version: 999, garbage: 'unrelated' }))
      const snap = fresh.snapshot()
      expect(snap.endlessModifierSignatures).toEqual([])
      expect(snap.typingRhythmFingerprints).toEqual([])
      expect(snap.endlessFreeTypeNotes).toEqual([])
      expect(snap.playerWorkerIdHistory).toEqual([])
      expect(snap.nimL4Unlocked).toBe(false)
    })

    it('反序列化损坏 JSON 不抛错，状态保持 empty', () => {
      const fresh = new NarrativeArchiveState()
      fresh.recordEndlessModifierSignature({ playerWorkerId: 'A', modifier: 'm', cycle: 6, timestamp: 1 })
      fresh.deserialize('{ not valid json')
      // 失败时保持当前状态
      expect(fresh.snapshot().endlessModifierSignatures).toHaveLength(1)
    })

    it('reset 清空所有 cross-run 数据', () => {
      state.recordEndlessModifierSignature({ playerWorkerId: 'A', modifier: 'm', cycle: 6, timestamp: 1 })
      state.markNimL4Unlocked()
      state.reset()
      const snap = state.snapshot()
      expect(snap.endlessModifierSignatures).toEqual([])
      expect(snap.nimL4Unlocked).toBe(false)
    })
  })

  describe('单例', () => {
    it('getNarrativeArchive 返回稳定单例', () => {
      resetNarrativeArchiveInstance()
      const a = getNarrativeArchive()
      const b = getNarrativeArchive()
      expect(a).toBe(b)
    })

    it('resetNarrativeArchiveInstance 后产生新实例', () => {
      const a = getNarrativeArchive()
      resetNarrativeArchiveInstance()
      const b = getNarrativeArchive()
      expect(a).not.toBe(b)
    })
  })
})
