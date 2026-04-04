// ============================================
// 打字肉鸽 - Boss 修饰器定义与注册表
// ============================================
// Story 18.1: 修饰器池（ID + Meta）
// Story 18.4: BossModifier 接口 + 注册表 + 6 个数值修饰器实现 + 7 个 stub
// Story 18.5: 视觉类修饰器实现（boss_fade）
// Story 18.6: 认知类修饰器实现（boss_scramble, boss_reverse）

/**
 * 修饰器分类
 */
export type ModifierCategory = 'offense' | 'defense' | 'disruption'

/**
 * 所有 Boss 修饰器 ID（5 offense + 5 defense + 5 disruption = 15）
 */
export const BOSS_MODIFIER_IDS = [
  // 进攻类 (offense) — 消耗时间
  'boss_fast_time',      // 时间加速
  'boss_keystroke_tax',  // 击键/资源扣时
  'boss_escalation',     // 渐进失控
  'boss_frostbite',      // 寒霜侵蚀
  'boss_mirror',         // 镜像试炼
  // 防守类 (defense) — 阻碍得分
  'boss_decay',          // 分数衰减
  'boss_cap',            // 单词限额
  'boss_double_target',  // 双倍目标
  'boss_diminish',       // 递减收益
  'boss_score_tax',      // 得分税
  'boss_output_drain',   // 产出削弱
  // 干扰类 (disruption) — 阻碍打字
  'boss_fade',           // 渐隐之词
  'boss_scramble',       // 乱序打字
  'boss_reverse',        // 倒序输入
  'boss_garble',         // 乱码
  'boss_decoy',          // 伪词干扰
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
 * 15 个修饰器的元数据（5 offense + 5 defense + 5 disruption）
 */
export const BOSS_MODIFIER_META: Record<BossModifierId, BossModifierMeta> = {
  // === 进攻类 (offense) ===
  boss_fast_time: {
    id: 'boss_fast_time',
    name: '时间加速',
    icon: '⏩',
    description: '开局即进入达标后加速阶段',
    eliteHint: '开局即进入达标后加速阶段',
    category: 'offense',
  },
  boss_keystroke_tax: {
    id: 'boss_keystroke_tax',
    name: '击键代价',
    icon: '⌨️',
    description: '击键或产出资源时 -1 秒',
    eliteHint: '击键或产出资源时 -1 秒',
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
    description: '打错冻结 1+N 秒（N=打错次数），冻结期间打字无效',
    eliteHint: '打错冻结 1+N 秒（N=打错次数），冻结期间打字无效',
    category: 'offense',
  },
  boss_mirror: {
    id: 'boss_mirror',
    name: '镜像试炼',
    icon: '🫧',
    description: '首次通关后重来，通关时间为倒计时，超时扣全部时间',
    eliteHint: '首次通关后重来，通关时间为倒计时，超时扣全部时间',
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
  boss_cap: {
    id: 'boss_cap',
    name: '单词限额',
    icon: '📦',
    description: '单词得分上限为目标分数的 10%',
    eliteHint: '单词得分上限为目标分数的 15%',
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
    description: '每词最终得分减少目标分数的 3%',
    eliteHint: '每词减少目标分数的 2%',
    category: 'defense',
  },
  boss_output_drain: {
    id: 'boss_output_drain',
    name: '产出削弱',
    icon: '🩸',
    description: '随机2种资源的技能产出被削弱（覆盖越多削弱越轻）',
    eliteHint: '随机3种资源，每种削弱更轻',
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
  boss_garble: {
    id: 'boss_garble',
    name: '乱码',
    icon: '🔣',
    description: '词语中插入随机标点符号',
    eliteHint: '插入较少标点符号',
    category: 'disruption',
  },
  boss_decoy: {
    id: 'boss_decoy',
    name: '伪词干扰',
    icon: '🎭',
    description: '30% 概率出现伪词，无失误完成反扣等量分数',
    eliteHint: '20% 概率出现伪词',
    category: 'disruption',
  },
}

/**
 * 查询修饰器元数据
 */
export function getBossModifierMeta(id: BossModifierId): BossModifierMeta | undefined {
  return BOSS_MODIFIER_META[id]
}

/** Story 54.6: 获取 offense + defense 类 modifier ID 列表（排除 disruption） */
export function getOffenseDefenseModifierIds(): BossModifierId[] {
  return BOSS_MODIFIER_IDS.filter(id => {
    const meta = BOSS_MODIFIER_META[id]
    return meta && (meta.category === 'offense' || meta.category === 'defense')
  })
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
 * 生成 Boss 修饰器候选（每类各 2 个，排除已激活）
 * 返回 3 组候选，顺序：offense → defense → disruption
 * @param guaranteedModId 若提供且不在 activeModifiers 中，保证出现在对应类别候选中
 */
export function generateBossModifierCandidatesByCategory(
  activeModifiers: BossModifierId[],
  guaranteedModId?: BossModifierId | null,
): BossModifierId[][] {
  const excluded = new Set(activeModifiers)
  const guaranteedCategory = guaranteedModId && !excluded.has(guaranteedModId)
    ? BOSS_MODIFIER_META[guaranteedModId]?.category ?? null
    : null
  const categories: ModifierCategory[] = ['offense', 'defense', 'disruption']
  const result: BossModifierId[][] = []
  for (const cat of categories) {
    const pool = BOSS_MODIFIER_IDS.filter(id => !excluded.has(id) && BOSS_MODIFIER_META[id].category === cat)
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    let candidates = pool.slice(0, 2)
    // 保证精英修饰器出现在对应类别
    if (guaranteedCategory === cat && guaranteedModId && !candidates.includes(guaranteedModId)) {
      if (candidates.length >= 2) {
        candidates[candidates.length - 1] = guaranteedModId
      } else {
        candidates.push(guaranteedModId)
      }
    }
    result.push(candidates)
  }
  return result
}

/** @deprecated 兼容旧调用 — 改用 generateBossModifierCandidatesByCategory */
export function generateBossModifierCandidates(activeModifiers: BossModifierId[]): BossModifierId[] {
  return generateBossModifierCandidatesByCategory(activeModifiers).flat()
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
  scoreCapPct?: number      // boss_cap: 单词得分上限（目标分数的百分比）
  timeSpeed?: number        // boss_fast_time: 计时器速度倍率
  targetMultiplier?: number // boss_double_target: 目标分倍率
  diminishRate?: number     // boss_diminish: 每词递减百分比
  outputDrainMult?: number           // boss_output_drain: 被削弱资源的产出倍率
  outputDrainResources?: ResourceType[] // boss_output_drain: 受影响的资源列表
  // 视觉类（Story 18.5）
  fadeSpeed?: number        // boss_fade: 初始淡出速度（秒/字母）
  fadeSpeedEnd?: number     // boss_fade: 最终淡出速度
  fadeDuration?: number     // boss_fade: 加速持续时间（秒）
  // 认知类（Story 18.6）
  scrambleMode?: number     // boss_scramble: 1=全打乱, 2=保留首尾
  reverseActive?: number    // boss_reverse: 1=倒序 (truthy check)
  // 乱码（boss_garble）
  garbleRate?: number       // 标点插入率
  garbleActive?: number     // 1=激活 (truthy check)
  // 新增：进攻类
  keystrokeTaxActive?: number     // boss_keystroke_tax: 1=激活（击键/资源产出 -1s）
  escalateStep?: number           // boss_escalation: 每阶段增速量
  escalateInterval?: number       // boss_escalation: 阶段间隔(秒)
  frostActive?: number            // boss_frostbite: 1=激活（打错冻结）
  mirrorActive?: number           // boss_mirror: 1=激活
  // 新增：防守类
  scoreTaxPct?: number            // boss_score_tax: 每词扣分（目标分数的百分比）
  // 新增：干扰类
  decoyChance?: number            // boss_decoy: 伪词出现概率
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

const bossCap: BossModifier = {
  id: 'boss_cap',
  getParams: (isElite) => ({ scoreCapPct: isElite ? 0.15 : 0.10 }),
  apply: () => {},
  cleanup: () => {},
}

const bossFastTime: BossModifier = {
  id: 'boss_fast_time',
  getParams: () => ({ timeSpeed: 1 }), // 标志位：开局即三次方加速
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

export const GARBLE_CHARS = '.,;:!?@#$%&*~+-=<>()[]{}/\\\'"'

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

// === boss_decoy: 伪词干扰 ===

let _isDecoyWord = false
/** 突变位置 → 原字母（大写），用于在突变位置同时接受原字母输入 */
let _decoyOriginals: Map<number, string> = new Map()
/** 玩家是否在突变位置打出了原字母（识破伪词） */
let _decoyRecognized = false

const bossDecoy: BossModifier = {
  id: 'boss_decoy',
  getParams: (isElite) => ({ decoyChance: isElite ? 0.20 : 0.30 }),
  apply: () => { _isDecoyWord = false; _decoyOriginals.clear(); _decoyRecognized = false },
  cleanup: () => { _isDecoyWord = false; _decoyOriginals.clear(); _decoyRecognized = false },
}

/** 相似字母映射：每个字母 → 可替换的近似字母列表 */
const SIMILAR_LETTERS: Record<string, string[]> = {
  A: ['E', 'O'],       E: ['A', 'I'],       I: ['E', 'Y'],
  O: ['A', 'U'],       U: ['O'],
  B: ['D', 'P'],       C: ['K', 'G'],       D: ['B', 'T'],
  F: ['V', 'P'],       G: ['C', 'J'],       H: ['N'],
  J: ['G'],            K: ['C', 'Q'],       L: ['R', 'I'],
  M: ['N', 'W'],       N: ['M', 'H'],       P: ['B', 'F'],
  Q: ['K'],            R: ['L'],            S: ['Z', 'C'],
  T: ['D'],            V: ['F', 'W'],       W: ['V', 'M'],
  X: ['Z', 'S'],       Y: ['I'],            Z: ['S', 'X'],
}

/** 最小突变长度：短于此长度的词不生成伪词 */
export const DECOY_MIN_LENGTH = 4

/**
 * 生成伪词：对真词做 1-2 个字母突变（替换为语音相似字母）
 * 同时记录突变位置 → originals map，供输入容错使用
 * 短词（<4字母）不适合突变，应在 rollDecoyWord 中跳过
 */
export function generateDecoyWord(word: string): { decoy: string; originals: Map<number, string> } {
  const chars = word.split('')
  const originals = new Map<number, string>()
  // 决定突变数量：4-5字母→1处，6+字母→1-2处
  const mutCount = word.length >= 6 && random() < 0.5 ? 2 : 1

  // 收集可突变位置（有相似字母映射的位置）
  const candidates: number[] = []
  for (let i = 0; i < chars.length; i++) {
    if (SIMILAR_LETTERS[chars[i]] && SIMILAR_LETTERS[chars[i]].length > 0) {
      candidates.push(i)
    }
  }
  if (candidates.length === 0) return { decoy: word, originals }

  // 随机选 mutCount 个不重复位置
  for (let n = 0; n < Math.min(mutCount, candidates.length); n++) {
    const ci = Math.floor(random() * (candidates.length - n)) + n
    ;[candidates[n], candidates[ci]] = [candidates[ci], candidates[n]]
    const pos = candidates[n]
    const alts = SIMILAR_LETTERS[chars[pos]]
    originals.set(pos, chars[pos]) // 记录原字母
    chars[pos] = alts[Math.floor(random() * alts.length)]
  }

  const result = chars.join('')
  if (result === word) originals.clear()
  return { decoy: result, originals }
}

/** battle.ts setWord 时调用：根据概率决定是否将本词变为伪词 */
export function rollDecoyWord(word: string): { word: string; isDecoy: boolean } {
  const chance = getActiveParams()?.decoyChance
  if (!chance || random() >= chance) {
    _isDecoyWord = false
    _decoyOriginals.clear()
    return { word, isDecoy: false }
  }
  // 短词跳过伪词
  if (word.length < DECOY_MIN_LENGTH) {
    _isDecoyWord = false
    _decoyOriginals.clear()
    return { word, isDecoy: false }
  }
  const { decoy, originals } = generateDecoyWord(word)
  if (decoy === word) {
    _isDecoyWord = false
    _decoyOriginals.clear()
    return { word, isDecoy: false }
  }
  _isDecoyWord = true
  _decoyOriginals = originals
  return { word: decoy, isDecoy: true }
}

/** 当前词是否为伪词 */
export function isDecoyWord(): boolean { return _isDecoyWord }

/** 玩家是否识破了伪词（在突变位置打出原字母） */
export function isDecoyRecognized(): boolean { return _decoyRecognized }

/** 突变位置容错：若当前 index 是突变位置，返回原字母（小写）；否则 null */
export function getDecoyOriginalAt(index: number): string | null {
  const orig = _decoyOriginals.get(index)
  return orig ? orig.toLowerCase() : null
}

/** battle.ts 在突变位置玩家打出原字母时调用 */
export function markDecoyRecognized(): void { _decoyRecognized = true }

/** 重置伪词状态（每词开始时） */
export function resetDecoyState(): void { _isDecoyWord = false; _decoyOriginals.clear(); _decoyRecognized = false }

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

// === boss_keystroke_tax: 击键/资源产出时 -1s（标志位，逻辑在 battle.ts）===
const bossKeystrokeTax: BossModifier = {
  id: 'boss_keystroke_tax',
  getParams: () => ({ keystrokeTaxActive: 1 }),
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

// === boss_frostbite: 打错冻结 1+N 秒 ===
let _frostErrorCount = 0
let _frostFreezeEnd = 0 // 冻结结束时刻（Date.now 毫秒）

const bossFrostbite: BossModifier = {
  id: 'boss_frostbite',
  getParams: () => ({ frostActive: 1 }),
  apply: () => { _frostErrorCount = 0; _frostFreezeEnd = 0 },
  cleanup: () => { _frostErrorCount = 0; _frostFreezeEnd = 0 },
}

/** battle.ts 打错时调用：触发冻结，返回冻结秒数（0=未激活） */
export function triggerFrostFreeze(): number {
  if (!getActiveParams()?.frostActive) return 0
  _frostErrorCount++
  const duration = 1 + _frostErrorCount
  _frostFreezeEnd = Date.now() + duration * 1000
  return duration
}

/** 是否处于冻结状态 */
export function isFrostFrozen(): boolean {
  return _frostFreezeEnd > 0 && Date.now() < _frostFreezeEnd
}

/** 获取冻结剩余秒数（UI 用） */
export function getFrostRemainingSeconds(): number {
  if (_frostFreezeEnd <= 0) return 0
  return Math.max(0, (_frostFreezeEnd - Date.now()) / 1000)
}

/** 获取累计打错次数（UI 用） */
export function getFrostErrorCount(): number { return _frostErrorCount }

// === boss_mirror: 镜像试炼（首通记录时间 → 重来倒计时） ===
let _mirrorPhase: 'first_run' | 'mirror_run' | 'done' = 'done'
let _mirrorFirstRunTime = 0    // 首次通关用时（秒）
let _mirrorCountdown = 0       // mirror_run 倒计时剩余（秒）

const bossMirror: BossModifier = {
  id: 'boss_mirror',
  getParams: () => ({ mirrorActive: 1 }),
  apply: () => {
    _mirrorPhase = 'first_run'
    _mirrorFirstRunTime = 0
    _mirrorCountdown = 0
  },
  cleanup: () => { _mirrorPhase = 'done' },
  onTick(dt: number) {
    if (_mirrorPhase === 'mirror_run') {
      _mirrorCountdown -= dt
      if (_mirrorCountdown <= 0) {
        // 倒计时耗尽：扣全部时间
        _mirrorCountdown = 0
        state.time = 0
      }
    }
  },
}

/**
 * battle.ts 达标时调用：
 * - 'reset': first_run 结束，需重置分数并进入 mirror_run
 * - 'clear': mirror_run 通过或未激活，正常通关
 */
export function onMirrorTargetReached(elapsedSeconds: number): 'reset' | 'clear' {
  if (_mirrorPhase === 'first_run') {
    _mirrorFirstRunTime = elapsedSeconds
    _mirrorCountdown = elapsedSeconds
    _mirrorPhase = 'mirror_run'
    return 'reset'
  }
  if (_mirrorPhase === 'mirror_run') {
    _mirrorPhase = 'done'
  }
  return 'clear'
}

/** 获取镜像试炼当前阶段（UI 用） */
export function getMirrorPhase(): 'first_run' | 'mirror_run' | 'done' { return _mirrorPhase }
export function getMirrorFirstRunTime(): number { return _mirrorFirstRunTime }
export function getMirrorCountdown(): number { return _mirrorCountdown }

// === boss_score_tax: 参数由 battle.ts 读取 ===
const bossScoreTax: BossModifier = {
  id: 'boss_score_tax',
  getParams: (isElite) => ({ scoreTaxPct: isElite ? 0.02 : 0.03 }),
  apply: () => {},
  cleanup: () => {},
}

// === boss_output_drain: 产出削弱 ===

const DRAIN_TOTAL_PENALTY = 0.30 // boss: 总削弱预算 30%
const DRAIN_TOTAL_PENALTY_ELITE = 0.15 // elite: 15%
const DRAINABLE_RESOURCES: ResourceType[] = ['base', 'score', 'multiplier', 'time', 'gold']
let _drainResources: Set<ResourceType> = new Set()
let _drainMult = 1

const bossOutputDrain: BossModifier = {
  id: 'boss_output_drain',
  getParams: (isElite) => {
    const n = isElite ? 3 : 2
    const totalPenalty = isElite ? DRAIN_TOTAL_PENALTY_ELITE : DRAIN_TOTAL_PENALTY
    const perResource = totalPenalty / n
    // 随机选 N 种资源
    const shuffled = [...DRAINABLE_RESOURCES].sort(() => Math.random() - 0.5)
    const resources = shuffled.slice(0, n)
    return { outputDrainMult: 1 - perResource, outputDrainResources: resources }
  },
  apply: () => {
    const params = getActiveParams()
    _drainResources = new Set(params?.outputDrainResources ?? [])
    _drainMult = params?.outputDrainMult ?? 1
  },
  cleanup: () => { _drainResources = new Set(); _drainMult = 1 },
}

/** 获取指定资源的产出削弱倍率（调度器使用） */
export function getOutputDrainMultiplier(resource: ResourceType): number {
  if (!_drainResources.has(resource)) return 1
  const shielded = state.player.relics.has('modifier_shield') ? 1 - (1 - _drainMult) * 0.75 : _drainMult
  return shielded
}

/** 获取当前受削弱的资源列表（UI 用） */
export function getOutputDrainResources(): ResourceType[] {
  return [..._drainResources]
}

// === 修饰器注册表 ===

export const BOSS_MODIFIER_REGISTRY: Record<BossModifierId, BossModifier> = {
  // 进攻类
  boss_fast_time: bossFastTime,
  boss_keystroke_tax: bossKeystrokeTax,
  boss_escalation: bossEscalation,
  boss_frostbite: bossFrostbite,
  boss_mirror: bossMirror,
  // 防守类
  boss_decay: bossDecay,
  boss_cap: bossCap,
  boss_double_target: bossDoubleTarget,
  boss_diminish: bossDiminish,
  boss_score_tax: bossScoreTax,
  boss_output_drain: bossOutputDrain,
  // 干扰类
  boss_fade: bossFade,
  boss_scramble: bossScramble,
  boss_reverse: bossReverse,
  boss_garble: bossGarble,
  boss_decoy: bossDecoy,
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
