// ============================================
// 打字肉鸽 - 键盘多格绑定管理器
// ============================================
// Story 40.3: 键盘多格绑定系统
// Epic 40: 多格技能形状系统
//
// 所有 binding 写入操作（set/delete）统一通过本模块，
// 外部不应直接操作 state.player.bindings。

import { mapShapeToKeys } from '../data/skillShapes'
import { KEYS, PUNCTUATION_KEYS } from '../core/constants'

// ===== Types =====

export interface BindShapeResult {
  success: boolean
  /** 被覆盖而解绑的技能 ID 列表（去重） */
  displacedSkillIds: string[]
}

interface BindingState {
  bindings: Map<string, string>
  affixSkills: Map<string, { shapeId?: string; rotation?: number }>
}

// ===== Core Functions =====

/**
 * 将技能形状绑定到键盘上。
 *
 * @param st 绑定状态（bindings Map + affixSkills Map）
 * @param skillId 要绑定的技能 ID
 * @param anchorKey 锚点键（形状 cells[0] 对应的键）
 * @returns 绑定结果：成功与否 + 被覆盖的技能 ID 列表
 */
export function bindShapeToKeys(
  st: BindingState,
  skillId: string,
  anchorKey: string,
): BindShapeResult {
  const skill = st.affixSkills.get(skillId)
  const shapeId = skill?.shapeId ?? 'monomino'
  const rotation = skill?.rotation ?? 0

  // mapShapeToKeys 使用 KEY_COORDS（小写键），标准化 anchor
  const normalizedAnchor = anchorKey.toLowerCase()

  // 获取形状映射到的键位列表
  const targetKeys = mapShapeToKeys(normalizedAnchor, shapeId, rotation)
  if (!targetKeys) {
    return { success: false, displacedSkillIds: [] }
  }

  // 收集被覆盖的其他技能（去重）
  const displacedSet = new Set<string>()
  for (const key of targetKeys) {
    const existing = st.bindings.get(key)
    if (existing && existing !== skillId) {
      displacedSet.add(existing)
    }
  }
  const displacedSkillIds = [...displacedSet]

  // 先解绑 displaced 技能的所有键位（整个形状全解）
  for (const dId of displacedSkillIds) {
    unbindSkill(st, dId)
  }

  // 先解绑自己可能的旧绑定
  unbindSkill(st, skillId)

  // 原子性设置所有目标键位
  for (const key of targetKeys) {
    st.bindings.set(key, skillId)
  }

  return { success: true, displacedSkillIds }
}

/**
 * 解绑技能的所有占用键位。
 *
 * @returns 释放的键位列表
 */
export function unbindSkill(st: BindingState, skillId: string): string[] {
  const released: string[] = []
  for (const [key, id] of st.bindings) {
    if (id === skillId) {
      released.push(key)
    }
  }
  for (const key of released) {
    st.bindings.delete(key)
  }
  return released
}

/**
 * 解绑单个键位。如果该键属于多格技能，解绑该技能的**所有**键位。
 *
 * @returns 被解绑的 skillId（如有）
 */
export function unbindKey(st: BindingState, key: string): string | undefined {
  const skillId = st.bindings.get(key)
  if (!skillId) return undefined
  unbindSkill(st, skillId)
  return skillId
}

/**
 * 获取技能占据的所有键位。
 */
export function getSkillKeys(st: BindingState, skillId: string): string[] {
  const keys: string[] = []
  for (const [key, id] of st.bindings) {
    if (id === skillId) {
      keys.push(key)
    }
  }
  return keys
}

/**
 * 获取技能的锚点键（第一个绑定键）。
 */
export function getSkillAnchorKey(st: BindingState, skillId: string): string | undefined {
  for (const [key, id] of st.bindings) {
    if (id === skillId) {
      return key
    }
  }
  return undefined
}

/**
 * 检查键位对于指定技能是否可用（空闲或已被自己占用）。
 */
export function isKeyAvailableForSkill(
  st: BindingState,
  key: string,
  skillId: string,
): boolean {
  const existing = st.bindings.get(key)
  return !existing || existing === skillId
}

// ===== Auto-bind helper =====

/**
 * 为新技能寻找空闲位置并自动绑定（购买时使用）。
 *
 * - monomino：找第一个空闲且频率 ≥ 5 的键
 * - 多格技能：遍历候选锚点键，找到第一个能放下且不覆盖已有技能的位置
 *
 * @param letterFreqs 字母频率表（用于过滤低频键）
 * @returns 绑定结果，若无空闲位返回 null
 */
export function autoBindSkill(
  st: BindingState,
  skillId: string,
  letterFreqs?: Map<string, number>,
): BindShapeResult | null {
  const skill = st.affixSkills.get(skillId)
  const shapeId = skill?.shapeId ?? 'monomino'
  const rotation = skill?.rotation ?? 0

  // 遍历所有键位作为候选锚点
  for (const anchorKey of KEYS) {
    // 标点键不参与自动绑定
    if (PUNCTUATION_KEYS.includes(anchorKey)) continue
    // 字频过低的键跳过
    if (letterFreqs && (letterFreqs.get(anchorKey) ?? 0) < 5) continue

    // 获取形状映射到的键位列表
    const targetKeys = mapShapeToKeys(anchorKey, shapeId, rotation)
    if (!targetKeys) continue

    // 检查所有目标键位都空闲
    const allFree = targetKeys.every(k => !st.bindings.has(k))
    if (!allFree) continue

    // 对于多格技能，也检查所有键的字频
    if (letterFreqs && targetKeys.some(k => (letterFreqs.get(k) ?? 0) < 5)) continue

    // 找到空闲位置，执行绑定
    return bindShapeToKeys(st, skillId, anchorKey)
  }

  return null
}

// ===== Seal helpers =====

/**
 * 封印技能的所有键位（rest stage 诅咒事件）。
 * 方案 A：封印整个形状。
 *
 * @returns 封印的键位列表和 skillId
 */
export function sealSkillKeys(
  st: BindingState,
  key: string,
): { skillId: string; keys: string[] } | null {
  const skillId = st.bindings.get(key)
  if (!skillId) return null

  const keys = unbindSkill(st, skillId)
  return { skillId, keys }
}

/**
 * 恢复封印的技能绑定。
 * 仅当所有键位空闲时恢复完整形状。
 */
export function restoreSealedSkill(
  st: BindingState,
  skillId: string,
  sealedKeys: string[],
): boolean {
  // 检查所有封印键位是否空闲
  for (const key of sealedKeys) {
    if (st.bindings.has(key)) return false
  }
  // 恢复绑定
  for (const key of sealedKeys) {
    st.bindings.set(key, skillId)
  }
  return true
}

// ===== Utility: get BindingState from different state shapes =====

/**
 * 从全局 GameState 构造 BindingState（便捷适配器）。
 * 返回的对象引用原始 Map，修改直接生效。
 */
export function getBindingState(state: {
  player: { bindings: Map<string, string> }
  affixSkills: Map<string, { shapeId?: string; rotation?: number }>
}): BindingState {
  return {
    bindings: state.player.bindings,
    affixSkills: state.affixSkills,
  }
}

/**
 * 从 RunStateData 构造 BindingState。
 * RunStateData 的 bindings 和 affixSkills 在同一层级。
 */
export function getRunStateBindingState(data: {
  bindings: Map<string, string>
  affixSkills: Map<string, { shapeId?: string; rotation?: number }>
}): BindingState {
  return {
    bindings: data.bindings,
    affixSkills: data.affixSkills,
  }
}
