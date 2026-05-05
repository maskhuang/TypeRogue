// ============================================
// 打字肉鸽 - NarrativeArchiveState（反身闭合 cross-run 数据）
// ============================================
// PL-5 / 反身闭合 implementation in save system（§9.6 LOCKED）
//
// 隐私 / 数据纪律（§9.6.3，硬约束）：
//   1. **仅本地**——绝不上传 server / 不跨玩家。IPC 走 SAVE_NARRATIVE（safeSave，不经 cloud sync）。
//   2. typingRhythmFingerprint **不含 typed content**，仅时间间隔数值数组。
//   3. **不在 UI 暴露**给玩家——无"我的反身闭合记录"页面。
//
// 设计 invariant：
//   - 所有 array 字段都有 cap，防无限增长写满磁盘。
//   - reset() 清空所有 cross-run 数据（用于开发 / 测试 / 玩家选择"清除存档"）。

import type {
  NarrativeArchive,
  EndlessModifierSignature,
  TypingRhythmFingerprint,
  EndlessFreeTypeNote,
  WorkerIdHistoryEntry,
} from '../../../shared/types'

/** 各 array 上限（防止存档无限增长） */
const CAPS = {
  endlessModifierSignatures: 500,
  typingRhythmFingerprints: 200,
  endlessFreeTypeNotes: 200,
  playerWorkerIdHistory: 200,
} as const

const NARRATIVE_ARCHIVE_VERSION = 1

function createEmptyArchive(): NarrativeArchive {
  return {
    endlessModifierSignatures: [],
    typingRhythmFingerprints: [],
    endlessFreeTypeNotes: [],
    playerWorkerIdHistory: [],
    nimL4Unlocked: false,
  }
}

/**
 * 反身闭合 cross-run 数据存档管理器。
 *
 * 写入路径：endless boss 修饰器选择（PL-5）/ chapter clear（playerWorkerIdHistory）/
 * typing session 结束（typingRhythmFingerprints，未来 PL-11）等。
 *
 * 读取路径：DC6 boss tooltip attribution（getBossModifierAttribution）/
 * DC9 主菜单 ambient（PL-11）/ DC2 下周目便条投递（PL-2/3）等。
 */
export class NarrativeArchiveState {
  private archive: NarrativeArchive

  constructor() {
    this.archive = createEmptyArchive()
  }

  // ===========================================
  // 序列化 / 反序列化 / 迁移
  // ===========================================

  serialize(): string {
    return JSON.stringify({
      version: NARRATIVE_ARCHIVE_VERSION,
      ...this.archive,
    })
  }

  /**
   * 从存档数据反序列化。
   * Migration：缺失字段一律默认空（v3.x save → v4.1 NarrativeArchive 默认空）。
   */
  deserialize(json: string): void {
    try {
      const data = JSON.parse(json)
      const empty = createEmptyArchive()
      this.archive = {
        endlessModifierSignatures: Array.isArray(data.endlessModifierSignatures)
          ? data.endlessModifierSignatures
          : empty.endlessModifierSignatures,
        typingRhythmFingerprints: Array.isArray(data.typingRhythmFingerprints)
          ? data.typingRhythmFingerprints
          : empty.typingRhythmFingerprints,
        endlessFreeTypeNotes: Array.isArray(data.endlessFreeTypeNotes)
          ? data.endlessFreeTypeNotes
          : empty.endlessFreeTypeNotes,
        playerWorkerIdHistory: Array.isArray(data.playerWorkerIdHistory)
          ? data.playerWorkerIdHistory
          : empty.playerWorkerIdHistory,
        nimL4Unlocked: typeof data.nimL4Unlocked === 'boolean'
          ? data.nimL4Unlocked
          : empty.nimL4Unlocked,
      }
    } catch (error) {
      console.error('NarrativeArchiveState: Failed to deserialize', error)
      // 保持当前状态不变（首次启动则保持 empty）
    }
  }

  reset(): void {
    this.archive = createEmptyArchive()
  }

  /** 调试 / 测试用，返回深拷贝 */
  snapshot(): NarrativeArchive {
    return JSON.parse(JSON.stringify(this.archive)) as NarrativeArchive
  }

  // ===========================================
  // 写入 API
  // ===========================================

  /** PL-5：endless 模式 boss 修饰器选定时调用 */
  recordEndlessModifierSignature(entry: EndlessModifierSignature): void {
    this.archive.endlessModifierSignatures.push(entry)
    capArray(this.archive.endlessModifierSignatures, CAPS.endlessModifierSignatures)
  }

  /**
   * 记录 typing rhythm 指纹（DC9 主菜单 ambient sound replay 用）
   *
   * 隐私守门：rhythmVector 必须是数值数组。如果传入了非数值（无意中夹带字符），
   * 则丢弃整条记录而非静默接受。
   */
  recordTypingRhythm(entry: TypingRhythmFingerprint): void {
    if (!Array.isArray(entry.rhythmVector) || !entry.rhythmVector.every(n => typeof n === 'number' && Number.isFinite(n))) {
      // 隐私 invariant 违反——拒绝写入
      console.warn('NarrativeArchiveState: rejected typing rhythm with non-numeric vector')
      return
    }
    this.archive.typingRhythmFingerprints.push(entry)
    capArray(this.archive.typingRhythmFingerprints, CAPS.typingRhythmFingerprints)
  }

  /** 记录 endless 自由打字便签（DC2 下周目其他职业 run 投递） */
  recordEndlessFreeTypeNote(entry: EndlessFreeTypeNote): void {
    this.archive.endlessFreeTypeNotes.push(entry)
    capArray(this.archive.endlessFreeTypeNotes, CAPS.endlessFreeTypeNotes)
  }

  /** 章节通关时记录工号 */
  recordWorkerIdHistory(entry: WorkerIdHistoryEntry): void {
    this.archive.playerWorkerIdHistory.push(entry)
    capArray(this.archive.playerWorkerIdHistory, CAPS.playerWorkerIdHistory)
  }

  /** B8 reveal flag（一旦 true 不会回退） */
  markNimL4Unlocked(): void {
    this.archive.nimL4Unlocked = true
  }

  // ===========================================
  // 读取 API
  // ===========================================

  /**
   * DC6 boss tooltip 反身闭合 attribution。
   *
   * 选择策略：modifier 匹配的最近一条签名（按 timestamp 降序）。
   * 若无匹配则返回 null——调用方落到默认 tooltip。
   */
  getBossModifierAttribution(modifier: string): EndlessModifierSignature | null {
    const matches = this.archive.endlessModifierSignatures.filter(s => s.modifier === modifier)
    if (matches.length === 0) return null
    return matches.reduce((latest, cur) => (cur.timestamp > latest.timestamp ? cur : latest))
  }

  /** 全部 endless modifier 签名（拷贝），用于 batch 计算 / 测试 */
  getAllEndlessModifierSignatures(): EndlessModifierSignature[] {
    return this.archive.endlessModifierSignatures.map(s => ({ ...s }))
  }

  isNimL4Unlocked(): boolean {
    return this.archive.nimL4Unlocked
  }
}

function capArray<T>(arr: T[], max: number): void {
  if (arr.length <= max) return
  arr.splice(0, arr.length - max)
}

// 单例（与 MetaState 模式一致）
let _instance: NarrativeArchiveState | null = null
export function getNarrativeArchive(): NarrativeArchiveState {
  if (_instance === null) _instance = new NarrativeArchiveState()
  return _instance
}

/** 测试用：重置单例 */
export function resetNarrativeArchiveInstance(): void {
  _instance = null
}
