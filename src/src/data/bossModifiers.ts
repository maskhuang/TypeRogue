// ============================================
// 打字肉鸽 - Boss 修饰器定义与注册表
// ============================================
// Story 18.1: 修饰器池（ID + Meta）
// Story 18.4: BossModifier 接口 + 注册表 + 6 个数值修饰器实现 + 7 个 stub
// Story 18.5: 3 个视觉类修饰器实现（boss_fade, boss_drift, boss_spotlight）
// Story 18.6: 3 个认知类修饰器实现（boss_scramble, boss_reverse, boss_masked）

/**
 * 所有 Boss 修饰器 ID
 * 打字难度类（7种）+ 数值规则类（6种）= 13种
 */
export const BOSS_MODIFIER_IDS = [
  // 打字难度类
  'boss_fade',       // 渐隐之词
  'boss_scramble',   // 乱序打字
  'boss_reverse',    // 倒序输入
  'boss_drift',      // 移动文字
  'boss_masked',     // 残缺词语
  'boss_spotlight',  // 聚光灯
  'boss_rhythm',     // 节奏锁定
  // 数值规则类
  'boss_decay',      // 分数衰减
  'boss_combo_punish', // 断连即扣
  'boss_cap',        // 单词限额
  'boss_fast_time',  // 时间加速
  'boss_double_target', // 双倍目标
  'boss_diminish',   // 递减收益
] as const

export type BossModifierId = typeof BOSS_MODIFIER_IDS[number]

/**
 * Boss 修饰器元数据
 */
export interface BossModifierMeta {
  id: BossModifierId
  name: string
  icon: string
  description: string
  eliteHint: string
}

/**
 * 13 个修饰器的元数据
 */
export const BOSS_MODIFIER_META: Record<BossModifierId, BossModifierMeta> = {
  boss_fade: {
    id: 'boss_fade',
    name: '渐隐之词',
    icon: '👻',
    description: '字母逐个淡出消失',
    eliteHint: '字母缓慢淡出（速度减半）',
  },
  boss_scramble: {
    id: 'boss_scramble',
    name: '乱序打字',
    icon: '🔀',
    description: '字母打乱显示，照乱序打',
    eliteHint: '仅打乱中间字母，首尾保留',
  },
  boss_reverse: {
    id: 'boss_reverse',
    name: '倒序输入',
    icon: '⏪',
    description: '从最后一个字母往前打',
    eliteHint: '从最后一个字母往前打',
  },
  boss_drift: {
    id: 'boss_drift',
    name: '移动文字',
    icon: '🌊',
    description: '词语在屏幕上漂移晃动',
    eliteHint: '词语轻微漂移（振幅减半）',
  },
  boss_masked: {
    id: 'boss_masked',
    name: '残缺词语',
    icon: '🕳️',
    description: '部分字母被遮挡（30%）',
    eliteHint: '遮挡 15% 字母',
  },
  boss_spotlight: {
    id: 'boss_spotlight',
    name: '聚光灯',
    icon: '🔦',
    description: '只能看到当前 2-3 个字母',
    eliteHint: '可见 3-4 个字母',
  },
  boss_rhythm: {
    id: 'boss_rhythm',
    name: '节奏锁定',
    icon: '🎵',
    description: '字母按节拍解锁（BPM 90-140）',
    eliteHint: '节拍较慢（BPM 70-110）',
  },
  boss_decay: {
    id: 'boss_decay',
    name: '分数衰减',
    icon: '📉',
    description: '每秒扣 5% 当前总分',
    eliteHint: '每秒扣 2.5% 总分',
  },
  boss_combo_punish: {
    id: 'boss_combo_punish',
    name: '断连即扣',
    icon: '☠️',
    description: '连击中断扣 20% 总分',
    eliteHint: '断连扣 10% 总分',
  },
  boss_cap: {
    id: 'boss_cap',
    name: '单词限额',
    icon: '📦',
    description: '单词得分上限 50 分',
    eliteHint: '单词得分上限 75 分',
  },
  boss_fast_time: {
    id: 'boss_fast_time',
    name: '时间加速',
    icon: '⏩',
    description: '计时器 1.5 倍速',
    eliteHint: '计时器 1.25 倍速',
  },
  boss_double_target: {
    id: 'boss_double_target',
    name: '双倍目标',
    icon: '🎯',
    description: '目标分数 ×2',
    eliteHint: '目标分数 ×1.5',
  },
  boss_diminish: {
    id: 'boss_diminish',
    name: '递减收益',
    icon: '📉',
    description: '每完成一词下个词分数 -10%',
    eliteHint: '每词 -5%',
  },
}

/**
 * 查询修饰器元数据
 */
export function getBossModifierMeta(id: BossModifierId): BossModifierMeta | undefined {
  return BOSS_MODIFIER_META[id]
}

/**
 * 从修饰器池中随机抽取 n 个不重复的修饰器
 */
export function drawBossModifiers(count: number): BossModifierId[] {
  const pool = [...BOSS_MODIFIER_IDS]
  const result: BossModifierId[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

// ============================================
// Story 18.4: BossModifier 系统
// ============================================

/**
 * 修饰器运行参数（由 getParams 返回）
 */
export interface BossModifierParams {
  // 数值规则类
  decayRate?: number        // boss_decay: 每秒扣分百分比 (0.05 = 5%)
  comboPunishRate?: number  // boss_combo_punish: 断连扣分百分比
  scoreCap?: number         // boss_cap: 单词得分上限
  timeSpeed?: number        // boss_fast_time: 计时器速度倍率
  targetMultiplier?: number // boss_double_target: 目标分倍率
  diminishRate?: number     // boss_diminish: 每词递减百分比
  // 视觉类（Story 18.5）
  fadeSpeed?: number        // boss_fade: 初始淡出速度（秒/字母）
  fadeSpeedEnd?: number     // boss_fade: 最终淡出速度
  fadeDuration?: number     // boss_fade: 加速持续时间（秒）
  driftAmplitude?: number   // boss_drift: 振幅（px）
  driftFrequency?: number   // boss_drift: 频率（Hz）
  spotlightRadius?: number  // boss_spotlight: 可见半径（字母数）
  // 认知类（Story 18.6）
  scrambleMode?: number     // boss_scramble: 1=全打乱, 2=保留首尾
  reverseActive?: number    // boss_reverse: 1=倒序 (truthy check)
  maskRate?: number         // boss_masked: 遮罩比例 (0.30 / 0.15)
}

/**
 * Boss 修饰器接口
 */
export interface BossModifier {
  id: BossModifierId
  /** 返回该修饰器的参数（isElite=true 时参数减弱） */
  getParams(isElite: boolean): BossModifierParams
  /** 应用修饰器效果到游戏状态（关卡开始时调用） */
  apply(params: BossModifierParams): void
  /** 清理修饰器效果（关卡结束或切换时调用） */
  cleanup(): void
  /** 每帧更新（可选，boss_decay 等需要） */
  onTick?(dt: number): void
}

/** 创建 stub 修饰器（打字难度类，18.5-18.8 实现） */
function createStubModifier(id: BossModifierId): BossModifier {
  return {
    id,
    getParams: () => ({}),
    apply: () => {},
    cleanup: () => {},
  }
}

// === 6 个数值规则类修饰器实现 ===

import { state } from '../core/state'

const bossDecay: BossModifier = {
  id: 'boss_decay',
  getParams: (isElite) => ({ decayRate: isElite ? 0.025 : 0.05 }),
  apply: () => {},
  cleanup: () => {},
  onTick(dt: number) {
    const rate = getActiveParams()?.decayRate
    if (rate && state.score > 0) {
      const penalty = state.score * rate * dt
      state.score = Math.max(0, state.score - penalty)
    }
  },
}

const bossComboPunish: BossModifier = {
  id: 'boss_combo_punish',
  getParams: (isElite) => ({ comboPunishRate: isElite ? 0.10 : 0.20 }),
  apply: () => {},
  cleanup: () => {},
}

const bossCap: BossModifier = {
  id: 'boss_cap',
  getParams: (isElite) => ({ scoreCap: isElite ? 75 : 50 }),
  apply: () => {},
  cleanup: () => {},
}

const bossFastTime: BossModifier = {
  id: 'boss_fast_time',
  getParams: (isElite) => ({ timeSpeed: isElite ? 1.25 : 1.5 }),
  apply: () => {},
  cleanup: () => {},
}

let originalTargetScore = 0

const bossDoubleTarget: BossModifier = {
  id: 'boss_double_target',
  getParams: (isElite) => ({ targetMultiplier: isElite ? 1.5 : 2.0 }),
  apply: (params) => {
    originalTargetScore = state.targetScore
    if (params.targetMultiplier) {
      state.targetScore = Math.floor(state.targetScore * params.targetMultiplier)
    }
  },
  cleanup: () => {
    if (originalTargetScore > 0) {
      state.targetScore = originalTargetScore
      originalTargetScore = 0
    }
  },
}

let diminishWordCount = 0

const bossDiminish: BossModifier = {
  id: 'boss_diminish',
  getParams: (isElite) => ({ diminishRate: isElite ? 0.05 : 0.10 }),
  apply: () => { diminishWordCount = 0 },
  cleanup: () => { diminishWordCount = 0 },
}

/** 递增词数计数器（completeWord 调用） */
export function incrementDiminishCount(): void {
  diminishWordCount++
}

/** 获取当前递减倍率 */
export function getDiminishMultiplier(): number {
  const rate = getActiveParams()?.diminishRate
  if (!rate) return 1
  return Math.max(0, 1 - rate * diminishWordCount)
}

// === 3 个视觉类修饰器实现（Story 18.5）===

let fadeElapsed = 0

const bossFade: BossModifier = {
  id: 'boss_fade',
  getParams: (isElite) => ({
    fadeSpeed: isElite ? 3.0 : 1.5,
    fadeSpeedEnd: isElite ? 1.6 : 0.8,
    fadeDuration: isElite ? 45 : 60,
  }),
  apply: () => { fadeElapsed = 0 },
  cleanup: () => {
    fadeElapsed = 0
    document.querySelectorAll('#word-display .letter').forEach(el => {
      ;(el as HTMLElement).style.opacity = ''
    })
  },
  onTick(dt: number) {
    fadeElapsed += dt
    const params = getActiveParams()
    if (!params?.fadeSpeed) return

    const t = Math.min(fadeElapsed / (params.fadeDuration ?? 60), 1)
    const currentSpeed = params.fadeSpeed + ((params.fadeSpeedEnd ?? params.fadeSpeed) - params.fadeSpeed) * t

    document.querySelectorAll('#word-display .letter').forEach((el) => {
      if (el.classList.contains('correct')) return
      const opacity = Math.max(0.05, 1 - fadeElapsed / currentSpeed * 0.3)
      ;(el as HTMLElement).style.opacity = String(opacity)
    })
  },
}

let driftElapsed = 0

const bossDrift: BossModifier = {
  id: 'boss_drift',
  getParams: (isElite) => ({
    driftAmplitude: isElite ? 8 : 15,
    driftFrequency: isElite ? 1.5 : 2.0,
  }),
  apply: () => { driftElapsed = 0 },
  cleanup: () => {
    driftElapsed = 0
    const wordEl = document.getElementById('word-display')
    if (wordEl) wordEl.style.transform = ''
  },
  onTick(dt: number) {
    driftElapsed += dt
    const params = getActiveParams()
    if (!params?.driftAmplitude) return

    const ampScale = 1 + driftElapsed / 60
    const amp = params.driftAmplitude * ampScale
    const freq = params.driftFrequency ?? 2

    const x = Math.sin(driftElapsed * freq * Math.PI * 2) * amp
    const y = Math.cos(driftElapsed * freq * Math.PI * 2 * 0.7) * amp * 0.5

    const wordEl = document.getElementById('word-display')
    if (wordEl) wordEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
  },
}

const bossSpotlight: BossModifier = {
  id: 'boss_spotlight',
  getParams: (isElite) => ({
    spotlightRadius: isElite ? 3 : 2,
  }),
  apply: () => {},
  cleanup: () => {
    document.querySelectorAll('#word-display .letter').forEach(el => {
      ;(el as HTMLElement).style.opacity = ''
    })
  },
  onTick() {
    const params = getActiveParams()
    if (!params?.spotlightRadius) return

    const idx = state.player.index
    const radius = params.spotlightRadius

    document.querySelectorAll('#word-display .letter').forEach((el, i) => {
      if (el.classList.contains('correct')) {
        ;(el as HTMLElement).style.opacity = ''
        return
      }
      const distance = Math.abs(i - idx)
      if (distance <= radius / 2) {
        ;(el as HTMLElement).style.opacity = '1'
      } else if (distance <= radius) {
        const fade = 1 - (distance - radius / 2) / (radius / 2)
        ;(el as HTMLElement).style.opacity = String(Math.max(0.05, fade))
      } else {
        ;(el as HTMLElement).style.opacity = '0.05'
      }
    })
  },
}

// === 3 个认知类修饰器实现（Story 18.6）===

function scrambleWord(word: string, preserveEnds: boolean, maxRetries = 5): string {
  if (word.length <= 2) return word
  const chars = word.split('')
  const start = preserveEnds ? 1 : 0
  const end = preserveEnds ? chars.length - 1 : chars.length

  if (end - start <= 1) return word // 可打乱的字母不足 2 个

  for (let i = end - 1; i > start; i--) {
    const j = start + Math.floor(Math.random() * (i - start + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  const result = chars.join('')
  if (result === word && maxRetries > 0) {
    return scrambleWord(word, preserveEnds, maxRetries - 1)
  }
  return result
}

const bossScramble: BossModifier = {
  id: 'boss_scramble',
  getParams: (isElite) => ({ scrambleMode: isElite ? 2 : 1 }),
  apply: () => {},
  cleanup: () => {},
}

const bossReverse: BossModifier = {
  id: 'boss_reverse',
  getParams: () => ({ reverseActive: 1 }),
  apply: () => {},
  cleanup: () => {},
}

/** 词语变换：scramble/reverse 在 setWord 时调用 */
export function transformWordForModifier(word: string): string {
  const params = getActiveParams()
  if (!params) return word

  if (params.reverseActive) {
    return word.split('').reverse().join('')
  }

  if (params.scrambleMode) {
    return scrambleWord(word, params.scrambleMode === 2)
  }

  return word
}

let maskedPositions: Set<number> = new Set()
let maskedForWord: string = ''

function generateMaskedPositions(length: number, rate: number): Set<number> {
  const count = Math.max(1, Math.floor(length * rate))
  const positions = new Set<number>()
  const available = Array.from({ length }, (_, i) => i)
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length)
    positions.add(available.splice(idx, 1)[0])
  }
  return positions
}

const bossMasked: BossModifier = {
  id: 'boss_masked',
  getParams: (isElite) => ({ maskRate: isElite ? 0.15 : 0.30 }),
  apply: () => {
    maskedPositions.clear()
    maskedForWord = ''
  },
  cleanup: () => {
    maskedPositions.clear()
    maskedForWord = ''
    document.querySelectorAll('#word-display .letter').forEach(el => {
      const htmlEl = el as HTMLElement
      const orig = htmlEl.getAttribute('data-original')
      if (orig) {
        htmlEl.textContent = orig
        htmlEl.removeAttribute('data-original')
      }
    })
  },
  onTick() {
    const params = getActiveParams()
    if (!params?.maskRate) return

    const currentWord = state.player.word
    if (currentWord !== maskedForWord) {
      maskedForWord = currentWord
      maskedPositions = generateMaskedPositions(currentWord.length, params.maskRate)
    }

    document.querySelectorAll('#word-display .letter').forEach((el, i) => {
      const htmlEl = el as HTMLElement
      if (el.classList.contains('correct')) {
        const orig = htmlEl.getAttribute('data-original')
        if (orig) {
          htmlEl.textContent = orig
          htmlEl.removeAttribute('data-original')
        }
        return
      }
      if (maskedPositions.has(i) && !htmlEl.getAttribute('data-original')) {
        htmlEl.setAttribute('data-original', htmlEl.textContent || '')
        htmlEl.textContent = '?'
      }
    })
  },
}

// === 修饰器注册表 ===

export const BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier> = {
  // 数值规则类（完整实现）
  boss_decay: bossDecay,
  boss_combo_punish: bossComboPunish,
  boss_cap: bossCap,
  boss_fast_time: bossFastTime,
  boss_double_target: bossDoubleTarget,
  boss_diminish: bossDiminish,
  // 视觉类（Story 18.5 实现）
  boss_fade: bossFade,
  boss_drift: bossDrift,
  boss_spotlight: bossSpotlight,
  // 认知类（Story 18.6 实现）
  boss_scramble: bossScramble,
  boss_reverse: bossReverse,
  boss_masked: bossMasked,
  // 打字难度类（stub，18.7-18.8 实现）
  boss_rhythm: createStubModifier('boss_rhythm'),
}

// === 活跃修饰器参数查询（供 bossModifierEngine 和 battle.ts 使用） ===

let _activeParams: BossModifierParams | null = null

/** 设置当前活跃修饰器参数（由 bossModifierEngine 调用） */
export function setActiveParams(params: BossModifierParams | null): void {
  _activeParams = params
}

/** 获取当前活跃修饰器参数 */
export function getActiveParams(): BossModifierParams | null {
  return _activeParams
}
