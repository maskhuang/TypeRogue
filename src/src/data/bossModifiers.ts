// ============================================
// 打字肉鸽 - Boss 修饰器定义与注册表
// ============================================
// Story 18.1: 修饰器池（ID + Meta）
// Story 18.4: BossModifier 接口 + 注册表 + 6 个数值修饰器实现 + 7 个 stub
// Story 18.5: 视觉类修饰器实现（boss_fade, boss_spotlight）
// Story 18.6: 认知类修饰器实现（boss_scramble, boss_reverse）

/**
 * 修饰器分类
 */
export type ModifierCategory = 'offense' | 'defense' | 'disruption'

/**
 * 所有 Boss 修饰器 ID（6 offense + 6 defense + 6 disruption = 18）
 */
export const BOSS_MODIFIER_IDS = [
  // 进攻类 (offense) — 消耗时间
  'boss_fast_time',      // 时间加速
  'boss_keystroke_tax',  // 击键代价
  'boss_escalation',     // 渐进失控
  'boss_frostbite',      // 寒霜侵蚀
  'boss_resource_tax',   // 资源征税
  'boss_mirror',         // 镜像试炼
  // 防守类 (defense) — 阻碍得分
  'boss_decay',          // 分数衰减
  'boss_combo_punish',   // 断连即扣
  'boss_cap',            // 单词限额
  'boss_double_target',  // 双倍目标
  'boss_diminish',       // 递减收益
  'boss_score_tax',      // 得分税
  // 干扰类 (disruption) — 阻碍打字
  'boss_fade',           // 渐隐之词
  'boss_scramble',       // 乱序打字
  'boss_reverse',        // 倒序输入
  'boss_spotlight',      // 聚光灯
  'boss_garble',         // 乱码
  'boss_scroll',         // 滚屏
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
  category: ModifierCategory
}

/**
 * 18 个修饰器的元数据（6 offense + 6 defense + 6 disruption）
 */
export const BOSS_MODIFIER_META: Record<BossModifierId, BossModifierMeta> = {
  // === 进攻类 (offense) ===
  boss_fast_time: {
    id: 'boss_fast_time',
    name: '时间加速',
    icon: '⏩',
    description: '计时器 1.5 倍速',
    eliteHint: '计时器 1.25 倍速',
    category: 'offense',
  },
  boss_keystroke_tax: {
    id: 'boss_keystroke_tax',
    name: '击键代价',
    icon: '⌨️',
    description: '每次正确击键扣 0.12 秒',
    eliteHint: '每次击键扣 0.06 秒',
    category: 'offense',
  },
  boss_escalation: {
    id: 'boss_escalation',
    name: '渐进失控',
    icon: '📈',
    description: '每 15 秒时间流速永久 +20%',
    eliteHint: '每 20 秒 +10%',
    category: 'offense',
  },
  boss_frostbite: {
    id: 'boss_frostbite',
    name: '寒霜侵蚀',
    icon: '🥶',
    description: '打错累积冰霜，满 5 层爆发扣 4 秒',
    eliteHint: '满 7 层扣 3 秒',
    category: 'offense',
  },
  boss_resource_tax: {
    id: 'boss_resource_tax',
    name: '资源征税',
    icon: '🏛️',
    description: '每词按被征税资源产出×10%扣时间',
    eliteHint: '税率 5%，轮换更慢',
    category: 'offense',
  },
  boss_mirror: {
    id: 'boss_mirror',
    name: '镜像试炼',
    icon: '🫧',
    description: '记录→挑战循环，超时扣全部时间',
    eliteHint: '超时扣固定 5 秒',
    category: 'offense',
  },
  // === 防守类 (defense) ===
  boss_decay: {
    id: 'boss_decay',
    name: '分数衰减',
    icon: '📉',
    description: '每秒扣 5% 当前总分',
    eliteHint: '每秒扣 2.5% 总分',
    category: 'defense',
  },
  boss_combo_punish: {
    id: 'boss_combo_punish',
    name: '断连即扣',
    icon: '☠️',
    description: '连击中断扣 20% 总分',
    eliteHint: '断连扣 10% 总分',
    category: 'defense',
  },
  boss_cap: {
    id: 'boss_cap',
    name: '单词限额',
    icon: '📦',
    description: '单词得分上限 50 分',
    eliteHint: '单词得分上限 75 分',
    category: 'defense',
  },
  boss_double_target: {
    id: 'boss_double_target',
    name: '双倍目标',
    icon: '⏫',
    description: '目标分数 ×2',
    eliteHint: '目标分数 ×1.5',
    category: 'defense',
  },
  boss_diminish: {
    id: 'boss_diminish',
    name: '递减收益',
    icon: '⬇️',
    description: '每完成一词下个词分数 -10%',
    eliteHint: '每词 -5%',
    category: 'defense',
  },
  boss_score_tax: {
    id: 'boss_score_tax',
    name: '得分税',
    icon: '🧾',
    description: '每词最终得分减少 15 分',
    eliteHint: '每词减少 8 分',
    category: 'defense',
  },
  // === 干扰类 (disruption) ===
  boss_fade: {
    id: 'boss_fade',
    name: '渐隐之词',
    icon: '👻',
    description: '字母逐个淡出消失',
    eliteHint: '字母缓慢淡出（速度减半）',
    category: 'disruption',
  },
  boss_scramble: {
    id: 'boss_scramble',
    name: '乱序打字',
    icon: '🔀',
    description: '字母打乱显示，照乱序打',
    eliteHint: '仅打乱中间字母，首尾保留',
    category: 'disruption',
  },
  boss_reverse: {
    id: 'boss_reverse',
    name: '倒序输入',
    icon: '⏪',
    description: '从最后一个字母往前打',
    eliteHint: '从最后一个字母往前打',
    category: 'disruption',
  },
  boss_spotlight: {
    id: 'boss_spotlight',
    name: '聚光灯',
    icon: '🔦',
    description: '只能看到当前 2-3 个字母',
    eliteHint: '可见 3-4 个字母',
    category: 'disruption',
  },
  boss_garble: {
    id: 'boss_garble',
    name: '乱码',
    icon: '🔣',
    description: '词语中插入随机标点符号',
    eliteHint: '插入较少标点符号',
    category: 'disruption',
  },
  boss_scroll: {
    id: 'boss_scroll',
    name: '滚屏',
    icon: '📜',
    description: '字母从右向左滚动，对准箭头时打字',
    eliteHint: '滚动较慢，命中区更宽',
    category: 'disruption',
  },
}

/**
 * 查询修饰器元数据
 */
export function getBossModifierMeta(id: BossModifierId): BossModifierMeta | undefined {
  return BOSS_MODIFIER_META[id]
}

/**
 * Story 42.6: 从修饰器池中抽取 1 个修饰器，排除已用列表
 * 如果所有修饰器都在 excluded 中，重置排除列表（AC4 耗尽重置），再抽 1 个
 */
export function drawSingleBossModifier(excluded: string[]): BossModifierId | null {
  let pool = BOSS_MODIFIER_IDS.filter(id => !excluded.includes(id))
  if (pool.length === 0) {
    // AC4: 耗尽重置 — 从全部修饰器中抽取
    pool = [...BOSS_MODIFIER_IDS]
  }
  if (pool.length === 0) return null
  const idx = Math.floor(random() * pool.length)
  return pool[idx]
}

/**
 * @deprecated Story 42.6: 使用 drawSingleBossModifier 替代
 * 从修饰器池中抽取修饰器（每个分类各抽一个，保证 offense+defense+disruption 各一）
 * count=3 时按分类抽取；其他 count 值退化为纯随机
 */
export function drawBossModifiers(count: number): BossModifierId[] {
  if (count === 3) {
    return drawBossModifiersByCategory()
  }
  // 退化：纯随机
  const pool = [...BOSS_MODIFIER_IDS]
  const result: BossModifierId[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

/** 每分类随机抽一个，返回 [offense, defense, disruption] 顺序 */
function drawBossModifiersByCategory(): BossModifierId[] {
  const categories: ModifierCategory[] = ['offense', 'defense', 'disruption']
  const result: BossModifierId[] = []
  for (const cat of categories) {
    const pool = BOSS_MODIFIER_IDS.filter(id => BOSS_MODIFIER_META[id].category === cat)
    const idx = Math.floor(random() * pool.length)
    result.push(pool[idx])
  }
  return result
}

/**
 * 生成 Boss 修饰器候选（排除已激活的修饰器）
 * 从全部 18 个修饰器中排除 activeModifiers，随机取 3 个
 * 若可用不足 3 个，返回全部可用
 */
export function generateBossModifierCandidates(activeModifiers: BossModifierId[]): BossModifierId[] {
  const excluded = new Set(activeModifiers)
  const pool = BOSS_MODIFIER_IDS.filter(id => !excluded.has(id))
  // Fisher-Yates shuffle
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 3)
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
  spotlightRadius?: number  // boss_spotlight: 可见半径（字母数）
  // 认知类（Story 18.6）
  scrambleMode?: number     // boss_scramble: 1=全打乱, 2=保留首尾
  reverseActive?: number    // boss_reverse: 1=倒序 (truthy check)
  // 乱码（boss_garble）
  garbleRate?: number       // 标点插入率
  garbleActive?: number     // 1=激活 (truthy check)
  // 滚屏（boss_scroll）
  scrollSpeed?: number      // 滚动速度（px/s）
  scrollHitZone?: number    // 命中区宽度（px）
  // 新增：进攻类
  keystrokeTax?: number           // boss_keystroke_tax: 每次正确击键扣时(秒)
  escalateStep?: number           // boss_escalation: 每阶段增速量
  escalateInterval?: number       // boss_escalation: 阶段间隔(秒)
  frostThreshold?: number         // boss_frostbite: 冰霜层爆发阈值
  frostPenalty?: number           // boss_frostbite: 爆发扣时(秒)
  taxRate?: number                // boss_resource_tax: 资源产出→时间的转换率
  taxRotateInterval?: number      // boss_resource_tax: 征税目标轮换间隔(秒)
  mirrorActive?: number           // boss_mirror: 1=激活
  mirrorFailPenalty?: number      // boss_mirror: 超时扣时（0=扣全部剩余时间）
  // 新增：防守类
  scoreTaxFlat?: number           // boss_score_tax: 每词固定扣分
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

// === 6 个数值规则类修饰器实现 ===

import { state } from '../core/state'
import { random } from '../core/seededRandom'

const bossDecay: BossModifier = {
  id: 'boss_decay',
  getParams: (isElite) => ({ decayRate: isElite ? 0.025 : 0.05 }),
  apply: () => {},
  cleanup: () => {},
  onTick(dt: number) {
    const rate = getActiveParams()?.decayRate
    if (rate && state.score > 0) {
      // Story 36.11: 护盾削弱 decayRate（内联避免循环依赖）
      const shieldedRate = state.player.relics.has('modifier_shield') ? rate * 0.75 : rate
      const penalty = state.score * shieldedRate * dt
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
  // Story 36.11: 护盾削弱 diminishRate（内联避免循环依赖）
  const shieldedRate = state.player.relics.has('modifier_shield') ? rate * 0.75 : rate
  return Math.max(0, 1 - shieldedRate * diminishWordCount)
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
    const j = start + Math.floor(random() * (i - start + 1))
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

// === boss_garble 乱码修饰器 ===

export const GARBLE_CHARS = '.,;:!?'

// === 遗物乱码（标点解放） ===
import { RELIC_GARBLE_CHARS, RELIC_GARBLE_RATE } from '../core/constants'

let _relicGarbleActive = false

/** 设置遗物乱码激活状态（battle.ts 调用） */
export function setRelicGarbleActive(active: boolean): void {
  _relicGarbleActive = active
}

/** 遗物乱码是否激活 */
export function isRelicGarbleActive(): boolean {
  return _relicGarbleActive
}

/** 获取当前激活的乱码字符集 */
export function getActiveGarbleChars(): string {
  if (_relicGarbleActive) return RELIC_GARBLE_CHARS
  return GARBLE_CHARS
}

/** 向词语中随机插入标点符号，至少插入 1 个 */
export function garbleWord(word: string, rate: number, chars: string = GARBLE_CHARS): string {
  const wordChars = word.split('')
  const result: string[] = []
  let inserted = 0
  for (let i = 0; i < wordChars.length; i++) {
    result.push(wordChars[i])
    if (random() < rate) {
      result.push(chars[Math.floor(random() * chars.length)])
      inserted++
    }
  }
  // 保证至少插入 1 个标点
  if (inserted === 0) {
    const pos = Math.floor(random() * (result.length - 1)) + 1
    result.splice(pos, 0, chars[Math.floor(random() * chars.length)])
  }
  return result.join('')
}

/** 是否任何乱码激活（boss 或遗物） */
export function isGarbleActive(): boolean {
  return !!getActiveParams()?.garbleActive || _relicGarbleActive
}

const bossGarble: BossModifier = {
  id: 'boss_garble',
  getParams: (isElite) => ({ garbleRate: isElite ? 0.15 : 0.3, garbleActive: 1 }),
  apply: () => {},
  cleanup: () => {},
}

// === boss_scroll 滚屏修饰器 ===

let scrollOffset = 0
let scrollActive = false
let scrollMissFlags: boolean[] = []
let scrollArrowEl: HTMLElement | null = null
let scrollRafId: number | null = null
let scrollLastTime = 0

export function isScrollActive(): boolean {
  return scrollActive
}

export function initScrollWord(len: number): void {
  scrollMissFlags = new Array(len).fill(false)
  const wordEl = document.getElementById('word-display')
  if (wordEl) {
    // 随机化字母间距，让滚动节奏有变化
    const letters = wordEl.children
    for (let i = 0; i < letters.length; i++) {
      const el = letters[i] as HTMLElement
      if (!el.classList.contains('letter')) continue
      // 最后一个字母不加右边距
      el.style.marginRight = i < len - 1 ? `${Math.round(4 + random() * 20)}px` : '0'
    }
    // 让词语从箭头右侧开始：初始偏移 = -(半个词宽 + 缓冲)
    const halfWidth = wordEl.scrollWidth / 2
    scrollOffset = -(halfWidth + 40) // 额外 40px 缓冲让玩家看到第一个字母接近
  } else {
    scrollOffset = 0
  }
}

/**
 * 判断字母相对箭头位置
 * 'locked' = 还没到箭头, 'hit' = 在命中区, 'miss' = 已经过了箭头
 */
export function checkScrollLetterState(idx: number): 'locked' | 'hit' | 'miss' {
  if (scrollMissFlags[idx]) return 'miss'
  const params = getActiveParams()
  if (!params?.scrollHitZone) return 'hit'
  const wordEl = document.getElementById('word-display')
  if (!wordEl) return 'hit'
  const letterEl = wordEl.children[idx] as HTMLElement | undefined
  if (!letterEl) return 'hit'
  const arrowEl = scrollArrowEl
  if (!arrowEl) return 'hit'
  const letterRect = letterEl.getBoundingClientRect()
  const arrowRect = arrowEl.getBoundingClientRect()
  const letterCenter = letterRect.left + letterRect.width / 2
  const arrowCenter = arrowRect.left + arrowRect.width / 2
  const dist = letterCenter - arrowCenter
  const halfZone = params.scrollHitZone / 2
  if (dist > halfZone) return 'locked'
  if (dist < -halfZone) return 'miss'
  return 'hit'
}

export function markScrollMiss(idx: number): void {
  scrollMissFlags[idx] = true
}

const bossScroll: BossModifier = {
  id: 'boss_scroll',
  getParams: (isElite) => ({
    scrollSpeed: isElite ? 60 : 100,
    scrollHitZone: isElite ? 60 : 40,
  }),
  apply: () => {
    scrollOffset = 0
    scrollActive = true
    scrollMissFlags = []
    const zone = document.getElementById('word-zone')
    if (zone) {
      zone.classList.add('scroll-active')
      scrollArrowEl = document.createElement('div')
      scrollArrowEl.id = 'scroll-arrow'
      scrollArrowEl.textContent = '▼'
      zone.insertBefore(scrollArrowEl, zone.firstChild)
    }
    // 启动 rAF 渲染循环
    scrollLastTime = performance.now()
    function scrollRender(now: number) {
      if (!scrollActive) return
      const dt = (now - scrollLastTime) / 1000
      scrollLastTime = now
      const params = getActiveParams()
      if (params?.scrollSpeed) {
        scrollOffset += params.scrollSpeed * dt
        const wordEl = document.getElementById('word-display')
        if (wordEl) {
          wordEl.style.transform = `translateX(${-scrollOffset}px)`
        }
      }
      scrollRafId = requestAnimationFrame(scrollRender)
    }
    scrollRafId = requestAnimationFrame(scrollRender)
  },
  cleanup: () => {
    scrollActive = false
    if (scrollRafId !== null) {
      cancelAnimationFrame(scrollRafId)
      scrollRafId = null
    }
    scrollOffset = 0
    scrollMissFlags = []
    if (scrollArrowEl) {
      scrollArrowEl.remove()
      scrollArrowEl = null
    }
    const zone = document.getElementById('word-zone')
    if (zone) zone.classList.remove('scroll-active')
    const wordEl = document.getElementById('word-display')
    if (wordEl) wordEl.style.transform = ''
  },
  onTick(_dt: number) {
    // 滚动渲染已由 rAF 驱动，此处无需操作
  },
}

/** 词语变换：reverse/scramble/garble 在 setWord 时调用（支持组合） */
export function transformWordForModifier(word: string): string {
  const params = getActiveParams()

  let result = word

  if (params?.reverseActive) {
    result = result.split('').reverse().join('')
  }

  if (params?.scrambleMode) {
    result = scrambleWord(result, params.scrambleMode === 2)
  }

  // 遗物乱码优先于 boss 乱码（替换不叠加）
  if (_relicGarbleActive) {
    result = garbleWord(result, RELIC_GARBLE_RATE, RELIC_GARBLE_CHARS)
  } else if (params?.garbleActive && params.garbleRate) {
    result = garbleWord(result, params.garbleRate)
  }

  return result
}

// === 6 个新修饰器实现 ===

// === boss_keystroke_tax: 参数由 battle.ts 读取 ===
const bossKeystrokeTax: BossModifier = {
  id: 'boss_keystroke_tax',
  getParams: (isElite) => ({ keystrokeTax: isElite ? 0.06 : 0.12 }),
  apply: () => {},
  cleanup: () => {},
}

// === boss_escalation: onTick 累加器递增 timeSpeed ===
let _escalateAccum = 0
let _escalateStacks = 0

const bossEscalation: BossModifier = {
  id: 'boss_escalation',
  getParams: (isElite) => ({
    escalateStep: isElite ? 0.10 : 0.20,
    escalateInterval: isElite ? 20 : 15,
  }),
  apply: () => { _escalateAccum = 0; _escalateStacks = 0 },
  cleanup: () => { _escalateAccum = 0; _escalateStacks = 0 },
  onTick(dt) {
    const p = getActiveParams()
    if (!p?.escalateInterval || !p?.escalateStep) return
    _escalateAccum += dt
    if (_escalateAccum >= p.escalateInterval) {
      _escalateAccum -= p.escalateInterval
      _escalateStacks++
    }
  },
}

/** 获取渐进失控的额外时间速度加成 */
export function getEscalateTimeSpeedBonus(): number {
  const p = getActiveParams()
  if (!p?.escalateStep) return 0
  return _escalateStacks * p.escalateStep
}

/** 获取当前渐进失控层数（UI 用） */
export function getEscalateStacks(): number { return _escalateStacks }

// === boss_frostbite: 错误累积 → 爆发 ===
let _frostStacks = 0

const bossFrostbite: BossModifier = {
  id: 'boss_frostbite',
  getParams: (isElite) => ({
    frostThreshold: isElite ? 7 : 5,
    frostPenalty: isElite ? 3 : 4,
  }),
  apply: () => { _frostStacks = 0 },
  cleanup: () => { _frostStacks = 0 },
}

/** battle.ts 错误时调用：返回 { burst, penalty } 或 null（非冰霜修饰器） */
export function addFrostStack(): { burst: boolean; penalty: number } | null {
  const p = getActiveParams()
  if (!p?.frostThreshold) return null
  _frostStacks++
  if (_frostStacks >= p.frostThreshold) {
    const rawPenalty = p.frostPenalty!
    const shielded = state.player.relics.has('modifier_shield')
      ? rawPenalty * 0.75 : rawPenalty
    _frostStacks = 0
    return { burst: true, penalty: shielded }
  }
  return { burst: false, penalty: 0 }
}

/** 获取当前冰霜层数（UI 用） */
export function getFrostStacks(): number { return _frostStacks }

// === boss_resource_tax: 资源征税 ===
const TAX_RESOURCES: import('../core/types').ResourceType[] = ['base', 'score', 'gold', 'multiplier']
let _taxResourceIdx = 0
let _taxRotateAccum = 0

const bossResourceTax: BossModifier = {
  id: 'boss_resource_tax',
  getParams: (isElite) => ({
    taxRate: isElite ? 0.05 : 0.10,
    taxRotateInterval: isElite ? 25 : 20,
  }),
  apply: () => { _taxResourceIdx = 0; _taxRotateAccum = 0 },
  cleanup: () => { _taxResourceIdx = 0; _taxRotateAccum = 0 },
  onTick(dt) {
    const p = getActiveParams()
    if (!p?.taxRotateInterval) return
    _taxRotateAccum += dt
    if (_taxRotateAccum >= p.taxRotateInterval) {
      _taxRotateAccum -= p.taxRotateInterval
      _taxResourceIdx = (_taxResourceIdx + 1) % TAX_RESOURCES.length
    }
  },
}

/** 获取当前被征税的资源类型 */
export function getCurrentTaxResource(): import('../core/types').ResourceType {
  return TAX_RESOURCES[_taxResourceIdx]
}

/** 获取当前税率 */
export function getTaxRate(): number {
  return getActiveParams()?.taxRate ?? 0
}

// === boss_mirror: 镜像试炼（无限循环：录制→挑战→录制→…） ===
let _mirrorPhase: 'recording' | 'challenging' | 'done' = 'done'
let _mirrorRecordedTime = 0
let _mirrorWordStart = 0

const bossMirror: BossModifier = {
  id: 'boss_mirror',
  getParams: (isElite) => ({
    mirrorActive: 1,
    mirrorFailPenalty: isElite ? 5 : 0, // 0=扣全部，5=扣固定5秒
  }),
  apply: () => {
    _mirrorPhase = 'recording'
    _mirrorRecordedTime = 0
    _mirrorWordStart = Date.now()
  },
  cleanup: () => { _mirrorPhase = 'done' },
  onTick() {
    if (_mirrorPhase === 'challenging') {
      const elapsed = (Date.now() - _mirrorWordStart) / 1000
      if (elapsed >= _mirrorRecordedTime) {
        const p = getActiveParams()
        const penalty = p?.mirrorFailPenalty ?? 0
        if (penalty > 0) {
          // 精英：扣固定秒数
          const shielded = state.player.relics.has('modifier_shield') ? penalty * 0.75 : penalty
          state.time -= shielded
        } else {
          // Boss：扣全部剩余时间
          state.time = 0
        }
        _mirrorPhase = 'recording' // 超时后重新开始下一轮录制
        _mirrorWordStart = Date.now()
      }
    }
  },
}

/** battle.ts 完成一词时调用 */
export function onMirrorWordComplete(): 'recorded' | 'survived' | 'inactive' {
  if (_mirrorPhase === 'recording') {
    _mirrorRecordedTime = (Date.now() - _mirrorWordStart) / 1000
    _mirrorPhase = 'challenging'
    _mirrorWordStart = Date.now() // 立即重置计时，避免 onTick 在 setWord 之前判定超时
    return 'recorded'
  }
  if (_mirrorPhase === 'challenging') {
    _mirrorPhase = 'recording' // 通过挑战，继续下一轮
    return 'survived'
  }
  return 'inactive'
}

/** battle.ts 新词开始时重置计时 */
export function resetMirrorWordTimer(): void {
  _mirrorWordStart = Date.now()
}

/** 获取镜像试炼当前阶段（UI 用） */
export function getMirrorPhase(): 'recording' | 'challenging' | 'done' { return _mirrorPhase }
export function getMirrorRecordedTime(): number { return _mirrorRecordedTime }
export function getMirrorElapsed(): number {
  if (_mirrorPhase !== 'challenging') return 0
  return (Date.now() - _mirrorWordStart) / 1000
}

// === boss_score_tax: 参数由 battle.ts 读取 ===
const bossScoreTax: BossModifier = {
  id: 'boss_score_tax',
  getParams: (isElite) => ({ scoreTaxFlat: isElite ? 8 : 15 }),
  apply: () => {},
  cleanup: () => {},
}

// === 修饰器注册表 ===

export const BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier> = {
  // 进攻类
  boss_fast_time: bossFastTime,
  boss_keystroke_tax: bossKeystrokeTax,
  boss_escalation: bossEscalation,
  boss_frostbite: bossFrostbite,
  boss_resource_tax: bossResourceTax,
  boss_mirror: bossMirror,
  // 防守类
  boss_decay: bossDecay,
  boss_combo_punish: bossComboPunish,
  boss_cap: bossCap,
  boss_double_target: bossDoubleTarget,
  boss_diminish: bossDiminish,
  boss_score_tax: bossScoreTax,
  // 干扰类
  boss_fade: bossFade,
  boss_spotlight: bossSpotlight,
  boss_scramble: bossScramble,
  boss_reverse: bossReverse,
  boss_garble: bossGarble,
  boss_scroll: bossScroll,
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
