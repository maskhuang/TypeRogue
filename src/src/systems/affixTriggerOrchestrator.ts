// ============================================
// 打字肉鸽 - 词条触发迭代调度器
// ============================================
// Story 35.14: 触发管线伪循环重构
// 用 FIFO work queue 替代真递归，O(1) 调用栈深度

import type { ResourceType } from '../core/types'
import { AffixType, EnchantmentType, BASE_VALUES } from '../data/affixes'
import { hasRelation, PositionRelation, getKeysWithRelation } from '../data/keyboardTopology'
import { getOutputDrainMultiplier } from '../data/bossModifiers'
import { onStackEffectTriggered, checkStackDividend, isStackingAffix, SURGE_BONUS_PER_STACK } from './relics/StackingRelicBehaviors'
import { isStackingSkill, isAuraQuestActive } from '../data/affixTrigger'
import {
  triggerAffixSkill,
  MAX_RECURSE_DEPTH,
  MAX_CHAIN_DEPTH,
  getClassResources,
  removeAffixAtRuntime,
  getExtendedNeighbors,
  hasSharedMatch,
  isAffixGloballyTransformed,
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
  | 'splash'
  | 'conduit'
  | 'relay'
  | 'outcast_echo'
  | 'crit_echo'
  | 'pulse_self'
  | 'pulse_burst'
  | 'amplify_trigger'
  | 'stack_self'
  | 'overload'

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
  /** 递归暴击率覆盖（每次暴击重触发减半） */
  recurseCritOverride?: number
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
  /** 吞噬目标（键位 + 邻居等级，用于移除邻居 + 经验累积） */
  devourTarget?: (targetKey: string, neighborLevel: number) => void
  /** 质变·繁殖：向邻居传播虫群词条 */
  swarmPropagate?: (targetSkillId: string, posRel: number) => void
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
  // devourConsumed 已移除：质变Void每次触发都可吞噬

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

    // ── 深度检查：自触发类型（recurse / pulse_self）使用 depth 防护 ──
    if ((item.type === 'recurse' || item.type === 'pulse_self') && item.depth >= MAX_RECURSE_DEPTH) {
      continue
    }

    // ── 循环检测：仅对链式类型（resonance/link/splash）检查 ──
    // Conduit 不参与循环检测：用 chainAffixesDisabled 阻止级联（见下方 triggerCtx 构建）
    const isChainType = item.type === 'resonance'
      || item.type === 'splash'
      || item.type === 'relay'
      || item.type === 'pulse_burst'
      || item.type === 'amplify_trigger'
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
    // triggerKey 为 null 时（Innate 等），用技能实际绑定键替代（仅内部计算用）
    const effectiveTriggerKey = item.triggerKey ?? chainedOccupiedKeys[0] ?? ''
    const triggerCtx: TriggerContext = {
      ...ctx,
      triggerKey: effectiveTriggerKey,
      occupiedKeys: chainedOccupiedKeys.length > 0 ? chainedOccupiedKeys : (effectiveTriggerKey ? [effectiveTriggerKey] : []),
      transmuteResource: skill.transmuteResource,
      // splash 触发禁用链式词条
      ...(item.type === 'splash' ? { chainAffixesDisabled: true } : {}),
      // 41-4: outcast_echo / crit_echo 禁用链式词条防止循环
      ...(item.type === 'outcast_echo' || item.type === 'crit_echo' ? { chainAffixesDisabled: true } : {}),
      // conduit 额外触发禁用链式词条，防止 Conduit→Conduit 无限级联
      ...(item.type === 'conduit' ? { chainAffixesDisabled: true } : {}),
      // relay 额外触发禁用链式词条，防止 Relay→Relay 级联
      ...(item.type === 'relay' ? { chainAffixesDisabled: true } : {}),
      // amplify_trigger / overload 禁用链式词条，防止指数增长
      ...(item.type === 'amplify_trigger' || item.type === 'overload' ? { chainAffixesDisabled: true } : {}),
      // recurse 重触发禁用链式词条，防止 Recurse→Splash/Resonance 指数增长
      ...(item.type === 'recurse' ? { chainAffixesDisabled: true } : {}),
      // recurse 概率覆盖（每次递归减半）
      ...(item.recurseCritOverride != null ? { recurseCritOverride: item.recurseCritOverride } : {}),
    }

    // ── 执行纯计算（triggerAffixSkill 签名不变） ──
    const recurseDepth = item.type === 'recurse' ? item.depth : 0
    const result = triggerAffixSkill(skill, runtimeState, triggerCtx, recurseDepth)

    // ── 同资源衍生增强 ──
    // 使用 phase4.output（Rainbow 非质变时含比例缩放）
    let effectiveOutput = result.phase4?.output ?? result.output
    // 同资源衍生附魔增强（系统层应用 output × (1 + boost)）
    if (result.phase5?.transmuteSameResourceBoost) {
      effectiveOutput *= (1 + result.phase5.transmuteSameResourceBoost)
    }
    // boss_output_drain：产出削弱（按技能目标资源判定）
    const drainResource = result.phase4?.targetResource ?? skill.resource
    effectiveOutput *= getOutputDrainMultiplier(drainResource)

    results.push(result)

    totalOutput += effectiveOutput
    triggerCount++

    // Story 45.9: Exhaust — 触发计数 + 词条移除
    {
      const skill = ctx.allSkills.get(item.skillId)
      const rt = ctx.skillStates.get(item.skillId)
      if (skill && rt) {
        const exhaustAffix = skill.affixes.find(a => a.type === AffixType.Exhaust)
        if (exhaustAffix && !exhaustAffix.spent) {
          rt.exhaustCount = (rt.exhaustCount ?? 0) + 1
          if (rt.exhaustCount >= (exhaustAffix.maxTriggers ?? Infinity)) {
            // 战斗中消耗完：从词条列表中移除
            const idx = skill.affixes.indexOf(exhaustAffix)
            if (idx >= 0) skill.affixes.splice(idx, 1)
          }
        }
      }
    }

    // ── 副作用 ──
    if (result.phase4) {
      if (result.phase4.allResources) {
        // 质变Rainbow：按比例分配到所有可用资源
        const pool = getClassResources(ctx.playerClass)
        const skillBase = result.phase4.rainbowSkillBase ?? 1
        const lvIdx = (result.phase4.rainbowSkillLevel ?? 1) - 1
        for (const r of pool) {
          const targetBase = BASE_VALUES[r]?.[lvIdx] ?? 1
          const share = skillBase > 0 ? effectiveOutput * (targetBase / skillBase) : effectiveOutput / pool.length
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

    // 吞噬：质变Void每次触发都吞噬最弱邻居（移除 + 经验）
    if (result.phase5?.devourTarget) {
      callbacks?.devourTarget?.(result.phase5.devourTarget.key, result.phase5.devourTarget.level)
    }

    // 繁殖：质变Swarm向邻居传播虫群词条
    if (result.phase5?.swarmPropagateTarget) {
      callbacks?.swarmPropagate?.(result.phase5.swarmPropagateTarget.skillId, result.phase5.swarmPropagateTarget.posRel)
    }

    // Story 41-5: Charge 质变 — 满蓄力自动完成当前单词（仅初始触发，不对链式传播）
    if (result.chargeAutoComplete && item.type === 'initial') {
      callbacks?.chargeAutoComplete?.()
    }

    // Story 45.5: 延迟资源消耗（Phase 4 后执行）
    // 注意：ctx.resources 是触发开始时的快照，consume 基于触发前的资源值限制消耗量
    if (result.consumeRequests) {
      for (const req of result.consumeRequests) {
        const current = ctx.resources[req.resource] ?? 0
        const consumeAmount = Math.min(req.amount, Math.max(0, current))
        if (consumeAmount > 0) {
          callbacks?.applyResource?.(req.resource, -consumeAmount, false)
        }
      }
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
        recurseCritOverride: result.phase5.recurse.newChance,
      })
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

    // Crit echo: 暴击质变回响 — 触发随机无 Crit 技能（chainAffixesDisabled 防循环）
    if (result.phase5?.critEchoTarget) {
      const echoSkillId = ctx.bindings.get(result.phase5.critEchoTarget)
      if (echoSkillId) {
        queue.push({
          skillId: echoSkillId,
          triggerKey: result.phase5.critEchoTarget,
          type: 'crit_echo',
          depth: childHistory.length,
          chainHistory: childHistory,
          chainSplash: false,
        })
      }
    }

    // Outcast 满层：触发词另一端字母键技能
    if (result.phase5?.outcastTarget) {
      const outcastSkillId = ctx.bindings.get(result.phase5.outcastTarget)
      if (outcastSkillId) {
        queue.push({
          skillId: outcastSkillId,
          triggerKey: result.phase5.outcastTarget,
          type: 'pulse_burst' as TriggerWorkType,
          depth: item.depth + 1,
          chainHistory: [...item.chainHistory, `${item.skillId}@${item.triggerKey}`],
        })
      }
    }

    // Amplify trigger: 增幅质变 — 层数增加时触发匹配技能
    if (result.phase5?.amplifyTriggerTargets) {
      for (const targetKey of result.phase5.amplifyTriggerTargets) {
        const targetSkillId = ctx.bindings.get(targetKey)
        if (!targetSkillId) continue
        queue.push({
          skillId: targetSkillId,
          triggerKey: targetKey,
          type: 'amplify_trigger',
          depth: item.depth + 1,
          chainHistory: childHistory,
        })
      }
    }

    // Splash: 溅射 — 触发叠层数个匹配技能
    if (result.phase5?.splashTargets) {
      // 质变·连锁溅射：被溅射目标还会触发1个匹配技能（仅首跳，防无限）
      const splashTransformed = item.type !== 'splash'
        && isAffixGloballyTransformed(AffixType.Splash, ctx.allSkills, ctx.skillStates)
      for (const targetKey of result.phase5.splashTargets) {
        const targetSkillId = ctx.bindings.get(targetKey)
        if (!targetSkillId) continue
        queue.push({
          skillId: targetSkillId,
          triggerKey: targetKey,
          type: 'splash',
          depth: item.depth + 1,
          chainHistory: childHistory,
          chainSplash: splashTransformed,
        })
      }
    }

    // 质变·连锁��射：被溅射技能触发后，从原始溅射技能范围内再触发1个匹配技能
    if (item.type === 'splash' && item.chainSplash) {
      // 找原始溅射技能（chainHistory 中最后一个非 splash 的触发源）
      for (const [splashSkillId, splashSkill] of ctx.allSkills) {
        const splashAffix = splashSkill.affixes.find(a => a.type === AffixType.Splash && a.posRel != null)
        if (!splashAffix) continue
        const splashKeys = [...ctx.bindings].filter(([, sid]) => sid === splashSkillId).map(([k]) => k)
        if (splashKeys.length === 0) continue
        const rangeKeys = getExtendedNeighbors(splashKeys, splashAffix.posRel!).filter(k => ctx.bindings.has(k))
        const seen = new Set<string>()
        const valid: string[] = []
        for (const k of rangeKeys) {
          const sid = ctx.bindings.get(k)!
          if (sid === splashSkillId || sid === item.skillId || seen.has(sid)) continue
          seen.add(sid)
          const ns = ctx.allSkills.get(sid)
          if (!ns || !hasSharedMatch(splashSkill, ns, AffixType.Splash)) continue
          valid.push(k)
        }
        if (valid.length > 0) {
          const pick = valid[Math.floor(ctx.randomFn() * valid.length)]
          const pickSid = ctx.bindings.get(pick)
          if (pickSid) {
            queue.push({ skillId: pickSid, triggerKey: pick, type: 'splash', depth: item.depth + 1, chainHistory: childHistory })
          }
        }
        break
      }
    }

    // ── 共鸣/回响：全局��听，叠层满��自触发 ──
    if (item.type !== 'stack_self') {
      const triggeredSkill = ctx.allSkills.get(item.skillId)
      for (const [monSkillId, monSkill] of ctx.allSkills) {
        if (monSkillId === item.skillId) continue
        const monRt = ctx.skillStates.get(monSkillId)
        if (!monRt) continue
        for (const ma of monSkill.affixes) {
          let matched = false
          if (ma.type === AffixType.Resonance && ma.resource && triggeredSkill) {
            matched = triggeredSkill.resource === ma.resource
          } else if (ma.type === AffixType.Echo && ma.echoAffixA && ma.echoAffixB && triggeredSkill) {
            matched = triggeredSkill.affixes.some(a => a.type === ma.echoAffixA || a.type === ma.echoAffixB)
          } else if (ma.type === AffixType.Fury && result.isCrit) {
            matched = true
          } else if ((ma.type === AffixType.WarDrum || ma.type === AffixType.Amplify) && ma.posRel != null && triggeredSkill) {
            // 战鼓/增幅：范围内匹配技能触发时叠层
            const auraKeys = [...ctx.bindings].filter(([, sid]) => sid === monSkillId).map(([k]) => k)
            const trigKeys = [...ctx.bindings].filter(([, sid]) => sid === item.skillId).map(([k]) => k)
            const inRange = trigKeys.some(tk => auraKeys.some(ak => hasRelation(ak, tk, ma.posRel!)))
            if (inRange && hasSharedMatch(triggeredSkill, monSkill, ma.type)) {
              matched = true
            }
          }
          if (matched) {
            monRt.stacks += 1
            // 叠层暴击：叠层时按暴击率判定，暴击则额外+1层
            if (ctx.stackCritActive && ctx.randomFn() < (ctx.baseCritRate ?? 0)) {
              monRt.stacks += 1
            }
            // 质变·脉冲：增幅叠层时触发范围内1个非匹配技能
            if (ma.type === AffixType.Amplify && ma.posRel != null
              && isAffixGloballyTransformed(AffixType.Amplify, ctx.allSkills, ctx.skillStates)) {
              const aKeys = [...ctx.bindings].filter(([, sid]) => sid === monSkillId).map(([k]) => k)
              const candidates: { skillId: string; key: string }[] = []
              const seen = new Set<string>()
              for (const [nk, nSid] of ctx.bindings) {
                if (nSid === monSkillId || seen.has(nSid)) continue
                seen.add(nSid)
                const nSkill = ctx.allSkills.get(nSid)
                if (!nSkill) continue
                const nInRange = aKeys.some(ak => hasRelation(ak, nk, ma.posRel!))
                if (!nInRange) continue
                if (hasSharedMatch(nSkill, monSkill, AffixType.Amplify)) continue // 非匹配
                candidates.push({ skillId: nSid, key: nk })
              }
              if (candidates.length > 0) {
                const pick = candidates[Math.floor(ctx.randomFn() * candidates.length)]
                queue.push({
                  skillId: pick.skillId,
                  triggerKey: pick.key,
                  type: 'amplify_trigger' as TriggerWorkType,
                  depth: item.depth + 1,
                  chainHistory: childHistory,
                })
              }
            }
            const interval = ma.interval ?? 4
            if (monRt.stacks > 0 && monRt.stacks % interval === 0) {
              const monKeys = [...ctx.bindings].filter(([, sid]) => sid === monSkillId).map(([k]) => k)
              if (monKeys.length > 0) {
                // 质变·狂暴：Fury 自触发时全场暴击率 +20%
                if (ma.type === AffixType.Fury && isAffixGloballyTransformed(AffixType.Fury, ctx.allSkills, ctx.skillStates)) {
                  ctx.baseCritRate = (ctx.baseCritRate ?? 0) + 0.20
                }
                queue.push({
                  skillId: monSkillId,
                  triggerKey: monKeys[0],
                  type: 'stack_self',
                  depth: item.depth + 1,
                  chainHistory: childHistory,
                })
              }
            }
          }
        }
      }
    }

    // ── 入队 Phase 6 后续触发 ──
    if (result.phase6?.actions) {
      for (const action of result.phase6.actions) {
        enqueuePhase6Action(action, childHistory, ctx, queue)
      }
    }

    // ── 叠层遗物钩子 ──
    if (result.stackEffectFired) {
      // 层层递进：间隔临时 -1
      onStackEffectTriggered(item.skillId)
      // 积少成多：检查产出加成
      checkStackDividend(item.skillId, runtimeState.stacks)
      // 铭文涌流：附魔叠层技能 → 成长+2%
      if (ctx.inscriptionFlowGrowth && skill.enchantmentIds.length > 0) {
        runtimeState.apprenticeAccumulated += ctx.inscriptionFlowGrowth
      }
      // 浪涌：层数归零，范围内匹配技能产出 +层数×10%
      if (ctx.surgeActive) {
        const surgeStacks = runtimeState.stacks
        runtimeState.stacks = 0
        if (surgeStacks > 0) {
          const bonus = surgeStacks * SURGE_BONUS_PER_STACK
          ctx.surgeBonus = (ctx.surgeBonus ?? 0) + bonus
        }
      }
      // 邻里守望：相邻叠层技能+1层
      if (ctx.neighborWatchActive) {
        for (const [nk, nSid] of ctx.bindings) {
          if (nSid === item.skillId) continue
          // 检查相邻
          const isAdj = [...ctx.bindings]
            .filter(([, sid]) => sid === item.skillId)
            .some(([k]) => hasRelation(k, nk, 0)) // PositionRelation.Adjacent = 0
          if (!isAdj) continue
          const nSkill = ctx.allSkills.get(nSid)
          if (!nSkill || !isStackingSkill(nSkill, ctx.skillStates)) continue
          const nState = ctx.skillStates.get(nSid)
          if (nState) nState.stacks += 1
        }
      }
      // 过载电路：额外触发相邻叠层技能（不叠层）
      if (ctx.overloadCircuitActive && item.type !== 'overload') {
        for (const [nk, nSid] of ctx.bindings) {
          if (nSid === item.skillId) continue
          const isAdj = [...ctx.bindings]
            .filter(([, sid]) => sid === item.skillId)
            .some(([k]) => hasRelation(k, nk, 0))
          if (!isAdj) continue
          const nSkill = ctx.allSkills.get(nSid)
          if (!nSkill || !isStackingSkill(nSkill, ctx.skillStates)) continue
          queue.push({
            skillId: nSid,
            triggerKey: nk,
            type: 'overload' as TriggerWorkType,
            depth: item.depth + 1,
            chainHistory: childHistory,
          })
        }
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
      for (let i = 0; i < action.triggerCount; i++) {
        queue.push({
          skillId: targetSkillId,
          triggerKey: action.neighborKey,
          type: 'resonance',
          depth: parentChildHistory.length,
          chainHistory: parentChildHistory,
        })
      }
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
    // conduit: 导能 — 让触发技能再触发 N 次（chainAffixesDisabled 防止级联）
    case 'conduit': {
      const targetSkillId = ctx.bindings.get(action.targetKey)
      if (!targetSkillId) return
      for (let i = 0; i < action.conduitCount; i++) {
        queue.push({
          skillId: targetSkillId,
          triggerKey: action.targetKey,
          type: 'conduit',
          depth: parentChildHistory.length,
          chainHistory: parentChildHistory,
        })
      }
      break
    }
    // relay: 中转 — 触发匹配技能（chainAffixesDisabled 防止级联）
    case 'relay': {
      const targetSkillId = ctx.bindings.get(action.targetKey)
      if (!targetSkillId) return
      queue.push({
        skillId: targetSkillId,
        triggerKey: action.targetKey,
        type: 'relay',
        depth: parentChildHistory.length,
        chainHistory: parentChildHistory,
      })
      break
    }
  }
}
