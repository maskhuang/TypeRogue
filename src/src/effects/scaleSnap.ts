// ============================================
// 打字肉鸽 - SFX 调音对齐工具
// ============================================
//
// 作用：把任意"想要的频率"对齐到当前 BGM 的调式 / 当前和弦上，
// 让 SFX 与 BGM 始终在同一个 musical key 里，互不打架。
//
// 三种模式：
//   snapToScale(hz)    → 最近的当前调式音阶音
//   snapToChord(hz)    → 最近的当前和弦音（root/3rd/5th，更协和）
//   snapDissonant(hz)  → 调外的 ♭2 / 三全音（专门给 error / wrong 这类要"刺耳"的 SFX）
//
// 调用方不必关心 BGM 是否启动 / 用了哪个预设 —— BgmController 总返回有效快照。

import {
  midiToFreq,
  freqToMidi,
  getBgmController,
} from '../systems/audio/BgmController'

/** 在当前调式音阶中找到最接近 targetMidi 的音 */
function nearestScaleMidi(targetMidi: number): number {
  const { scale, rootMidi } = getBgmController().getScaleConfig()
  const targetPc = ((targetMidi - rootMidi) % 12 + 12) % 12
  let bestClass: number = scale[0]
  let bestDist = 12
  for (const pc of scale) {
    const d = Math.min(Math.abs(pc - targetPc), 12 - Math.abs(pc - targetPc))
    if (d < bestDist) {
      bestDist = d
      bestClass = pc
    }
  }
  const baseOct = Math.floor((targetMidi - rootMidi) / 12)
  const candidates = [
    rootMidi + baseOct * 12 + bestClass,
    rootMidi + (baseOct + 1) * 12 + bestClass,
    rootMidi + (baseOct - 1) * 12 + bestClass,
  ]
  return candidates.reduce((best, c) =>
    Math.abs(c - targetMidi) < Math.abs(best - targetMidi) ? c : best
  )
}

/** 当前和弦的 [root, 3rd, 5th] MIDI（octave = baseOct） */
function currentChordMidis(baseOct: number = 0): number[] {
  const { scale, progression, rootMidi, chordIndex } = getBgmController().getScaleConfig()
  const len = scale.length
  const deg = progression[chordIndex]
  const noteAt = (d: number) => {
    const oct = Math.floor(d / len) + baseOct
    const idx = ((d % len) + len) % len
    return rootMidi + scale[idx] + oct * 12
  }
  return [noteAt(deg), noteAt(deg + 2), noteAt(deg + 4)]
}

function nearestChordMidi(targetMidi: number): number {
  // 跨 ±2 个八度找最近和弦音
  let best = currentChordMidis(0)[0]
  let bestDist = Math.abs(best - targetMidi)
  for (let oct = -2; oct <= 2; oct++) {
    for (const m of currentChordMidis(oct)) {
      const d = Math.abs(m - targetMidi)
      if (d < bestDist) {
        bestDist = d
        best = m
      }
    }
  }
  return best
}

/** 把任意频率对齐到最近的调式音阶音 */
export function snapToScale(hz: number): number {
  if (hz <= 0) return hz
  return midiToFreq(nearestScaleMidi(freqToMidi(hz)))
}

/** 把任意频率对齐到当前和弦的 root/3rd/5th 之一（最协和） */
export function snapToChord(hz: number): number {
  if (hz <= 0) return hz
  return midiToFreq(nearestChordMidi(freqToMidi(hz)))
}

/**
 * 故意走调外：把目标频率挪到最近调式音阶音上 +1 半音。
 * 用于 error / wrong / gameover / taboo 这类需要"听感不对"的 SFX。
 * 因为各预设的调式不同（minor / dorian / phrygian / harmonic），
 * +1 半音永远是调外（不在 7 个 pitch class 里），刺耳感稳定。
 */
export function snapDissonant(hz: number): number {
  if (hz <= 0) return hz
  return midiToFreq(nearestScaleMidi(freqToMidi(hz)) + 1)
}

/** 取当前和弦根音频率 */
export function chordRootFreq(octaveOffset = 0): number {
  return midiToFreq(currentChordMidis(octaveOffset)[0])
}

/** 取当前和弦三个音的频率 [root, 3rd, 5th] */
export function chordArpFreqs(octaveOffset = 0): number[] {
  return currentChordMidis(octaveOffset).map(midiToFreq)
}
