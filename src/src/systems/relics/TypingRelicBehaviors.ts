// ============================================
// 打字肉鸽 - 打字/输入系统遗物行为 (Story 36.2)
// ============================================

import { state } from '../../core/state'
import { registerRelicBehavior } from './RelicPipeline'
import { eventBus } from '../../core/events/EventBus'
import { unbindSkill, getBindingState } from '../bindingManager'
import { getRecycleSellMultiplier } from './ShopRelicBehaviors'

// === 模块级状态（关级别，不需持久化） ===

/** 本关已出现过的单词（小助手用） */
let seenWords: Set<string> = new Set()

/** 上个词的用时（秒），减速津贴/加速奖金用 */
let lastWordElapsed = -1

// === 太鼓节拍系统状态 ===

interface TaikoBall { id: number; startTime: number; duration: number }
let taikoBalls: TaikoBall[] = []
let taikoSpeed = 1500          // ms, 小球移动时间
let recentKeyTimes: number[] = []
let taikoSpawnTimer: ReturnType<typeof setTimeout> | null = null
let nextBallId = 0

const TAIKO_HIT_WINDOW = 150   // ms, 判定窗口
const TAIKO_BONUS = 0.30
const SPAWN_MIN = 400           // ms
const SPAWN_MAX = 1200          // ms

/**
 * 重置关级别状态 — 在 startLevel() 中调用
 */
export function resetTypingRelicState(): void {
  seenWords.clear()
  lastWordElapsed = -1
  resetTaikoState()
}

/**
 * 记录当前单词到已见列表 — 在 setWord() 中调用
 */
export function trackWord(word: string): void {
  seenWords.add(word.toUpperCase())
}

/**
 * 检查单词是否为重复词（已出现过）
 */
export function isRepeatWord(word: string): boolean {
  return seenWords.has(word.toUpperCase())
}

// === 小助手 Tab 自动补全检查 ===

/**
 * 检查是否可以 Tab 自动补全
 * @returns true 如果当前词可以自动补全（重复词 + 已打完首字母）
 */
export function canAutocomplete(): boolean {
  if (!state.player.relics.has('little_helper')) return false
  if (state.player.index < 1) return false // 还没打完首字母
  return isRepeatWord(state.player.word)
}

// === 减速津贴 + 加速奖金（在 completeWord 中调用） ===

/**
 * 检查减速/加速遗物
 * @param wordElapsed 当前词用时（秒）
 * @returns 时间加成和香蕉加成
 */
export function checkSpeedRelics(wordElapsed: number): { timeBonus: number; goldBonus: number } {
  let timeBonus = 0, goldBonus = 0
  if (lastWordElapsed >= 0) {
    if (state.player.relics.has('decelerate_reward') && wordElapsed > lastWordElapsed) timeBonus = 0.5
    if (state.player.relics.has('accelerate_reward') && wordElapsed < lastWordElapsed) goldBonus = 2
  }
  lastWordElapsed = wordElapsed
  return { timeBonus, goldBonus }
}

// === 太鼓节拍系统（rhythm_adapt 重做） ===

/**
 * 判定点固定在最左端
 */
function getTaikoJudgeLeft(): number {
  return 0
}

/**
 * 更新判定点位置（每次按键后调用）
 */
export function updateTaikoJudge(): void {
  if (typeof document === 'undefined') return
  if (!state.player.relics.has('rhythm_adapt')) return
  const judge = document.querySelector('.taiko-judge') as HTMLElement
  if (judge) judge.style.left = `${getTaikoJudgeLeft()}px`
}

/**
 * 记录击键时间，动态调整小球速度
 */
export function recordKeypressForTaiko(): void {
  const now = performance.now()
  recentKeyTimes.push(now)
  // 只保留最近 10 次击键
  if (recentKeyTimes.length > 10) recentKeyTimes.shift()
  // 根据平均击键间隔调整小球移动速度
  if (recentKeyTimes.length >= 3) {
    let totalInterval = 0
    for (let i = 1; i < recentKeyTimes.length; i++) {
      totalInterval += recentKeyTimes[i] - recentKeyTimes[i - 1]
    }
    const avgInterval = totalInterval / (recentKeyTimes.length - 1)
    // 小球移动时间 = 平均间隔 × 5，限制在 800~2500ms
    taikoSpeed = Math.max(800, Math.min(2500, avgInterval * 5))
  }
}

/** 上次 checkTaikoHit 的命中加成（供 skills.ts 读取） */
let _lastTaikoBonus = 0

/**
 * 获取上次 checkTaikoHit 的命中加成（0 或 TAIKO_BONUS）
 * 由 skills.ts 在 triggerSkill 中读取
 */
export function getTaikoBonus(): number {
  return _lastTaikoBonus
}

/**
 * 检查当前是否命中节拍球
 * @returns bonus 倍率 (1.0 无命中, 1.0 + TAIKO_BONUS 命中)
 */
export function checkTaikoHit(): number {
  if (!state.player.relics.has('rhythm_adapt')) { _lastTaikoBonus = 0; return 1 }
  const now = performance.now()
  for (let i = 0; i < taikoBalls.length; i++) {
    const ball = taikoBalls[i]
    const elapsed = now - ball.startTime
    const arrivalTime = ball.duration
    // 判定窗口：球到达判定点前后 TAIKO_HIT_WINDOW ms
    if (Math.abs(elapsed - arrivalTime) <= TAIKO_HIT_WINDOW) {
      // 命中 — 移除该球
      taikoBalls.splice(i, 1)
      // 视觉反馈：标记命中
      markTaikoBallHit(ball.id)
      _lastTaikoBonus = TAIKO_BONUS
      return 1 + TAIKO_BONUS
    }
  }
  _lastTaikoBonus = 0
  return 1
}

/**
 * 标记某个球被命中（用于 DOM 动画）
 */
function markTaikoBallHit(ballId: number): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(`taiko-ball-${ballId}`)
  if (el) {
    el.classList.add('hit')
    setTimeout(() => el.remove(), 200)
  }
  // 闪烁判定点
  const judge = document.querySelector('.taiko-judge') as HTMLElement
  if (judge) {
    judge.classList.add('flash')
    setTimeout(() => judge.classList.remove('flash'), 150)
  }
}

/**
 * 生成一个小球并定时生成下一个
 */
export function startTaikoSpawner(): void {
  if (!state.player.relics.has('rhythm_adapt')) return
  if (typeof document === 'undefined') return
  // 显示太鼓条
  const bar = document.getElementById('taiko-bar')
  if (bar) bar.classList.add('active')

  function spawnBall(): void {
    const id = nextBallId++
    const duration = taikoSpeed
    const ball: TaikoBall = { id, startTime: performance.now(), duration }
    taikoBalls.push(ball)

    // 创建 DOM 元素
    if (typeof document !== 'undefined') {
      const bar = document.getElementById('taiko-bar')
      if (bar) {
        // 球从右端出发，移动到左端判定点
        const targetLeft = 0
        const barWidth = bar.offsetWidth
        const startLeft = barWidth - 10
        const el = document.createElement('div')
        el.className = 'taiko-ball'
        el.id = `taiko-ball-${id}`
        el.style.setProperty('--duration', `${duration}ms`)
        el.style.setProperty('--start-left', `${startLeft}px`)
        el.style.setProperty('--target-left', `${targetLeft}px`)
        bar.appendChild(el)
        // 球到达终点后自动移除
        setTimeout(() => {
          el.remove()
          // 从数据中也移除
          const idx = taikoBalls.findIndex(b => b.id === id)
          if (idx >= 0) taikoBalls.splice(idx, 1)
        }, duration + 50)
      }
    }

    // 随机间隔后生成下一个
    const nextDelay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
    taikoSpawnTimer = setTimeout(spawnBall, nextDelay)
  }

  // 首个球延迟生成
  const firstDelay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
  taikoSpawnTimer = setTimeout(spawnBall, firstDelay)
}

/**
 * 停止太鼓生成器
 */
export function stopTaikoSpawner(): void {
  if (taikoSpawnTimer !== null) {
    clearTimeout(taikoSpawnTimer)
    taikoSpawnTimer = null
  }
  // 隐藏太鼓条
  if (typeof document !== 'undefined') {
    const bar = document.getElementById('taiko-bar')
    if (bar) {
      bar.classList.remove('active')
      // 清除所有球 DOM
      bar.querySelectorAll('.taiko-ball').forEach(el => el.remove())
    }
  }
}

/**
 * 重置太鼓状态
 */
export function resetTaikoState(): void {
  stopTaikoSpawner()
  taikoBalls = []
  taikoSpeed = 1500
  recentKeyTimes = []
  nextBallId = 0
}

// === 回归基本功检查（得分×10，禁止装备技能） ===

/**
 * 检查是否持有回归基本功遗物
 * @returns true 如果持有回归基本功
 */
export function hasGlassCannon(): boolean {
  return state.player.relics.has('glass_cannon_v2')
}

// === 注册所有行为 ===

/**
 * 初始化打字子系统遗物行为注册
 * 在应用启动时调用一次
 */
export function initTypingRelicBehaviors(): void {
  registerRelicBehavior('decelerate_reward', (_relicId, _context) => {
    // 实际逻辑在 checkSpeedRelics() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('accelerate_reward', (_relicId, _context) => {
    // 实际逻辑在 checkSpeedRelics() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('autocomplete', (_relicId, _context) => {
    // 小助手的实际逻辑在 canAutocomplete() 中，由 battle.ts 直接调用
  })

  registerRelicBehavior('rhythm_adapt', (_relicId, _context) => {
    // 节奏适应的实际逻辑在太鼓系统函数中，由 battle.ts 直接调用
  })

  registerRelicBehavior('glass_cannon', (_relicId, _context) => {
    // 回归基本功：score×10 在 battle.ts completeWord() 中直接处理
    // 获取时卖出所有技能 + 禁止装备 在 relic:acquired 事件中处理
  })

  // 回归基本功：获取时卖出所有已有技能并回收香蕉
  eventBus.on('relic:acquired', ({ relicId }) => {
    if (relicId !== 'glass_cannon_v2') return
    const bs = getBindingState(state)
    const sellMult = getRecycleSellMultiplier()
    let totalGold = 0

    // 遍历所有技能，累加回收香蕉
    for (const [skillId, data] of state.player.skills) {
      const sellPrice = Math.floor((data.purchasePrice || 15) * sellMult)
      totalGold += sellPrice
      unbindSkill(bs, skillId)
    }

    // 清空技能相关数据
    state.affixSkills.clear()
    state.affixSkillStates.clear()
    state.player.skills.clear()
    state.player.bindings.clear()

    // 回收香蕉
    if (totalGold > 0) {
      state.player.gold += totalGold
    }
  })
}
