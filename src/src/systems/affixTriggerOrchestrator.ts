// ============================================
// 打字肉鸽 - 词条触发迭代调度器
// ============================================
// Story 35.14: 触发管线伪循环重构
// 用 FIFO work queue 替代真递归，O(1) 调用栈深度

import type { ResourceType } from '../core/types'
import {
  triggerAffixSkill,
  MAX_RECURSE_DEPTH,
  MAX_CHAIN_DEPTH,
} from '../data/affixTrigger'
import type {
  TriggerContext,
  TriggerResult,
  Phase6Action,
} from '../data/affixTrigger'

// ===== 工作队列条目 =====

export type TriggerWorkType =
  | 'initial'
  | 'recurse'
  | 'resonance'
  | 'link'
  | 'splash'

export interface TriggerWorkItem {
  /** 目标技能 ID */
  skillId: string
  /** 触发键位 */
  triggerKey: string
  /** 触发类型 */
  type: TriggerWorkType
  /** 递归深度（仅 recurse 类型使用） */
  depth: number
  /** 链式历史（用于循环检测） */
  chainHistory: string[]
}

// ===== 调度器结果 =====

export interface OrchestratorResult {
  /** 所有触发的总产出 */
  totalOutput: number
  /** 执行的触发次数 */
  triggerCount: number
  /** 达到的最大递归/链式深度 */
  maxDepth: number
  /** 是否进入了伪无限模式 */
  enteredPseudoInfinite: boolean
  /** 每次触发的详细结果 */
  triggerResults: TriggerResult[]
  /** 伪无限参与键位 */
  pseudoInfiniteKeys?: string[]
}

// ===== 副作用回调接口 =====

export interface OrchestratorCallbacks {
  /** 资源写入 */
  applyResource?: (resource: ResourceType, amount: number) => void
  /** 反馈弹窗 */
  showFeedback?: (text: string, color: string) => void
  /** 音效 */
  playSound?: (type: string) => void
  /** 进入伪无限模式 */
  enterPseudoInfinite?: (participantKeys: string[]) => void
  /** 吞噬目标 */
  devourTarget?: (targetKey: string) => void
}

// ===== 迭代调度器 =====

/**
 * 词条触发迭代调度器。
 *
 * 用 FIFO work queue 替代真递归：
 * 1. 初始触发入队
 * 2. while queue 非空且未达 MAX_CHAIN_DEPTH:
 *    - dequeue → 深度/循环检查 → triggerAffixSkill → 副作用 → enqueue 后续
 * 3. 返回汇总结果
 *
 * 调用栈深度始终为 O(1)。
 */
export function orchestrateAffixTrigger(
  initialSkillId: string,
  triggerKey: string,
  ctx: TriggerContext,
  callbacks?: OrchestratorCallbacks,
): OrchestratorResult {
  const queue: TriggerWorkItem[] = []
  const results: TriggerResult[] = []
  let totalOutput = 0
  let triggerCount = 0
  let maxDepth = 0
  let enteredPseudoInfinite = false
  let pseudoInfiniteKeys: string[] | undefined

  // 入队初始触发（chainHistory 为空：初始键尚未处理过）
  queue.push({
    skillId: initialSkillId,
    triggerKey,
    type: 'initial',
    depth: 0,
    chainHistory: [],
  })

  // 主循环
  while (queue.length > 0 && triggerCount < MAX_CHAIN_DEPTH) {
    const item = queue.shift()!

    // ── 深度检查：Recurse 类型使用 depth 防护（自触发，不受链检测） ──
    if (item.type === 'recurse' && item.depth >= MAX_RECURSE_DEPTH) {
      continue
    }

    // ── 循环检测：仅对链式类型（resonance/link/splash）检查 ──
    const isChainType = item.type === 'resonance'
      || item.type === 'link' || item.type === 'splash'
    if (isChainType && item.chainHistory.includes(item.triggerKey)) {
      // 检测到循环 → 进入伪无限模式
      // chainHistory 中已包含所有参与键位（item.triggerKey 也在其中）
      if (item.chainHistory.length >= 2) {
        enteredPseudoInfinite = true
        pseudoInfiniteKeys = [...item.chainHistory]
        callbacks?.enterPseudoInfinite?.(pseudoInfiniteKeys)
      }
      continue
    }

    // ── 查找技能和状态 ──
    const skill = ctx.allSkills.get(item.skillId)
    if (!skill) continue

    const runtimeState = ctx.skillStates.get(item.skillId)
    if (!runtimeState) continue

    // ── 更新 depth 跟踪 ──
    maxDepth = Math.max(maxDepth, item.depth)

    // ── 构建本次触发上下文 ──
    const triggerCtx: TriggerContext = {
      ...ctx,
      triggerKey: item.triggerKey,
      transmuteResource: skill.transmuteResource,
    }

    // ── 执行纯计算（triggerAffixSkill 签名不变） ──
    const recurseDepth = item.type === 'recurse' ? item.depth : 0
    const result = triggerAffixSkill(skill, runtimeState, triggerCtx, recurseDepth)

    // ── 同资源衍生增强 ──
    let effectiveOutput = result.output
    // 同资源衍生附魔增强（系统层应用 output × (1 + boost)）
    if (result.phase5?.transmuteSameResourceBoost) {
      effectiveOutput *= (1 + result.phase5.transmuteSameResourceBoost)
    }

    results.push(result)
    totalOutput += effectiveOutput
    triggerCount++

    // ── 副作用 ──
    if (result.phase4) {
      callbacks?.applyResource?.(result.phase4.targetResource, effectiveOutput)
    }

    // 衍生附魔额外资源
    if (result.phase5?.transmuteOutput) {
      callbacks?.applyResource?.(
        result.phase5.transmuteOutput.resource,
        result.phase5.transmuteOutput.amount,
      )
    }

    // 吞噬
    if (result.phase5?.devourTarget) {
      callbacks?.devourTarget?.(result.phase5.devourTarget)
    }

    // ── 入队 Phase 5 后续触发 ──
    // childHistory = 当前项的 history + 当前项自己（"我之前处理过的所有键"）
    const childHistory = [...item.chainHistory, item.triggerKey]

    // Recurse: 重触发自身（不传播 chainHistory，用 depth 防护）
    if (result.phase5?.recurse.shouldRecurse) {
      queue.push({
        skillId: item.skillId,
        triggerKey: item.triggerKey,
        type: 'recurse',
        depth: (item.type === 'recurse' ? item.depth : 0) + 1,
        chainHistory: item.chainHistory,
      })
    }

    // Splash: 溅射邻居
    if (result.phase5?.splashTargets) {
      for (const targetKey of result.phase5.splashTargets) {
        const targetSkillId = ctx.bindings.get(targetKey)
        if (!targetSkillId) continue

        queue.push({
          skillId: targetSkillId,
          triggerKey: targetKey,
          type: 'splash',
          depth: item.depth + 1,
          chainHistory: childHistory,
        })
      }
    }

    // ── 入队 Phase 6 后续触发 ──
    if (result.phase6?.actions) {
      for (const action of result.phase6.actions) {
        enqueuePhase6Action(action, childHistory, ctx, queue)
      }
    }
  }

  return {
    totalOutput,
    triggerCount,
    maxDepth,
    enteredPseudoInfinite,
    triggerResults: results,
    pseudoInfiniteKeys,
  }
}

// ===== Phase 6 入队辅助 =====

function enqueuePhase6Action(
  action: Phase6Action,
  parentChildHistory: string[],
  ctx: TriggerContext,
  queue: TriggerWorkItem[],
): void {
  switch (action.type) {
    case 'resonance': {
      const targetSkillId = ctx.bindings.get(action.neighborKey)
      if (!targetSkillId) return
      queue.push({
        skillId: targetSkillId,
        triggerKey: action.neighborKey,
        type: 'resonance',
        depth: parentChildHistory.length,
        chainHistory: parentChildHistory,
      })
      break
    }
    case 'link': {
      const targetSkillId = ctx.bindings.get(action.neighborKey)
      if (!targetSkillId) return
      queue.push({
        skillId: targetSkillId,
        triggerKey: action.neighborKey,
        type: 'link',
        depth: parentChildHistory.length,
        chainHistory: parentChildHistory,
      })
      break
    }
    // apprentice_neighbor 和 quest_resonance 不触发完整技能，仅状态更新
    case 'apprentice_neighbor':
    case 'quest_resonance':
      // 这些动作在 triggerAffixSkill 内部已处理 runtimeState，无需入队
      break
  }
}
