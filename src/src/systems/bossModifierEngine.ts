// ============================================
// 打字肉鸽 - Boss 修饰器引擎
// ============================================
// Story 18.4: 修饰器生命周期管理 + Boss 关轮换引擎
// Story 25.3: 多修饰器同时激活（跨周目叠加 + 精英/Boss 共存）

import { state } from '../core/state'
import {
  BOSS_MODIFIER_REGISTRY,
  setActiveParams,
  getActiveParams,
  getBossModifierMeta,
} from '../data/bossModifiers'
import type {
  BossModifierId,
  BossModifier,
  BossModifierParams,
} from '../data/bossModifiers'

// === 修饰器实例 ===

interface ModifierInstance {
  modId: BossModifierId
  modifier: BossModifier
  params: BossModifierParams
  isPermanent: boolean // true = 来自 state.activeModifiers（跨周目永久），false = 精英/Boss 轮换临时
}

// === 活跃修饰器状态（支持多个同时激活） ===

let activeModifierInstances: ModifierInstance[] = []

// === Boss 轮换状态 ===

let bossRotationStart = 0
let bossRotationPhase = -1 // -1 = not rotating, 0=A, 1=B, 2=C
let isRotating = false

// === 修饰器生命周期 ===

/** 重新计算合并参数并写入 activeParams */
function rebuildActiveParams(): void {
  if (activeModifierInstances.length === 0) {
    setActiveParams(null)
    return
  }
  // 每个修饰器类型的参数键天然不重叠（候选排除保证不重复），直接 Object.assign
  const merged: BossModifierParams = {}
  for (const inst of activeModifierInstances) {
    Object.assign(merged, inst.params)
  }
  setActiveParams(merged)
}

/** 应用修饰器（追加到活跃列表，不替换） */
export function applyModifier(modId: BossModifierId, isElite: boolean, isPermanent = false): void {
  const mod = BOSS_MODIFIER_REGISTRY[modId]
  if (!mod) return
  const params = mod.getParams(isElite)
  mod.apply(params)
  activeModifierInstances.push({ modId, modifier: mod, params, isPermanent })
  rebuildActiveParams()
}

/** 清理所有活跃修饰器（关卡结束时调用） */
export function cleanupModifier(): void {
  for (const inst of activeModifierInstances) {
    inst.modifier.cleanup()
  }
  activeModifierInstances = []
  setActiveParams(null)
}

/** 清理临时修饰器（Boss 轮换切换时调用，保留永久修饰器） */
export function cleanupTemporaryModifiers(): void {
  const permanent: ModifierInstance[] = []
  for (const inst of activeModifierInstances) {
    if (inst.isPermanent) {
      permanent.push(inst)
    } else {
      inst.modifier.cleanup()
    }
  }
  activeModifierInstances = permanent
  rebuildActiveParams()
}

/** 每帧更新（由 timer interval 调用） */
export function tickModifier(dt: number): void {
  for (const inst of activeModifierInstances) {
    if (inst.modifier.onTick) {
      inst.modifier.onTick(dt)
    }
  }
  // Boss 轮换检查
  if (isRotating) {
    checkBossRotation()
  }
}

/** 获取当前活跃修饰器效果参数（供测试查询） */
export function getActiveModifierEffect(): BossModifierParams | null {
  return getActiveParams()
}

/** 检查某个修饰器是否已在活跃列表中（用于精英关去重） */
export function isModifierActive(modId: BossModifierId): boolean {
  return activeModifierInstances.some(inst => inst.modId === modId)
}

/** 获取当前活跃修饰器实例列表（只读引用） */
export function getActiveInstances(): readonly ModifierInstance[] {
  return activeModifierInstances
}

/** 暴露 rebuildActiveParams 供外部调用（修饰器反转修改 params 后重建合并参数） */
export function forceRebuildParams(): void {
  rebuildActiveParams()
}

/** 替换一个临时修饰器（混沌轮盘用）：cleanup 旧修饰器 → 移除 → 应用新修饰器 → rebuild */
export function replaceTemporaryModifier(oldModId: BossModifierId, newModId: BossModifierId): boolean {
  const idx = activeModifierInstances.findIndex(inst => inst.modId === oldModId && !inst.isPermanent)
  if (idx < 0) return false
  const old = activeModifierInstances[idx]
  old.modifier.cleanup()
  activeModifierInstances.splice(idx, 1)
  applyModifier(newModId, false, false)
  return true
}

/** 撤销最后一个临时修饰器（修饰器屏障用） */
export function undoLastTemporaryModifier(): boolean {
  for (let i = activeModifierInstances.length - 1; i >= 0; i--) {
    if (!activeModifierInstances[i].isPermanent) {
      activeModifierInstances[i].modifier.cleanup()
      activeModifierInstances.splice(i, 1)
      rebuildActiveParams()
      return true
    }
  }
  return false
}

export type { ModifierInstance }

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

/** 切换到指定阶段（清理临时修饰器，保留永久修饰器） */
function switchToPhase(phase: number): void {
  const modId = state.bossModifierPool[phase]
  if (!modId) return

  // 清理旧的临时修饰器（保留永久修饰器）
  cleanupTemporaryModifiers()

  // 跳过已在永久修饰器中的（永久版已全力运行，不重复应用）
  if (!isModifierActive(modId)) {
    applyModifier(modId, false, false)
  }

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
