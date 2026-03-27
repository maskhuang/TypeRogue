// ============================================
// 打字肉鸽 - Boss 修饰器引擎
// ============================================
// Story 18.4: 修饰器生命周期管理
// Story 25.3: 多修饰器同时激活（跨周目叠加 + 精英/Boss 共存）
// Story 42.6: 移除 Boss 关轮换引擎（改为单修饰器固定制）

import {
  BOSS_MODIFIER_REGISTRY,
  setActiveParams,
  getActiveParams,
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
  isPermanent: boolean // true = 来自 state.activeModifiers（跨周目永久），false = Boss 关/精英关临时
}

// === 活跃修饰器状态（支持多个同时激活） ===

let activeModifierInstances: ModifierInstance[] = []

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

/** 清理临时修饰器（关卡结束时保留永久修饰器） */
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
