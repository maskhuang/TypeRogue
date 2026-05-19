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
import type { AffixSkillInstance } from '../data/affixes'
import {
  getInstanceState,
  addAura,
  addStatus,
  addSkillCumBase,
  addSkillCumFactor,
  grantHaste,
} from './affixV2State'
import { random } from '../core/seededRandom'
import { getCandidatePool, widenSkillFilter, spawnSkillFromSeed, filterByNeighborPosRel } from './affixV2SkillFilter'

// ============================================
// EquippedView · 已装备 affix 的查询视图（避免 affixV2Effect → affixV2Equipped 循环依赖）
// ============================================

/** scope-aware 查询返回的 affix 视图 · 字段 hydrate 自 def + entry */
export interface EquippedView {
  readonly defId: string
  readonly skillId: string
  readonly key: string
  readonly instanceId: string
  readonly tags: readonly import('../data/affixTags').Tag[]
}

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
  /** 本 affix 宿主 skill 的等级（gain_skill levelMode='inherit_host' 用 · 缺省 1）*/
  readonly hostSkillLevel: number
  /** 本 affix 自身 def 的 section（gain_skill filter.hasTagFromHost 用 · 缺省时 imitate 等动态 filter 退化）*/
  readonly selfSection?: import('../data/affixTags').SectionTag
  /** 玩家资源池查询（resource_below/above 用）*/
  readonly getPlayerResource: (resource: string) => number

  // === scope-aware loadout 查询（运行时集成层注入）===
  /** 单点 scope 查询：返回 scope 内已装备的 affix 视图列表 ·
   *  self → 本 affix 自身；其它 scope（neighbors / matched_tag / matched_resource /
   *  matched_rarity / all_skills）→ 范围内 skill 上的全部装备 ·
   *  resolver / condition 在此基础上做 tag/status/resource 等任意 filter（无需新增 ctx 字段）*/
  readonly queryEquipped?: (scope: TargetSelector) => readonly EquippedView[]

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

export interface SkillGranted {
  readonly sourceInstanceId: string
  readonly skill: AffixSkillInstance
  /** filter 是否走了 widen 兜底（true 时玩家拿到的不是首选 filter 匹配的 skill）*/
  readonly widened: boolean
}

export interface SkillUpgrade {
  readonly sourceInstanceId: string
  readonly skillId: string
  readonly amount: number
}

export interface AffixGraft {
  readonly sourceInstanceId: string
  /** 接收方 skill（宿主）*/
  readonly targetSkillId: string
  readonly targetKey: string
  /** 要嫁接的 V2 词条 def id */
  readonly defId: string
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
  /** 申请的新技能（已 spawn 但未入 inbox · 由 caller 写入 state.affixSkills/player.skills/player.inbox）*/
  skillsGranted: SkillGranted[]
  /** 申请的 skill 升级（由 caller 增 skill.level）*/
  skillUpgrades: SkillUpgrade[]
  /** 申请的词条嫁接（由 caller equip 到 host + 更新 v2Ids）*/
  affixGrafts: AffixGraft[]
  /** 因 rate limit 被丢弃的 fire_target 次数（telemetry 用）*/
  rateLimitedFireTargets: number
}

function freshResult(): ResolveResult {
  return {
    resourceProduced: [],
    fireTargetsTriggered: [],
    aurasApplied: [],
    statusesApplied: [],
    skillsGranted: [],
    skillUpgrades: [],
    affixGrafts: [],
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

    case 'gain_proportional': {
      // amount = ratio × Lv1[target] × (player[source] / Lv1[source])
      const sourceLv1 = ctx.resourceLv1Base(spec.source)
      const targetLv1 = ctx.resourceLv1Base(spec.target)
      const playerSource = ctx.getPlayerResource(spec.source)
      if (sourceLv1 <= 0 || playerSource <= 0) return  // 防 0 除 / 持有量为 0 不产出
      const scaleFactor = playerSource / sourceLv1
      const amount = spec.ratio * targetLv1 * scaleFactor
      result.resourceProduced.push({ resource: spec.target, amount })
      return
    }

    case 'grant_haste': {
      // selector 展开 → 每个 target skill 累加 amount 极速（grantHaste 内含 addHaste + emit haste:granted）
      const targets = ctx.resolveSelector?.(spec.selector, ctx.skillId, ctx.key) ?? [ctx.skillId]
      for (const tid of targets) {
        grantHaste(tid, spec.amount, ctx.instanceId)
      }
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
      const factor = applyScale(spec.scale, ctx)
      const scaledModifier = scaleAuraModifier(spec.modifier, factor)
      addAura(ctx.instanceId, spec.selector, scaledModifier)
      result.aurasApplied.push({
        sourceInstanceId: ctx.instanceId,
        selector: spec.selector,
        modifier: scaledModifier,
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

    case 'gain_skill': {
      // 解析 levelMode → 目标 Lv
      const mode = spec.levelMode ?? 'inherit_host'
      let targetLv: number
      if (mode === 'inherit_host') {
        targetLv = ctx.hostSkillLevel
      } else if (mode.type === 'fixed') {
        targetLv = mode.level
      } else {
        targetLv = Math.max(1, ctx.hostSkillLevel - mode.delta)
      }

      // 解析候选池 + filter widen 兜底
      const source = spec.source ?? 'recipe_pool'
      // player_skill_pool 需排除宿主自身（防自我无限克隆）· 其他 source 不需 hostId
      let pool = getCandidatePool(source, source === 'player_skill_pool' ? ctx.skillId : undefined)
      // neighborPosRel · 仅 player_skill_pool 有键位信息可计算邻位 · 收紧候选到宿主键位邻位
      if (spec.filter.neighborPosRel !== undefined && source === 'player_skill_pool') {
        pool = filterByNeighborPosRel(pool, ctx.key, spec.filter.neighborPosRel)
      }
      if (pool.length === 0) return  // 空池（shop/altar stub · 无邻位兄弟 · player_skill_pool 空等）直接放弃

      // hasTagFromHost · 用本词条 def 的 section 覆盖 filter.hasTag（缺 selfSection 时退化为去掉该字段）
      let effectiveFilter = spec.filter
      if (spec.filter.hasTagFromHost) {
        const { hasTagFromHost: _drop, ...rest } = spec.filter
        effectiveFilter = ctx.selfSection
          ? { ...rest, hasTag: ctx.selfSection }
          : rest
      }

      const widen = widenSkillFilter(effectiveFilter, pool)
      if (widen.matches.length === 0) {
        // 全 widen 仍空（不应到这里因为 widenSkillFilter 兜底返全池）→ 按 fallback 处理
        const fb = spec.fallback ?? 'widen'
        if (fb === 'skip' || fb === 'refund') return   // refund 当前 stub → 等价 skip
        return
      }

      // 从命中集合无放回抽 count 个（同 seed 可重抽不同 spawn instance · 这里实现 seed 不重）
      // spawn 时传 widen 后的 effectiveFilter · spawnSkillFromSeed 用 filter.resource/rarity 约束生成参数
      const count = Math.max(1, spec.count ?? 1)
      const remaining = [...widen.matches]
      for (let i = 0; i < count && remaining.length > 0; i++) {
        const idx = Math.floor(random() * remaining.length)
        const [seed] = remaining.splice(idx, 1)
        const skill = spawnSkillFromSeed(seed, targetLv, widen.filter)
        result.skillsGranted.push({
          sourceInstanceId: ctx.instanceId,
          skill,
          widened: widen.droppedFields.length > 0,
        })
      }
      return
    }

    case 'upgrade_skill': {
      // selector 展开 → 每个 target skill 申请升级 amount 级（实际 +level 在 caller）
      const targets = ctx.resolveSelector?.(spec.selector, ctx.skillId, ctx.key) ?? [ctx.skillId]
      for (const tid of targets) {
        result.skillUpgrades.push({
          sourceInstanceId: ctx.instanceId,
          skillId: tid,
          amount: spec.amount,
        })
      }
      return
    }

    case 'graft_affix': {
      // from 范围内查所有已装备词条 → 随机抽 1 个 defId → 申请嫁接到宿主
      if (!ctx.queryEquipped) return
      const candidates = ctx.queryEquipped(spec.from)
        .filter(v => v.skillId !== ctx.skillId)   // 排除宿主自身词条
      if (candidates.length === 0) return
      const pick = candidates[Math.floor(random() * candidates.length)]
      result.affixGrafts.push({
        sourceInstanceId: ctx.instanceId,
        targetSkillId: ctx.skillId,
        targetKey: ctx.key,
        defId: pick.defId,
      })
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
  switch (scale.type) {
    case 'tag_count':
      return 1 + totalCount * scale.factor
    case 'tag_per_n':
      // perN<=0 视为关闭（避免除零 / 无限值）
      if (scale.perN <= 0) return 0
      return Math.floor(totalCount / scale.perN)
  }
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
  if (!ctx.queryEquipped) return 0
  const entries = ctx.queryEquipped(scope ?? { type: 'all_skills' })
  let n = 0
  for (const e of entries) {
    if (e.tags.includes(tag)) n++
  }
  return n
}

/**
 * 把 aura modifier 的 amount/ratio 字段按 scale factor 乘缩；
 * 'rainbow' 无数值字段，直接透传。factor 缺省值 1（无 scale 时 modifier 不变）。
 */
function scaleAuraModifier(mod: AuraModifier, factor: number): AuraModifier {
  if (factor === 1) return mod
  switch (mod.type) {
    case 'rainbow':
      return mod
    case 'base_add':
      return { ...mod, ratio: mod.ratio * factor }
    case 'factor_add':
    case 'crit_chance_add':
    case 'output_bonus_pct':
    case 'multi_fire_add':
      return { ...mod, amount: mod.amount * factor }
  }
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
