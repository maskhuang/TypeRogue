// ============================================
// 打字肉鸽 - Boss 修饰器引擎
// ============================================
// Story 18.4: 修饰器生命周期管理 + Boss 关轮换引擎

import { state } from '../core/state'
import {
  BOSS_MODIFIER_REGISTRY,
  setActiveParams,
  getBossModifierMeta,
} from '../data/bossModifiers'
import type {
  BossModifierId,
  BossModifier,
  BossModifierParams,
} from '../data/bossModifiers'

// === 活跃修饰器状态 ===

let activeModifier: { modifier: BossModifier; params: BossModifierParams } | null = null

// === Boss 轮换状态 ===

let bossRotationStart = 0
let bossRotationPhase = -1 // -1 = not rotating, 0=A, 1=B, 2=C
let isRotating = false

// === 修饰器生命周期 ===

/** 应用修饰器（精英关或 Boss 关单阶段使用） */
export function applyModifier(modId: BossModifierId, isElite: boolean): void {
  cleanupModifier()
  const mod = BOSS_MODIFIER_REGISTRY[modId]
  if (!mod) return
  const params = mod.getParams(isElite)
  mod.apply(params)
  activeModifier = { modifier: mod, params }
  setActiveParams(params)
}

/** 清理当前活跃修饰器 */
export function cleanupModifier(): void {
  if (activeModifier) {
    activeModifier.modifier.cleanup()
    activeModifier = null
    setActiveParams(null)
  }
}

/** 每帧更新（由 timer interval 调用） */
export function tickModifier(dt: number): void {
  if (activeModifier?.modifier.onTick) {
    activeModifier.modifier.onTick(dt)
  }
  // Boss 轮换检查
  if (isRotating) {
    checkBossRotation()
  }
}

/** 获取当前活跃修饰器效果参数（供 battle.ts 查询） */
export function getActiveModifierEffect(): BossModifierParams | null {
  return activeModifier ? activeModifier.params : null
}

// === Boss 关轮换引擎 ===

/** 启动 Boss 关 3 阶段轮换（20s 一换） */
export function startBossRotation(): void {
  if (state.bossModifierPool.length < 3) return

  bossRotationStart = Date.now()
  bossRotationPhase = -1
  isRotating = true

  // 立即应用第一个修饰器
  switchToPhase(0)

  // 更新 HUD：显示 Boss 关修饰器信息
  updateBossModifierHUD(state.bossModifierPool[0])
}

/** 停止 Boss 关轮换 */
export function stopBossRotation(): void {
  isRotating = false
  bossRotationPhase = -1
}

/** 检查是否需要切换阶段 */
function checkBossRotation(): void {
  const elapsed = (Date.now() - bossRotationStart) / 1000
  const newPhase = Math.min(Math.floor(elapsed / 20), 2)
  if (newPhase !== bossRotationPhase) {
    switchToPhase(newPhase)
  }
}

/** 切换到指定阶段 */
function switchToPhase(phase: number): void {
  const modId = state.bossModifierPool[phase]
  if (!modId) return

  // 清理旧的修饰器
  cleanupModifier()

  // 应用新的修饰器（Boss 关使用满功率）
  const mod = BOSS_MODIFIER_REGISTRY[modId]
  if (!mod) return
  const params = mod.getParams(false)
  mod.apply(params)
  activeModifier = { modifier: mod, params }
  setActiveParams(params)

  // 阶段切换视觉提示（非首次切换时）
  if (bossRotationPhase >= 0) {
    announceModifierSwitch(modId)
  }

  bossRotationPhase = phase

  // 更新 HUD
  updateBossModifierHUD(modId)
}

/** 更新 Boss 修饰器 HUD 显示 */
function updateBossModifierHUD(modId: BossModifierId): void {
  const modInfo = document.getElementById('modifier-info')
  if (!modInfo) return

  const meta = getBossModifierMeta(modId)
  if (!meta) return

  const iconEl = modInfo.querySelector('.modifier-icon')
  const nameEl = modInfo.querySelector('.modifier-name')
  const hintEl = modInfo.querySelector('.modifier-hint')

  if (iconEl) iconEl.textContent = meta.icon
  if (nameEl) nameEl.textContent = meta.name
  if (hintEl) hintEl.textContent = meta.description

  modInfo.classList.add('visible')
}

/** 修饰器切换视觉提示 */
function announceModifierSwitch(modId: BossModifierId): void {
  const meta = getBossModifierMeta(modId)
  if (!meta) return

  // 闪烁动画
  const modInfo = document.getElementById('modifier-info')
  if (modInfo) {
    modInfo.classList.add('modifier-switch')
    setTimeout(() => modInfo.classList.remove('modifier-switch'), 500)
  }

  // 中央公告
  const container = document.getElementById('game-container')
  if (container) {
    const ann = document.createElement('div')
    ann.className = 'level-announce modifier-announce'
    ann.innerHTML = `${meta.icon} ${meta.name}<br><span class="target-hint">${meta.description}</span>`
    container.appendChild(ann)
    setTimeout(() => ann.remove(), 1500)
  }
}
