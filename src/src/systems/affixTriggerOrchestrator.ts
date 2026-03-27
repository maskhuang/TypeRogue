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
  applyApprenticeAffixGrowth,
  getClassResources,
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
  | 'conduit'
  | 'outcast_echo'

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
  /** Story 41-3: 质变溅射 — 允许被溅射技能的 Splash 词条再触发一跳 */
  chainSplash?: boolean
  /** 41-4: 质变 Resonance/Link 产出加成 */
  transformedBoost?: number
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
  applyResource?: (resource: ResourceType, amount: number, isMultiplyOp?: boolean) => void
  /** 反馈弹窗 */
  showFeedback?: (text: string, color: string) => void
  /** 音效 */
  playSound?: (type: string) => void
  /** 进入伪无限模式 */
  enterPseudoInfinite?: (participantKeys: string[]) => void
  /** 吞噬目标 */
  devourTarget?: (targetKey: string) => void
  /** Story 41-5: Charge 质变 — 满蓄力释放自动完成当前单词 */
  chargeAutoComplete?: () => void
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
  let devourConsumed = false  // 41-4: 质变Void吞噬每调度周期限一次

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
      || item.type === 'link' || item.type === 'splash' || item.type === 'conduit'
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
    // Story 40.9: 从 bindings 反查连锁目标技能的实际占据键位
    const chainedOccupiedKeys = [...ctx.bindings]
      .filter(([_, sid]) => sid === item.skillId)
      .map(([k]) => k)
    const triggerCtx: TriggerContext = {
      ...ctx,
      triggerKey: item.triggerKey,
      occupiedKeys: chainedOccupiedKeys.length > 0 ? chainedOccupiedKeys : [item.triggerKey],
      transmuteResource: skill.transmuteResource,
      // Story 41-3: splash 项默认禁用链式词条，chainSplash 允许一跳
      ...(item.type === 'splash' && !item.chainSplash ? { chainAffixesDisabled: true } : {}),
      // 41-4: outcast_echo 禁用链式词条防止循环
      ...(item.type === 'outcast_echo' ? { chainAffixesDisabled: true } : {}),
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
    // 41-4: 质变 Resonance/Link 产出加成
    if (item.transformedBoost) {
      effectiveOutput *= (1 + item.transformedBoost)
    }

    results.push(result)
    totalOutput += effectiveOutput
    triggerCount++

    // ── 悟道·词条：跨技能成长通知 ──
    const triggeredAffixTypes = skill.affixes.map(a => a.type)
    if (triggeredAffixTypes.length > 0) {
      applyApprenticeAffixGrowth(
        item.skillId,
        triggeredAffixTypes,
        ctx.allSkills,
        ctx.skillStates,
        ctx.apprenticeGrowthMultiplier,
      )
    }

    // ── 副作用 ──
    if (result.phase4) {
      if (result.phase4.allResources) {
        // 质变Rainbow：等比分摊到所有可用资源
        const pool = getClassResources(ctx.playerClass)
        const share = effectiveOutput / pool.length
        for (const r of pool) {
          callbacks?.applyResource?.(r, share, result.isMultiplyOp)
        }
      } else {
        callbacks?.applyResource?.(result.phase4.targetResource, effectiveOutput, result.isMultiplyOp)
      }
    }

    // Convert质变反向产出
    if (result.convertReverseOutputs) {
      for (const ro of result.convertReverseOutputs) {
        callbacks?.applyResource?.(ro.resource, ro.amount, false)
      }
    }

    // 衍生附魔额外资源：始终加算（不受 MultiplyOperator 影响）
    if (result.phase5?.transmuteOutput) {
      callbacks?.applyResource?.(
        result.phase5.transmuteOutput.resource,
        result.phase5.transmuteOutput.amount,
        false,
      )
    }

    // 吞噬（41-4: 质变Void每次触发都产出devourTarget，调度层限一次）
    if (result.phase5?.devourTarget && !devourConsumed) {
      callbacks?.devourTarget?.(result.phase5.devourTarget)
      devourConsumed = true
    }

    // Story 41-5: Charge 质变 — 满蓄力自动完成当前单词（仅初始触发，不对链式传播）
    if (result.chargeAutoComplete && item.type === 'initial') {
      callbacks?.chargeAutoComplete?.()
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
      // Story 41-3: 质变溅射 — 首跳传播 chainSplash，后续强制 false（仅一跳）
      const propagateChainSplash = item.type !== 'splash'
        ? (result.phase5.chainSplash ?? false)
        : false
      for (const targetKey of result.phase5.splashTargets) {
        const targetSkillId = ctx.bindings.get(targetKey)
        if (!targetSkillId) continue

        queue.push({
          skillId: targetSkillId,
          triggerKey: targetKey,
          type: 'splash',
          depth: item.depth + 1,
          chainHistory: childHistory,
          chainSplash: propagateChainSplash,
        })
      }
    }

    // Outcast echo: 首尾呼应 — 对端技能触发（chainAffixesDisabled 防循环）
    if (result.phase5?.outcastEchoTarget) {
      const echoSkillId = ctx.bindings.get(result.phase5.outcastEchoTarget)
      if (echoSkillId) {
        queue.push({
          skillId: echoSkillId,
          triggerKey: result.phase5.outcastEchoTarget,
          type: 'outcast_echo',
          depth: childHistory.length,
          chainHistory: childHistory,
          chainSplash: false,
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
        transformedBoost: action.transformedBoost,
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
        transformedBoost: action.transformedBoost,
      })
      break
    }
    // apprentice_neighbor: 直接更新邻居 runtimeState（不入队触发）
    case 'apprentice_neighbor': {
      const neighborSkillId = ctx.bindings.get(action.neighborKey)
      if (neighborSkillId) {
        const neighborState = ctx.skillStates.get(neighborSkillId)
        if (neighborState) {
          neighborState.apprenticeAccumulated += action.growthDelta * (ctx.apprenticeGrowthMultiplier ?? 1)
        }
      }
      break
    }
    // conduit: 导能 — 让触发技能再触发一次
    case 'conduit': {
      const targetSkillId = ctx.bindings.get(action.targetKey)
      if (!targetSkillId) return
      queue.push({
        skillId: targetSkillId,
        triggerKey: action.targetKey,
        type: 'conduit',
        depth: parentChildHistory.length,
        chainHistory: parentChildHistory,
      })
      break
    }
    // quest_resonance: triggerAffixSkill 内部已处理 runtimeState
    case 'quest_resonance':
      break
  }
}
