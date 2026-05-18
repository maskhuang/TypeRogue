// ============================================
// 打字肉鸽 - 新 Affix 系统 · Instance State Registry
// ============================================
// K5 决议：单独 Map<instanceId, AffixV2RuntimeState>。
// 沿用现 SkillRuntimeState 模式——state 与 schema 分离，battle end 一行 clear。

import type { AuraModifier, TargetSelector, StatusKeyword } from '../data/affixV2Trigger'
import { state } from '../core/state'
import { eventBus } from '../core/events/EventBus'

// ============================================
// AffixV2 实例运行时 state
// ============================================

export interface AffixV2RuntimeState {
  /** 关内成长累积 base（add kind · 单位：ratio × Lv1_base 已计算后的绝对值）*/
  cumulativeBaseAdd: number
  /** 关内成长累积 factor（multiply kind · factor delta 已累加；factor = 1 + cumulativeFactorAdd）*/
  cumulativeFactorAdd: number
  /** 当前 stack 计数（stack_inc / stack_release 用）*/
  stacks: number
  /** 本 affix 自身已见的按键数（every_n_keys / affix_key_count_gte 用）*/
  affixKeyCount: number
  /** 上次 fire 时间戳（fire_target 限流、节奏分析 用）*/
  lastFireTimestamp: number
}

function freshState(): AffixV2RuntimeState {
  return {
    cumulativeBaseAdd: 0,
    cumulativeFactorAdd: 0,
    stacks: 0,
    affixKeyCount: 0,
    lastFireTimestamp: 0,
  }
}

// ============================================
// State Registry
// ============================================

const _stateMap: Map<string, AffixV2RuntimeState> = new Map()

/** 获取 / 自动初始化 instance state */
export function getInstanceState(instanceId: string): AffixV2RuntimeState {
  let s = _stateMap.get(instanceId)
  if (!s) {
    s = freshState()
    _stateMap.set(instanceId, s)
  }
  return s
}

/** 仅查询，不自动创建（用于只读判断） */
export function peekInstanceState(instanceId: string): AffixV2RuntimeState | undefined {
  return _stateMap.get(instanceId)
}

/** 清理指定 instance state（词条被卖出/移除时） */
export function clearInstanceState(instanceId: string): void {
  _stateMap.delete(instanceId)
}

/** 全部清空（战斗结束 · K3 决议 + 关内成长 reset）*/
export function clearAllStates(): void {
  _stateMap.clear()
}

/** 仅清"关内"字段（关内成长 + stacks），保留可能的永久字段（暂无）*/
export function resetFightState(instanceId: string): void {
  const s = _stateMap.get(instanceId)
  if (!s) return
  s.cumulativeBaseAdd = 0
  s.cumulativeFactorAdd = 0
  s.stacks = 0
}

/** 全 instance 战内 state 重置（battle end hook） */
export function resetAllFightStates(): void {
  for (const s of _stateMap.values()) {
    s.cumulativeBaseAdd = 0
    s.cumulativeFactorAdd = 0
    s.stacks = 0
  }
}

/** 测试用 · 列出所有已注册的 instance id */
export function listAllStateIds(): readonly string[] {
  return Array.from(_stateMap.keys())
}

// ============================================
// 学徒附魔进度 · 跨战永久（独立存储，避免 resetFightState 误清）
// ============================================
// 设计：监听本 instance 的 trigger 命中次数 → 达阈值 → 宿主 skill level++
//   阈值序列 3 → 6 → 12（× 2），cap 在 skill.level=4（V2 baseValues 表只 4 级有效）
//   生命周期：随 V2 instance 同生灭——unequip 清，新 run / clearAllEquipped 清；battle reset 不动

interface ApprenticeProgress {
  progress: number
}

const _apprenticeProgress: Map<string, ApprenticeProgress> = new Map()

export function getApprenticeProgress(instanceId: string): ApprenticeProgress {
  let p = _apprenticeProgress.get(instanceId)
  if (!p) {
    p = { progress: 0 }
    _apprenticeProgress.set(instanceId, p)
  }
  return p
}

export function peekApprenticeProgress(instanceId: string): ApprenticeProgress | undefined {
  return _apprenticeProgress.get(instanceId)
}

export function clearApprenticeProgress(instanceId: string): void {
  _apprenticeProgress.delete(instanceId)
}

export function clearAllApprenticeProgress(): void {
  _apprenticeProgress.clear()
}

// ============================================
// Aura store · K3 仅 'fight'，battle end 自动清
// ============================================

interface AuraEntry {
  readonly sourceInstanceId: string
  readonly selector: TargetSelector
  readonly modifier: AuraModifier
}

const _auras: AuraEntry[] = []

/** 添加 aura（apply_aura 调用） */
export function addAura(sourceInstanceId: string, selector: TargetSelector, modifier: AuraModifier): void {
  _auras.push({ sourceInstanceId, selector, modifier })
}

/** 列出全部活跃 aura（resolver 计算 buff 用） */
export function listActiveAuras(): readonly AuraEntry[] {
  return _auras
}

/** 战斗结束 / aura 来源被移除时清 */
export function clearAuras(): void {
  _auras.length = 0
}

/** 移除来自特定来源的 aura（词条被卖出时） */
export function clearAurasFromSource(sourceInstanceId: string): void {
  for (let i = _auras.length - 1; i >= 0; i--) {
    if (_auras[i].sourceInstanceId === sourceInstanceId) _auras.splice(i, 1)
  }
}

// ============================================
// Status store · K4 D' 占位 stub
// ============================================
// 词表未定，运行时不做实质处理。

interface StatusEntry {
  readonly target: TargetSelector
  readonly status: StatusKeyword
  readonly amount: number
  readonly duration?: number
}

const _statuses: StatusEntry[] = []

export function addStatus(target: TargetSelector, status: StatusKeyword, amount: number, duration?: number): void {
  _statuses.push({ target, status, amount, duration })
}

export function listStatuses(): readonly StatusEntry[] {
  return _statuses
}

export function clearStatuses(): void {
  _statuses.length = 0
}

// ============================================
// fire_target rate limiter（K1 决议：4 fires/sec/source）
// ============================================

import { FIRE_TARGET_RATE_LIMIT_PER_SEC } from '../data/affixV2Trigger'

interface RateLimitWindow {
  windowStartMs: number
  fireCount: number
}

const _rateLimits: Map<string, RateLimitWindow> = new Map()

/**
 * 尝试为 sourceInstanceId 申请一次 fire_target 配额。
 * @returns true 已放行 · false 已限流
 */
export function tryFireTargetQuota(sourceInstanceId: string, nowMs: number): boolean {
  const window = _rateLimits.get(sourceInstanceId)
  if (!window || nowMs - window.windowStartMs >= 1000) {
    // 新窗口
    _rateLimits.set(sourceInstanceId, { windowStartMs: nowMs, fireCount: 1 })
    return true
  }
  if (window.fireCount >= FIRE_TARGET_RATE_LIMIT_PER_SEC) return false
  window.fireCount++
  return true
}

/**
 * 查询：还需等多少 ms 才能再发一次 fire_target（0 = 现在就可以）
 * 用于 setTimeout 推迟超额 dispatch，让 V2 fire_target 循环按 4/sec 限速持续运行
 */
export function getFireTargetWaitMs(sourceInstanceId: string, nowMs: number): number {
  const window = _rateLimits.get(sourceInstanceId)
  if (!window) return 0
  if (nowMs - window.windowStartMs >= 1000) return 0
  if (window.fireCount < FIRE_TARGET_RATE_LIMIT_PER_SEC) return 0
  // 窗口未到期且配额满 → 等到窗口结束
  return Math.max(1, 1000 - (nowMs - window.windowStartMs))
}

export function clearRateLimits(): void {
  _rateLimits.clear()
}

// ============================================
// Per-skill aggregate state · scope-broadcast add/multiply 用
// 当 EffectSpec.add/multiply 带 selector 时，写到对应 target skill 的 aggregate；
// emit base output 时 (Lv1 + ΣinstanceCumBase + skillCumBase) × (1 + ΣinstanceCumFactor + skillCumFactor)
// ============================================

const _skillCumBase: Map<string, number> = new Map()
const _skillCumFactor: Map<string, number> = new Map()

export function addSkillCumBase(skillId: string, delta: number): void {
  _skillCumBase.set(skillId, (_skillCumBase.get(skillId) ?? 0) + delta)
}

export function addSkillCumFactor(skillId: string, delta: number): void {
  _skillCumFactor.set(skillId, (_skillCumFactor.get(skillId) ?? 0) + delta)
}

export function getSkillCumBase(skillId: string): number {
  return _skillCumBase.get(skillId) ?? 0
}

export function getSkillCumFactor(skillId: string): number {
  return _skillCumFactor.get(skillId) ?? 0
}

export function clearSkillAggregates(): void {
  _skillCumBase.clear()
  _skillCumFactor.clear()
}

// ============================================
// 极速层 · per-skill 累加 float · consume floor(1) per key press
// ============================================

const _hasteBySkill: Map<string, number> = new Map()

export function addHaste(skillId: string, amount: number): void {
  // perpetual_engine（极速系遗物）：跨关保留极速，代价是每次获得的极速量 ×0.5
  const mult = state.player?.relics?.has('perpetual_engine') ? 0.5 : 1
  _hasteBySkill.set(skillId, (_hasteBySkill.get(skillId) ?? 0) + amount * mult)
}

/** 消耗一层极速 · floor(haste) >= 1 时 -1 并返 true；否则返 false */
export function consumeHasteOne(skillId: string): boolean {
  const cur = _hasteBySkill.get(skillId) ?? 0
  if (cur < 1) return false
  _hasteBySkill.set(skillId, cur - 1)
  return true
}

/** UI 查询 · 显示当前 floor 极速层数 */
export function getHaste(skillId: string): number {
  return Math.floor(_hasteBySkill.get(skillId) ?? 0)
}

/** 清空指定 skill 的全部极速 · 返回清空前的 floor 层数（surge 遗物用）*/
export function clearHasteForSkill(skillId: string): number {
  const cleared = Math.floor(_hasteBySkill.get(skillId) ?? 0)
  _hasteBySkill.delete(skillId)
  return cleared
}

export function clearAllHaste(): void {
  // perpetual_engine（极速系遗物）：极速层数关末不清零，跨关累积
  if (state.player?.relics?.has('perpetual_engine')) return
  _hasteBySkill.clear()
}

/** 极速施加统一入口 · addHaste + emit haste:granted（UI 反馈 / on_haste_granted / 极速系遗物）
 *  affixV2Effect.grant_haste 与极速系遗物（drum_pass / neighbor_watch 等）均走此入口 */
export function grantHaste(skillId: string, amount: number, sourceInstanceId: string): void {
  addHaste(skillId, amount)
  eventBus.emit('haste:granted', { skillId, amount, sourceInstanceId })
}

// ============================================
// 一键全 reset（battle end / cycle 切换）
// ============================================

export function resetAllAffixV2State(): void {
  // K5 决议：单独 registry 的好处 — 一行清空
  clearAllStates()
  clearAuras()
  clearStatuses()
  clearRateLimits()
  clearSkillAggregates()
  clearAllHaste()
}
