// ============================================
// 打字肉鸽 - 新 Affix 系统 · Effect Resolver + Condition Evaluator
// ============================================
// 给定 EffectSpec + ResolveContext，结算 effect：
//   - 产出资源（gain_resource / add 的等效产出）
//   - 触发目标 fire_target（带 rate limit）
//   - 应用 aura / status
//   - 修改 instance state（关内成长 / stacks）
//
// 结算后返回 ResolveResult；caller 负责把 resourceProduced 注入战斗 ledger。

import type {
  EffectSpec,
  ConditionSpec,
  TargetSelector,
  AuraModifier,
  StatusKeyword,
  ScaleByTag,
} from '../data/affixV2Trigger'
import type { Tag } from '../data/affixTags'
import { countByTag } from './tagQuery'
import {
  getInstanceState,
  addAura,
  addStatus,
  addSkillCumBase,
  addSkillCumFactor,
} from './affixV2State'

// ============================================
// ResolveContext
// ============================================

/** Resolve 所需的运行时上下文 */
export interface ResolveContext {
  /** 本 affix 实例 id（state 查询用）*/
  readonly instanceId: string
  /** 本 affix 所在 skill id */
  readonly skillId: string
  /** 本 affix 所在键位（fire_target 邻居解析用）*/
  readonly key: string
  /** 本 skill 的主资源（add / gain_resource 用作 fallback）*/
  readonly skillResource: string
  /** 本 skill 的 Lv1 base 值（add / gain_resource ratio 解析用）*/
  readonly skillResourceLv1Base: number
  /** 资源 → Lv1 base 查询（gain_resource 用）*/
  readonly resourceLv1Base: (resource: string) => number
  /** 当前时间戳（ms · 用于 rate limiter）*/
  readonly nowMs: number
  /** 当前 fire 是否暴击 */
  readonly isCrit: boolean
  /** 当前词长（word_length_gte/lte 用）*/
  readonly currentWordLength: number
  /** 玩家资源池查询（resource_below/above 用）*/
  readonly getPlayerResource: (resource: string) => number

  // === scope-aware queries（运行时 loadout 集成时填）===
  /** 本 affix 是否携带 tag（scope='self' 计数用）*/
  readonly selfHasTag?: (tag: import('../data/affixTags').Tag) => boolean
  /** 邻居 skill 中携带 tag 的 affix 总数（scope='neighbors' 计数用）*/
  readonly countTagInNeighbors?: (tag: import('../data/affixTags').Tag, posRel: import('../data/keyboardTopology').PositionRelation) => number
  /** 产出指定资源的 skill 中携带 tag 的 affix 总数（scope='matched_resource' 计数用）*/
  readonly countTagInResourceMatched?: (tag: import('../data/affixTags').Tag, resource: string) => number

  /** TargetSelector 展开为 skill id 列表（add/multiply 带 selector 时用）
   * 由集成层提供（详 affixV2BattleIntegration.resolveSelectorToSkillIds）；
   * 缺省时 selector 展开退化为 [self.skillId]
   */
  readonly resolveSelector?: (selector: TargetSelector, sourceSkillId: string, sourceKey: string) => readonly string[]
}

// ============================================
// ResolveResult
// ============================================

export interface ResourceProduction {
  readonly resource: string
  readonly amount: number
}

export interface FireTargetTriggered {
  readonly sourceInstanceId: string
  readonly selector: TargetSelector
}

export interface StatusApplied {
  readonly target: TargetSelector
  readonly status: StatusKeyword
  readonly amount: number
  readonly duration?: number
}

export interface AuraApplied {
  readonly sourceInstanceId: string
  readonly selector: TargetSelector
  readonly modifier: AuraModifier
}

export interface ResolveResult {
  /** 一次性产出的资源列表（gain_resource）+ 关内成长后本次 fire 等效产出（add/multiply 复合）*/
  resourceProduced: ResourceProduction[]
  /** 申请的 fire_target 触发（实际触发由 caller 调用 skill dispatch）*/
  fireTargetsTriggered: FireTargetTriggered[]
  /** 应用的 aura（已写入 state 注册表）*/
  aurasApplied: AuraApplied[]
  /** 应用的 status（已写入 state 注册表，runtime stub）*/
  statusesApplied: StatusApplied[]
  /** 因 rate limit 被丢弃的 fire_target 次数（telemetry 用）*/
  rateLimitedFireTargets: number
}

function freshResult(): ResolveResult {
  return {
    resourceProduced: [],
    fireTargetsTriggered: [],
    aurasApplied: [],
    statusesApplied: [],
    rateLimitedFireTargets: 0,
  }
}

// ============================================
// 主 entry · resolveEffect
// ============================================

/**
 * 结算 effect spec。
 *
 * 调用约束：
 *   - 应在 affix 的 trigger evaluator 命中后调用
 *   - state mutation 直接发生在 affixV2State 注册表，不在 result 里
 *   - resourceProduced / fireTargetsTriggered 由 caller 拿去执行实际战斗效果
 */
export function resolveEffect(spec: EffectSpec, ctx: ResolveContext): ResolveResult {
  const result = freshResult()
  resolveInto(spec, ctx, result)
  return result
}

function resolveInto(spec: EffectSpec, ctx: ResolveContext, result: ResolveResult): void {
  switch (spec.kind) {
    case 'noop':
      return

    case 'add': {
      const factor = applyScale(spec.scale, ctx)
      const delta = spec.ratio * ctx.skillResourceLv1Base * factor
      if (spec.selector) {
        // scope-broadcast：写到每个 target skill 的 aggregate
        const targets = ctx.resolveSelector?.(spec.selector, ctx.skillId, ctx.key) ?? [ctx.skillId]
        for (const tid of targets) addSkillCumBase(tid, delta)
      } else {
        // self：写到本 instance state
        getInstanceState(ctx.instanceId).cumulativeBaseAdd += delta
      }
      return
    }

    case 'multiply': {
      const factor = applyScale(spec.scale, ctx)
      const delta = spec.amount * factor
      if (spec.selector) {
        const targets = ctx.resolveSelector?.(spec.selector, ctx.skillId, ctx.key) ?? [ctx.skillId]
        for (const tid of targets) addSkillCumFactor(tid, delta)
      } else {
        getInstanceState(ctx.instanceId).cumulativeFactorAdd += delta
      }
      return
    }

    case 'gain_resource': {
      const factor = applyScale(spec.scale, ctx)
      const baseLv1 = ctx.resourceLv1Base(spec.resource)
      const amount = spec.ratio * baseLv1 * factor
      result.resourceProduced.push({ resource: spec.resource, amount })
      return
    }

    case 'composite': {
      // 顺序结算（加算层 → 乘算层 → 一次性产出）
      // composite.effects 由 affix 作者决定顺序；resolver 按顺序执行
      for (const child of spec.effects) {
        resolveInto(child, ctx, result)
      }
      return
    }

    case 'conditional': {
      if (evaluateCondition(spec.when, ctx)) {
        resolveInto(spec.then, ctx, result)
      } else if (spec.else) {
        resolveInto(spec.else, ctx, result)
      }
      return
    }

    case 'fire_target': {
      // K1 决议：rate limit 4/sec/source · 但不在此处丢弃 —— 全部 push，由 integration
      // 派发时按窗口配额延迟 setTimeout（实现"无限限流循环"）
      result.fireTargetsTriggered.push({
        sourceInstanceId: ctx.instanceId,
        selector: spec.selector,
      })
      return
    }

    case 'apply_aura': {
      addAura(ctx.instanceId, spec.selector, spec.modifier)
      result.aurasApplied.push({
        sourceInstanceId: ctx.instanceId,
        selector: spec.selector,
        modifier: spec.modifier,
      })
      return
    }

    case 'apply_status': {
      // K4 D' 占位 · 注册到 status store 但不做实质处理
      addStatus(spec.target, spec.status, spec.amount, spec.duration)
      result.statusesApplied.push({
        target: spec.target,
        status: spec.status,
        amount: spec.amount,
        duration: spec.duration,
      })
      return
    }

    case 'stack_inc': {
      const state = getInstanceState(ctx.instanceId)
      state.stacks += spec.amount ?? 1
      return
    }

    case 'stack_release': {
      const state = getInstanceState(ctx.instanceId)
      if (state.stacks >= spec.threshold) {
        resolveInto(spec.release, ctx, result)
        if (spec.reset !== false) state.stacks = 0
      }
      return
    }
  }
}

// ============================================
// ScaleByTag 解析
// ============================================

/**
 * 把 ScaleByTag 解析为乘法因子。
 * `magnitude_final = base_magnitude × applyScale(scale, ctx)`
 *
 * 缺省 (undefined) 返 1.0。
 */
function applyScale(scale: ScaleByTag | undefined, ctx: ResolveContext): number {
  if (!scale) return 1
  const tags = Array.isArray(scale.tag) ? scale.tag : [scale.tag]
  let totalCount = 0
  for (const t of tags) {
    totalCount += countTagInScope(t, scale.scope, ctx)
  }
  return 1 + totalCount * scale.factor
}

/**
 * 在指定 scope 内计数携带 tag 的 affix。
 * 按 TargetSelector 派发：
 *   - self → ctx.selfHasTag callback（0/1）
 *   - all_skills（默认）→ 全注册表
 *   - neighbors → ctx.countTagInNeighbors callback
 *   - matched_tag → 当前与 all_skills 等价（待 runtime 区分）
 *   - matched_resource → ctx.countTagInResourceMatched callback
 */
function countTagInScope(tag: Tag, scope: TargetSelector | undefined, ctx: ResolveContext): number {
  if (!scope || scope.type === 'all_skills') {
    return countByTag(tag, { kind: 'registry' })
  }
  if (scope.type === 'self') {
    return ctx.selfHasTag?.(tag) ? 1 : 0
  }
  if (scope.type === 'neighbors') {
    return ctx.countTagInNeighbors?.(tag, scope.posRel) ?? 0
  }
  if (scope.type === 'matched_resource') {
    return ctx.countTagInResourceMatched?.(tag, scope.resource) ?? 0
  }
  if (scope.type === 'matched_tag') {
    return countByTag(tag, { kind: 'registry' })
  }
  return 0
}

// ============================================
// Condition evaluator
// ============================================

/**
 * 求值 ConditionSpec 是否成立。
 *
 * Status-依赖条件（has_status / status_count_gte）当前 K4 D' 占位返 false。
 */
export function evaluateCondition(spec: ConditionSpec, ctx: ResolveContext): boolean {
  switch (spec.type) {
    case 'is_crit':
      return ctx.isCrit

    case 'word_length_gte':
      return ctx.currentWordLength >= spec.n

    case 'word_length_lte':
      return ctx.currentWordLength <= spec.n

    case 'count_tag_gte':
      return countTagInScope(spec.tag, spec.scope, ctx) >= spec.n

    case 'count_tag_lte':
      return countTagInScope(spec.tag, spec.scope, ctx) <= spec.n

    case 'resource_below': {
      const lv1 = ctx.resourceLv1Base(spec.resource)
      const threshold = spec.ratio * lv1
      return ctx.getPlayerResource(spec.resource) < threshold
    }

    case 'resource_above': {
      const lv1 = ctx.resourceLv1Base(spec.resource)
      const threshold = spec.ratio * lv1
      return ctx.getPlayerResource(spec.resource) > threshold
    }

    case 'affix_key_count_gte': {
      const state = getInstanceState(ctx.instanceId)
      return state.affixKeyCount >= spec.n
    }

    case 'has_status':
    case 'status_count_gte':
      // K4 D' 占位 · 词表未定，永远返 false
      return false
  }
}
